import { updateSlide } from "../api/slides";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useUpdateSlide() {
  const mutation = useFullPresentationMutation(updateSlide);
  return {
    updateSlide: mutation.mutate,
    updateSlideAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
