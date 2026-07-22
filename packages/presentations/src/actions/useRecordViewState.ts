import { apiClient } from "@beyo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  ViewStateEnvelopeSchema,
  type RecordedPresentationViewState,
  type RecordViewStateInput,
} from "../types";

const BASE_PATH = "/api/v1/app-update-presentations";

export async function recordPresentationViewState(
  input: RecordViewStateInput,
): Promise<RecordedPresentationViewState | null> {
  if (input.action === "dismissed" && !input.isDismissible) return null;
  const response = await apiClient.post(
    `${BASE_PATH}/${input.presentationClientId}/view-state`,
    ViewStateEnvelopeSchema,
    {
      version: input.version,
      action: input.action,
      ...(input.lastSlideIndex === undefined
        ? {}
        : { last_slide_index: input.lastSlideIndex }),
    },
  );
  return response.data.view_state;
}

export function useRecordViewState() {
  const mutation = useMutation({
    mutationFn: recordPresentationViewState,
    retry: 2,
    retryDelay: 0,
  });

  const record = useCallback(
    async (input: RecordViewStateInput): Promise<RecordedPresentationViewState | null> => {
      try {
        return await mutation.mutateAsync(input);
      } catch {
        // Playback and closing are deliberately independent from telemetry availability.
        return null;
      }
    },
    [mutation.mutateAsync],
  );

  const forAction = useCallback(
    (
      action: RecordViewStateInput["action"],
      input: Omit<RecordViewStateInput, "action">,
    ) => record({ ...input, action }),
    [record],
  );

  return {
    ...mutation,
    record,
    shown: (input: Omit<RecordViewStateInput, "action">) => forAction("shown", input),
    progressed: (input: Omit<RecordViewStateInput, "action">) => forAction("progressed", input),
    dismissed: (input: Omit<RecordViewStateInput, "action">) => forAction("dismissed", input),
    completed: (input: Omit<RecordViewStateInput, "action">) => forAction("completed", input),
  };
}
