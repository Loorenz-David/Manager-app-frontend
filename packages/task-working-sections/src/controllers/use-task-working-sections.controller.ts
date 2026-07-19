import { useCallback, useMemo, useState } from "react";

import { AuthRole, selectUser, useAuthStore, useRole } from "@beyo/auth";
import { updateItemPositions } from "@beyo/items";
import { generateClientId } from "@beyo/lib";
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
  useCreateTaskNote,
  type TaskNoteComposerValue,
} from "@beyo/task-notes";
import {
  useWorkingSectionPickerFlow,
  type WorkingSectionMember,
  type WorkingSectionOption,
} from "@beyo/working-sections";
import {
  useTaskStepsByTaskQuery,
  humanizeSnakeCase,
  useAddTaskStep,
  useGetTaskQuery,
  useRemoveTaskStep,
  useTransitionTaskStep,
  taskKeys,
  type AddTaskStepVariables,
  type TaskStepRich,
} from "@beyo/tasks";
import { useQueryClient } from "@tanstack/react-query";

import { quickTaskKeys } from "../api/quick-task-keys";

import type {
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskWorkingSectionsSurfaceOpeners,
  TaskWorkingSectionsSurfaceProps,
} from "../surface-ids";

type TaskStep = TaskStepRich;
type StatePillVariant = "neutral" | "active" | "warning" | "success" | "danger";
type ControllerInit = {
  initialPendingAdds?: RecoveredPendingAdd[];
  initialPendingRemoveIds?: string[];
  initialPendingReassignments?: RecoveredPendingReassignment[];
  initialNoteClientId?: string;
  initialNoteContent?: TaskNoteComposerValue | null;
  initialItemPosition?: string | null;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};

const TASK_STEP_STATE_VARIANT: Record<string, StatePillVariant> = {
  pending: "neutral",
  working: "active",
  paused: "warning",
  ended_shift: "warning",
  blocked: "danger",
  completed: "success",
  skipped: "neutral",
  failed: "danger",
  cancelled: "neutral",
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
  return step.closed_at !== null || step.state === "completed";
}

function getLatestStepForSection(
  taskSteps: TaskStep[],
  sectionId: string,
): TaskStep | null {
  const activeStep = [...taskSteps].reverse().find(
    (step) =>
      step.working_section_id === sectionId &&
      step.state !== "skipped" &&
      !isCompletedStep(step),
  );

  if (activeStep) {
    return activeStep;
  }

  return (
    [...taskSteps]
      .reverse()
      .find(
        (step) =>
          step.working_section_id === sectionId && step.state !== "skipped",
      ) ?? null
  );
}

