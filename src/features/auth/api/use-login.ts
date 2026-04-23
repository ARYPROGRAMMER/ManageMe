import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


type ResponseType = InferResponseType<(typeof client.api.auth.login)["$post"]>;
type RequestType = InferRequestType<(typeof client.api.auth.login)["$post"]>;

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const res = await client.api.auth.login["$post"]({ json });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast.success("Logged in successfully");
      router.refresh();
      // window.location.reload();
      queryClient.invalidateQueries({ queryKey: ["current"] });
    },
    onError: (error) => {
      toast.error("Failed to login: " + error.message);
    }
  });

  return mutation;
};
