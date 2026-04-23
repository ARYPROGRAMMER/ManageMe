import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetTaskProps {
  taskId: string;
}

export const useGetTask = ({ taskId }: UseGetTaskProps) => {
  const query = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await client.api.tasks[":taskId"].$get({ param: { taskId } });

      if (!res.ok) {
        throw new Error("Failed to fetch task");
      }

      const { data } = await res.json();
      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return query;
};
