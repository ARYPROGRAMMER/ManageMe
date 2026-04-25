import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import {
  DATABASE_ID,
  FILES_BUCKET_ID,
  MEMBERS_ID,
  PROJECTS_ID,
  TASKS_ID,
  WORKSPACE_INTEGRATIONS_ID,
} from "@/config";
import { TaskStatus } from "@/features/tasks/types";
import { getMember } from "@/features/members/utils";

const app = new Hono();

const openClawStatus = z.enum(["todo", "in_progress", "done"]);
const integrationPlatform = z.enum(["telegram", "discord", "slack"]);

const dbStatusByOpenClawStatus: Record<
  z.infer<typeof openClawStatus>,
  TaskStatus
> = {
  todo: TaskStatus.TODO,
  in_progress: TaskStatus.IN_PROGRESS,
  done: TaskStatus.DONE,
};

const openClawStatusByDbStatus: Record<
  string,
  z.infer<typeof openClawStatus>
> = {
  [TaskStatus.TODO]: "todo",
  [TaskStatus.IN_PROGRESS]: "in_progress",
  [TaskStatus.DONE]: "done",
  [TaskStatus.BACKLOG]: "todo",
  [TaskStatus.IN_REVIEW]: "in_progress",
};

const sourceChannelMap = new Set([
  "telegram",
  "whatsapp",
  "slack",
  "discord",
  "openclaw",
]);

app.use("/ping", openClawAuth);
app.use("/task", openClawAuth);
app.use("/task/*", openClawAuth);
app.use("/tasks", openClawAuth);
app.use("/project", openClawAuth);
app.use("/projects", openClawAuth);
app.use("/resource", openClawAuth);

app.get("/", (c: any) => {
  return c.json({
    ok: true,
    message:
      "Use /ping, /task, /tasks, /project, /projects, /resource with x-openclaw-secret.",
  });
});

app.get("/ping", (c: any) => {
  return c.json({ ok: true, workspace: c.get("workspaceId"), ts: Date.now() });
});

app.post(
  "/task",
  zValidator(
    "json",
    z
      .object({
        title: z.string().trim().min(1).max(500).optional(),
        name: z.string().trim().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        projectId: z.string().optional(),
        assigneeId: z.string().optional(),
        sourceChannel: z.string().optional(),
      })
      .refine((data) => Boolean(data.title || data.name), {
        message: "title is required",
        path: ["title"],
      }),
  ),
  async (c) => {
    const workspaceId = (c as any).get("workspaceId") as string;
    const data = c.req.valid("json");
    const { tables } = await createAdminClient();
    const taskTitle = (data.title ?? data.name ?? "").trim();

    const assigneeId = await resolveAssigneeId(
      tables,
      workspaceId,
      data.assigneeId,
    );
    if (!assigneeId) {
      return c.json(
        {
          error:
            "No assignee available in this workspace. Add a member or provide a valid assigneeId.",
        },
        400,
      );
    }

    let projectId = await resolveProjectId(tables, workspaceId, data.projectId);
    if (!projectId) {
      projectId = await createProjectInWorkspace(tables, workspaceId, "Inbox");
    }

    const highestPositionTask = await tables.listRows<any>(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("status", TaskStatus.TODO),
        Query.orderDesc("position"),
        Query.limit(1),
      ],
    );

    const newPosition =
      highestPositionTask.rows.length > 0
        ? highestPositionTask.rows[0].position + 1000
        : 1000;

    const dueDate =
      normalizeDueDate(data.dueDate) ??
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createdVia =
      data.sourceChannel && sourceChannelMap.has(data.sourceChannel)
        ? data.sourceChannel
        : "openclaw";

    const task = await tables.createRow(DATABASE_ID, TASKS_ID, ID.unique(), {
      workspaceId,
      name: taskTitle,
      description: data.description ?? "",
      dueDate,
      priority: data.priority,
      status: TaskStatus.TODO,
      projectId,
      assigneeId,
      createdVia,
      resources: [],
      position: newPosition,
    });

    return c.json({
      success: true,
      taskId: task.$id,
      title: task.name,
      priority: task.priority,
      dueDate: task.dueDate,
      sourceChannel: task.createdVia,
    });
  },
);

