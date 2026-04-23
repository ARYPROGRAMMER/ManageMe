import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.members)[":memberId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.members)[":memberId"]["$patch"]
>;

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const res = await client.api.members[":memberId"]["$patch"]({
        param,
        json,
      });

      if (!res.ok) {
        throw new Error("Member update failed");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast.success("Member updated");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error) => {
      toast.error("Failed to update member: " + error.message);
    },
  });

  return mutation;
};
