import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  hasNoAvailableUpholstery,
  isUpholsteryWarningSection,
} from "../lib/step-transition-guards";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type StepDependencyWarningSheetSurfaceProps,
  type StepStateFilterSheetSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
  type UpholsteryWarningSheetSurfaceProps,
} from "../surface-ids";
import {
  computeNonTerminalCounts,
  toIncompleteDependencyViewModels,
  toTaskStepCardViewModel,
  type NonTerminalStepCounts,
  type StepState,
  type TaskStepCardViewModel,
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

export const DEFAULT_STATE_FILTERS: StepState[] = [
  "pending",
  "working",
  "paused",
  "ended_shift",
];

export type WorkingSectionStepsController = {
  steps: TaskStepCardViewModel[];
  nonTerminalCounts: NonTerminalStepCounts;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  stateFilters: StepState[];
  activeFilterCount: number;
  refetch: () => Promise<void>;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleOpenStateFilter: () => void;
  handleOpenTaskActions: (stepId: TaskStepId, taskId: TaskId) => void;
  handleOpenTaskDetail: (stepId: TaskStepId, taskId: TaskId) => void;
  handleOpenImageViewer: (stepId: TaskStepId) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
};

export function useWorkingSectionStepsController(
  sectionId: WorkingSectionId,
): WorkingSectionStepsController {
  const [search, setSearch] = useState("");
  const [stateFilters, setStateFilters] =
    useState<StepState[]>(DEFAULT_STATE_FILTERS);
  const debouncedSearch = useDebounced(search, 300);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useWorkingSectionStepsQuery({
    working_section_id: sectionId,
    q: debouncedSearch || undefined,
    record_step_state: stateFilters.join(","),
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
    const isDefaultFilter =
      stateFilters.length === DEFAULT_STATE_FILTERS.length &&
      DEFAULT_STATE_FILTERS.every((state) => stateFilters.includes(state));

    return isDefaultFilter ? 0 : stateFilters.length;
  }, [stateFilters]);

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
      onApply: (newFilters: StepState[]) => {
        setStateFilters(newFilters);
      },
    } as StepStateFilterSheetSurfaceProps);
  }, [openSurface, stateFilters]);

  const handleOpenTaskActions = useCallback(
    (stepId: TaskStepId, taskId: TaskId) => {
      openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
        stepId,
        taskId,
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

  return {
    steps,
    nonTerminalCounts,
    isPending: query.isPending,
    isError: query.isError,
    hasMore: query.data?.has_more ?? false,
    search,
    setSearch,
    stateFilters,
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
