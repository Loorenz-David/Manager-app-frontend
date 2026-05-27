import { useCallback, useMemo, useState } from 'react';

import { useAddTaskStep } from '@/features/tasks/actions/use-add-task-step';
import { useRemoveTaskStep } from '@/features/tasks/actions/use-remove-task-step';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { humanizeSnakeCase } from '@/features/tasks/lib/task-detail';
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type RecoveredPendingAdd,
  type RecoveredPendingReassignment,
  type TaskWorkingSectionsDiscardChangesSurfaceProps,
  type TaskWorkingSectionsSurfaceProps,
} from '@/features/tasks/surfaces';
import type { TaskDetailRaw } from '@/features/tasks/types';
import { useWorkingSectionPickerFlow } from '@/features/working-sections/flows/use-working-section-picker.flow';
import type {
  WorkingSectionMember,
  WorkingSectionOption,
} from '@/features/working-sections/types';
import { useSurface } from '@/hooks/use-surface';
import { generateClientId } from '@/lib/client-id';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type TaskStep = TaskDetailRaw['task_steps'][number];
type StatePillVariant = 'neutral' | 'active' | 'warning' | 'success' | 'danger';
type ControllerInit = {
  initialPendingAdds?: RecoveredPendingAdd[];
  initialPendingRemoveIds?: string[];
  initialPendingReassignments?: RecoveredPendingReassignment[];
};

const TASK_STEP_STATE_VARIANT: Record<string, StatePillVariant> = {
  pending: 'neutral',
  working: 'active',
  paused: 'warning',
  ended_shift: 'warning',
  blocked: 'danger',
  completed: 'success',
  skipped: 'neutral',
  failed: 'danger',
  cancelled: 'neutral',
};

export type TaskWorkingSectionEntry = {
  section: WorkingSectionOption;
  currentStep: TaskStep | null;
  activeStep: TaskStep | null;
  assignedMember: WorkingSectionMember | null;
  stateLabel: string | null;
  stateVariant: StatePillVariant;
  isActive: boolean;
  isCompleted: boolean;
};

function isCompletedStep(step: TaskStep): boolean {
  return step.closed_at !== null || step.state === 'completed';
}

function getLatestStepForSection(taskSteps: TaskStep[], sectionId: string): TaskStep | null {
  const activeStep = [...taskSteps]
    .reverse()
    .find(
      (step) =>
        step.working_section_id === sectionId &&
        step.state !== 'skipped' &&
        !isCompletedStep(step),
    );

  if (activeStep) {
    return activeStep;
  }

  return (
    [...taskSteps]
      .reverse()
      .find((step) => step.working_section_id === sectionId && step.state !== 'skipped') ?? null
  );
}

function buildPendingStep(pendingAdd: RecoveredPendingAdd): TaskStep {
  return {
    client_id: pendingAdd._pendingId,
    task_id: '',
    state: 'pending',
    readiness_status: 'ready',
    sequence_order: null,
    working_section_id: pendingAdd.working_section_id,
    assigned_worker_id: pendingAdd.worker_id,
    total_dependencies: 0,
    completed_dependencies: 0,
    working_section_name_snapshot: pendingAdd.working_section_name_snapshot,
    assigned_worker_display_name_snapshot:
      pendingAdd.assigned_worker_display_name_snapshot,
    created_at: new Date(0).toISOString(),
    closed_at: null,
    latest_state_records: null,
  };
}

function applyPendingState(
  taskSteps: TaskStep[],
  pendingAdds: RecoveredPendingAdd[],
  pendingRemoveIds: string[],
  pendingReassignments: RecoveredPendingReassignment[],
): TaskStep[] {
  const removeIdSet = new Set(pendingRemoveIds);
  const reassignmentMap = new Map(
    pendingReassignments.map((reassignment) => [reassignment.step_id, reassignment]),
  );

  const persistedSteps = taskSteps
    .filter((step) => !removeIdSet.has(step.client_id))
    .map((step) => {
      const reassignment = reassignmentMap.get(step.client_id);

      if (!reassignment) {
        return step;
      }

      return {
        ...step,
        assigned_worker_id: reassignment.worker_id,
        assigned_worker_display_name_snapshot: reassignment.display_name,
      };
    });

  return [...persistedSteps, ...pendingAdds.map(buildPendingStep)];
}

