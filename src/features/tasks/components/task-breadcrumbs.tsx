import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { Project } from "@/features/projects/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { ChevronRightIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDeleteTask } from "../api/use-delete-task";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";

interface TaskBreadCrumbsProps {
  project: Project;
  task: any;
}

export const TaskBreadCrumbs = ({ project, task }: TaskBreadCrumbsProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { mutate, isPending } = useDeleteTask();
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Task",
    "Are you sure you want to delete this task? This action cannot be undone.",
    "destructive"
  );

  const handleDeleteTask = async () => {
    const ok = await confirm();
    if (!ok) return;

    mutate(
      { param: { taskId: task.$id } },
      {
        onSuccess: () => {
          router.push(`/workspaces/${workspaceId}/tasks`);
        },
      }
    );
  };

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center">
      <ConfirmDialog />
      <div className="flex min-w-0 items-center gap-x-2">
        <ProjectAvatar
          name={project.name}
          image={project.imageUrl}
          className="size-8 lg:size-10"
        />

        <Link href={`/workspaces/${workspaceId}/projects/${project.$id}`}>
          <p className="truncate text-sm font-semibold text-muted-foreground transition hover:text-white lg:text-base">
            {project.name}
          </p>
        </Link>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground lg:size-5" />
        <p className="truncate text-sm font-bold text-white lg:text-lg">
          {task.name}
        </p>
      </div>
      <Button
        className="sm:ml-auto"
        variant={"destructive"}
        size={"sm"}
        onClick={handleDeleteTask}
        disabled={isPending}
      >
        <TrashIcon className="size-4 lg:mr-2" />
        <span className="hidden lg:block">Delete Task</span>
      </Button>
    </div>
  );
};
