import { DATABASE_ID, IMAGES_BUCKET_ID, PROJECTS_ID, TASKS_ID } from "@/config";
import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import z from "zod";
import { createProjectSchema, updateProjectSchema } from "../schema";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");

      const { workspaceId } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "workspaceId is required" }, 400);
      }

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "You are not a member of this workspace" }, 401);
      }

      const projects = await tables.listRows<any>(DATABASE_ID, PROJECTS_ID, [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt"),
      ]);

      return c.json({
        data: projects,
      });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createProjectSchema),
    async (c) => {
      const tables = c.get("tables");
      const storage = c.get("storage");
      const user = c.get("user");

      const { name, image, workspaceId } = c.req.valid("form");

      if (!workspaceId) {
        return c.json({ error: "workspaceId is required" }, 400);
      }

      const member = await getMember({
        tables,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "You are not a member of this workspace" }, 401);
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
      }

      try {
        const project = await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: PROJECTS_ID,
          rowId: ID.unique(),
          data: {
            name,
            imageUrl: uploadedImageUrl,
            workspaceId,
          },
        });

        return c.json({ data: project });
      } catch (err) {
        console.error("createRow failed", err);
        return c.json({ error: "Failed to create project" }, 500);
      }
    }
  )
  .patch(
    "/:projectId",
    sessionMiddleware,
    zValidator("form", updateProjectSchema),
    async (c) => {
      const tables = c.get("tables");
      const storage = c.get("storage");
      const user = c.get("user");
      const { projectId } = c.req.param();

      const { name, image } = c.req.valid("form");

      const existingProject = await tables.getRow<any>(
        DATABASE_ID,
        PROJECTS_ID,
        projectId
      );

      const member = await getMember({
        tables,
        workspaceId: existingProject.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json(
          {
            error: "Unauthorized",
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

      const project = await tables.updateRow(
        DATABASE_ID,
        PROJECTS_ID,
        projectId,
        {
          name,
          imageUrl: uploadedImageUrl,
        }
      );

      return c.json({ data: project });
    }
  )
  .delete("/:projectId", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { projectId } = c.req.param();

    const existingProject = await tables.getRow<any>(
      DATABASE_ID,
      PROJECTS_ID,
      projectId
    );

    const member = await getMember({
      tables,
      workspaceId: existingProject.workspaceId,
      userId: user.$id,
    });
    if (!member) {
      return c.json(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    await tables.deleteRow(DATABASE_ID, PROJECTS_ID, projectId);

    return c.json({
      data: { $id: existingProject.$id },
    });
  })
  .get("/:projectId", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");

    const { projectId } = c.req.param();

    const project = await tables.getRow<any>(
      DATABASE_ID,
      PROJECTS_ID,
      projectId
    );

    const member = await getMember({
      tables,
      workspaceId: project.workspaceId,
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

    return c.json({ data: project });
  })
  .get("/:projectId/analytics", sessionMiddleware, async (c) => {
    const tables = c.get("tables");
    const user = c.get("user");
    const { projectId } = c.req.param();

    const project = await tables.getRow<any>(
      DATABASE_ID,
      PROJECTS_ID,
      projectId
    );

    const member = await getMember({
      tables,
      workspaceId: project.workspaceId,
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
      Query.equal("projectId", projectId),
      Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
    ]);

    const lastMonthTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("projectId", projectId),
      Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
    ]);

    const taskCount = thisMonthTasks.total;
    const taskDifference = taskCount - lastMonthTasks.total;

    const thisMonthAssignedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("projectId", projectId),
        Query.equal("assigneeId", member.$id),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthAssignedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("projectId", projectId),
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
        Query.equal("projectId", projectId),
        Query.notEqual("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthIncompleteTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("projectId", projectId),
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
        Query.equal("projectId", projectId),
        Query.equal("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
      ]
    );

    const lastMonthCompletedTasks = await tables.listRows(
      DATABASE_ID,
      TASKS_ID,
      [
        Query.equal("projectId", projectId),
        Query.equal("status", TaskStatus.DONE),
        Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
        Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
      ]
    );

    const completedTasksCount = thisMonthCompletedTasks.total;
    const completedTaskDifference =
      completedTasksCount - lastMonthCompletedTasks.total;

    const thisMonthOverdueTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("projectId", projectId),
      Query.notEqual("status", TaskStatus.DONE),
      Query.lessThanEqual("dueDate", now.toISOString()),
      Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
      Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
    ]);

    const lastMonthOverdueTasks = await tables.listRows(DATABASE_ID, TASKS_ID, [
      Query.equal("projectId", projectId),
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