app.get("/tasks", async (c) => {
  const workspaceId = (c as any).get("workspaceId") as string;
  const status = c.req.query("status") ?? "all";
  const projectId = c.req.query("projectId");
  const dueWithin = c.req.query("dueWithin");

  const { tables } = await createAdminClient();

  const queries: string[] = [Query.equal("workspaceId", workspaceId)];

  if (status !== "all") {
    const parsedStatus = openClawStatus.safeParse(status);
    if (!parsedStatus.success) {
      return c.json({ error: "invalid status" }, 400);
    }
    queries.push(
      Query.equal("status", dbStatusByOpenClawStatus[parsedStatus.data]),
    );
  }

  if (projectId) {
    queries.push(Query.equal("projectId", projectId));
  }

  if (dueWithin) {
    const parsedHours = Number.parseInt(dueWithin.replace("h", ""), 10);
    if (Number.isNaN(parsedHours) || parsedHours <= 0) {
      return c.json({ error: "invalid dueWithin format" }, 400);
    }

    const cutoff = new Date(
      Date.now() + parsedHours * 60 * 60 * 1000,
    ).toISOString();
    queries.push(Query.lessThanEqual("dueDate", cutoff));
    queries.push(Query.greaterThan("dueDate", new Date().toISOString()));
    queries.push(Query.equal("status", TaskStatus.TODO));
  }

  queries.push(Query.orderAsc("dueDate"));
  queries.push(Query.limit(50));

  const result = await tables.listRows<any>(DATABASE_ID, TASKS_ID, queries);

  return c.json({
    total: result.total,
    tasks: result.rows.map((task) => ({
      id: task.$id,
      title: task.name,
      status: openClawStatusByDbStatus[task.status] ?? "todo",
      priority: task.priority ?? "medium",
      dueDate: task.dueDate,
      projectId: task.projectId,
      createdVia: task.createdVia ?? "web",
    })),
  });
});

app.get("/projects", async (c) => {
  const workspaceId = (c as any).get("workspaceId") as string;
  const { tables } = await createAdminClient();

  const projects = await tables.listRows<any>(DATABASE_ID, PROJECTS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);

  return c.json({
    total: projects.total,
    projects: projects.rows.map((project) => ({
      id: project.$id,
      name: project.name,
      imageUrl: project.imageUrl ?? "",
    })),
  });
});

app.get("/project", async (c) => {
  const workspaceId = (c as any).get("workspaceId") as string;
  const projectId = c.req.query("id");
  const { tables } = await createAdminClient();

  if (projectId) {
    const project = await tables.listRows<any>(DATABASE_ID, PROJECTS_ID, [
      Query.equal("$id", projectId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);

    if (!project.total) {
      return c.json({ error: "project not found in this workspace" }, 404);
    }

    return c.json({
      project: {
        id: project.rows[0].$id,
        name: project.rows[0].name,
        imageUrl: project.rows[0].imageUrl ?? "",
      },
    });
  }

  const projects = await tables.listRows<any>(DATABASE_ID, PROJECTS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);

  return c.json({
    total: projects.total,
    projects: projects.rows.map((project) => ({
      id: project.$id,
      name: project.name,
      imageUrl: project.imageUrl ?? "",
    })),
  });
});

app.post(
  "/project",
  zValidator("json", z.object({ name: z.string().trim().min(1).max(200) })),
  async (c) => {
    const workspaceId = (c as any).get("workspaceId") as string;
    const { name } = c.req.valid("json");
    const { tables } = await createAdminClient();

    const projectId = await createProjectInWorkspace(tables, workspaceId, name);
    return c.json({ success: true, projectId, name });
  },
);

app.post(
  "/projects",
  zValidator("json", z.object({ name: z.string().trim().min(1).max(200) })),
  async (c) => {
    const workspaceId = (c as any).get("workspaceId") as string;
    const { name } = c.req.valid("json");
    const { tables } = await createAdminClient();

    const projectId = await createProjectInWorkspace(tables, workspaceId, name);
    return c.json({ success: true, projectId, name });
  },
);

app.patch("/task/:id/complete", async (c) => {
  const taskId = c.req.param("id");
  const workspaceId = (c as any).get("workspaceId") as string;
  const { tables } = await createAdminClient();

  const taskResult = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
    Query.equal("$id", taskId),
    Query.equal("workspaceId", workspaceId),
    Query.limit(1),
  ]);
  if (!taskResult.total) {
    return c.json({ error: "task not found in this workspace" }, 404);
  }

  await tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
    status: TaskStatus.DONE,
    completedAt: new Date().toISOString(),
  });

  return c.json({ success: true, taskId });
});

