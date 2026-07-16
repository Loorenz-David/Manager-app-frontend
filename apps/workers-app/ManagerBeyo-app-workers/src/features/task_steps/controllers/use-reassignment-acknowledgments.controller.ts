import { useCallback, useMemo, useRef } from "react";
import { useSurface } from "@beyo/hooks";
import { isSameImagePath, type TaskStepId } from "@beyo/lib";
import {
  IMAGE_VIEWER_SURFACE_ID,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  type ImageLinkEntityType,
  type ImageUploadState,
  type ImageViewModel,
} from "@beyo/images";
import { useAcknowledgeReassignments } from "../actions/use-acknowledge-reassignments";
import { useMarkAcknowledgmentsSeen } from "../actions/use-mark-acknowledgments-seen";
import { usePendingAcknowledgmentsQuery } from "../api/use-pending-acknowledgments";
import {
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import {
  toReassignmentAckViewModel,
  type ReassignmentAckViewModel,
  type ReassignmentStep,
} from "../types";

export function useReassignmentAcknowledgmentsController() {
  const query = usePendingAcknowledgmentsQuery();
  const items = useMemo(() => query.data ?? [], [query.data]);

  // Stable signed-URL cache keyed by stepId — prevents thumbnail reload/flicker on refetch.
  const stableImageUrlsRef = useRef<Map<string, string>>(new Map());

  const vms = useMemo<ReassignmentAckViewModel[]>(() => {
    const nextCache = new Map<string, string>();
    const mapped = items.map((item) => {
      const vm = toReassignmentAckViewModel(item);
      if (vm.firstImageUrl !== null) {
        const cached = stableImageUrlsRef.current.get(vm.stepId);
        const stableUrl =
          cached && isSameImagePath(cached, vm.firstImageUrl)
            ? cached
            : vm.firstImageUrl;
        nextCache.set(vm.stepId, stableUrl);
        return { ...vm, firstImageUrl: stableUrl };
      }
      return vm;
    });
    stableImageUrlsRef.current = nextCache;
    return mapped;
  }, [items]);

  const { acknowledge, isPending: isAcknowledging, pendingStepIds } =
    useAcknowledgeReassignments();
  const { markSeen } = useMarkAcknowledgmentsSeen();
  const { open: openSurface } = useSurface();

  const pendingStepIdSet = useMemo(
    () => (pendingStepIds ? new Set<string>(pendingStepIds) : null),
    [pendingStepIds],
  );

  const acknowledgeOne = useCallback(
    (stepId: TaskStepId) => {
      acknowledge({ step_ids: [stepId] });
    },
    [acknowledge],
  );

  const acknowledgeAll = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    acknowledge({ step_ids: items.map((item) => item.acknowledgment.step_id) });
  }, [acknowledge, items]);

  // De-dupe ref so /seen is only submitted once per step across renders.
  const seenSubmittedRef = useRef<Set<string>>(new Set());
  const markVisibleSeen = useCallback(() => {
    const unseen = vms
      .filter(
        (vm) =>
          vm.firstSeenAt === null && !seenSubmittedRef.current.has(vm.stepId),
      )
      .map((vm) => vm.stepId);

    if (unseen.length === 0) {
      return;
    }
    for (const id of unseen) {
      seenSubmittedRef.current.add(id);
    }
    markSeen({ step_ids: unseen });
  }, [vms, markSeen]);

  const handleOpenDetail = useCallback(
    (step: ReassignmentStep) => {
      openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
        stepId: step.client_id,
        taskId: step.task_id,
        workingSectionId: step.working_section_id,
        initialStep: step,
      } as TaskStepDetailSurfaceProps);
    },
    [openSurface],
  );

  const handleOpenImageViewer = useCallback(
    (step: ReassignmentStep) => {
      if (step.item_images.length === 0) {
        return;
      }

      const entityClientId = step.item?.client_id ?? null;
      const images: ImageViewModel[] = step.item_images.map((img, index) => {
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
    },
    [openSurface],
  );

  return {
    vms,
    count: vms.length,
    hasCards: vms.length > 0,
    isPending: query.isPending,
    isAcknowledging,
    pendingStepIds: pendingStepIdSet,
    acknowledge: acknowledgeOne,
    acknowledgeAll,
    markVisibleSeen,
    handleOpenDetail,
    handleOpenImageViewer,
  };
}

export type ReassignmentAcknowledgmentsController = ReturnType<
  typeof useReassignmentAcknowledgmentsController
>;
