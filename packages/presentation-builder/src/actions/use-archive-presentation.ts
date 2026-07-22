import { archivePresentation } from "../api/presentations";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useArchivePresentation() {
  const mutation = useFullPresentationMutation(archivePresentation, { invalidateLists: true });
  return {
    archivePresentation: mutation.mutate,
    archivePresentationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
