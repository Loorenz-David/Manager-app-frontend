import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import { deleteImage } from '../api/delete-image';
import { imageKeys } from '../api/image-keys';
import type { EntityImage } from '../types';

type DeleteImageContext = {
  previousLists: Array<[QueryKey, EntityImage[] | undefined]>;
};

export function useDeleteImage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteImage,
    onMutate: async (imageClientId): Promise<DeleteImageContext> => {
      await queryClient.cancelQueries({ queryKey: imageKeys.lists() });

      const previousLists = queryClient.getQueriesData<EntityImage[]>({
        queryKey: imageKeys.lists(),
      });

      queryClient.setQueriesData<EntityImage[]>({ queryKey: imageKeys.lists() }, (old) => {
        return old?.filter((entityImage) => entityImage.image.client_id !== imageClientId) ?? [];
      });

      return { previousLists };
    },
    onError: (_error, _imageClientId, context) => {
      if (!context) {
        return;
      }

      context.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (_deletedImageClientId, imageClientId) => {
      queryClient.removeQueries({ queryKey: imageKeys.detail(imageClientId) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });

  return {
    deleteImage: mutation.mutate,
    deleteImageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
