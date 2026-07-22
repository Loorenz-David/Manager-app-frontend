import { deleteSlide } from "../api/slides";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useDeleteSlide() {
  const mutation = useFullPresentationMutation(deleteSlide, { invalidateLists: true });
  return {
    deleteSlide: mutation.mutate,
    deleteSlideAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
