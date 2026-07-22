import { replaceComposition } from "../api/composition";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useReplaceComposition() {
  const mutation = useFullPresentationMutation(replaceComposition);
  return {
    replaceComposition: mutation.mutate,
    replaceCompositionAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
