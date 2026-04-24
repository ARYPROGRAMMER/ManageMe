import { Project } from "@/features/projects/types";
import { TaskStatus } from "../types";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useRouter } from "next/navigation";

interface EventCardProps {
  title: string;
  assignee: any;
  project: Project;
  status: TaskStatus;
  id: string;
}

const statusColorMap: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "border-l-neutral-400",
  [TaskStatus.IN_PROGRESS]: "border-l-amber-200",
  [TaskStatus.DONE]: "border-l-emerald-200",
  [TaskStatus.BACKLOG]: "border-l-neutral-600",
  [TaskStatus.IN_REVIEW]: "border-l-sky-200",
};

export const EventCard = ({
  title,
  assignee,
  project,
  status,
  id,
}: EventCardProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    router.push(`/workspaces/${workspaceId}/tasks/${id}`);
  };

  return (
    <div className="px-1">
      <div
        onClick={onClick}
        className={cn(
          "flex cursor-pointer flex-col gap-y-1.5 rounded-xl border border-white/10 border-l-4 bg-black/50 p-2 text-xs text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.06]",
          statusColorMap[status]
        )}
      >
        <p className="line-clamp-1 font-semibold">{title}</p>
        <div className="flex items-center gap-x-1">
          <MemberAvatar name={assignee?.name} />
          <div className="size-1 rounded-full bg-neutral-700" />

          <ProjectAvatar name={project?.name} image={project?.imageUrl} />
        </div>
      </div>
    </div>
  );
};
