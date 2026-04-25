import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)[":taskId"]["resource"][":fileId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)[":taskId"]["resource"][":fileId"]["$delete"]
>;

export const useDeleteTaskResource = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const res = await client.api.tasks[":taskId"].resource[":fileId"].$delete(
        {
          param,
        },
      );

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      return res.json();
    },
    onSuccess: (_response, variables) => {
      toast.success("Attachment removed");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task", variables.param.taskId],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove attachment: " + error.message);
    },
  });
};
