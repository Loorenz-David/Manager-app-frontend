import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createImageAnnotation } from '../api/create-image-annotation';
import { imageKeys } from '../api/image-keys';

export function useCreateImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createImageAnnotation,
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
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
