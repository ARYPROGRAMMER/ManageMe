import z from "zod";
import { TaskStatus } from "./types";

// Client-side form schema (uses Date)
export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Task name is required"),
  status: z.enum(TaskStatus, { error: "Task status is required" }),
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  projectId: z.string().trim().min(1, "Project ID is required"),
  dueDate: z.date(),
  assigneeId: z.string().trim().min(1, "Assignee ID is required"),
  description: z.string().optional(),
});

// Server-side API schema (uses ISO string)
export const createTaskSchemaServer = z.object({
  name: z.string().trim().min(1, "Task name is required"),
  status: z.enum(TaskStatus, { error: "Task status is required" }),
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  projectId: z.string().trim().min(1, "Project ID is required"),
  dueDate: z.string().datetime(),
  assigneeId: z.string().trim().min(1, "Assignee ID is required"),
  description: z.string().optional(),
});
