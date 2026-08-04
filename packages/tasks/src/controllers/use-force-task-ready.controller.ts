import { useCallback, useMemo } from "react";

import { AuthRole, useRole } from "@beyo/auth";
import { notify } from "@beyo/lib";
import { useWorkingSectionPickerFlow } from "@beyo/working-sections";

import { useForceTaskReady } from "../actions/use-force-task-ready";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { useTaskStepsByTaskQuery } from "../api/use-task-steps-by-task-query";
import {
  canForceTaskReady,
  isOpenStepState,
  resolveForceTaskReadyErrorMessage,
} from "../lib/force-task-ready";
import {
  toForceTaskReadyStepViewModel,
  type ForceTaskReadyStepViewModel,
} from "../types";

export type ForceTaskReadySubmitInput = {
  reason: string;
  markInaccurate: boolean;
};

export function useForceTaskReadyController(
  taskId: string,
  onCompleted?: () => void,
) {
  const { hasRole } = useRole();
  const taskQuery = useGetTaskQuery(taskId);
  const stepsQuery = useTaskStepsByTaskQuery(taskId);
  const sections = useWorkingSectionPickerFlow();
  const action = useForceTaskReady();

  const task = taskQuery.data?.task ?? null;

  const sectionsById = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>();
    for (const section of sections.options) {
      map.set(section.client_id, {
        name: section.name,
        image: section.image,
      });
    }
    return map;
  }, [sections.options]);

  // Only the steps this call will actually close. Already-terminal steps are
  // left alone by the backend, so showing them would misrepresent the impact.
  const steps = useMemo<ForceTaskReadyStepViewModel[]>(() => {
    const openSteps = (stepsQuery.data ?? []).filter((step) =>
      isOpenStepState(step.state),
    );

    return openSteps
      .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
      .map((step) =>
        toForceTaskReadyStepViewModel(
          step,
          step.working_section_id
            ? (sectionsById.get(step.working_section_id) ?? null)
            : null,
        ),
      );
  }, [sectionsById, stepsQuery.data]);

  const canForce = hasRole(AuthRole.Admin) || hasRole(AuthRole.Manager);
  const isBlocked = Boolean(task) && !canForceTaskReady(task?.state);

  const submit = useCallback(
    ({ reason, markInaccurate }: ForceTaskReadySubmitInput) => {
      if (!taskId || !canForce) {
        return;
      }

      action.forceTaskReady(
        { task_id: taskId, reason, mark_inaccurate: markInaccurate },
        {
          onSuccess: (result) => {
            const count = result.skipped_step_ids.length;
            notify.success(
              "Task marked ready",
              count === 1 ? "1 step skipped." : `${count} steps skipped.`,
            );
            onCompleted?.();
          },
        },
      );
    },
    [action, canForce, onCompleted, taskId],
  );

  return {
    taskId,
    task,
    steps,
    stepCount: steps.length,
    // Sections back the images only; a slow section fetch must not block the
    // list, which already has a name fallback from the step snapshot.
    isLoading: taskQuery.isPending || stepsQuery.isPending,
    isError: taskQuery.isError || stepsQuery.isError,
    canForce,
    isBlocked,
    blockedMessage: isBlocked
      ? "This task is already ready or closed. It cannot be forced ready again."
      : null,
    submit,
    isSubmitting: action.isPending,
    errorMessage: resolveForceTaskReadyErrorMessage(action.error),
  };
}

export type ForceTaskReadyController = ReturnType<
  typeof useForceTaskReadyController
>;
