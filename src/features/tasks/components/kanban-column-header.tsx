import { snakeCaseToTitleCase } from "@/lib/utils";
import { TaskStatus } from "../types";
import {
  CircleCheckIcon,
  CircleIcon,
  PlusIcon,
  CircleDotIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";

interface KanbanColumnHeaderProps {
  board: TaskStatus;
  taskCount: number;
}

const statusIconMap: Record<TaskStatus, React.ReactNode> = {
  [TaskStatus.BACKLOG]: (
    <CircleDashedIcon className="size-[18px] text-neutral-400" />
  ),
  [TaskStatus.TODO]: <CircleIcon className="size-[18px] text-neutral-300" />,
  [TaskStatus.IN_PROGRESS]: (
    <CircleDotDashedIcon className="size-[18px] text-amber-200" />
  ),
  [TaskStatus.IN_REVIEW]: (
    <CircleDotIcon className="size-[18px] text-sky-200" />
  ),
  [TaskStatus.DONE]: <CircleCheckIcon className="size-[18px] text-emerald-200" />,
};

export const KanbanColumnHeader = ({
  board,
  taskCount,
}: KanbanColumnHeaderProps) => {
  const { open } = useCreateTaskModal();
  const icon = statusIconMap[board];

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="flex items-center gap-x-2">
        {icon}
        <h2 className="text-sm font-semibold text-white">
          {snakeCaseToTitleCase(board)}
        </h2>
        <div className="flex size-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-neutral-300">
          {taskCount}
        </div>
      </div>
      <Button onClick={open} variant="ghost" size="icon" className="size-5">
        <PlusIcon className="size-4 text-neutral-400" />
      </Button>
    </div>
  );
};
