import { reorderSlideMedia } from "../api/media";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useReorderSlideMedia() {
  const mutation = useFullPresentationMutation(reorderSlideMedia);
  return {
    reorderSlideMedia: mutation.mutate,
    reorderSlideMediaAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
