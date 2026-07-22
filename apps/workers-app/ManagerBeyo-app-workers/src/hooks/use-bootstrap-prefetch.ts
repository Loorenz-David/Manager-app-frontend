import { useQueryClient } from "@tanstack/react-query";
import { selectUser, useAuthStore } from "@beyo/auth";
import { prefetchPauseReasonsData } from "@beyo/pause-reasons";
import { usePrefetchOnCondition } from "@beyo/ui";

export function useBootstrapPrefetch(): void {
  const queryClient = useQueryClient();
  const userId = useAuthStore(selectUser)?.id ?? null;

  usePrefetchOnCondition(userId != null, () =>
    prefetchPauseReasonsData(queryClient),
  );
}
