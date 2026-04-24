"use client";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { RiAddCircleFill } from "react-icons/ri";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { WorkspaceAvatar } from "@/features/workspaces/components/workspace-avatar";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateWorkspaceModal } from "@/features/workspaces/hooks/use-create-workspace-modal";
import { Button } from "./ui/button";

export const WorkspaceSwitcher = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const onSelect = (id: string) => {
    router.push(`/workspaces/${id}`);
  };
  const { data: workspaces } = useGetWorkspaces();
  const { open } = useCreateWorkspaceModal();

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-neutral-500">
          Workspaces
        </p>
        <Button type="button" variant="ghost" size="icon" onClick={open} className="size-7">
          <RiAddCircleFill className="size-5" />
        </Button>
      </div>

      <Select onValueChange={onSelect} value={workspaceId}>
        <SelectTrigger className="h-14 w-full rounded-2xl bg-white/[0.06] font-medium">
          <SelectValue placeholder="No workspace selected" />
        </SelectTrigger>
        <SelectContent>
          {workspaces?.rows.map((workspace) => (
            <SelectItem key={workspace.$id} value={workspace.$id}>
              <div className="flex items-center justify-start gap-3 font-medium">
                <WorkspaceAvatar
                  image={workspace.imageUrl}
                  name={workspace.name}
                />

                <span className="truncate">{workspace.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
