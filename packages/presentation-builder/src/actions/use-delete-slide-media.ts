import { deleteSlideMedia } from "../api/media";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useDeleteSlideMedia() {
  const mutation = useFullPresentationMutation(deleteSlideMedia);
  return {
    deleteSlideMedia: mutation.mutate,
    deleteSlideMediaAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
