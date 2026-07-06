import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskKeys } from "@beyo/tasks";

import { customerCoordinationKeys } from "../api/customer-coordination-keys";
import { customerCoordinationEmailKeys } from "../api/customer-coordination-email-keys";
import {
  postCompleteCoordination,
  type CompleteCoordinationInput,
} from "../api/post-complete-coordination";

export function useCompleteCoordination() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: postCompleteCoordination,
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
    completeCoordination: (input: CompleteCoordinationInput) =>
      mutation.mutateAsync(input),
  };
}
