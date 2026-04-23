import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetWorkspaceProps {
  workspaceId: string;
}

export const useGetWorkspace = ({ workspaceId }: UseGetWorkspaceProps) => {
  const query = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const res = await client.api.workspaces[":workspaceId"].$get({
        param: { workspaceId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch workspace");
      }

      const { data } = await res.json();
      return data;
    },
  });

  return query;
};
