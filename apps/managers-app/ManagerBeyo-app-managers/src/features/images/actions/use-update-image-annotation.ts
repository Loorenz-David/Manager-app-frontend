import { useMutation, useQueryClient } from '@tanstack/react-query';

import { imageKeys } from '../api/image-keys';
import { updateImageAnnotation } from '../api/update-image-annotation';
import type { EntityImage, Image, UpdateImageAnnotationInput } from '../types';

function patchImageAnnotation(image: Image, input: UpdateImageAnnotationInput): Image {
  const nextAnnotations = (image.image_annotations ?? []).map((annotation) =>
    annotation.client_id !== input.annotation_client_id
      ? annotation
      : {
          ...annotation,
          data: input.data,
          accuracy: input.accuracy ?? annotation.accuracy,
        },
  );

  return {
    ...image,
    image_annotations: nextAnnotations,
    image_annotation:
      image.image_annotation?.client_id === input.annotation_client_id
        ? nextAnnotations.find((annotation) => annotation.client_id === input.annotation_client_id) ?? null
        : image.image_annotation,
  };
}

export function useUpdateImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateImageAnnotation,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: imageKeys.detail(input.image_client_id) });
      await queryClient.cancelQueries({ queryKey: imageKeys.lists() });

      const previousDetail = queryClient.getQueryData<Image>(imageKeys.detail(input.image_client_id));
      const previousLists = queryClient.getQueriesData<EntityImage[]>({
        queryKey: imageKeys.lists(),
      });

      queryClient.setQueryData<Image>(imageKeys.detail(input.image_client_id), (current) =>
        current ? patchImageAnnotation(current, input) : current,
      );

      queryClient.setQueriesData<EntityImage[]>({ queryKey: imageKeys.lists() }, (current) =>
        current?.map((entityImage) =>
          entityImage.image.client_id !== input.image_client_id
            ? entityImage
            : {
                ...entityImage,
                image: patchImageAnnotation(entityImage.image, input),
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
    updateAnnotation: mutation.mutate,
    updateAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
