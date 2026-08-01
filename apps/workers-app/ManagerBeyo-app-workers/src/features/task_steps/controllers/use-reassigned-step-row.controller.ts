import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSurface } from "@beyo/hooks";
import type { TaskId, TaskStepId } from "@beyo/lib";
import {
  IMAGE_VIEWER_SURFACE_ID,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  type ImageLinkEntityType,
  type ImageUploadState,
  type ImageViewModel,
} from "@beyo/images";
import {
  reassignedStepKeys,
  type ReassignedStepItem,
} from "@beyo/task-working-sections";
import { useTransitionStepState } from "../actions/use-transition-step-state";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import { toTaskStepCardViewModel, type StepState } from "../types";

/**
 * Wiring for one row of the package-owned reassigned-steps page. Replicates the
 * section list's four interactions; batch mode does not apply here.
 */
export function useReassignedStepRowController(step: ReassignedStepItem) {
  const queryClient = useQueryClient();
  const { open: openSurface } = useSurface();
  const {
    transitionStepState,
    isPending: isTransitioning,
    pendingStepId,
  } = useTransitionStepState();

  const card = useMemo(() => toTaskStepCardViewModel(step), [step]);

  const handleOpenTaskDetail = useCallback(() => {
    // Opened from outside a section list, so no `listQueryParams` — the detail
    // page falls back to `initialStep` plus its own fetch for that step.
    openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
      stepId: step.client_id,
      taskId: step.task_id,
      workingSectionId: step.working_section_id,
      initialStep: step,
    } as TaskStepDetailSurfaceProps);
  }, [openSurface, step]);

  const handleOpenTaskActions = useCallback(() => {
    openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
      stepId: step.client_id,
      taskId: step.task_id,
      itemId: step.item?.client_id ?? null,
      itemArticleNumber: step.item?.article_number ?? null,
      itemSku: step.item?.sku ?? null,
      itemCategoryId: step.item?.item_category_id ?? null,
      // Not carried by this endpoint's compact section payload; the Shopify
      // action is section-scoped and stays off here.
      allowsShopifyProductModifications: false,
    } as TaskStepActionsSheetSurfaceProps);
  }, [openSurface, step]);

  const handleOpenImageViewer = useCallback(() => {
    if (step.item_images.length === 0) {
      return;
    }

    const entityClientId = step.item?.client_id ?? null;
    const images: ImageViewModel[] = step.item_images.map((img, index) => {
      // Only element 0 carries the rich shape (handoff §5.7) — narrow before use.
      const rawAnnotation =
        "image_annotation" in img ? img.image_annotation : undefined;
      const parsed = ImageAnnotationSchema.nullable().safeParse(rawAnnotation);
      const parsedAnnotation = parsed.success && parsed.data ? parsed.data : null;
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
      initialImageClientId: images[0]?.clientId ?? "",
      entityType: "item" as ImageLinkEntityType,
      entityClientId: entityClientId ?? "",
      mode: "preview-only",
      enableOnDemandImageLoad: false,
    });
  }, [openSurface, step]);

  const handleTransition = useCallback(
    (_stepId: TaskStepId, _taskId: TaskId, nextState: StepState) => {
      if (nextState === "paused") {
        openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
          stepId: step.client_id,
          taskId: step.task_id,
          workingSectionId: step.working_section_id,
        } as PauseReasonSheetSurfaceProps);
        return;
      }

      transitionStepState(
        {
          task_id: step.task_id,
          step_id: step.client_id,
          new_state: nextState,
          working_section_id: step.working_section_id,
        },
        {
          // A step that reaches a terminal state leaves this list on its own
          // (handoff §1) — re-read both the list and the badge.
          onSettled: () => {
            void queryClient.invalidateQueries({
              queryKey: reassignedStepKeys.all,
            });
          },
        },
      );
    },
    [openSurface, queryClient, step, transitionStepState],
  );

  return {
    card,
    transitioningStepId: isTransitioning ? (pendingStepId ?? null) : null,
    handleOpenTaskDetail,
    handleOpenTaskActions,
    handleOpenImageViewer,
    handleTransition,
  };
}

export type ReassignedStepRowController = ReturnType<
  typeof useReassignedStepRowController
>;
