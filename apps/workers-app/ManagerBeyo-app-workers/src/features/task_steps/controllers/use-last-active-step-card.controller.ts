import { useCallback, useMemo, useRef } from "react";
import { useSurface } from "@beyo/hooks";
import { useEntityView } from "@beyo/realtime";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { isSameImagePath } from "@beyo/lib";
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
import { useUserLastActiveStepQuery } from "../api/use-user-last-active-step";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  type PauseReasonSheetSurfaceProps,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import { toTaskStepCardViewModel, type StepState } from "../types";

export function useLastActiveStepCardController() {
  const query = useUserLastActiveStepQuery();
  const step = query.data ?? null;

  useEntityView("task_step", step?.client_id ?? null);

  // Ref so that handleOpenImageViewer can read the latest step without
  // needing step in its useCallback deps (which would make onTap unstable
  // and break memo on CardThumbnail, causing image flicker on refetch).
  const stepRef = useRef(step);
  stepRef.current = step;

  // Keeps the previous signed URL alive when the refetch returns the same
  // image with a different query string (e.g. a new expiry token). If the
  // pathname matches we return the cached URL reference, so CardThumbnail's
  // memo sees no prop change and the browser never reloads the image.
  const stableImageUrlRef = useRef<{ stepId: TaskStepId; url: string } | null>(
    null,
  );

  const vm = useMemo(() => {
    if (!step) return null;
    const rawVm = toTaskStepCardViewModel(step);

    if (rawVm.firstImageUrl !== null) {
      const cached = stableImageUrlRef.current;
      if (
        cached &&
        cached.stepId === rawVm.stepId &&
        isSameImagePath(cached.url, rawVm.firstImageUrl)
      ) {
        return { ...rawVm, firstImageUrl: cached.url };
      }
      stableImageUrlRef.current = {
        stepId: rawVm.stepId,
        url: rawVm.firstImageUrl,
      };
    } else {
      stableImageUrlRef.current = null;
    }

    return rawVm;
  }, [step]);

  const {
    transitionStepState,
    isPending: isTransitioning,
    pendingStepId,
  } = useTransitionStepState();
  const { open: openSurface } = useSurface();

  const handleTransition = useCallback(
    (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
      if (!step) {
        return;
      }

      if (nextState === "paused") {
        openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
          stepId,
          taskId,
          workingSectionId: step.working_section_id,
        } as PauseReasonSheetSurfaceProps);
        return;
      }

      transitionStepState({
        task_id: taskId,
        step_id: stepId,
        new_state: nextState,
        working_section_id: step.working_section_id,
      });
    },
    [step, transitionStepState, openSurface],
  );

  const handleOpenDetail = useCallback(() => {
    if (!step) {
      return;
    }

    openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
      stepId: step.client_id,
      taskId: step.task_id,
      workingSectionId: step.working_section_id,
    } as TaskStepDetailSurfaceProps);
  }, [step, openSurface]);

  const handleOpenImageViewer = useCallback(() => {
    const s = stepRef.current;
    if (!s || s.item_images.length === 0) {
      return;
    }

    const entityClientId = s.item?.client_id ?? null;
    const images: ImageViewModel[] = s.item_images.map((img, index) => {
      const rawAnnotation =
        "image_annotation" in img ? img.image_annotation : undefined;
      const parsed = ImageAnnotationSchema.nullable().safeParse(rawAnnotation);
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
      initialImageClientId: images[0]?.clientId ?? "",
      entityType: "item" as ImageLinkEntityType,
      entityClientId: entityClientId ?? "",
      mode: "preview-only",
      enableOnDemandImageLoad: false,
    });
  }, [openSurface]); // stepRef is a stable ref — step is read at call time via stepRef.current

  return {
    step,
    vm,
    isPending: query.isPending,
    isTransitioning: isTransitioning && pendingStepId === step?.client_id,
    handleTransition,
    handleOpenDetail,
    handleOpenImageViewer,
  };
}

export type LastActiveStepCardController = ReturnType<
  typeof useLastActiveStepCardController
>;
