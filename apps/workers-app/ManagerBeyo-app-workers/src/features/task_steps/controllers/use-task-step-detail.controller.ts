import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@beyo/auth";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
import {
  ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
  type ItemIssueSelectionSheetSurfaceProps,
  type ItemIssueSurfaceOpeners,
} from "@beyo/item-issues";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import {
  useItemCategoryByIdFlow,
  type ItemCategoryId,
  type ItemCategoryViewModel,
} from "@beyo/item-categories";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  useListCasesQuery,
  useUnreadCountsQuery,
  type CaseCreationSurfaceOpeners,
  type ParticipantPickerSlideSurfaceProps,
} from "@beyo/cases";
import {
  IMAGE_VIEWER_SURFACE_ID,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  type ImageLinkEntityType,
  type ImageUploadState,
  type ImageViewModel,
} from "@beyo/images";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { useCancelPendingStepCompletion } from "../actions/use-cancel-pending-step-completion";
import { useTransitionStepState } from "../actions/use-transition-step-state";
import { taskStepKeys } from "../api/task-step-keys";
import { useWorkingSectionStepsQuery } from "../api/use-working-section-steps";
import { buildProceedToStart } from "../lib/build-proceed-to-start";
import {
  hasNoAvailableUpholstery,
  isUpholsteryWarningSection,
} from "../lib/step-transition-guards";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  TASK_CASES_SLIDE_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type StepDependencyWarningSheetSurfaceProps,
  type TaskCasesSlideSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
  type UpholsteryWarningSheetSurfaceProps,
} from "../surface-ids";
import {
  type PendingStepCompletion,
  STEP_TERMINAL_STATES,
  toIncompleteDependencyViewModels,
  toTaskStepCardViewModel,
  type CasesSummary,
  type StepState,
  type TaskStep,
  type TaskStepCardViewModel,
} from "../types";

export type LiveCasesSummary = {
  openResolvingCount: number;
  totalUnread: number;
  unreadCaseCount: number;
  singleUnreadCaseId: string | null;
};

export type TaskStepDetailController = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  step: TaskStep | null;
  itemCategory: ItemCategoryViewModel | null;
  isItemCategoryPending: boolean;
  isItemCategoryError: boolean;
  isSeatCategory: boolean;
  vm: TaskStepCardViewModel | null;
  isPending: boolean;
  isError: boolean;
  isStepTerminal: boolean;
  casesSummary: CasesSummary | null;
  liveCasesSummary: LiveCasesSummary;
  pendingCompletion: PendingStepCompletion | null;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleComplete: () => void;
  handleCancelCompletion: () => void;
  handleCompletionExpired: () => void;
  handleOpenImageViewer: (initialImageClientId: string) => void;
  handleOpenActionsSheet: () => void;
  handleOpenCasesForTask: () => void;
  handleOpenFlowRecord: (entityClientId: string) => void;
  issuesSurfaceOpeners: ItemIssueSurfaceOpeners;
  isTransitioning: boolean;
  isCancellingCompletion: boolean;
  transitioningStepId: TaskStepId | null;
  refetch: () => Promise<void>;
};

