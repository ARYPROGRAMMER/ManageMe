import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchemaServer } from "../schemas";
import { getMember } from "@/features/members/utils";
import { DATABASE_ID, MEMBERS_ID, PROJECTS_ID, TASKS_ID } from "@/config";
import { ID, Query } from "node-appwrite";
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
          401
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
    }
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
      })
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
          401
        );
      }

      const query = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt"),
      ];

      if (projectId) {
        console.log("projectId: ", projectId);
        query.push(Query.equal("projectId", projectId));
      }

      if (status) {
        console.log("status: ", status);
        query.push(Query.equal("status", status));
      }
      if (assigneeId) {
        console.log("assigneeId: ", assigneeId);
        query.push(Query.equal("assigneeId", assigneeId));
      }
      if (search) {
        console.log("search: ", search);
        query.push(Query.search("name", search));
      }
      if (dueDate) {
        console.log("dueDate: ", dueDate);
        query.push(Query.greaterThanEqual("dueDate", dueDate));
        query.push(Query.lessThan("dueDate", `${dueDate}T23:59:59.999Z`));
      }

      const tasks = await tables.listRows<any>(DATABASE_ID, TASKS_ID, query);

      const projectIds = tasks.rows.map((task) => task.projectId);
      const assigneeIds = tasks.rows.map((task) => task.assigneeId);

      const projects = await tables.listRows<any>(
        DATABASE_ID,
        PROJECTS_ID,
        projectIds.length > 0 ? [Query.contains("$id", projectIds)] : []
      );

      const members = await tables.listRows(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : []
      );

      const assignees = await Promise.all(
        members.rows.map(async (member) => {
          const user = await users.get(member.userId);

          return {
            ...member,
            name: user.name || user.email,
            email: user.email,
          };
        })
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
    }
  )

  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("json", createTaskSchemaServer.partial()),
    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");
      const {
        name,
        status,
        assigneeId,
        dueDate,
        projectId,

        description,
      } = c.req.valid("json");

      const { taskId } = c.req.param();

      const existingTask = await tables.getRow<any>(
        DATABASE_ID,
        TASKS_ID,
        taskId
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
          401
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
    }
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
        401
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
        401
      );
    }

    const project = await tables.getRow<any>(
      DATABASE_ID,
      PROJECTS_ID,
      task.projectId
    );

    const member = await tables.getRow<any>(
      DATABASE_ID,
      MEMBERS_ID,
      task.assigneeId
    );

    const user = await users.get(member.userId);

    const assignee = {
      ...member,
      name: user.name || user.email,
      email: user.email,
    };

    return c.json({
      data: {
        ...task,
        project,
        assignee,
      },
    });
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
          })
        ),
      })
    ),

    async (c) => {
      const user = c.get("user");
      const tables = c.get("tables");
      const { tasks } = c.req.valid("json");

      const tasksToUpdate = await tables.listRows<any>(DATABASE_ID, TASKS_ID, [
        Query.contains(
          "$id",
          tasks.map((t) => t.$id)
        ),
      ]);

      const workspaceIds = new Set(
        tasksToUpdate.rows.map((task) => task.workspaceId)
      );

      if (workspaceIds.size !== 1) {
        return c.json(
          {
            error: "Tasks belong to multiple workspaces",
          },
          400
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
          401
        );
      }

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { $id, status, position } = task;
          return tables.updateRow(DATABASE_ID, TASKS_ID, $id, {
            status,
            position,
          });
        })
      );

      return c.json({ data: updatedTasks });
    }
  );

export default app;
