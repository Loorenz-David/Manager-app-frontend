import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import { imageKeys } from '../api/image-keys';
import { reorderImages } from '../api/reorder-images';
import type { EntityImage } from '../types';

type ReorderImagesContext = {
  listKey: QueryKey;
  previousList: EntityImage[] | undefined;
};

export function useReorderImages() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: reorderImages,
    onMutate: async (input): Promise<ReorderImagesContext> => {
      const listKey = imageKeys.list({
        entity_type: input.entity_type,
        entity_client_id: input.entity_client_id,
      });

      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<EntityImage[]>(listKey);

      queryClient.setQueryData<EntityImage[]>(listKey, (old) => {
        if (!old) {
          return old;
        }

        const orderMap = new Map(
          input.ordered_image_client_ids.map((imageClientId, index) => [imageClientId, index]),
        );

        return [...old].sort((left, right) => {
          const leftOrder = orderMap.get(left.image.client_id) ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = orderMap.get(right.image.client_id) ?? Number.MAX_SAFE_INTEGER;
          return leftOrder - rightOrder;
        });
      });

      return { listKey, previousList };
    },
    onError: (_error, _input, context) => {
      if (!context) {
        return;
      }

      if (context.previousList !== undefined) {
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.list({
          entity_type: input.entity_type,
          entity_client_id: input.entity_client_id,
        }),
      });
    },
  });

  return {
    reorderImages: mutation.mutate,
    reorderImagesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