app.patch(
  "/task/:id/status",
  zValidator("json", z.object({ status: openClawStatus })),
  async (c) => {
    const taskId = c.req.param("id");
    const workspaceId = (c as any).get("workspaceId") as string;
    const { status } = c.req.valid("json");
    const { tables } = await createAdminClient();

    const taskResult = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
      Query.equal("$id", taskId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);
    if (!taskResult.total) {
      return c.json({ error: "task not found in this workspace" }, 404);
    }

    await tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
      status: dbStatusByOpenClawStatus[status],
      completedAt: status === "done" ? new Date().toISOString() : null,
    });

    return c.json({ success: true, taskId, status });
  },
);

app.patch(
  "/task",
  zValidator(
    "json",
    z
      .object({
        id: z.string().trim().min(1).optional(),
        taskId: z.string().trim().min(1).optional(),
        task_id: z.string().trim().min(1).optional(),
        title: z.string().trim().min(1).max(500).optional(),
        name: z.string().trim().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        projectId: z.string().optional(),
        assigneeId: z.string().optional(),
        status: openClawStatus.optional(),
      })
      .transform((payload) => ({
        taskId: payload.id ?? payload.taskId ?? payload.task_id,
        title: payload.title ?? payload.name,
        description: payload.description,
        dueDate: payload.dueDate,
        priority: payload.priority,
        projectId: payload.projectId,
        assigneeId: payload.assigneeId,
        status: payload.status,
      }))
      .refine((payload) => Boolean(payload.taskId), {
        message: "taskId is required",
        path: ["taskId"],
      })
      .refine(
        (payload) =>
          Boolean(
            payload.title ||
            payload.description !== undefined ||
            payload.dueDate !== undefined ||
            payload.priority ||
            payload.projectId ||
            payload.assigneeId ||
            payload.status,
          ),
        {
          message: "No update fields provided",
          path: ["taskId"],
        },
      ),
  ),
  async (c) => {
    const workspaceId = (c as any).get("workspaceId") as string;
    const payload = c.req.valid("json");
    const taskId = payload.taskId as string;
    const { tables } = await createAdminClient();

    const taskResult = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
      Query.equal("$id", taskId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);

    if (!taskResult.total) {
      return c.json({ error: "task not found in this workspace" }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (payload.title) {
      updateData.name = payload.title;
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }
    if (payload.dueDate !== undefined) {
      updateData.dueDate =
        normalizeDueDate(payload.dueDate) ?? taskResult.rows[0].dueDate;
    }
    if (payload.priority) {
      updateData.priority = payload.priority;
    }
    if (payload.projectId !== undefined) {
      updateData.projectId = payload.projectId;
    }
    if (payload.assigneeId !== undefined) {
      updateData.assigneeId = payload.assigneeId;
    }
    if (payload.status) {
      updateData.status = dbStatusByOpenClawStatus[payload.status];
      updateData.completedAt =
        payload.status === "done" ? new Date().toISOString() : null;
    }

    const updatedTask = await tables.updateRow(
      DATABASE_ID,
      TASKS_ID,
      taskId,
      updateData,
    );

    return c.json({
      success: true,
      taskId: updatedTask.$id,
      title: updatedTask.name,
      status: openClawStatusByDbStatus[updatedTask.status] ?? "todo",
      dueDate: updatedTask.dueDate,
    });
  },
);

app.post("/resource", async (c) => {
  const workspaceId = (c as any).get("workspaceId") as string;
  const contentType = (c.req.header("content-type") ?? "").toLowerCase();

  const parsedUpload = await parseResourceUpload(c, contentType);
  if (!parsedUpload.success) {
    return c.json({ error: parsedUpload.error }, parsedUpload.status);
  }

  const { fileName, mimeType, taskId, transcription, buffer } = parsedUpload;

  if (buffer.byteLength > 15 * 1024 * 1024) {
    return c.json({ error: "That file is too large for upload." }, 413);
  }

  const { storage, tables } = await createAdminClient();

  let existingResources: string[] = [];
  if (taskId) {
    const taskResult = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
      Query.equal("$id", taskId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);

    if (!taskResult.total) {
      return c.json({ error: "task not found in this workspace" }, 404);
    }

    const task = taskResult.rows[0];
    existingResources = Array.isArray(task.resources) ? task.resources : [];
  }

  const file = await storage.createFile(
    FILES_BUCKET_ID,
    ID.unique(),
    InputFile.fromBuffer(new Uint8Array(buffer), fileName),
  );

  if (taskId) {
    const newResource = JSON.stringify({
      fileId: file.$id,
      fileName,
      mimeType,
      transcription: transcription ?? null,
      uploadedAt: new Date().toISOString(),
    });

    await tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
      resources: [...existingResources, newResource],
    });
  }

  return c.json({
    success: true,
    fileId: file.$id,
    fileName,
    mimeType,
    attachedToTask: taskId ?? null,
  });
});

