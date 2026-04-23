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
    z.object({
      title: z.string().trim().min(1).max(500).optional(),
      name: z.string().trim().min(1).max(500).optional(),
      description: z.string().max(5000).optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      projectId: z.string().optional(),
      assigneeId: z.string().optional(),
      sourceChannel: z.string().optional(),
    }).refine((data) => Boolean(data.title || data.name), {
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

    let projectId = await resolveProjectId(
      tables,
      workspaceId,
      data.projectId,
    );
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

app.post(
  "/resource",
  zValidator(
    "json",
    z.object({
      fileName: z.string().trim().min(1),
      mimeType: z.string().trim().min(1),
      base64Data: z.string().trim().min(1),
      taskId: z.string().optional(),
      transcription: z.string().optional(),
    }),
  ),
  async (c) => {
    const workspaceId = (c as any).get("workspaceId") as string;
    const { fileName, mimeType, base64Data, taskId, transcription } =
      c.req.valid("json");

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

    const parsedBase64 = parseBase64Payload(base64Data);
    if (!parsedBase64) {
      return c.json({ error: "invalid base64Data payload" }, 400);
    }
    if (parsedBase64.buffer.byteLength > 15 * 1024 * 1024) {
      return c.json({ error: "file too large (max 15MB)" }, 413);
    }

    const file = await storage.createFile(
      FILES_BUCKET_ID,
      ID.unique(),
      InputFile.fromBuffer(new Uint8Array(parsedBase64.buffer), fileName),
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
      attachedToTask: taskId ?? null,
    });
  },
);

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
    return c.json({ error: "missing secret" }, 401);
  }

  const workspaceId = c.req.query("w") ?? c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ error: "missing workspaceId" }, 400);
  }

  const { tables } = await createAdminClient();
  const integrations = await tables.listRows<any>(
    DATABASE_ID,
    WORKSPACE_INTEGRATIONS_ID,
    [Query.equal("workspaceId", workspaceId), Query.limit(1)],
  );

  if (!integrations.total) {
    return c.json({ error: "workspace integration not found" }, 404);
  }

  const integration = integrations.rows[0];
  if (!integration.openclawSecret || integration.openclawSecret !== secret) {
    return c.json({ error: "invalid secret" }, 401);
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
  const project = await tables.createRow(DATABASE_ID, PROJECTS_ID, ID.unique(), {
    workspaceId,
    name: safeName,
    imageUrl: "",
  });

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
  const normalizedBase64 = base64Data.includes(",")
    ? (base64Data.split(",").at(-1) ?? "")
    : base64Data;
  const cleanBase64 = normalizedBase64.replace(/\s/g, "");

  if (!cleanBase64 || cleanBase64.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    return null;
  }

  try {
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer.byteLength) {
      return null;
    }
    return { buffer };
  } catch {
    return null;
  }
}

export default app;
