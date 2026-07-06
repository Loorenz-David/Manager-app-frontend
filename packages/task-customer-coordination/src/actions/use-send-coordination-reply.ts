import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerCoordinationEmailKeys } from "../api/customer-coordination-email-keys";
import { postCoordinationReply } from "../api/post-coordination-reply";
import type { SendCoordinationReplyInput } from "../types";

export function useSendCoordinationReply() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: SendCoordinationReplyInput;
    }) => postCoordinationReply(taskId, input),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [...customerCoordinationEmailKeys.all, "inbox-threads"],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...customerCoordinationEmailKeys.all,
          "thread-messages",
          variables.input.thread_client_id,
        ],
      });
    },
  });

  return {
    ...mutation,
    sendCoordinationReply: mutation.mutateAsync,
  };
}
