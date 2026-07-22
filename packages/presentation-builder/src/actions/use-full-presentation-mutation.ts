import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Presentation } from "../types";
import { presentationKeys } from "../api/presentation-keys";

type Options = { invalidateLists?: boolean };

function getSourcePresentationId(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (typeof input !== "object" || input === null) return null;
  if ("presentationId" in input && typeof input.presentationId === "string") {
    return input.presentationId;
  }
  if ("id" in input && typeof input.id === "string") return input.id;
  return null;
}

export function useFullPresentationMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Presentation>,
  options: Options = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (presentation, input) => {
      queryClient.setQueryData(presentationKeys.detail(presentation.client_id), presentation);
      const sourcePresentationId = getSourcePresentationId(input);
      if (sourcePresentationId !== null) {
        void queryClient.invalidateQueries({ queryKey: presentationKeys.preview(sourcePresentationId) });
      }
    },
    onSettled: () => {
      if (options.invalidateLists) {
        void queryClient.invalidateQueries({ queryKey: presentationKeys.lists() });
      }
    },
  });
}
