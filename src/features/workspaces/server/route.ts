import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";
import {
  DATABASE_ID,
  IMAGES_BUCKET_ID,
  MEMBERS_ID,
  TASKS_ID,
  WORKSPACES_ID,
} from "@/config";
import { ID, Query } from "node-appwrite";
import { MemberRole } from "@/features/members/type";
import { generateInviteCode } from "@/lib/utils";
import { getMember } from "@/features/members/utils";
import z from "zod";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const tables = c.get("tables");

    const members = await tables.listRows(DATABASE_ID, MEMBERS_ID, [
      Query.equal("userId", user.$id),
    ]);

    if (members.total === 0) {
      return c.json({ data: { rows: [], total: 0 } });
    }
    const workspaceIds = members.rows.map((member) => member.workspaceId);

    const workspaces = await tables.listRows(DATABASE_ID, WORKSPACES_ID, [
      Query.orderDesc("$createdAt"),
      Query.contains("$id", workspaceIds),
    ]);

    return c.json({ data: workspaces });
  })

  .post(
    "/",
    zValidator("form", createWorkspaceSchema),
    sessionMiddleware,
    async (c) => {
      const tables = c.get("tables");
      const storage = c.get("storage");
      const user = c.get("user");

      const { name, image } = c.req.valid("form");

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGES_BUCKET_ID,
          ID.unique(),
          image
        );

        const arrayBuffer = await storage.getFilePreview(
          IMAGES_BUCKET_ID,
          file.$id
        );

        uploadedImageUrl = `data:image/png;base64,${Buffer.from(
          arrayBuffer
        ).toString("base64")}`;
      }

      try {
        const workspace = await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: WORKSPACES_ID,
          rowId: ID.unique(),
          data: {
            name,
            userId: user.$id,
            imageUrl: uploadedImageUrl,
            inviteCode: generateInviteCode(6),
          },
        });

        await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: MEMBERS_ID,
          rowId: ID.unique(),
          data: {
            userId: user.$id,
            workspaceId: workspace.$id,
            role: MemberRole.ADMIN,
          },
        });

        return c.json({ data: workspace });
      } catch (err) {
        console.error("createRow failed", err);
        return c.json({ error: "Failed to create workspace" }, 500);
      }
    }
  )
  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const tables = c.get("tables");
      const storage = c.get("storage");
      const user = c.get("user");
      const { workspaceId } = c.req.param();

      const { name, image } = c.req.valid("form");

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json(
          {
            error: "You do not have permission to update this workspace",
          },
          401
        );
      }

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGES_BUCKET_ID,
          ID.unique(),
          image
        );

        const arrayBuffer = await storage.getFilePreview(
          IMAGES_BUCKET_ID,
          file.$id
        );

        uploadedImageUrl = `data:image/png;base64,${Buffer.from(
          arrayBuffer
        ).toString("base64")}`;
      } else {
        uploadedImageUrl = image;
      }

      const workspace = await tables.updateRow(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          name,
          imageUrl: uploadedImageUrl,
        }
      );

      return c.json({ data: workspace });
    }
  )
  .delete("/:workspaceId", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });
    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json(
        {
          error: "You do not have permission to delete this workspace",
        },
        401
      );
    }

    await tables.deleteRow(DATABASE_ID, WORKSPACES_ID, workspaceId);

    return c.json({
      data: { $id: workspaceId },
    });
  })

  .post("/:workspaceId/reset-invite-code", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });
    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json(
        {
          error: "You do not have permission to delete this workspace",
        },
        401
      );
    }

    const workspace = await tables.updateRow(
      DATABASE_ID,
      WORKSPACES_ID,
      workspaceId,
      {
        inviteCode: generateInviteCode(6),
      }
    );

    return c.json({
      data: workspace,
    });
  })
  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");
      const tables = c.get("tables");
      const user = c.get("user");

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (member) {
        return c.json(
          { error: "You are already a member of this workspace" },
          400
        );
      }

      const workspace = (await tables.getRow(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      )) as any;

      if (workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: WORKSPACES_ID,
        rowId: ID.unique(),
        data: {
          workspaceId,
          userId: user.$id,
          role: MemberRole.MEMBER,
        },
      });

      return c.json({ data: workspace });
    }
  )
  .get("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const tables = c.get("tables");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json({ error: "You do not have access to this workspace" }, 401);
    }

    const workspace = await tables.getRow<any>(
      DATABASE_ID,
      WORKSPACES_ID,
      workspaceId
    );

    return c.json({ data: workspace });
  })

  .get("/:workspaceId/info", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const { workspaceId } = c.req.param();

    const workspace = await tables.getRow<any>(
      DATABASE_ID,
      WORKSPACES_ID,
      workspaceId
    );

    return c.json({
      data: {
        $id: workspace.$id,
        name: workspace.name,
        imageUrl: workspace.imageUrl,
      },
    });
  })

  .get("/:workspaceId/analytics", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      tables,
      workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json(
        {
          error: "You are not a member of this workspace",
        },
        401
      );
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("workspaceId", workspaceId),
      Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
    ]);

    const lastMonthTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("workspaceId", workspaceId),
      Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
    ]);

    const taskCount = thisMonthTasks.total;
    const taskDifference = taskCount - lastMonthTasks.total;

    const thisMonthAssignedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("assigneeId", member.$id),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthAssignedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("assigneeId", member.$id),
        Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
      ]
    );

    const assignedTaskCount = thisMonthAssignedTasks.total;
    const assignedTaskDifference =
      assignedTaskCount - lastMonthAssignedTasks.total;

    const thisMonthIncompleteTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.notEqual("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthIncompleteTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.notEqual("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
      ]
    );

    const incompleteTaskCount = thisMonthIncompleteTasks.total;
    const incompleteTaskDifference =
      incompleteTaskCount - lastMonthIncompleteTasks.total;

    const thisMonthCompletedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthCompletedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
      ]
    );

    const completedTasksCount = thisMonthCompletedTasks.total;
    const completedTaskDifference =
      completedTasksCount - lastMonthCompletedTasks.total;

    const thisMonthOverdueTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("workspaceId", workspaceId),
      Query.notEqual("status", TaskStatus.DONE),
      Query.lessThanEqual("dueDate", now.toISOString()),
      Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
    ]);

    const lastMonthOverdueTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("workspaceId", workspaceId),
      Query.notEqual("status", TaskStatus.DONE),
      Query.lessThanEqual("dueDate", now.toISOString()),
      Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
    ]);

    const overdueTasksCount = thisMonthOverdueTasks.total;
    const overdueTaskDifference =
      overdueTasksCount - lastMonthOverdueTasks.total;

    return c.json({
      data: {
        taskCount,
        taskDifference,
        assignedTaskCount,
        assignedTaskDifference,
        completedTasksCount,
        completedTaskDifference,
        incompleteTaskCount,
        incompleteTaskDifference,
        overdueTasksCount,
        overdueTaskDifference,
      },
    });
  });

export default app;
