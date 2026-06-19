import type { QueryClient, QueryKey } from "@tanstack/react-query";

type BatchInvalidationOptions = {
  queryClient: QueryClient;
  ids: string[];
  toQueryKey: (clientId: string) => QueryKey;
  listKey: QueryKey;
};

export function batchInvalidation({
  queryClient,
  ids,
  toQueryKey,
  listKey,
}: BatchInvalidationOptions): void {
  const cache = queryClient.getQueryCache();

  ids.forEach((clientId) => {
    const queryKey = toQueryKey(clientId);
    const query = cache.find({ queryKey, exact: true });

    if (!query) return;

    if (query.getObserversCount() > 0) {
      queryClient.invalidateQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    }
  });

  queryClient.invalidateQueries({ queryKey: listKey, refetchType: "active" });
}