app.get(
  "/integrations",
  sessionMiddleware,
  zValidator("query", z.object({ workspaceId: z.string().trim().min(1) })),
  async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { workspaceId } = c.req.valid("query");

    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = await tables.listRows<any>(
      DATABASE_ID,
      WORKSPACE_INTEGRATIONS_ID,
      [Query.equal("workspaceId", workspaceId), Query.limit(1)],
    );
    const integration = result.rows[0];

    return c.json({
      data: {
        openclawEnabled: integration?.openclawEnabled ?? false,
        openclawSecret: integration?.openclawSecret ?? "",
        platforms: integration?.platforms ?? [],
        credentials: {
          telegram: integration?.telegramBotToken ?? "",
          discord: integration?.discordWebhookUrl ?? "",
          slack: integration?.slackWebhookUrl ?? "",
        },
      },
    });
  },
);

app.post(
  "/integrations/connect",
  sessionMiddleware,
  zValidator(
    "json",
    z.object({
      workspaceId: z.string().trim().min(1),
      platform: integrationPlatform,
      credential: z.string().trim().min(1),
    }),
  ),
  async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { workspaceId, platform, credential } = c.req.valid("json");

    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const existing = await tables.listRows<any>(
      DATABASE_ID,
      WORKSPACE_INTEGRATIONS_ID,
      [Query.equal("workspaceId", workspaceId), Query.limit(1)],
    );

    const fieldByPlatform = {
      telegram: "telegramBotToken",
      discord: "discordWebhookUrl",
      slack: "slackWebhookUrl",
    } as const;

    const fieldName = fieldByPlatform[platform];
    const existingRow = existing.rows[0];
    const openclawSecret = existingRow?.openclawSecret ?? crypto.randomUUID();
    const existingPlatforms = Array.isArray(existingRow?.platforms)
      ? existingRow.platforms
      : [];
    const platforms = Array.from(new Set([...existingPlatforms, platform]));

    const updateData = {
      [fieldName]: credential,
      openclawSecret,
      openclawEnabled: true,
      platforms,
    };

    if (existingRow) {
      await tables.updateRow(
        DATABASE_ID,
        WORKSPACE_INTEGRATIONS_ID,
        existingRow.$id,
        updateData,
      );
    } else {
      await tables.createRow(
        DATABASE_ID,
        WORKSPACE_INTEGRATIONS_ID,
        ID.unique(),
        {
          workspaceId,
          ...updateData,
        },
      );
    }

    return c.json({
      success: true,
      platform,
      openclawSecret,
    });
  },
);

async function openClawAuth(c: any, next: any) {
  const secret = c.req.header("x-openclaw-secret");
  if (!secret) {
    return c.json(
      {
        error:
          "Your ManageMe connection needs re-authorizing. Please check your settings.",
      },
      401,
    );
  }

  const workspaceId = c.req.query("w") ?? c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json(
      {
        error:
          "That workspace or item was not found. Please check your ManageMe configuration.",
      },
      400,
    );
  }

  const { tables } = await createAdminClient();
  const integrations = await tables.listRows<any>(
    DATABASE_ID,
    WORKSPACE_INTEGRATIONS_ID,
    [Query.equal("workspaceId", workspaceId), Query.limit(1)],
  );

  if (!integrations.total) {
    return c.json(
      {
        error:
          "That workspace or item was not found. Please check your ManageMe configuration.",
      },
      404,
    );
  }

  const integration = integrations.rows[0];
  if (!integration.openclawSecret || integration.openclawSecret !== secret) {
    return c.json(
      {
        error:
          "Your ManageMe connection needs re-authorizing. Please check your settings.",
      },
      401,
    );
  }

  c.set("workspaceId", workspaceId);
  c.set("integration", integration);
  await next();
}

