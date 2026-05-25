import { useCallback, useMemo, useState } from 'react';

import { useAddTaskStep } from '@/features/tasks/actions/use-add-task-step';
import { useAssignStepWorker } from '@/features/tasks/actions/use-assign-step-worker';
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
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  type WorkingSectionWorkerPickerSurfaceProps,
} from '@/features/working-sections/surfaces';
import type {
  WorkingSectionMember,
  WorkingSectionOption,
} from '@/features/working-sections/types';
import { useSurface } from '@/hooks/use-surface';
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

function openWorkerPicker(
  surface: ReturnType<typeof useSurface>,
  props: WorkingSectionWorkerPickerSurfaceProps,
) {
  surface.open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, props);
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
  const assignStepWorker = useAssignStepWorker(taskId);
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
          _pendingId: crypto.randomUUID(),
          working_section_id: section.client_id,
          worker_id: member?.client_id ?? null,
          working_section_name_snapshot: section.name,
          assigned_worker_display_name_snapshot: member?.username ?? null,
        },
      ]);
    },
    [],
  );

  const stageReassignment = useCallback(
    (stepId: string, workerId: string, displayName: string | null) => {
      const pendingAdd = pendingAdds.find((candidate) => candidate._pendingId === stepId);

      if (pendingAdd) {
        setPendingAdds((current) =>
          current.map((candidate) =>
            candidate._pendingId === stepId
              ? {
                  ...candidate,
                  worker_id: workerId,
                  assigned_worker_display_name_snapshot: displayName,
                }
              : candidate,
          ),
        );
        return;
      }

      const baseStep = baseTaskSteps.find((candidate) => candidate.client_id === stepId);

      if (
        baseStep &&
        baseStep.assigned_worker_id === workerId &&
        (baseStep.assigned_worker_display_name_snapshot ?? null) === displayName
      ) {
        setPendingReassignments((current) =>
          current.filter((candidate) => candidate.step_id !== stepId),
        );
        return;
      }

      setPendingReassignments((current) => {
        const next = current.filter((candidate) => candidate.step_id !== stepId);
        next.push({ step_id: stepId, worker_id: workerId, display_name: displayName });
        return next;
      });
    },
    [baseTaskSteps, pendingAdds],
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

  const handleSectionPress = useCallback(
    (sectionId: string) => {
      const entry = sectionEntries.find(
        (candidate) => candidate.section.client_id === sectionId,
      );

      if (!entry) {
        return;
      }

      if (entry.activeStep) {
        const activeStep = entry.activeStep;

        if (entry.section.members.length === 0) {
          return;
        }

        openWorkerPicker(surface, {
          sectionName: entry.section.name,
          members: entry.section.members,
          currentWorkerId: activeStep.assigned_worker_id ?? null,
          onSelect: (workerId: string) => {
            const member =
              entry.section.members.find(
                (candidate) => candidate.client_id === workerId,
              ) ?? null;

            stageReassignment(
              activeStep.client_id,
              workerId,
              member?.username ?? null,
            );
          },
        });
        return;
      }

      if (entry.section.members.length === 0) {
        stageStepStart(entry.section);
        return;
      }

      if (entry.section.members.length === 1) {
        stageStepStart(entry.section, entry.section.members[0]);
        return;
      }

      openWorkerPicker(surface, {
        sectionName: entry.section.name,
        members: entry.section.members,
        currentWorkerId: null,
        onSelect: (workerId: string) => {
          const member =
            entry.section.members.find(
              (candidate) => candidate.client_id === workerId,
            ) ?? null;
          stageStepStart(entry.section, member ?? undefined);
        },
      });
    },
    [sectionEntries, stageReassignment, stageStepStart, surface],
  );

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

      for (const pendingReassignment of recoverySnapshot.recoveredPendingReassignments ?? []) {
        await assignStepWorker.mutateAsync({
          step_id: pendingReassignment.step_id,
          worker_id: pendingReassignment.worker_id,
          assigned_worker_display_name_snapshot:
            pendingReassignment.display_name,
        });
      }
    } catch {
      useSurfaceStore.getState().open(
        TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
        recoverySnapshot,
      );
    }
  }, [
    addTaskStep,
    assignStepWorker,
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
    handleRemoveStep,
    handleSaveAndClose,
    handleCloseWithGuard,
  };
}

export type TaskWorkingSectionsController = ReturnType<
  typeof useTaskWorkingSectionsController
>;
