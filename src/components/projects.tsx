"use client";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { RiAddCircleFill } from "react-icons/ri";
import { Button } from "./ui/button";

const Projects = () => {
  const workspaceId = useWorkspaceId();
  const { data } = useGetProjects({ workspaceId });
  const pathname = usePathname();
  const { open } = useCreateProjectModal();

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-neutral-500">
          Projects
        </p>
        <Button type="button" variant="ghost" size="icon" onClick={open} className="size-7">
          <RiAddCircleFill className="size-5" />
        </Button>
      </div>

      {data?.rows.map((project) => {
        const href = `/workspaces/${workspaceId}/projects/${project.$id}`;
        const isActive = pathname === href;
        return (
          <Link href={href} key={project.$id}>
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-neutral-500 transition-all hover:bg-white/[0.06] hover:text-white",

                isActive &&
                  "border border-white/10 bg-white text-black shadow-[0_14px_38px_rgba(255,255,255,0.1)] hover:bg-white hover:text-black"
              )}
            >
              <ProjectAvatar image={project.imageUrl} name={project.name} />
              <span className="truncate">{project.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default Projects;
