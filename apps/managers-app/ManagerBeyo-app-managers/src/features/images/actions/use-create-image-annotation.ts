import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createImageAnnotation } from '../api/create-image-annotation';
import { imageKeys } from '../api/image-keys';
import type { EntityImage, Image } from '../types';

export function useCreateImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createImageAnnotation,
    onMutate: async (input) => {
      const optimisticAnnotation = {
        client_id: `optimistic-${Date.now()}`,
        annotation_type: input.annotation_type,
        data: input.data,
        accuracy: null,
        created_at: new Date().toISOString(),
      };

      await queryClient.cancelQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });

      const previousDetail = queryClient.getQueryData<Image>(
        imageKeys.detail(input.image_client_id),
      );
      const previousLists = queryClient.getQueriesData<EntityImage[]>({
        queryKey: imageKeys.lists(),
      });

      queryClient.setQueryData<Image>(
        imageKeys.detail(input.image_client_id),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            image_annotation: optimisticAnnotation,
            image_annotations: [...(current.image_annotations ?? []), optimisticAnnotation],
          };
        },
      );

      queryClient.setQueriesData<EntityImage[]>(
        { queryKey: imageKeys.lists() },
        (current) =>
          current?.map((entityImage) =>
            entityImage.image.client_id !== input.image_client_id
              ? entityImage
              : {
                  ...entityImage,
                  image: {
                    ...entityImage.image,
                    image_annotation: optimisticAnnotation,
                    image_annotations: [
                      ...(entityImage.image.image_annotations ?? []),
                      optimisticAnnotation,
                    ],
                  },
                },
          ) ?? current,
      );

      return {
        imageClientId: input.image_client_id,
        previousDetail,
        previousLists,
      };
    },
    onError: (_error, _input, context) => {
      if (!context) {
        return;
      }

      if (context.previousDetail !== undefined) {
        queryClient.setQueryData(imageKeys.detail(context.imageClientId), context.previousDetail);
      }

      context.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });
      void queryClient.invalidateQueries({
        queryKey: imageKeys.lists(),
      });
    },
  });

  return {
    createAnnotation: mutation.mutate,
    createAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
