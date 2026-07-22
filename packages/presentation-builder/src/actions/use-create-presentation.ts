import { createPresentation } from "../api/presentations";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useCreatePresentation() {
  const mutation = useFullPresentationMutation(createPresentation, { invalidateLists: true });
  return {
    createPresentation: mutation.mutate,
    createPresentationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
