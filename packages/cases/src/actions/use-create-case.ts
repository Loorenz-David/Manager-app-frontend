import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiRequestError } from "@beyo/api-client";
import { notify } from "@beyo/lib";

import { caseKeys } from "../api/case-keys";
import { createCase } from "../api/create-case";
import type { CreateCaseResponseData } from "../api/create-case";
import type { CreateCaseInput } from "../types";

export function useCreateCase() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CreateCaseResponseData,
    ApiRequestError,
    CreateCaseInput
  >({
    mutationFn: createCase,
    onSuccess: () => {
      notify.success("Case created");
    },
    onError: () => {
      notify.error(
        "Case not created",
        "Something went wrong. Your input is preserved — try again.",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });

  return {
    createCase: mutation.mutate,
    createCaseAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type CreateCaseAction = ReturnType<typeof useCreateCase>;
