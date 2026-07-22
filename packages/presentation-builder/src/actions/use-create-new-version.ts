import { createNewVersion } from "../api/presentations";
import { useFullPresentationMutation } from "./use-full-presentation-mutation";

export function useCreateNewVersion() {
  const mutation = useFullPresentationMutation(createNewVersion, { invalidateLists: true });
  return {
    createNewVersion: mutation.mutate,
    createNewVersionAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