async function resolveProjectId(
  tables: any,
  workspaceId: string,
  projectId?: string,
) {
  if (projectId) {
    const result = await tables.listRows(DATABASE_ID, PROJECTS_ID, [
      Query.equal("$id", projectId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);

    return result.rows[0]?.$id ?? null;
  }

  const fallbackProject = await tables.listRows(DATABASE_ID, PROJECTS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.orderAsc("$createdAt"),
    Query.limit(1),
  ]);

  return fallbackProject.rows[0]?.$id ?? null;
}

async function resolveAssigneeId(
  tables: any,
  workspaceId: string,
  assigneeId?: string,
) {
  if (assigneeId) {
    const result = await tables.listRows(DATABASE_ID, MEMBERS_ID, [
      Query.equal("$id", assigneeId),
      Query.equal("workspaceId", workspaceId),
      Query.limit(1),
    ]);

    return result.rows[0]?.$id ?? null;
  }

  const fallbackAssignee = await tables.listRows(DATABASE_ID, MEMBERS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.orderAsc("$createdAt"),
    Query.limit(1),
  ]);

  return fallbackAssignee.rows[0]?.$id ?? null;
}

async function createProjectInWorkspace(
  tables: any,
  workspaceId: string,
  name: string,
) {
  const safeName = name.trim() || "Inbox";
  const project = await tables.createRow(
    DATABASE_ID,
    PROJECTS_ID,
    ID.unique(),
    {
      workspaceId,
      name: safeName,
      imageUrl: "",
    },
  );

  return project.$id as string;
}

function normalizeDueDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseBase64Payload(base64Data: string): { buffer: Buffer } | null {
  const unescapedBase64 = base64Data
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "");

  const normalizedBase64 = unescapedBase64.includes(",")
    ? (unescapedBase64.split(",").at(-1) ?? "")
    : unescapedBase64;
  const cleanBase64 = normalizedBase64
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const paddingLength = cleanBase64.length % 4;
  const paddedBase64 =
    paddingLength === 0
      ? cleanBase64
      : cleanBase64 + "=".repeat(4 - paddingLength);

  if (!paddedBase64) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(paddedBase64)) {
    return null;
  }

  try {
    const buffer = Buffer.from(paddedBase64, "base64");
    if (!buffer.byteLength) {
      return null;
    }
    return { buffer };
  } catch {
    return null;
  }
}

const resourceJsonSchema = z
  .object({
    fileName: z.string().trim().min(1).optional(),
    filename: z.string().trim().min(1).optional(),
    file_name: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    mimeType: z.string().trim().min(1).optional(),
    mime_type: z.string().trim().min(1).optional(),
    contentType: z.string().trim().min(1).optional(),
    base64Data: z.string().trim().min(1).optional(),
    base64: z.string().trim().min(1).optional(),
    data: z.string().trim().min(1).optional(),
    fileData: z.string().trim().min(1).optional(),
    taskId: z.string().trim().min(1).optional(),
    task_id: z.string().trim().min(1).optional(),
    task: z.string().trim().min(1).optional(),
    transcription: z.string().optional(),
    transcript: z.string().optional(),
    text: z.string().optional(),
  })
  .transform((payload) => ({
    fileName:
      payload.fileName ??
      payload.filename ??
      payload.file_name ??
      payload.name ??
      "",
    mimeType:
      payload.mimeType ?? payload.mime_type ?? payload.contentType ?? "",
    base64Data:
      payload.base64Data ??
      payload.base64 ??
      payload.data ??
      payload.fileData ??
      "",
    taskId: payload.taskId ?? payload.task_id ?? payload.task,
    transcription: payload.transcription ?? payload.transcript ?? payload.text,
  }));

type ParsedResourceUpload =
  | {
      success: true;
      fileName: string;
      mimeType: string;
      taskId?: string;
      transcription?: string;
      buffer: Buffer;
    }
  | {
      success: false;
      error: string;
      status: number;
    };