export function useTaskStepDetailController(): TaskStepDetailController {
  const { stepId, taskId, workingSectionId } =
    useSurfaceProps<TaskStepDetailSurfaceProps>();
  // useSurfaceProps returns Partial<T> — resolve once here, use resolved everywhere
  const resolvedStepId = stepId ?? ("" as TaskStepId);
  const resolvedTaskId = taskId ?? ("" as TaskId);
  const resolvedWorkingSectionId = workingSectionId ?? ("" as WorkingSectionId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useWorkingSectionStepsQuery({
    working_section_id: resolvedWorkingSectionId,
    limit: 50,
    offset: 0,
  });

  const step = useMemo(
    () => query.data?.items.find((s) => s.client_id === resolvedStepId) ?? null,
    [query.data?.items, resolvedStepId],
  );

  const itemCategoryId =
    step?.item?.item_category_id != null
      ? (step.item.item_category_id as ItemCategoryId)
      : null;

  const {
    category: itemCategory,
    isPending: isItemCategoryPending,
    isError: isItemCategoryError,
  } = useItemCategoryByIdFlow(itemCategoryId);

  const isSeatCategory = itemCategory?.majorCategory === "seat";

  const vm = useMemo(
    () => (step ? toTaskStepCardViewModel(step) : null),
    [step],
  );

  const {
    transitionStepState,
    isPending: isTransitioning,
    pendingStepId,
    pendingCompletion,
    clearPendingCompletion,
  } = useTransitionStepState();
  const {
    cancelCompletion,
    isPending: isCancellingCompletion,
  } = useCancelPendingStepCompletion();
  const { open: openSurface } = useSurface();

  const taskCasesQuery = useListCasesQuery({
    case_state: "open,resolving",
    entity_client_id: resolvedTaskId,
    entity_type: "task",
  });

  const taskCaseIds = useMemo(
    () => (taskCasesQuery.data ?? []).map((c) => c.client_id),
    [taskCasesQuery.data],
  );

  const taskUnreadCountsQuery = useUnreadCountsQuery(
    taskCaseIds.length > 0 ? taskCaseIds : undefined,
  );

  async function refetch(): Promise<void> {
    await Promise.all([
      query.refetch(),
      taskCasesQuery.refetch(),
      taskUnreadCountsQuery.refetch(),
    ]);
  }

  const liveCasesSummary = useMemo<LiveCasesSummary>(() => {
    const cases = taskCasesQuery.data ?? [];
    const unreadCounts = taskUnreadCountsQuery.data ?? {};
    const unreadCaseIds = taskCaseIds.filter(
      (id) => (unreadCounts[id] ?? 0) > 0,
    );

    return {
      openResolvingCount: cases.length,
      totalUnread: unreadCaseIds.reduce(
        (sum, id) => sum + (unreadCounts[id] ?? 0),
        0,
      ),
      unreadCaseCount: unreadCaseIds.length,
      singleUnreadCaseId:
        unreadCaseIds.length === 1 ? (unreadCaseIds[0] ?? null) : null,
    };
  }, [taskCasesQuery.data, taskCaseIds, taskUnreadCountsQuery.data]);

  const handleTransition = useCallback(
    (targetStepId: TaskStepId, targetTaskId: TaskId, nextState: StepState) => {
      if (nextState === "paused") {
        openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
          stepId: targetStepId,
          taskId: targetTaskId,
          workingSectionId: resolvedWorkingSectionId,
        } as PauseReasonSheetSurfaceProps);
        return;
      }

      if (
        step &&
        step.client_id === targetStepId &&
        step.state === "pending" &&
        nextState === "working"
      ) {
        const proceedToStart = buildProceedToStart({
          stepId: targetStepId,
          taskId: targetTaskId,
          workingSectionId: resolvedWorkingSectionId,
          itemId: step.item?.client_id,
          itemCategoryId: step.item?.item_category_id ?? null,
          workerId: user?.id ?? null,
          queryClient,
          openSurface,
          transitionStepState,
        });

        if (
          step.item?.client_id &&
          isUpholsteryWarningSection(step.working_section_name_snapshot) &&
          hasNoAvailableUpholstery(step)
        ) {
          openSurface(UPHOLSTERY_WARNING_SHEET_SURFACE_ID, {
            stepId: targetStepId,
            taskId: targetTaskId,
            workingSectionId: resolvedWorkingSectionId,
            itemId: step.item.client_id,
          } as UpholsteryWarningSheetSurfaceProps);
          return;
        }

        if (step.readiness_status !== "ready") {
          const incompleteDependencies = toIncompleteDependencyViewModels(
            step.dependency_working_sections,
          );

          if (incompleteDependencies.length > 0) {
            openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
              stepId: targetStepId,
              taskId: targetTaskId,
              workingSectionId: resolvedWorkingSectionId,
              incompleteDependencies,
              onConfirm: proceedToStart,
            } as StepDependencyWarningSheetSurfaceProps);
            return;
          }
        }

        proceedToStart();
        return;
      }

      transitionStepState({
        task_id: targetTaskId,
        step_id: targetStepId,
        new_state: nextState,
        working_section_id: resolvedWorkingSectionId,
      });
    },
    [
      openSurface,
      queryClient,
      resolvedWorkingSectionId,
      step,
      transitionStepState,
      user?.id,
    ],
  );

  const handleComplete = useCallback(() => {
    if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;
    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "completed",
      working_section_id: resolvedWorkingSectionId,
    });
  }, [
    vm,
    resolvedTaskId,
    resolvedStepId,
    resolvedWorkingSectionId,
    transitionStepState,
  ]);

  const handleCancelCompletion = useCallback(() => {
    if (!pendingCompletion) {
      return;
    }

    clearPendingCompletion();
    cancelCompletion({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      working_section_id: resolvedWorkingSectionId,
    });
  }, [
    pendingCompletion,
    clearPendingCompletion,
    cancelCompletion,
    resolvedTaskId,
    resolvedStepId,
    resolvedWorkingSectionId,
  ]);

  const handleCompletionExpired = useCallback(() => {
    if (!pendingCompletion) {
      return;
    }

    clearPendingCompletion();
    void queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionListsBySection(resolvedWorkingSectionId),
    });
    void queryClient.invalidateQueries({
      queryKey: workerWorkingSectionKeys.mine(),
    });
    void queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
    });
  }, [
    pendingCompletion,
    clearPendingCompletion,
    queryClient,
    resolvedWorkingSectionId,
  ]);

  const handleOpenImageViewer = useCallback(
    (initialImageClientId: string) => {
      if (!step || step.item_images.length === 0) {
        return;
      }

      const entityClientId = step.item?.client_id ?? null;
      const images: ImageViewModel[] = step.item_images.map((img, index) => {
        const rawAnnotation =
          "image_annotation" in img ? img.image_annotation : undefined;
        const parsed =
          ImageAnnotationSchema.nullable().safeParse(rawAnnotation);
        const parsedAnnotation =
          parsed.success && parsed.data ? parsed.data : null;
        const annotation = parsedAnnotation
          ? toImageAnnotationViewModel(parsedAnnotation)
          : null;
        const annotations = toImageAnnotationViewModels(
          parsedAnnotation ?? undefined,
          undefined,
        );

        return {
          clientId: img.client_id,
          linkClientId: null,
          entityType: "item" as ImageLinkEntityType,
          entityClientId,
          imageUrl: img.image_url,
          localObjectUrl: null,
          displayOrder: index,
          widthPx: img.width_px,
          heightPx: img.height_px,
          fileSizeBytes: img.file_size_bytes,
          createdAt: null,
          uploadState: "uploaded" as ImageUploadState,
          isOptimistic: false,
          isDeleted: false,
          pendingUploadClientId: null,
          uploadError: null,
          annotation,
          annotations,
          isFullyLoaded: "image_annotation" in img,
        };
      });

      openSurface(IMAGE_VIEWER_SURFACE_ID, {
        images,
        initialImageClientId,
        entityType: "item" as ImageLinkEntityType,
        entityClientId: entityClientId ?? "",
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [step, openSurface],
  );

  const handleOpenActionsSheet = useCallback(() => {
    openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
      stepId: resolvedStepId,
      taskId: resolvedTaskId,
    } as TaskStepActionsSheetSurfaceProps);
  }, [openSurface, resolvedStepId, resolvedTaskId]);

  const issuesSurfaceOpeners = useMemo<ItemIssueSurfaceOpeners>(() => {
    const itemId = step?.item?.client_id;

    if (!itemId || !step?.item?.item_category_id) {
      return {};
    }

    return {
      openIssueSelection: () =>
        openSurface(ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID, {
          itemId,
          workingSectionId: resolvedWorkingSectionId,
          itemCategoryId: step?.item?.item_category_id ?? null,
          stepId: resolvedStepId,
          workerId: user?.id ?? null,
        } satisfies ItemIssueSelectionSheetSurfaceProps),
    };
  }, [
    openSurface,
    resolvedStepId,
    resolvedWorkingSectionId,
    step,
    user?.id,
  ]);

  const handleOpenCasesForTask = useCallback(() => {
    if (liveCasesSummary.openResolvingCount === 0) {
      const surfaceOpeners: CaseCreationSurfaceOpeners = {
        openCaseTypePicker: (props) =>
          openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
        openParticipantPicker: (props: ParticipantPickerSlideSurfaceProps) =>
          openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
      };

      openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
        entityTypes: ["task"],
        entityClientId: resolvedTaskId,
        title: vm?.articleLabel,
        surfaceOpeners,
        onCaseCreated: (plainText: string | undefined) => {
          if (step?.state !== "working") {
            return;
          }

          transitionStepState({
            task_id: resolvedTaskId,
            step_id: resolvedStepId,
            new_state: "paused",
            working_section_id: resolvedWorkingSectionId,
            reason: "pause_case_created",
            ...(plainText ? { description: plainText } : {}),
          });
        },
      });
      return;
    }

    if (
      liveCasesSummary.unreadCaseCount === 1 &&
      liveCasesSummary.singleUnreadCaseId
    ) {
      openSurface(CASE_CONVERSATION_SURFACE_ID, {
        caseClientId: liveCasesSummary.singleUnreadCaseId,
      });
      return;
    }

    openSurface(TASK_CASES_SLIDE_SURFACE_ID, {
      taskId: resolvedTaskId,
    } as TaskCasesSlideSurfaceProps);
  }, [
    liveCasesSummary,
    openSurface,
    resolvedTaskId,
    vm,
    step,
    transitionStepState,
    resolvedStepId,
    resolvedWorkingSectionId,
  ]);

  // Flow record detail surface not yet registered in workers app.
  const handleOpenFlowRecord = useCallback((_entityClientId: string) => {}, []);

  return {
    stepId: resolvedStepId,
    taskId: resolvedTaskId,
    workingSectionId: resolvedWorkingSectionId,
    step,
    itemCategory,
    isItemCategoryPending,
    isItemCategoryError,
    isSeatCategory,
    vm,
    isPending: query.isPending,
    isError: query.isError,
    isStepTerminal: vm ? STEP_TERMINAL_STATES.has(vm.state) : false,
    casesSummary: step?.cases_summary ?? null,
    liveCasesSummary,
    pendingCompletion,
    handleTransition,
    handleComplete,
    handleCancelCompletion,
    handleCompletionExpired,
    handleOpenImageViewer,
    handleOpenActionsSheet,
    handleOpenCasesForTask,
    handleOpenFlowRecord,
    issuesSurfaceOpeners,
    isTransitioning,
    isCancellingCompletion,
    transitioningStepId: pendingStepId ?? null,
    refetch,
  };
}
