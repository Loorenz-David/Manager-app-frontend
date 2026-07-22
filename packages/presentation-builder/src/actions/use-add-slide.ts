import { addSlide } from "../api/slides";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useAddSlide() {
  const mutation = useFullPresentationMutation(addSlide, { invalidateLists: true });
  return {
    addSlide: mutation.mutate,
    addSlideAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
