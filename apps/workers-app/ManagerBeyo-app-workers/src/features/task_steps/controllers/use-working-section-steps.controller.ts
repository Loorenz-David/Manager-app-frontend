import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSurface } from "@beyo/hooks";
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
import {
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import {
  computeNonTerminalCounts,
  toTaskStepCardViewModel,
  type NonTerminalStepCounts,
  type StepState,
  type TaskStepCardViewModel,
} from "../types";

function isSameImagePath(a: string, b: string): boolean {
  try {
    return new URL(a).pathname === new URL(b).pathname;
  } catch {
    return a === b;
  }
}

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

export type WorkingSectionStepsController = {
  steps: TaskStepCardViewModel[];
  nonTerminalCounts: NonTerminalStepCounts;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  refetch: () => Promise<void>;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
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
  const debouncedSearch = useDebounced(search, 300);

  const query = useWorkingSectionStepsQuery({
    working_section_id: sectionId,
    q: debouncedSearch || undefined,
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

  const handleTransition = useCallback(
    (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
      transitionStepState({
        task_id: taskId,
        step_id: stepId,
        new_state: nextState,
        working_section_id: sectionId,
      });
    },
    [transitionStepState, sectionId],
  );

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
    refetch,
    handleTransition,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    handleOpenImageViewer,
    isTransitioning,
    transitioningStepId: pendingStepId ?? null,
  };
}
