import { publishPresentation } from "../api/presentations";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function usePublishPresentation() {
  const mutation = useFullPresentationMutation(publishPresentation, { invalidateLists: true });
  return {
    publishPresentation: mutation.mutate,
    publishPresentationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
