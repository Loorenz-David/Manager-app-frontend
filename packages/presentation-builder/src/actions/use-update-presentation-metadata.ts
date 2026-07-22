import { updatePresentationMetadata } from "../api/presentations";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useUpdatePresentationMetadata() {
  const mutation = useFullPresentationMutation(updatePresentationMetadata, { invalidateLists: true });
  return {
    updatePresentationMetadata: mutation.mutate,
    updatePresentationMetadataAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
