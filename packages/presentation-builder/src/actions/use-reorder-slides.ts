import { reorderSlides } from "../api/slides";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useReorderSlides() {
  const mutation = useFullPresentationMutation(reorderSlides);
  return {
    reorderSlides: mutation.mutate,
    reorderSlidesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
