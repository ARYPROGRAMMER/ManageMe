import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";
import { TaskStatus } from "../types";

interface UseGetTasksProps {
  workspaceId: string;
  projectId?: string | null;
  status?: TaskStatus | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  search?: string | null;
}

export const useGetTasks = ({
  workspaceId,
  projectId,
  status,
  assigneeId,
  search,
  dueDate,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: [
      "tasks",
      workspaceId,
      projectId,
      status,
      assigneeId,
      search,
      dueDate,
    ],
    queryFn: async () => {
      const res = await client.api.tasks.$get({
        query: {
          workspaceId,
          projectId: projectId ?? undefined,
          status: status ?? undefined,
          assigneeId: assigneeId ?? undefined,
          search: search ?? undefined,
          dueDate: dueDate ?? undefined,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const { data } = await res.json();
      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return query;
};
