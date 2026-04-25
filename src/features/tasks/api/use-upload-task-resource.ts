import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)[":taskId"]["resource"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)[":taskId"]["resource"]["$post"]
>;

export const useUploadTaskResource = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, form }) => {
      const res = await client.api.tasks[":taskId"].resource.$post({
        param,
        form,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      return res.json();
    },
    onSuccess: (_response, variables) => {
      toast.success("Attachment uploaded");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task", variables.param.taskId],
      });
    },
    onError: (error) => {
      toast.error("Failed to upload attachment: " + error.message);
    },
  });
};
