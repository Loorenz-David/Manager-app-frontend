import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskKeys } from "@beyo/tasks";

import { customerCoordinationKeys } from "../api/customer-coordination-keys";
import { postEmailBatch } from "../api/post-email-batch";

export function useSendEmailBatch() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: postEmailBatch,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: customerCoordinationKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
      });
    },
  });

  return {
    ...mutation,
    sendEmailBatch: mutation.mutateAsync,
  };
}
