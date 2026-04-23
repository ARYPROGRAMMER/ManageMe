import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.workspaces)[":workspaceId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.workspaces)[":workspaceId"]["$patch"]
>;

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, param }) => {
      const res = await client.api.workspaces[":workspaceId"]["$patch"]({
        form,
        param,
      });

      if (!res.ok) {
        throw new Error("Workspace update failed");
      }

      return await res.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Workspace updated");

      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
    },
    onError: (error) => {
      toast.error("Failed to update workspace: " + error.message);
    },
  });

  return mutation;
};
