import { replaceAudience } from "../api/audience";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useReplaceAudience() {
  const mutation = useFullPresentationMutation(replaceAudience, { invalidateLists: true });
  return {
    replaceAudience: mutation.mutate,
    replaceAudienceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
