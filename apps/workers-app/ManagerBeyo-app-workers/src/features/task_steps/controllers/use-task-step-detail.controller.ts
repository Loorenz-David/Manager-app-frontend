import { useCallback, useMemo } from "react";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
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
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import {
  STEP_TERMINAL_STATES,
  toTaskStepCardViewModel,
  type StepState,
  type TaskStep,
  type TaskStepCardViewModel,
} from "../types";

export type TaskStepDetailController = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  step: TaskStep | null;
  vm: TaskStepCardViewModel | null;
  isPending: boolean;
  isError: boolean;
  isStepTerminal: boolean;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleComplete: () => void;
  handleOpenImageViewer: (initialImageClientId: string) => void;
  handleOpenActionsSheet: () => void;
  handleOpenFlowRecord: (entityClientId: string) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
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

  const handleTransition = useCallback(
    (targetStepId: TaskStepId, targetTaskId: TaskId, nextState: StepState) => {
      transitionStepState({
        task_id: targetTaskId,
        step_id: targetStepId,
        new_state: nextState,
        working_section_id: resolvedWorkingSectionId,
      });
    },
    [transitionStepState, resolvedWorkingSectionId],
  );

  const handleComplete = useCallback(() => {
    if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;
    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "completed",
      working_section_id: resolvedWorkingSectionId,
    });
  }, [vm, resolvedTaskId, resolvedStepId, resolvedWorkingSectionId, transitionStepState]);

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

  // Flow record detail surface not yet registered in workers app.
  const handleOpenFlowRecord = useCallback((_entityClientId: string) => {}, []);

  return {
    stepId: resolvedStepId,
    taskId: resolvedTaskId,
    workingSectionId: resolvedWorkingSectionId,
    step,
    vm,
    isPending: query.isPending,
    isError: query.isError,
    isStepTerminal: vm ? STEP_TERMINAL_STATES.has(vm.state) : false,
    handleTransition,
    handleComplete,
    handleOpenImageViewer,
    handleOpenActionsSheet,
    handleOpenFlowRecord,
    isTransitioning,
    transitioningStepId: pendingStepId ?? null,
  };
}
