import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskKeys } from "@beyo/tasks";

import { customerCoordinationKeys } from "../api/customer-coordination-keys";
import { customerCoordinationEmailKeys } from "../api/customer-coordination-email-keys";
import {
  postFailCoordination,
  type FailCoordinationInput,
} from "../api/post-fail-coordination";

export function useFailCoordination() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: postFailCoordination,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: customerCoordinationEmailKeys.all,
      });
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
    failCoordination: (input: FailCoordinationInput) => mutation.mutateAsync(input),
  };
}
