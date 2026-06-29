import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  selectClearSearch,
  selectSearch,
  selectSetSearch,
  useTaskStepsUiStore,
} from "@/store/task-steps-ui.store";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@beyo/auth";
import { useSurface } from "@beyo/hooks";
import { isSameImagePath } from "@beyo/lib";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
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
import { buildProceedToStart } from "../lib/build-proceed-to-start";
import { preloadPinNotificationsSlideSurface } from "../surfaces";
import {
  hasNoAvailableUpholstery,
  hasNoUpholsterySelected,
  isUpholsteryWarningSection,
} from "../lib/step-transition-guards";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type StepDependencyWarningSheetSurfaceProps,
  type StepStateFilterSheetSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
  type UpholsterySelectionMissingSheetSurfaceProps,
  type UpholsteryWarningSheetSurfaceProps,
} from "../surface-ids";
import {
  computeNonTerminalCounts,
  toIncompleteDependencyViewModels,
  toTaskStepCardViewModel,
  type MajorCategory,
  type NonTerminalStepCounts,
  type ReadinessStatus,
  type StepState,
  type TaskStepCardViewModel,
  type TaskType,
} from "../types";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delayMs]);

  return debounced;
}

// Returns true only after `delayMs` of `value` being true; resets immediately when false.
function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (value) {
      timerRef.current = setTimeout(() => setDelayed(true), delayMs);
    } else {
      setDelayed(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return delayed;
}

export const DEFAULT_STATE_FILTERS: StepState[] = [
  "pending",
  "working",
  "paused",
  "ended_shift",
];

export const DEFAULT_READINESS_STATUS_FILTERS: ReadinessStatus[] = ["ready"];

export type WorkingSectionStepsController = {
  steps: TaskStepCardViewModel[];
  rawSteps: import("../types").TaskStep[];
  nonTerminalCounts: NonTerminalStepCounts;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  stateFilters: StepState[];
  majorCategoryFilters: MajorCategory[];
  readinessStatusFilters: ReadinessStatus[];
  taskTypeFilters: TaskType[];
  activeFilterCount: number;
  refetch: () => Promise<void>;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleOpenStateFilter: () => void;
  handleOpenTaskActions: (
    stepId: TaskStepId,
    taskId: TaskId,
    itemId: string | null,
  ) => void;
  handleOpenTaskDetail: (stepId: TaskStepId, taskId: TaskId) => void;
  handleOpenImageViewer: (stepId: TaskStepId) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
};

export function useWorkingSectionStepsController(
  sectionId: WorkingSectionId,
): WorkingSectionStepsController {
  const search = useTaskStepsUiStore(selectSearch);
  const setSearch = useTaskStepsUiStore(selectSetSearch);
  const clearSearch = useTaskStepsUiStore(selectClearSearch);

  useEffect(() => {
    return () => clearSearch();
  }, [sectionId, clearSearch]);

  const [stateFilters, setStateFilters] =
    useState<StepState[]>(DEFAULT_STATE_FILTERS);
  const [majorCategoryFilters, setMajorCategoryFilters] = useState<
    MajorCategory[]
  >([]);
  const [readinessStatusFilters, setReadinessStatusFilters] = useState<
    ReadinessStatus[]
  >(DEFAULT_READINESS_STATUS_FILTERS);
  const [taskTypeFilters, setTaskTypeFilters] = useState<TaskType[]>([]);
  const debouncedSearch = useDebounced(search, 300);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useWorkingSectionStepsQuery({
    working_section_id: sectionId,
    q: debouncedSearch || undefined,
    record_step_state: stateFilters.join(","),
    major_category:
      majorCategoryFilters.length > 0
        ? majorCategoryFilters.join(",")
        : undefined,
    readiness_statuses: readinessStatusFilters.join(","),
    task_types:
      taskTypeFilters.length > 0 ? taskTypeFilters.join(",") : undefined,
    limit: 50,
    offset: 0,
  });

  async function refetch(): Promise<void> {
    await query.refetch();
  }

  const {
    transitionStepState,
    isPending: isTransitioning,
    pendingStepId,
  } = useTransitionStepState();
  const { open: openSurface } = useSurface();
  const stableImageUrlsRef = useRef(new Map<TaskStepId, string>());

  const steps = useMemo(() => {
    const urlCache = stableImageUrlsRef.current;
    return (query.data?.items ?? []).map((item) => {
      const vm = toTaskStepCardViewModel(item);
      if (vm.firstImageUrl !== null) {
        const cached = urlCache.get(vm.stepId);
        if (cached && isSameImagePath(cached, vm.firstImageUrl)) {
          return { ...vm, firstImageUrl: cached };
        }
        urlCache.set(vm.stepId, vm.firstImageUrl);
      }
      return vm;
    });
  }, [query.data?.items]);

  const nonTerminalCounts = useMemo(
    () => computeNonTerminalCounts(query.data?.items ?? []),
    [query.data?.items],
  );
  const activeFilterCount = useMemo(() => {
    const isDefaultStateFilter =
      stateFilters.length === DEFAULT_STATE_FILTERS.length &&
      DEFAULT_STATE_FILTERS.every((state) => stateFilters.includes(state));
    const stateCount = isDefaultStateFilter ? 0 : stateFilters.length;

    const isDefaultReadinessFilter =
      readinessStatusFilters.length === DEFAULT_READINESS_STATUS_FILTERS.length &&
      DEFAULT_READINESS_STATUS_FILTERS.every((s) =>
        readinessStatusFilters.includes(s),
      );
    const readinessCount = isDefaultReadinessFilter ? 0 : readinessStatusFilters.length;

    return (
      stateCount +
      majorCategoryFilters.length +
      readinessCount +
      taskTypeFilters.length
    );
  }, [
    majorCategoryFilters,
    readinessStatusFilters,
    stateFilters,
    taskTypeFilters,
  ]);

  const handleTransition = useCallback(
    (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
      if (nextState === "paused") {
        openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
          stepId,
          taskId,
          workingSectionId: sectionId,
        } as PauseReasonSheetSurfaceProps);
        return;
      }

      const step = query.data?.items.find((item) => item.client_id === stepId);
      if (step && step.state === "pending" && nextState === "working") {
        const proceedToStart = buildProceedToStart({
          stepId,
          taskId,
          workingSectionId: sectionId,
          workingSectionName: step.working_section_name_snapshot,
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
          hasNoUpholsterySelected(step)
        ) {
          openSurface(UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID, {
            stepId,
            taskId,
            workingSectionId: sectionId,
            itemId: step.item.client_id,
          } as UpholsterySelectionMissingSheetSurfaceProps);
          return;
        }

        if (
          step.item?.client_id &&
          isUpholsteryWarningSection(step.working_section_name_snapshot) &&
          hasNoAvailableUpholstery(step)
        ) {
          openSurface(UPHOLSTERY_WARNING_SHEET_SURFACE_ID, {
            stepId,
            taskId,
            workingSectionId: sectionId,
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
              stepId,
              taskId,
              workingSectionId: sectionId,
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
        task_id: taskId,
        step_id: stepId,
        new_state: nextState,
        working_section_id: sectionId,
      });
    },
    [
      openSurface,
      queryClient,
      query.data?.items,
      sectionId,
      transitionStepState,
      user?.id,
    ],
  );

  const handleOpenStateFilter = useCallback(() => {
    openSurface(STEP_STATE_FILTER_SHEET_SURFACE_ID, {
      selectedStates: stateFilters,
      selectedMajorCategories: majorCategoryFilters,
      selectedReadinessStatuses: readinessStatusFilters,
      selectedTaskTypes: taskTypeFilters,
      onApply: (
        newFilters: StepState[],
        newMajorCategories: MajorCategory[],
        newReadinessStatuses: ReadinessStatus[],
        newTaskTypes: TaskType[],
      ) => {
        setStateFilters(newFilters);
        setMajorCategoryFilters(newMajorCategories);
        setReadinessStatusFilters(newReadinessStatuses);
        setTaskTypeFilters(newTaskTypes);
      },
    } as StepStateFilterSheetSurfaceProps);
  }, [
    majorCategoryFilters,
    openSurface,
    readinessStatusFilters,
    stateFilters,
    taskTypeFilters,
  ]);

  const handleOpenTaskActions = useCallback(
    (stepId: TaskStepId, taskId: TaskId, itemId: string | null) => {
      preloadPinNotificationsSlideSurface();
      openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
        stepId,
        taskId,
        itemId,
      } as TaskStepActionsSheetSurfaceProps);
    },
    [openSurface],
  );

  const handleOpenTaskDetail = useCallback(
    (stepId: TaskStepId, taskId: TaskId) => {
      openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
        stepId,
        taskId,
        workingSectionId: sectionId,
      } as TaskStepDetailSurfaceProps);
    },
    [openSurface, sectionId],
  );

  const handleOpenImageViewer = useCallback(
    (stepId: TaskStepId) => {
      const step = query.data?.items.find((s) => s.client_id === stepId);
      if (!step || step.item_images.length === 0) return;

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
        initialImageClientId: images[0].clientId,
        entityType: "item" as ImageLinkEntityType,
        entityClientId: entityClientId ?? "",
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [query.data?.items, openSurface],
  );

  const isPending = useDelayedTrue(query.isPending, 200);

  return {
    steps,
    rawSteps: query.data?.items ?? [],
    nonTerminalCounts,
    isPending,
    isError: query.isError,
    hasMore: query.data?.has_more ?? false,
    search,
    setSearch,
    stateFilters,
    majorCategoryFilters,
    readinessStatusFilters,
    taskTypeFilters,
    activeFilterCount,
    refetch,
    handleTransition,
    handleOpenStateFilter,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    handleOpenImageViewer,
    isTransitioning,
    transitioningStepId: pendingStepId ?? null,
  };
}
