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
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    slack: "Slack",
    discord: "Discord",
    openclaw: "OpenClaw",
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  return (
    <div className="mb-2.5 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-x-2">
        <div className="space-y-1.5">
          <p className="line-clamp-2 text-sm font-semibold text-white">
            {task.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.createdVia &&
              task.createdVia !== "web" &&
              sourceLabelMap[task.createdVia] && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
                  {sourceLabelMap[task.createdVia]}
                </span>
              )}

            {task.priority && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  task.priority === "high" &&
                    "border-red-300/25 bg-red-300/10 text-red-100",
                  task.priority === "medium" &&
                    "border-amber-300/25 bg-amber-300/10 text-amber-100",
                  task.priority === "low" &&
                    "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                )}
              >
                {task.priority}
              </span>
            )}
          </div>
        </div>
        <TaskActions id={task.$id} projectId={task.projectId}>
          <MoreHorizontal className="size-[18px] shrink-0 stroke-1 text-neutral-400 transition hover:text-white" />
        </TaskActions>
      </div>
      <DottedSeparator />
      <div className="flex items-center gap-x-1.5">
        <MemberAvatar
          name={task.assignee.name}
          fallbackClassName="text-[10px]"
        />
        <div className="size-1 rounded-full bg-neutral-700" />
        {task.dueDate && (
          <TaskDate
            value={task.dueDate}
            className={cn("text-xs", isOverdue && "font-medium text-red-300")}
          />
        )}
      </div>
      <div className="flex items-center gap-x-1.5">
        <ProjectAvatar
          name={task.project.name}
          image={task.project.imageUrl}
          fallbackClassName="text-[10px]"
        />
        <span className="text-xs font-medium text-neutral-300">
          {task.project.name}
        </span>

        {Array.isArray(task.resources) && task.resources.length > 0 && (
          <>
            <div className="size-1 rounded-full bg-neutral-700" />
            <span className="text-xs text-muted-foreground">
              {task.resources.length} file
              {task.resources.length > 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