function buildPendingStep(pendingAdd: RecoveredPendingAdd): TaskStep {
  return {
    client_id: pendingAdd._pendingId,
    task_id: "",
    state: "pending",
    readiness_status: "ready",
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
    ready_by_at: null,
    total_working_seconds: 0,
    total_pause_seconds: 0,
    total_ended_shift_seconds: 0,
    total_working_count: 0,
    total_pause_count: 0,
    total_ended_shift_count: 0,
    total_issues_count: 0,
    total_issues_resolved_count: 0,
    total_cost_minor: null,
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
  const queryClient = useQueryClient();
  const taskQuery = useGetTaskQuery(taskId);
  const taskStepsQuery = useTaskStepsByTaskQuery(taskId);
  const workingSectionFlow = useWorkingSectionPickerFlow();
  const addTaskStep = useAddTaskStep(taskId);
  const removeTaskStep = useRemoveTaskStep(taskId);
  const transitionTaskStep = useTransitionTaskStep(taskId);
  const createTaskNote = useCreateTaskNote();
  const user = useAuthStore(selectUser);
  const { role } = useRole();
  const isWorker = role === AuthRole.Worker;
  const [pendingAdds, setPendingAdds] = useState<RecoveredPendingAdd[]>(
    () => clonePendingAdds(init.initialPendingAdds ?? []),
  );
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>(
    () => [...(init.initialPendingRemoveIds ?? [])],
  );
  const [pendingReassignments, setPendingReassignments] = useState<
    RecoveredPendingReassignment[]
  >(() => clonePendingReassignments(init.initialPendingReassignments ?? []));
  const [noteClientId, setNoteClientId] = useState(
    () => init.initialNoteClientId ?? generateClientId("TaskNote"),
  );
  const [noteDraft, setNoteDraft] = useState<TaskNoteComposerValue | null>(
    () => init.initialNoteContent ?? null,
  );
  // `null` means the user has not touched the field yet, so the persisted item
  // position is shown instead. This keeps the draft correct even though the
  // task detail resolves after the controller mounts.
  const [itemPositionDraft, setItemPositionDraft] = useState<string | null>(
    () => init.initialItemPosition ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const majorCategory = taskQuery.data?.item?.item_major_category_snapshot;
  const itemClientId = taskQuery.data?.item?.client_id ?? null;
  const persistedItemPosition = taskQuery.data?.item?.item_position ?? "";
  const itemPositionValue = itemPositionDraft ?? persistedItemPosition;
  const hasItemPositionChange =
    itemPositionDraft !== null &&
    itemClientId !== null &&
    itemPositionDraft.trim() !== persistedItemPosition.trim();
  const baseTaskSteps = taskStepsQuery.data ?? [];
  const surfaceOpeners = init.surfaceOpeners;

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

  // The current worker's own in-progress step on this task. When a worker
  // assigns new steps to fellows we pause their own working step (if any) so
  // their timer stops while the fellows pick up the work.
  const currentUserId = String(user?.id ?? "");
  const currentUserWorkingStep = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return (
      baseTaskSteps.find(
        (step) =>
          step.assigned_worker_id === currentUserId &&
          step.state === "working",
      ) ?? null
    );
  }, [baseTaskSteps, currentUserId]);

  const hasUnsavedChanges =
    pendingAdds.length > 0 ||
    pendingRemoveIds.length > 0 ||
    pendingReassignments.length > 0 ||
    hasItemPositionChange ||
    hasMeaningfulNoteContent(noteDraft);

  const closeSlide = useCallback(() => {
    surfaceOpeners?.closeSlide?.();
  }, [surfaceOpeners]);

  const closeDiscardSheet = useCallback(() => {
    surfaceOpeners?.closeDiscardSheet?.();
  }, [surfaceOpeners]);

  const buildRecoverySnapshot = useCallback(
    (): TaskWorkingSectionsSurfaceProps => ({
      taskId,
      recoveredPendingAdds: clonePendingAdds(pendingAdds),
      recoveredPendingRemoveIds: [...pendingRemoveIds],
      recoveredPendingReassignments: clonePendingReassignments(pendingReassignments),
      recoveredNoteClientId: noteClientId,
      recoveredNoteContent: noteDraft,
      recoveredItemPosition: itemPositionDraft,
      surfaceOpeners,
    }),
    [
      itemPositionDraft,
      noteClientId,
      noteDraft,
      pendingAdds,
      pendingRemoveIds,
      pendingReassignments,
      surfaceOpeners,
      taskId,
    ],
  );

  const stageStepStart = useCallback(
    (section: WorkingSectionOption, member?: WorkingSectionMember) => {
      setPendingAdds((current) => [
        ...current,
        {
          _pendingId: generateClientId("TaskStep"),
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
          ? (TASK_STEP_STATE_VARIANT[currentStep.state] ?? "neutral")
          : "neutral",
        isActive,
        isCompleted,
      };
    });
  }, [effectiveTaskSteps, majorCategory, workingSectionFlow.options]);

  const handleRemoveStep = useCallback(
    (stepId: string) => {
      const isPendingAdd = pendingAdds.some(
        (candidate) => candidate._pendingId === stepId,
      );

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
    },
    [pendingAdds],
  );

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

  const persistPendingSectionChanges = useCallback(
    async (recoverySnapshot: TaskWorkingSectionsSurfaceProps) => {
      const pendingRemoveIds = recoverySnapshot.recoveredPendingRemoveIds ?? [];

      if (pendingRemoveIds.length > 0) {
        await removeTaskStep.mutateAsync({ step_ids: pendingRemoveIds });
      }

      const noteContent = recoverySnapshot.recoveredNoteContent ?? null;
      const stepReason =
        noteContent && hasMeaningfulNoteContent(noteContent)
          ? noteContent.plainText
          : undefined;

      for (const pendingAdd of recoverySnapshot.recoveredPendingAdds ?? []) {
        const variables: AddTaskStepVariables = {
          working_section_id: pendingAdd.working_section_id,
          worker_id: pendingAdd.worker_id ?? undefined,
          reason: stepReason,
          working_section_name_snapshot:
            pendingAdd.working_section_name_snapshot,
          assigned_worker_display_name_snapshot:
            pendingAdd.assigned_worker_display_name_snapshot,
        };
        await addTaskStep.mutateAsync(variables);
      }
    },
    [addTaskStep, removeTaskStep],
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
      const currentUserClientId = String(user?.id ?? "");
      const currentNoteDraft = noteDraft;
      const notePayload = currentNoteDraft && hasMeaningfulNoteContent(currentNoteDraft)
        ? {
            client_id: recoverySnapshot.recoveredNoteClientId ?? noteClientId,
            note_type: "user_note" as const,
            content: toTaskNoteContentBlocks(currentNoteDraft.content),
            plain_text: currentNoteDraft.plainText,
            users_read_list: currentUserClientId ? [currentUserClientId] : [],
          }
        : null;

      // A worker assigning new steps to fellows pauses their own working step
      // on this task so their timer stops while handing the work over.
      const shouldPauseOwnStep =
        isWorker &&
        currentUserWorkingStep !== null &&
        (recoverySnapshot.recoveredPendingAdds?.length ?? 0) > 0;

      await Promise.all([
        persistPendingSectionChanges(recoverySnapshot),
        notePayload
          ? createTaskNote.mutateAsync({ taskId, notes: [notePayload] })
          : Promise.resolve(null),
        shouldPauseOwnStep && currentUserWorkingStep
          ? transitionTaskStep.mutateAsync({
              step_id: currentUserWorkingStep.client_id,
              new_state: "paused",
            })
          : Promise.resolve(null),
        hasItemPositionChange && itemClientId
          ? updateItemPositions([
              {
                client_id: itemClientId,
                item_position: itemPositionDraft?.trim() || null,
              },
            ])
          : Promise.resolve(null),
      ]);

      if (hasItemPositionChange && itemClientId) {
        setItemPositionDraft(null);
        void queryClient.invalidateQueries({
          queryKey: taskKeys.detail(taskId),
        });
        surfaceOpeners?.onItemPositionSaved?.(itemClientId);
      }

      void queryClient.invalidateQueries({ queryKey: quickTaskKeys.all });

      setNoteDraft(null);
      setNoteClientId(generateClientId("TaskNote"));

      // Worker reassignment is intentionally disabled.
      surfaceOpeners?.onSaveComplete?.(
        taskId,
        clonePendingAdds(recoverySnapshot.recoveredPendingAdds ?? []),
      );
    } catch {
      surfaceOpeners?.reopenSlideAfterError?.(recoverySnapshot);
    } finally {
      setIsSaving(false);
    }
  }, [
    buildRecoverySnapshot,
    closeDiscardSheet,
    closeSlide,
    createTaskNote,
    currentUserWorkingStep,
    hasItemPositionChange,
    hasUnsavedChanges,
    isSaving,
    itemClientId,
    itemPositionDraft,
    isWorker,
    noteClientId,
    noteDraft,
    persistPendingSectionChanges,
    queryClient,
    surfaceOpeners,
    taskId,
    transitionTaskStep,
    user?.id,
  ]);

  const handleCloseWithGuard = useCallback(() => {
    if (!hasUnsavedChanges) {
      closeSlide();
      return;
    }

    surfaceOpeners?.openDiscardChangesSheet?.({
      onDiscardAndClose: () => {
        closeDiscardSheet();
        closeSlide();
      },
      onSaveAndClose: () => void handleSaveAndClose(),
    });
  }, [
    closeDiscardSheet,
    closeSlide,
    handleSaveAndClose,
    hasUnsavedChanges,
    surfaceOpeners,
  ]);

  return {
    taskId,
    taskDetail: taskQuery.data ?? null,
    surfaceOpeners,
    sectionEntries,
    pendingAdds,
    pendingRemoveIds,
    pendingReassignments,
    noteClientId,
    noteDraft,
    itemClientId,
    itemPositionValue,
    handleItemPositionChange: setItemPositionDraft,
    handleNoteChange: setNoteDraft,
    hasUnsavedChanges,
    isPending: taskQuery.isPending || taskStepsQuery.isPending,
    isError: taskQuery.isError || taskStepsQuery.isError,
    isSectionsLoading: workingSectionFlow.isLoading,
    isSaving,
    refetch: async () => {
      await Promise.all([taskQuery.refetch(), taskStepsQuery.refetch()]);
    },
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
