import { MoreHorizontal } from "lucide-react";
import { TaskActions } from "./task-actions";
import { DottedSeparator } from "@/components/dotted-separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  task: any;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
  const sourceLabelMap: Record<string, string> = {
    telegram: "🤖 Telegram",
    whatsapp: "📱 WhatsApp",
    slack: "💬 Slack",
    discord: "🎮 Discord",
    openclaw: "🦞 OpenClaw",
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  return (
    <div className="bg-white p-2.5 mb-1.5 rounded shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-x-2">
        <div className="space-y-1.5">
          <p className="text-sm line-clamp-2">{task.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.createdVia &&
              task.createdVia !== "web" &&
              sourceLabelMap[task.createdVia] && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {sourceLabelMap[task.createdVia]}
                </span>
              )}

            {task.priority && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  task.priority === "high" && "bg-red-100 text-red-700",
                  task.priority === "medium" && "bg-yellow-100 text-yellow-700",
                  task.priority === "low" && "bg-green-100 text-green-700",
                )}
              >
                {task.priority}
              </span>
            )}
          </div>
        </div>
        <TaskActions id={task.$id} projectId={task.projectId}>
          <MoreHorizontal className="size-[18px] stroke-1 shrink-0 text-neutral-700 hover:opacity-75 transition" />
        </TaskActions>
      </div>
      <DottedSeparator />
      <div className="flex items-center gap-x-1.5">
        <MemberAvatar
          name={task.assignee.name}
          fallbackClassName="text-[10px]"
        />

        <div className="size-1 rounded-full bg-neutral-300" />
        {task.dueDate && (
          <TaskDate
            value={task.dueDate}
            className={cn("text-xs", isOverdue && "font-medium text-red-500")}
          />
        )}
      </div>
      <div className="flex items-center gap-x-1.5">
        <ProjectAvatar
          name={task.project.name}
          image={task.project.imageUrl}
          fallbackClassName="text-[10px]"
        />

        <span className="text-xs font-medium">{task.project.name}</span>

        {Array.isArray(task.resources) && task.resources.length > 0 && (
          <>
            <div className="size-1 rounded-full bg-neutral-300" />
            <span className="text-xs text-muted-foreground">
              📎 {task.resources.length} file
              {task.resources.length > 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
