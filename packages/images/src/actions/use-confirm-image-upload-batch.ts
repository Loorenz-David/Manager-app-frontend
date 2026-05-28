import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@beyo/lib';
import { confirmImageUploadBatch } from '../api/confirm-image-upload-batch';
import { imageKeys } from '../api/image-keys';

export function useConfirmImageUploadBatch() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: confirmImageUploadBatch,
    onSuccess: (images) => {
      images.forEach((image) => {
        queryClient.setQueryData(imageKeys.detail(image.client_id), image);
      });
    },
    onError: () => {
      notify.error(
        'Batch confirm failed',
        'All uploads in this batch were rolled back. Please retry.',
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });

  return {
    confirmBatch: mutation.mutate,
    confirmBatchAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
