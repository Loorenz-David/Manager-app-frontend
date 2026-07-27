import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";

import { completePostHandling } from "../api/complete-post-handling";
import type { PostHandlingCounts } from "../api/get-post-handling-counts";
import { taskKeys } from "../api/task-keys";
import type { ListTasksResult } from "../types";

type PostHandlingPages = InfiniteData<ListTasksResult>;

function isPostHandlingListKey(queryKey: readonly unknown[]): boolean {
  const params = queryKey[2] as { post_handling_states?: string } | undefined;
  return typeof params?.post_handling_states === "string";
}

function removeTask(
  data: PostHandlingPages | undefined,
  taskId: string,
): PostHandlingPages | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.task.client_id !== taskId),
    })),
  };
}

export function useCompletePostHandling() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: completePostHandling,
    // The task leaves the pending/filled lists the moment it is completed, so
    // drop it straight away and let the list animate the removal instead of
    // waiting for the refetch.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousLists = queryClient
        .getQueriesData<PostHandlingPages>({ queryKey: taskKeys.lists() })
        .filter(([queryKey]) => isPostHandlingListKey(queryKey));
      const previousCounts = queryClient.getQueriesData<PostHandlingCounts>({
        queryKey: taskKeys.postHandling(),
      });

      previousLists.forEach(([queryKey]) => {
        queryClient.setQueryData<PostHandlingPages>(queryKey, (old) =>
          removeTask(old, input.taskId),
        );
      });

      previousCounts.forEach(([queryKey, counts]) => {
        if (!counts) return;

        queryClient.setQueryData<PostHandlingCounts>(queryKey, {
          ...counts,
          ...(counts.filled === undefined
            ? {}
            : { filled: Math.max(counts.filled - 1, 0) }),
          ...(counts.completed === undefined
            ? {}
            : { completed: counts.completed + 1 }),
        });
      });

      return { previousLists, previousCounts };
    },
    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousCounts.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, input) => {
      // Let the surface finish closing and the row finish animating out
      // before the refetch storm hits the list underneath.
      runWhenUiSettled(() => {
        void queryClient.invalidateQueries({
          queryKey: taskKeys.detail(input.taskId),
        });
        void queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
        });
        void queryClient.invalidateQueries({
          queryKey: taskKeys.postHandling(),
        });
      });
    },
  });

  return {
    ...mutation,
    completePostHandling: mutation.mutateAsync,
  };
}
