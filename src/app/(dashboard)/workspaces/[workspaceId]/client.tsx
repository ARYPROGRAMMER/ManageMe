"use client";

import { Analytics } from "@/components/analytics";
import { DottedSeparator } from "@/components/dotted-separator";
import PageError from "@/components/page-error";
import PageLoader from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { Project } from "@/features/projects/types";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();

  const { data: analytics, isLoading: isLoadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
  });
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId,
  });

  const isLoading =
    isLoadingAnalytics ||
    isLoadingTasks ||
    isLoadingProjects ||
    isLoadingMembers;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!analytics || !tasks || !projects || !members) {
    return <PageError message="Failed to load workspace data" />;
  }

  return (
    <div className="flex w-full flex-col space-y-6">
      <Analytics data={analytics} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <TaskList data={tasks.rows} total={tasks.total} />
        <ProjectList data={projects.rows} total={projects.total} />
        <MembersList data={members.rows} total={members.total} />
      </div>
    </div>
  );
};

interface TaskListProps {
  data: any[];
  total: number;
}

export const TaskList = ({ data, total }: TaskListProps) => {
  const { open: createTask } = useCreateTaskModal();

  const workspaceId = useWorkspaceId();

  return (
    <div className="col-span-1 flex flex-col gap-y-4">
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">Tasks</p>
            <p className="text-xs text-muted-foreground">{total} tracked items</p>
          </div>

          <Button variant={"muted"} size={"icon"} onClick={createTask}>
            <PlusIcon className="size-4" />
          </Button>
        </div>

        <DottedSeparator className="my-4" />

        <ul className="flex flex-col gap-y-3">
          {data.map((task) => (
            <li key={task.$id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${task.$id}`}>
                <Card className="rounded-2xl border-white/10 bg-white/[0.045] shadow-none transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <CardContent className="p-4">
                    <p className="truncate text-base font-semibold text-white">
                      {task.name}
                    </p>

                    <div className="mt-2 flex items-center gap-x-2 text-sm text-neutral-400">
                      <p className="truncate">{task.project?.name}</p>
                      <div className="size-1 rounded-full bg-neutral-600" />

                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarIcon className="size-3 mr-1" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(task.dueDate))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}

          {data.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
              No tasks found
            </li>
          )}
        </ul>

        <Button variant={"muted"} className="mt-4 w-full" asChild>
          <Link href={`/workspaces/${workspaceId}/tasks`}>Show All</Link>
        </Button>
      </div>
    </div>
  );
};

interface ProjectListProps {
  data: any[];
  total: number;
}

export const ProjectList = ({ data, total }: ProjectListProps) => {
  const { open: createProject } = useCreateProjectModal();

  const workspaceId = useWorkspaceId();

  return (
    <div className="col-span-1 flex flex-col gap-y-4">
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">Projects</p>
            <p className="text-xs text-muted-foreground">{total} active spaces</p>
          </div>

          <Button variant={"secondary"} size={"icon"} onClick={createProject}>
            <PlusIcon className="size-4" />
          </Button>
        </div>

        <DottedSeparator className="my-4" />

        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.map((project) => (
            <li key={project.$id}>
              <Link href={`/workspaces/${workspaceId}/projects/${project.$id}`}>
                <Card className="rounded-2xl border-white/10 bg-white/[0.045] shadow-none transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <CardContent className="flex items-center gap-x-3 p-4">
                    <ProjectAvatar
                      name={project.name}
                      image={project.imageUrl}
                      className="size-12"
                      fallbackClassName="text-lg"
                    />
                    <p className="truncate text-base font-semibold text-white">
                      {project.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}

          {data.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground lg:col-span-2">
              No projects found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

interface MembersListProps {
  data: any[];
  total: number;
}

export const MembersList = ({ data, total }: MembersListProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <div className="col-span-1 flex flex-col gap-y-4 xl:col-span-2">
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">Members</p>
            <p className="text-xs text-muted-foreground">{total} collaborators</p>
          </div>

          <Button asChild variant={"secondary"} size={"icon"}>
            <Link href={`/workspaces/${workspaceId}/members`}>
              <SettingsIcon className="size-4" />
            </Link>
          </Button>
        </div>

        <DottedSeparator className="my-4" />

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((member) => (
            <li key={member.$id}>
              <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.045] shadow-none">
                <CardContent className="flex flex-col items-center gap-x-2 p-4">
                  <MemberAvatar name={member.name} className="size-12" />

                  <div className="flex flex-col items-center overflow-hidden">
                    <p className="line-clamp-1 text-base font-semibold text-white">
                      {member.name}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {member.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}

          {data.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground lg:col-span-3">
              No members found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
