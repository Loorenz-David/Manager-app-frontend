import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerCoordinationEmailKeys } from "./customer-coordination-email-keys";
import { postThreadRead } from "./post-thread-read";
import type { CoordinationInboxThreadsResult } from "../types";

type MarkReadContext = {
  snapshots: Array<[readonly unknown[], CoordinationInboxThreadsResult | undefined]>;
};

export function useMarkThreadRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, { threadId: string }, MarkReadContext>({
    mutationFn: ({ threadId }) => postThreadRead(threadId),
    onMutate: async ({ threadId }) => {
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: customerCoordinationEmailKeys.all })
        .filter((query) => query.queryKey[1] === "inbox-threads");

      const snapshots: MarkReadContext["snapshots"] = queries.map((query) => [
        query.queryKey,
        queryClient.getQueryData<CoordinationInboxThreadsResult>(query.queryKey),
      ]);

      for (const [queryKey, snapshot] of snapshots) {
        if (!snapshot) continue;

        queryClient.setQueryData<CoordinationInboxThreadsResult>(queryKey, {
          ...snapshot,
          items: snapshot.items.map((thread) =>
            thread.threadId === threadId ? { ...thread, isUnread: false } : thread,
          ),
        });
      }

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: customerCoordinationEmailKeys.unreadCount(),
      });
    },
  });

  return {
    ...mutation,
    markThreadRead: mutation.mutateAsync,
  };
}