async function parseResourceUpload(
  c: any,
  contentType: string,
): Promise<ParsedResourceUpload> {
  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData().catch(() => null);
    if (!form) {
      return {
        success: false,
        error: "Invalid multipart payload.",
        status: 400,
      };
    }

    let fileValue =
      form.get("file") ??
      form.get("attachment") ??
      form.get("resource") ??
      form.get("document");

    if (!fileValue) {
      for (const value of form.values()) {
        if (typeof value !== "string") {
          fileValue = value;
          break;
        }
      }
    }

    if (!fileValue || typeof fileValue === "string") {
      return {
        success: false,
        error: "No file found in multipart payload.",
        status: 400,
      };
    }

    const fileName =
      firstNonEmpty(
        form.get("fileName"),
        form.get("filename"),
        (fileValue as any).name,
      ) ?? "attachment";
    const mimeType =
      firstNonEmpty(
        form.get("mimeType"),
        form.get("mime_type"),
        (fileValue as any).type,
      ) ?? inferMimeTypeFromFileName(fileName);

    const taskId = firstNonEmpty(
      form.get("taskId"),
      form.get("task_id"),
      form.get("task"),
    );
    const transcription = firstNonEmpty(
      form.get("transcription"),
      form.get("transcript"),
      form.get("text"),
    );

    const arrayBuffer = await (fileValue as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      fileName,
      mimeType,
      taskId: taskId || undefined,
      transcription: transcription || undefined,
      buffer,
    };
  }

  if (contentType.includes("application/json") || contentType === "") {
    const rawJson = await c.req.json().catch(() => null);
    const parsedJson = resourceJsonSchema.safeParse(rawJson);

    if (!parsedJson.success) {
      return {
        success: false,
        error: "Invalid JSON payload for resource upload.",
        status: 400,
      };
    }

    const fileName = parsedJson.data.fileName.trim();
    if (!fileName) {
      return {
        success: false,
        error: "File name is required.",
        status: 400,
      };
    }

    const parsedBase64 = parseBase64Payload(parsedJson.data.base64Data);
    if (!parsedBase64) {
      return {
        success: false,
        error:
          "Invalid base64 payload. Send a valid base64 string or use multipart upload.",
        status: 400,
      };
    }

    return {
      success: true,
      fileName,
      mimeType:
        parsedJson.data.mimeType.trim() || inferMimeTypeFromFileName(fileName),
      taskId: parsedJson.data.taskId?.trim() || undefined,
      transcription: parsedJson.data.transcription,
      buffer: parsedBase64.buffer,
    };
  }

  if (contentType.includes("application/octet-stream")) {
    const arrayBuffer = await c.req.arrayBuffer().catch(() => null);
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return {
        success: false,
        error:
          "Empty binary body. Provide file bytes with --data-binary @path/to/file.",
        status: 400,
      };
    }

    const fileName =
      firstNonEmpty(
        c.req.header("x-file-name"),
        c.req.query("fileName"),
        c.req.query("filename"),
      ) ?? "attachment.bin";
    const mimeType =
      firstNonEmpty(
        c.req.header("x-mime-type"),
        c.req.query("mimeType"),
        c.req.query("mime_type"),
      ) ?? inferMimeTypeFromFileName(fileName);
    const taskId =
      firstNonEmpty(
        c.req.header("x-task-id"),
        c.req.query("taskId"),
        c.req.query("task_id"),
      ) ?? undefined;
    const transcription =
      firstNonEmpty(
        c.req.header("x-transcription"),
        c.req.query("transcription"),
      ) ?? undefined;

    return {
      success: true,
      fileName,
      mimeType,
      taskId,
      transcription,
      buffer: Buffer.from(arrayBuffer),
    };
  }

  if (contentType.includes("text/plain")) {
    const rawBody = (await c.req.text().catch(() => "")).trim();
    const fileName =
      firstNonEmpty(
        c.req.header("x-file-name"),
        c.req.query("fileName"),
        c.req.query("filename"),
      ) ?? "attachment.bin";
    const mimeType =
      firstNonEmpty(
        c.req.header("x-mime-type"),
        c.req.query("mimeType"),
        c.req.query("mime_type"),
      ) ?? inferMimeTypeFromFileName(fileName);
    const taskId =
      firstNonEmpty(
        c.req.header("x-task-id"),
        c.req.query("taskId"),
        c.req.query("task_id"),
      ) ?? undefined;
    const transcription =
      firstNonEmpty(
        c.req.header("x-transcription"),
        c.req.query("transcription"),
      ) ?? undefined;

    const parsedBase64 = parseBase64Payload(rawBody);
    if (!parsedBase64) {
      return {
        success: false,
        error:
          "Invalid raw text body. Provide base64 content, or use application/octet-stream for raw file bytes.",
        status: 400,
      };
    }

    return {
      success: true,
      fileName,
      mimeType,
      taskId,
      transcription,
      buffer: parsedBase64.buffer,
    };
  }

  return {
    success: false,
    error:
      "Unsupported content type. Use application/json, multipart/form-data, text/plain (base64), or application/octet-stream (raw bytes).",
    status: 415,
  };
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function inferMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeByExtension: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    csv: "text/csv",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
  };

  if (!extension) {
    return "application/octet-stream";
  }

  return mimeByExtension[extension] ?? "application/octet-stream";
}

export default app;
