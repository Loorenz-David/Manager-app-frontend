import { updateSlideMedia } from "../api/media";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useUpdateSlideMedia() {
  const mutation = useFullPresentationMutation(updateSlideMedia);
  return {
    updateSlideMedia: mutation.mutate,
    updateSlideMediaAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
