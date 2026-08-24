import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@beyo/api-client";
import { useAuth } from "@beyo/auth";
import { notify } from "@beyo/lib";
import {
  usePauseReasonsQuery,
  type PauseReason,
} from "@beyo/pause-reasons";
import {
  WORKER_SHIFT_SELF_SCOPE,
  useDeclareState,
  workerShiftKeys,
} from "@beyo/worker-shifts";
import { taskStepKeys } from "@/features/task_steps/api/task-step-keys";

export type WorkerStateSheetView = "picker" | "description";

export function useWorkerStateSheetController(onClose: () => void) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Scoped to this worker (plus reasons with no user link, which are global)
  // — the backend now decides eligibility, no client-side pause_type filter.
  // The task-step pause sheet scopes by working section instead; the
  // param-keyed cache holds the two lists separately.
  const reasonsQuery = usePauseReasonsQuery(
    { user_ids: user?.id ? [user.id] : [] },
    { enabled: Boolean(user?.id) },
  );
  const { declareState, isPending: isDeclaring } = useDeclareState();

  const [view, setView] = useState<WorkerStateSheetView>("picker");
  const [selectedReason, setSelectedReason] = useState<PauseReason | null>(null);
  const [description, setDescription] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  const submit = useCallback(
    (reason: PauseReason, descriptionText?: string) => {
      setInlineError(null);

      declareState(
        {
          // Worker token: omit user_id entirely (handoff §12.1).
          pause_reason_id: reason.client_id,
          ...(descriptionText ? { description: descriptionText } : {}),
        },
        {
          onSuccess: (result) => {
            if (result.paused_steps > 0) {
              notify.success(
                `${result.paused_steps} task${result.paused_steps === 1 ? "" : "s"} paused`,
                "Your running work was paused under this reason.",
              );
            }

            void queryClient.invalidateQueries({
              queryKey: workerShiftKeys.current({
                user_id: WORKER_SHIFT_SELF_SCOPE,
              }),
            });
            void queryClient.invalidateQueries({
              queryKey: taskStepKeys.sectionLists(),
            });
            void queryClient.invalidateQueries({
              queryKey: taskStepKeys.userLastActive(),
            });

            onClose();
          },
          onError: (error) => {
            // A 409 means the screen was stale, not that anything failed —
            // re-read the shift and re-render instead of erroring (handoff §12.7).
            if (error instanceof ApiRequestError && error.status === 409) {
              void queryClient.invalidateQueries({
                queryKey: workerShiftKeys.current({
                  user_id: WORKER_SHIFT_SELF_SCOPE,
                }),
              });
              onClose();
              return;
            }

            // Defensive: the picker is already scoped to this worker, so a 422
            // or 404 here means the reason changed under us — refresh the list.
            void reasonsQuery.refetch();
            setInlineError(
              error instanceof ApiRequestError
                ? error.message
                : "Your state could not be changed. Please try again.",
            );
          },
        },
      );
    },
    [declareState, onClose, queryClient, reasonsQuery],
  );

  const handleSelectReason = useCallback(
    (reason: PauseReason) => {
      if (isDeclaring) {
        return;
      }

      setSelectedReason(reason);

      if (reason.requires_description) {
        setDescription("");
        setInlineError(null);
        setView("description");
        return;
      }

      submit(reason);
    },
    [isDeclaring, submit],
  );

  const handleConfirmDescription = useCallback(() => {
    const trimmed = description.trim();
    if (isDeclaring || !selectedReason || trimmed.length === 0) {
      return;
    }
    submit(selectedReason, trimmed);
  }, [description, isDeclaring, selectedReason, submit]);

  const handleBackToPicker = useCallback(() => {
    setView("picker");
    setInlineError(null);
  }, []);

  return {
    reasons: reasonsQuery.data?.pause_reasons ?? [],
    isReasonsPending: reasonsQuery.isPending,
    isReasonsError: reasonsQuery.isError,
    isDeclaring,
    inlineError,
    view,
    selectedReason,
    description,
    setDescription,
    handleSelectReason,
    handleConfirmDescription,
    handleBackToPicker,
  };
}

export type WorkerStateSheetController = ReturnType<
  typeof useWorkerStateSheetController
>;
