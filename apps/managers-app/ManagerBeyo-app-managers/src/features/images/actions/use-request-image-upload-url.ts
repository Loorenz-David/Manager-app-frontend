import { useMutation } from '@tanstack/react-query';

import { requestImageUploadUrl } from '../api/request-image-upload-url';

export function useRequestImageUploadUrl() {
  const mutation = useMutation({
    mutationFn: requestImageUploadUrl,
  });

  return {
    requestUploadUrl: mutation.mutate,
    requestUploadUrlAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
