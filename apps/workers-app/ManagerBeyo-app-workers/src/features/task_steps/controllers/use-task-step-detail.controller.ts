import { useCallback, useMemo } from "react";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import {
  ITEM_FAST_ISSUE_SHEET_SURFACE_ID,
  type TaskIssueSurfaceOpeners,
} from "@beyo/tasks";
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
import { useTransitionStepState } from "../actions/use-transition-step-state";
import { useWorkingSectionStepsQuery } from "../api/use-working-section-steps";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  TASK_CASES_SLIDE_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type TaskCasesSlideSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import {
  STEP_TERMINAL_STATES,
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
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleComplete: () => void;
  handleOpenImageViewer: (initialImageClientId: string) => void;
  handleOpenActionsSheet: () => void;
  handleOpenCasesForTask: () => void;
  handleOpenFlowRecord: (entityClientId: string) => void;
  issuesSurfaceOpeners: TaskIssueSurfaceOpeners;
  isTransitioning: boolean;
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
  } = useTransitionStepState();
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

      transitionStepState({
        task_id: targetTaskId,
        step_id: targetStepId,
        new_state: nextState,
        working_section_id: resolvedWorkingSectionId,
      });
    },
    [transitionStepState, resolvedWorkingSectionId, openSurface],
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

  const issuesSurfaceOpeners = useMemo<TaskIssueSurfaceOpeners>(() => {
    const itemId = step?.item?.client_id;
    const itemCategoryId = step?.item?.item_category_id ?? null;

    if (!itemId) {
      return {};
    }

    return {
      openFastIssueSheet: () =>
        openSurface(ITEM_FAST_ISSUE_SHEET_SURFACE_ID, {
          taskId: resolvedTaskId,
          itemId,
          itemCategoryId,
        }),
    };
  }, [step, openSurface, resolvedTaskId]);

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
  }, [liveCasesSummary, openSurface, resolvedTaskId, vm]);

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
    handleTransition,
    handleComplete,
    handleOpenImageViewer,
    handleOpenActionsSheet,
    handleOpenCasesForTask,
    handleOpenFlowRecord,
    issuesSurfaceOpeners,
    isTransitioning,
    transitioningStepId: pendingStepId ?? null,
    refetch,
  };
}
