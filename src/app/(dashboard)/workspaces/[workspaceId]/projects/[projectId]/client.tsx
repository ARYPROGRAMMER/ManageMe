"use client";

import { Analytics } from "@/components/analytics";
import PageError from "@/components/page-error";
import PageLoader from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { useGetProjectAnalytics } from "@/features/projects/api/use-get-project-analytics";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { TasksViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { PencilIcon } from "lucide-react";
import Link from "next/link";

export const ProjectIdClient = () => {
  const projectId = useProjectId();
  const { data: project, isLoading: isLoadingProject } = useGetProject({
    projectId,
  });
  const { data: analytics, isLoading: isLoadingAnalytics } =
    useGetProjectAnalytics({ projectId });

  const isLoading = isLoadingProject || isLoadingAnalytics;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!project) {
    return <PageError message="Project not found" />;
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-x-3">
          <ProjectAvatar
            name={project.name}
            image={project.imageUrl}
            className="size-12"
          />
          <div>
            <p className="text-xl font-bold text-white">{project.name}</p>
            <p className="text-sm text-muted-foreground">
              Project execution overview
            </p>
          </div>
        </div>

        <div className="flex">
          <Button variant={"secondary"} size={"sm"} asChild>
            <Link
              href={`/workspaces/${project.workspaceId}/projects/${project.$id}/settings`}
            >
              <PencilIcon className="size-4 mr-2" />
              Edit Project
            </Link>
          </Button>
        </div>
      </div>

      {analytics ? <Analytics data={analytics} /> : null}

      <TasksViewSwitcher hideProjectFilter />
    </div>
  );
};
