import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";

import { updatePostHandling } from "../api/update-post-handling";
import { taskKeys } from "../api/task-keys";
import type { ListTasksResult, TaskDetailRaw } from "../types";

type PostHandlingPages = InfiniteData<ListTasksResult>;

type UpdatePostHandlingContext = {
  snapshot: TaskDetailRaw | undefined;
  pendingLists: [readonly unknown[], PostHandlingPages | undefined][];
  taskId: string;
};

/** True for the list that holds only the tasks still missing their values. */
function isPendingOnlyListKey(queryKey: readonly unknown[]): boolean {
  const params = queryKey[2] as { post_handling_states?: string } | undefined;
  return params?.post_handling_states === "pending";
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

export function useUpdatePostHandling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePostHandling,
    onMutate: async ({
      taskId,
      ...fields
    }): Promise<UpdatePostHandlingContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
        (old) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            task: {
              ...old.task,
              ...fields,
            },
          };
        },
      );

      // Filling the values moves the task out of the pending list, so drop it
      // there right away and let the list animate the removal.
      const pendingLists = queryClient
        .getQueriesData<PostHandlingPages>({ queryKey: taskKeys.lists() })
        .filter(([queryKey]) => isPendingOnlyListKey(queryKey));

      pendingLists.forEach(([queryKey]) => {
        queryClient.setQueryData<PostHandlingPages>(queryKey, (old) =>
          removeTask(old, taskId),
        );
      });

      return { snapshot, pendingLists, taskId };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(
          taskKeys.detail(context.taskId as never),
          context.snapshot,
        );
      }

      context?.pendingLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, input) => {
      // Let the surface finish closing and the row finish animating out
      // before the refetch storm hits the list underneath.
      runWhenUiSettled(() => {
        void queryClient.invalidateQueries({
          queryKey: taskKeys.detail(input.taskId as never),
        });
        void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskKeys.postHandling() });
      });
    },
  });
}