function clonePendingAdds(pendingAdds: RecoveredPendingAdd[]): RecoveredPendingAdd[] {
  return pendingAdds.map((pendingAdd) => ({ ...pendingAdd }));
}

function clonePendingReassignments(
  pendingReassignments: RecoveredPendingReassignment[],
): RecoveredPendingReassignment[] {
  return pendingReassignments.map((pendingReassignment) => ({
    ...pendingReassignment,
  }));
}

export function useTaskWorkingSectionsController(
  taskId: string,
  init: ControllerInit = {},
) {
  const surface = useSurface();
  const taskQuery = useGetTaskQuery(taskId);
  const workingSectionFlow = useWorkingSectionPickerFlow();
  const addTaskStep = useAddTaskStep(taskId);
  const removeTaskStep = useRemoveTaskStep(taskId);
  const [pendingAdds, setPendingAdds] = useState<RecoveredPendingAdd[]>(
    () => clonePendingAdds(init.initialPendingAdds ?? []),
  );
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>(
    () => [...(init.initialPendingRemoveIds ?? [])],
  );
  const [pendingReassignments, setPendingReassignments] = useState<
    RecoveredPendingReassignment[]
  >(() => clonePendingReassignments(init.initialPendingReassignments ?? []));
  const [isSaving, setIsSaving] = useState(false);

  const majorCategory = taskQuery.data?.item?.item_major_category_snapshot;
  const baseTaskSteps = taskQuery.data?.task_steps ?? [];

  const effectiveTaskSteps = useMemo(
    () =>
      applyPendingState(
        baseTaskSteps,
        pendingAdds,
        pendingRemoveIds,
        pendingReassignments,
      ),
    [baseTaskSteps, pendingAdds, pendingRemoveIds, pendingReassignments],
  );

  const hasUnsavedChanges =
    pendingAdds.length > 0 ||
    pendingRemoveIds.length > 0 ||
    pendingReassignments.length > 0;

  const closeSlide = useCallback(() => {
    useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID);
  }, []);

  const closeDiscardSheet = useCallback(() => {
    useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID);
  }, []);

  const buildRecoverySnapshot = useCallback(
    (): TaskWorkingSectionsSurfaceProps => ({
      taskId,
      recoveredPendingAdds: clonePendingAdds(pendingAdds),
      recoveredPendingRemoveIds: [...pendingRemoveIds],
      recoveredPendingReassignments: clonePendingReassignments(pendingReassignments),
    }),
    [pendingAdds, pendingRemoveIds, pendingReassignments, taskId],
  );

  const stageStepStart = useCallback(
    (section: WorkingSectionOption, member?: WorkingSectionMember) => {
      setPendingAdds((current) => [
        ...current,
        {
          _pendingId: generateClientId('TaskStep'),
          working_section_id: section.client_id,
          worker_id: member?.client_id ?? null,
          working_section_name_snapshot: section.name,
          assigned_worker_display_name_snapshot: member?.username ?? null,
        },
      ]);
    },
    [],
  );

  const sectionEntries = useMemo<TaskWorkingSectionEntry[]>(() => {
    const filteredSections =
      majorCategory === undefined || majorCategory === null
        ? workingSectionFlow.options
        : workingSectionFlow.options.filter((section) =>
            section.item_categories.some(
              (itemCategory) => itemCategory.major_category === majorCategory,
            ),
          );

    return filteredSections.map((section) => {
      const currentStep = getLatestStepForSection(
        effectiveTaskSteps,
        section.client_id,
      );
      const isCompleted = currentStep ? isCompletedStep(currentStep) : false;
      const isActive = currentStep !== null && !isCompleted;
      const assignedMember =
        currentStep?.assigned_worker_id
          ? (section.members.find(
              (member) => member.client_id === currentStep.assigned_worker_id,
            ) ?? null)
          : null;

      return {
        section,
        currentStep,
        activeStep: isActive ? currentStep : null,
        assignedMember,
        stateLabel: currentStep
          ? (humanizeSnakeCase(currentStep.state) ?? currentStep.state)
          : null,
        stateVariant: currentStep
          ? (TASK_STEP_STATE_VARIANT[currentStep.state] ?? 'neutral')
          : 'neutral',
        isActive,
        isCompleted,
      };
    });
  }, [effectiveTaskSteps, majorCategory, workingSectionFlow.options]);

  const handleRemoveStep = useCallback((stepId: string) => {
    const isPendingAdd = pendingAdds.some((candidate) => candidate._pendingId === stepId);

    if (isPendingAdd) {
      setPendingAdds((current) =>
        current.filter((candidate) => candidate._pendingId !== stepId),
      );
      return;
    }

    setPendingRemoveIds((current) =>
      current.includes(stepId) ? current : [...current, stepId],
    );
    setPendingReassignments((current) =>
      current.filter((candidate) => candidate.step_id !== stepId),
    );
  }, [pendingAdds]);

  const handleSectionPress = useCallback(
    (sectionId: string) => {
      const entry = sectionEntries.find(
        (candidate) => candidate.section.client_id === sectionId,
      );

      if (!entry) {
        return;
      }

      if (entry.activeStep) {
        handleRemoveStep(entry.activeStep.client_id);
        return;
      }

      stageStepStart(entry.section);
    },
    [handleRemoveStep, sectionEntries, stageStepStart],
  );

  const handleShortcutPress = useCallback(
    (sectionIds: string[]) => {
      const targetSectionIds = new Set(sectionIds);

      for (const entry of sectionEntries) {
        const shouldBeActive = targetSectionIds.has(entry.section.client_id);

        if (entry.activeStep && !shouldBeActive) {
          handleRemoveStep(entry.activeStep.client_id);
          continue;
        }

        if (!entry.isActive && shouldBeActive) {
          stageStepStart(entry.section);
        }
      }
    },
    [handleRemoveStep, sectionEntries, stageStepStart],
  );

  const handleSaveAndClose = useCallback(async () => {
    if (isSaving) {
      return;
    }

    if (!hasUnsavedChanges) {
      closeDiscardSheet();
      closeSlide();
      return;
    }

    setIsSaving(true);
    const recoverySnapshot = buildRecoverySnapshot();

    closeDiscardSheet();
    closeSlide();

    try {
      for (const stepId of recoverySnapshot.recoveredPendingRemoveIds ?? []) {
        await removeTaskStep.mutateAsync({ step_id: stepId });
      }

      for (const pendingAdd of recoverySnapshot.recoveredPendingAdds ?? []) {
        await addTaskStep.mutateAsync({
          working_section_id: pendingAdd.working_section_id,
          worker_id: pendingAdd.worker_id ?? undefined,
          working_section_name_snapshot:
            pendingAdd.working_section_name_snapshot,
          assigned_worker_display_name_snapshot:
            pendingAdd.assigned_worker_display_name_snapshot,
        });
      }

      // Worker reassignment is intentionally disabled.
    } catch {
      useSurfaceStore.getState().open(
        TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
        recoverySnapshot,
      );
    }
  }, [
    addTaskStep,
    buildRecoverySnapshot,
    closeDiscardSheet,
    closeSlide,
    hasUnsavedChanges,
    isSaving,
    removeTaskStep,
  ]);

  const handleCloseWithGuard = useCallback(() => {
    if (!hasUnsavedChanges) {
      closeSlide();
      return;
    }

    surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, {
      onDiscardAndClose: () => {
        closeDiscardSheet();
        closeSlide();
      },
      onSaveAndClose: () => void handleSaveAndClose(),
    } satisfies TaskWorkingSectionsDiscardChangesSurfaceProps);
  }, [
    closeDiscardSheet,
    closeSlide,
    handleSaveAndClose,
    hasUnsavedChanges,
    surface,
  ]);

  return {
    taskId,
    taskDetail: taskQuery.data ?? null,
    sectionEntries,
    hasUnsavedChanges,
    isPending: taskQuery.isPending,
    isError: taskQuery.isError,
    isSectionsLoading: workingSectionFlow.isLoading,
    isSaving,
    refetch: taskQuery.refetch,
    handleSectionPress,
    handleShortcutPress,
    handleRemoveStep,
    handleSaveAndClose,
    handleCloseWithGuard,
  };
}

export type TaskWorkingSectionsController = ReturnType<
  typeof useTaskWorkingSectionsController
>;
