import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchemaServer } from "../schemas";
import { getMember } from "@/features/members/utils";
import {
  DATABASE_ID,
  FILES_BUCKET_ID,
  MEMBERS_ID,
  PROJECTS_ID,
  TASKS_ID,
} from "@/config";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import z from "zod";
import { TaskStatus } from "../types";
import { createAdminClient } from "@/lib/appwrite";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createTaskSchemaServer),
    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");
      const { name, status, assigneeId, dueDate, projectId, workspaceId } =
        c.req.valid("json");

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json(
          {
            error: "Unauthorized",
          },
          401,
        );
      }

      const highestPositionTask = await tables.listRows(DATABASE_ID, TASKS_ID, [
        Query.equal("status", status),
        Query.equal("workspaceId", workspaceId),
        Query.orderAsc("position"),
        Query.limit(1),
      ]);

      const newPosition =
        highestPositionTask.rows.length > 0
          ? highestPositionTask.rows[0].position + 1000
          : 1000;

      const task = await tables.createRow(DATABASE_ID, TASKS_ID, ID.unique(), {
        name,
        status,
        workspaceId,
        projectId,
        dueDate,
        assigneeId,
        position: newPosition,
      });

      return c.json({ data: task });
    },
  )

  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.enum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      }),
    ),
    async (c) => {
      const { users } = await createAdminClient();

      const tables = c.get("tables");
      const user = c.get("user");
      const { workspaceId, projectId, assigneeId, status, search, dueDate } =
        c.req.valid("query");

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json(
          {
            error: "Unauthorized",
          },
          401,
        );
      }

      const query = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt"),
      ];

      if (projectId) {
        query.push(Query.equal("projectId", projectId));
      }

      if (status) {
        query.push(Query.equal("status", status));
      }
      if (assigneeId) {
        query.push(Query.equal("assigneeId", assigneeId));
      }
      if (search) {
        query.push(Query.search("name", search));
      }
      if (dueDate) {
        query.push(Query.greaterThanEqual("dueDate", dueDate));
        query.push(Query.lessThan("dueDate", `${dueDate}T23:59:59.999Z`));
      }

      const tasks = await tables.listRows<any>(DATABASE_ID, TASKS_ID, query);

      const projectIds = tasks.rows.map((task) => task.projectId);
      const assigneeIds = tasks.rows.map((task) => task.assigneeId);

      const projects = await tables.listRows<any>(
        DATABASE_ID,
        PROJECTS_ID,
        projectIds.length > 0 ? [Query.contains("$id", projectIds)] : [],
      );

      const members = await tables.listRows(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : [],
      );

      const assignees = await Promise.all(
        members.rows.map(async (member) => {
          const assigneeUser = await users.get(member.userId);

          return {
            ...member,
            name: assigneeUser.name || assigneeUser.email,
            email: assigneeUser.email,
          };
        }),
      );

      const populatedTasks = tasks.rows.map((task) => {
        const project = projects.rows.find((p) => p.$id === task.projectId);
        const assignee = assignees.find((a) => a.$id === task.assigneeId);
        return {
          ...task,
          project,
          assignee,
        };
      });

      return c.json({
        data: {
          ...tasks,
          rows: populatedTasks,
        },
      });
    },
  )

  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("json", createTaskSchemaServer.partial()),
    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");
      const { name, status, assigneeId, dueDate, projectId, description } =
        c.req.valid("json");

      const { taskId } = c.req.param();

      const existingTask = await tables.getRow<any>(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      const member = await getMember({
        tables,
        workspaceId: existingTask.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json(
          {
            error: "Unauthorized",
          },
          401,
        );
      }

      const task = await tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
        name,
        status,
        projectId,
        dueDate,
        assigneeId,
        description,
      });

      return c.json({ data: task });
    },
  )

  .delete("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const tables = c.get("tables");
    const { taskId } = c.req.param();

    const task = await tables.getRow<any>(DATABASE_ID, TASKS_ID, taskId);

    const member = await getMember({
      tables,
      workspaceId: task.workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    await tables.deleteRow(DATABASE_ID, TASKS_ID, taskId);

    return c.json({ data: { $id: task.$id } });
  })

  .get("/:taskId", sessionMiddleware, async (c) => {
    const currentUser = c.get("user");
    const tables = c.get("tables");
    const { taskId } = c.req.param();
    const { users } = await createAdminClient();

    const task = await tables.getRow<any>(DATABASE_ID, TASKS_ID, taskId);

    const currentMember = await getMember({
      tables,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const project = await tables.getRow<any>(
      DATABASE_ID,
      PROJECTS_ID,
      task.projectId,
    );

    const member = await tables.getRow<any>(
      DATABASE_ID,
      MEMBERS_ID,
      task.assigneeId,
    );

    const assigneeUser = await users.get(member.userId);

    const assignee = {
      ...member,
      name: assigneeUser.name || assigneeUser.email,
      email: assigneeUser.email,
    };

    return c.json({
      data: {
        ...task,
        project,
        assignee,
      },
    });
  })

  .post("/:taskId/resource", sessionMiddleware, async (c) => {
    const currentUser = c.get("user");
    const tables = c.get("tables");
    const { storage } = await createAdminClient();
    const { taskId } = c.req.param();

    const task = await tables.getRow<any>(DATABASE_ID, TASKS_ID, taskId);

    const currentMember = await getMember({
      tables,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const form = await c.req.formData().catch(() => null);
    if (!form) {
      return c.json({ error: "Invalid upload payload" }, 400);
    }

    const fileValue = form.get("file");
    if (!fileValue || typeof fileValue === "string") {
      return c.json({ error: "No file provided" }, 400);
    }

    const file = fileValue as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!buffer.byteLength) {
      return c.json({ error: "Uploaded file is empty" }, 400);
    }

    if (buffer.byteLength > 15 * 1024 * 1024) {
      return c.json({ error: "That file is too large for upload." }, 413);
    }

    const transcription = getStringFormValue(form, "transcription");
    const fileName = file.name || "attachment";
    const mimeType = file.type || inferMimeTypeFromFileName(fileName);

    const uploaded = await storage.createFile(
      FILES_BUCKET_ID,
      ID.unique(),
      InputFile.fromBuffer(new Uint8Array(buffer), fileName),
    );

    const existingResources = parseTaskResources(task.resources || []);
    const newResource = {
      fileId: uploaded.$id,
      fileName,
      mimeType,
      transcription: transcription ?? null,
      uploadedAt: new Date().toISOString(),
    };

    const allResources = [...existingResources, newResource];

    await tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
      resources: allResources.map((resource) => JSON.stringify(resource)),
    });

    return c.json({ data: newResource });
  })

  .get("/:taskId/resource/:fileId", sessionMiddleware, async (c) => {
    const currentUser = c.get("user");
    const tables = c.get("tables");
    const { storage } = await createAdminClient();
    const { taskId, fileId } = c.req.param();

    const task = await tables.getRow<any>(DATABASE_ID, TASKS_ID, taskId);

    const currentMember = await getMember({
      tables,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const resources = parseTaskResources(task.resources);
    const resource = resources.find((entry) => entry.fileId === fileId);

    if (!resource) {
      return c.json(
        {
          error: "Resource not found for this task",
        },
        404,
      );
    }

    const [fileMeta, fileView] = await Promise.all([
      storage.getFile(FILES_BUCKET_ID, fileId),
      storage.getFileView(FILES_BUCKET_ID, fileId),
    ]);

    return new Response(fileView as BodyInit, {
      headers: {
        "Content-Type": fileMeta.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          fileMeta.name || resource.fileName || "attachment",
        )}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  })

  .delete("/:taskId/resource/:fileId", sessionMiddleware, async (c) => {
    const currentUser = c.get("user");
    const tables = c.get("tables");
    const { storage } = await createAdminClient();
    const { taskId, fileId } = c.req.param();

    const task = await tables.getRow<any>(DATABASE_ID, TASKS_ID, taskId);

    const currentMember = await getMember({
      tables,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const resources = parseTaskResources(task.resources);
    const filteredResources = resources.filter(
      (entry) => entry.fileId !== fileId,
    );

    if (filteredResources.length === resources.length) {
      return c.json({ error: "Resource not found for this task" }, 404);
    }

    await Promise.all([
      tables.updateRow(DATABASE_ID, TASKS_ID, taskId, {
        resources: filteredResources.map((entry) => JSON.stringify(entry)),
      }),
      storage.deleteFile(FILES_BUCKET_ID, fileId).catch(() => null),
    ]);

    return c.json({ data: { fileId } });
  })

  .post(
    "/bulk-update",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            $id: z.string(),
            status: z.enum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          }),
        ),
      }),
    ),

    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");
      const { tasks } = c.req.valid("json");

      const tasksToUpdate = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
        Query.contains(
          "$id",
          tasks.map((t) => t.$id),
        ),
      ]);

      const workspaceIds = new Set(
        tasksToUpdate.rows.map((task) => task.workspaceId),
      );

      if (workspaceIds.size !== 1) {
        return c.json(
          {
            error: "Tasks belong to multiple workspaces",
          },
          400,
        );
      }

      const workspaceId = workspaceIds.values().next().value;

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json(
          {
            error: "Unauthorized",
          },
          401,
        );
      }

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { $id, status, position } = task;
          return tables.updateRow(DATABASE_ID, TASKS_ID, $id, {
            status,
            position,
          });
        }),
      );

      return c.json({ data: updatedTasks });
    },
  );

export default app;

interface TaskResource {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  transcription?: string | null;
  uploadedAt?: string;
}

function parseTaskResources(resources: unknown): TaskResource[] {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources
    .map((entry) => {
      if (typeof entry === "string") {
        try {
          return JSON.parse(entry) as TaskResource;
        } catch {
          return null;
        }
      }

      if (entry && typeof entry === "object") {
        return entry as TaskResource;
      }

      return null;
    })
    .filter((entry): entry is TaskResource => Boolean(entry));
}

function getStringFormValue(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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
