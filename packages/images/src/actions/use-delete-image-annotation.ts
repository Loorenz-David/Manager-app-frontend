import { useMutation, useQueryClient } from '@tanstack/react-query';

import { imageKeys } from '../api/image-keys';
import { deleteImageAnnotation } from '../api/delete-image-annotation';
import type { DeleteImageAnnotationInput, EntityImage, Image } from '../types';

export function useDeleteImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ image_client_id, annotation_client_id }: DeleteImageAnnotationInput) =>
      deleteImageAnnotation(image_client_id, annotation_client_id),
    onMutate: async ({ image_client_id, annotation_client_id }) => {
      await queryClient.cancelQueries({ queryKey: imageKeys.detail(image_client_id) });
      await queryClient.cancelQueries({ queryKey: imageKeys.lists() });

      const previousDetail = queryClient.getQueryData<Image>(imageKeys.detail(image_client_id));
      const previousLists = queryClient.getQueriesData<EntityImage[]>({
        queryKey: imageKeys.lists(),
      });

      const removeAnnotation = (image: Image): Image => {
        const nextAnnotations = (image.image_annotations ?? []).filter(
          (annotation) => annotation.client_id !== annotation_client_id,
        );

        return {
          ...image,
          image_annotations: nextAnnotations,
          image_annotation: nextAnnotations[0] ?? null,
        };
      };

      queryClient.setQueryData<Image>(imageKeys.detail(image_client_id), (current) => {
        if (!current) {
          return current;
        }

        return removeAnnotation(current);
      });

      queryClient.setQueriesData<EntityImage[]>({ queryKey: imageKeys.lists() }, (current) =>
        current?.map((entityImage) =>
          entityImage.image.client_id !== image_client_id
            ? entityImage
            : {
                ...entityImage,
                image: removeAnnotation(entityImage.image),
              },
        ) ?? current,
      );

      return {
        imageClientId: image_client_id,
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
    deleteAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
