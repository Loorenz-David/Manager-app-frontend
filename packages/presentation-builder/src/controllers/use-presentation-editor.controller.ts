import { useCallback, useEffect, useRef, useState } from "react";

import { useAddSlide } from "../actions/use-add-slide";
import { useDeleteSlide } from "../actions/use-delete-slide";
import { useDeleteSlideMedia } from "../actions/use-delete-slide-media";
import { useReorderSlides } from "../actions/use-reorder-slides";
import { useUpdatePresentationMetadata } from "../actions/use-update-presentation-metadata";
import { useUploadSlideMedia } from "../actions/use-upload-slide-media";
import { usePresentationDetail } from "../api/use-presentation-detail";
import type { Presentation, Slide } from "../types";
import {
  appendOverlayMediaElement,
  createEditorDraftStore,
  replaceBackgroundMediaElement,
  selectedSlideFromState,
  slideHasBackground,
  useEditorDraftStore,
} from "../editor/draft-store";

const TITLE_DEBOUNCE_MS = 450;

type UploadRole = "background" | "overlay";

type UploadState = {
  fileName: string;
  role: UploadRole;
  errorMessage: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The requested editor action failed.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function moveSlide(slides: readonly Slide[], id: string, targetIndex: number): string[] {
  const ordered = slides.map((slide) => slide.client_id);
  const sourceIndex = ordered.indexOf(id);
  if (sourceIndex < 0) return ordered;
  const [moved] = ordered.splice(sourceIndex, 1);
  ordered.splice(Math.max(0, Math.min(targetIndex, ordered.length)), 0, moved!);
  return ordered;
}

function slideById(presentation: Presentation | null, slideId: string | null): Slide | null {
  return presentation?.slides.find((slide) => slide.client_id === slideId) ?? null;
}

export function usePresentationEditorController(presentationId: string) {
  const [store] = useState(createEditorDraftStore);
  const draft = useEditorDraftStore(store);
  const [titleDraft, setTitleDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUploadRef = useRef<{ file: File; role: UploadRole } | null>(null);

  const detail = usePresentationDetail(presentationId);
  const addSlide = useAddSlide();
  const deleteSlide = useDeleteSlide();
  const reorderSlides = useReorderSlides();
  const updateMetadata = useUpdatePresentationMetadata();
  const uploadMedia = useUploadSlideMedia();
  const cancelUploadMutation = uploadMedia.cancel;
  const deleteMedia = useDeleteSlideMedia();

  useEffect(() => {
    store.reset();
    setTitleDraft("");
    setNotice(null);
    setUploadState(null);
  }, [presentationId, store]);

  useEffect(() => {
    if (!detail.data || store.getState().hydrated) return;
    store.hydrate(detail.data);
    setTitleDraft(detail.data.title);
  }, [detail.data, store]);

  useEffect(
    () => () => {
      if (titleTimerRef.current !== null) clearTimeout(titleTimerRef.current);
      cancelUploadMutation();
      store.reset();
    },
    [cancelUploadMutation, store],
  );

  const presentation = draft.presentation;
  const selectedSlide = selectedSlideFromState(draft);
  const readOnly = presentation !== null && presentation.status !== "draft";

  const reconcile = useCallback(
    (next: Presentation, selectedSlideId?: string | null) => {
      store.reconcile(next, selectedSlideId);
      setTitleDraft(next.title);
    },
    [store],
  );

  const selectSlide = useCallback(
    (slideId: string) => {
      store.selectSlide(slideId);
    },
    [store],
  );

  const add = useCallback(async () => {
    if (readOnly || !presentation) return;
    setNotice(null);
    try {
      const previousIds = new Set(presentation.slides.map((slide) => slide.client_id));
      const response = await addSlide.addSlideAsync({ presentationId });
      const added = response.slides.find((slide) => !previousIds.has(slide.client_id));
      reconcile(response, added?.client_id ?? response.slides.at(-1)?.client_id ?? null);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }, [addSlide, presentation, presentationId, readOnly, reconcile]);

  const remove = useCallback(
    async (slideId: string) => {
      if (readOnly || !presentation || presentation.slides.length <= 1) return;
      const oldIndex = presentation.slides.findIndex((slide) => slide.client_id === slideId);
      if (oldIndex < 0) return;
      const wasSelected = draft.selectedSlideId === slideId;
      const neighborId = presentation.slides[oldIndex + 1]?.client_id ?? presentation.slides[oldIndex - 1]?.client_id ?? null;
      setNotice(null);
      try {
        const response = await deleteSlide.deleteSlideAsync({ presentationId, slideId });
        const selectedId = wasSelected
          ? response.slides.find((slide) => slide.client_id === neighborId)?.client_id ?? response.slides[0]?.client_id ?? null
          : draft.selectedSlideId;
        reconcile(response, selectedId);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    },
    [deleteSlide, draft.selectedSlideId, presentation, presentationId, readOnly, reconcile],
  );

  const removeMedia = useCallback(
    async (mediaId: string, slideId = draft.selectedSlideId) => {
      if (readOnly || !presentation || !slideId) return;
      const slide = slideById(presentation, slideId);
      if (!slide?.media.some((media) => media.client_id === mediaId)) return;
      setNotice(null);
      try {
        const response = await deleteMedia.deleteSlideMediaAsync({ presentationId, slideId, mediaId });
        reconcile(response, draft.selectedSlideId);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    },
    [deleteMedia, draft.selectedSlideId, presentation, presentationId, readOnly, reconcile],
  );

  const reorder = useCallback(
    async (slideId: string, targetIndex: number) => {
      if (readOnly || !presentation) return;
      const orderedSlideIds = moveSlide(presentation.slides, slideId, targetIndex);
      if (orderedSlideIds.every((id, index) => id === presentation.slides[index]?.client_id)) return;
      setNotice(null);
      try {
        const response = await reorderSlides.reorderSlidesAsync({ presentationId, ordered_slide_ids: orderedSlideIds });
        reconcile(response, draft.selectedSlideId);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    },
    [draft.selectedSlideId, presentation, presentationId, readOnly, reconcile, reorderSlides],
  );

  const commitTitle = useCallback(
    (value: string) => {
      if (titleTimerRef.current !== null) clearTimeout(titleTimerRef.current);
      if (readOnly || !presentation || value === presentation.title) return;
      if (value.trim().length === 0) {
        setTitleDraft(presentation.title);
        setNotice("A presentation title is required.");
        return;
      }
      titleTimerRef.current = setTimeout(() => {
        titleTimerRef.current = null;
        if (store.getState().presentation?.status !== "draft") return;
        void updateMetadata
          .updatePresentationMetadataAsync({ id: presentationId, title: value })
          .then((response) => reconcile(response, store.getState().selectedSlideId))
          .catch((error: unknown) => setNotice(errorMessage(error)));
      }, TITLE_DEBOUNCE_MS);
    },
    [presentation, presentationId, readOnly, reconcile, store, updateMetadata],
  );

  const uploadFile = useCallback(
    async (file: File, requestedRole?: UploadRole) => {
      if (readOnly || !presentation) return;
      const currentState = store.getState();
      const slide = selectedSlideFromState(currentState);
      if (!slide) return;
      const elements = currentState.localCompositions[slide.client_id] ?? slide.elements;
      const role = requestedRole ?? (slideHasBackground(elements) ? "overlay" : "background");
      lastUploadRef.current = { file, role };
      const oldBackgroundMediaId = elements.find(
        (element) => element.element_type === "media" && element.layer_index === 0,
      )?.media?.client_id;
      setUploadState({ fileName: file.name, role, errorMessage: null });
      setNotice(null);
      try {
        const response = await uploadMedia.uploadSlideMediaAsync({
          presentationId,
          slideId: slide.client_id,
          file,
          media_type: file.type.startsWith("video/") ? "video" : "image",
        });
        const responseSlide = slideById(response, slide.client_id);
        const uploadedMedia = responseSlide?.media.find(
          (media) => !slide.media.some((previous) => previous.client_id === media.client_id),
        ) ?? responseSlide?.media.at(-1);
        reconcile(response, slide.client_id);
        if (uploadedMedia) {
          const serverElements = responseSlide?.elements ?? elements;
          const serverHasUploadedElement = serverElements.some(
            (element) => element.element_type === "media" && element.media?.client_id === uploadedMedia.client_id,
          );
          const legacyAllBackgrounds = serverElements.length > 1 && serverElements.every(
            (element) => element.element_type === "media" && element.layer_index === 0,
          );
          const nextElements = role === "background"
            ? replaceBackgroundMediaElement(elements, uploadedMedia)
            : serverHasUploadedElement && !legacyAllBackgrounds
              ? serverElements
              : appendOverlayMediaElement(elements, uploadedMedia);
          store.setLocalComposition(slide.client_id, nextElements);
        }
        if (role === "background" && oldBackgroundMediaId && oldBackgroundMediaId !== uploadedMedia?.client_id) {
          const afterDelete = await deleteMedia.deleteSlideMediaAsync({
            presentationId,
            slideId: slide.client_id,
            mediaId: oldBackgroundMediaId,
          });
          reconcile(afterDelete, slide.client_id);
          if (uploadedMedia) store.setLocalComposition(slide.client_id, replaceBackgroundMediaElement(elements, uploadedMedia));
        }
        setUploadState(null);
      } catch (error) {
        if (!isAbortError(error)) {
          setUploadState((current) => current ? { ...current, errorMessage: errorMessage(error) } : current);
          setNotice(errorMessage(error));
        }
      }
    },
    [deleteMedia, presentation, presentationId, readOnly, reconcile, store, uploadMedia],
  );

  const onFilesDropped = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const retryUpload = useCallback(() => {
    const lastUpload = lastUploadRef.current;
    if (lastUpload) void uploadFile(lastUpload.file, lastUpload.role);
  }, [uploadFile]);

  const cancelUpload = useCallback(() => {
    cancelUploadMutation();
    setUploadState(null);
  }, [cancelUploadMutation]);

  const dismissUploadError = useCallback(() => setUploadState(null), []);

  return {
    presentation,
    selectedSlide,
    selectedSlideId: draft.selectedSlideId,
    localCompositions: draft.localCompositions,
    dirty: draft.dirtySlideIds.size > 0,
    revision: draft.revision,
    hydrated: draft.hydrated,
    isLoading: detail.isLoading,
    error: detail.error ?? (notice ? new Error(notice) : null),
    notice,
    readOnly,
    isMutating: addSlide.isPending || deleteSlide.isPending || reorderSlides.isPending || updateMetadata.isPending || uploadMedia.isPending || deleteMedia.isPending,
    title: titleDraft,
    onTitleChange: setTitleDraft,
    onTitleCommit: commitTitle,
    onSelectSlide: selectSlide,
    onAddSlide: add,
    onDeleteSlide: remove,
    onDeleteMedia: removeMedia,
    onReorder: reorder,
    onFilesDropped,
    onUploadFile: uploadFile,
    uploadProgress: uploadMedia.progress,
    uploadState,
    cancelUpload,
    dismissUploadError,
    retryUpload,
    refetch: detail.refetch,
  };
}
