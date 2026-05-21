import { useMutation, useQueryClient } from '@tanstack/react-query';

import { imageKeys } from '../api/image-keys';
import { confirmImageUpload } from '../api/confirm-image-upload';

export function useConfirmImageUpload() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: confirmImageUpload,
    onSuccess: (image) => {
      queryClient.setQueryData(imageKeys.detail(image.client_id), image);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });

  return {
    confirmUpload: mutation.mutate,
    confirmUploadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
