import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserLastActiveStep } from "./fetch-user-last-active-step";
import { taskStepKeys } from "./task-step-keys";
import { seedTaskStepDetails } from "../lib/task-step-detail-cache";
import type { UserLastActivePayload } from "../types";

export function useUserLastActiveStepQuery() {
  const queryClient = useQueryClient();

  return useQuery<UserLastActivePayload>({
    queryKey: taskStepKeys.userLastActive(),
    queryFn: async ({ signal }) => {
      const payload = await fetchUserLastActiveStep();
      // A response cancelled by a transition predates the tap — see
      // fetchPageAndSeed in use-working-section-steps.
      if (!signal.aborted) {
        seedTaskStepDetails(queryClient, [
          ...(payload.step ? [payload.step] : []),
          ...(payload.batchSteps ?? []),
        ]);
      }
      return payload;
    },
  });
}
