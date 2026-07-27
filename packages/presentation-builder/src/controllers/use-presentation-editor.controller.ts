import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@beyo/lib";

import { useAddSlide } from "../actions/use-add-slide";
import { useArchivePresentation } from "../actions/use-archive-presentation";
import { useCreateNewVersion } from "../actions/use-create-new-version";
import { useDeleteSlide } from "../actions/use-delete-slide";
import { useDeleteSlideMedia } from "../actions/use-delete-slide-media";
import { useReorderSlides } from "../actions/use-reorder-slides";
import { useReplaceComposition } from "../actions/use-replace-composition";
import { useReplaceAudience } from "../actions/use-replace-audience";
import { usePublishPresentation } from "../actions/use-publish-presentation";
import { useUpdateSlide } from "../actions/use-update-slide";
import { useUpdatePresentationMetadata } from "../actions/use-update-presentation-metadata";
import { useUploadSlideMedia } from "../actions/use-upload-slide-media";
import { usePresentationDetail } from "../api/use-presentation-detail";
import { usePresentationPreview } from "../api/use-presentation-preview";
import {
  MEDIA_PANEL_DRAWERS,
  SLIDE_PANEL_DRAWERS,
  TEXT_PANEL_DRAWERS,
} from "../components/panels/PanelDrawer";
import type { Presentation, Slide } from "../types";
import type { CompositionElement } from "@beyo/presentation-runtime";
import {
  appendMediaElement,
  compositionElementId,
  createEditorDraftStore,
  replaceMediaElementSource,
  selectedSlideFromState,
  useEditorDraftStore,
} from "../editor/draft-store";
import {
  editorCompositionToPutBody,
  serverElementsToEditorComposition,
} from "../lib/composition-mapping";
import { measureText } from "../lib/text-measurement";
import {
  buildPublishPayloads,
  mapPublishFailure,
  type PublishFormState,
  type PublishIssueState,
  type PublishStep,
} from "../lib/publish-form";
import { assertPreviewCompositionParity } from "../preview/preview-parity";

const TITLE_DEBOUNCE_MS = 450;
const COMPOSITION_AUTOSAVE_MS = 2_000;

export type EditorPanelType = "slide" | "text" | "media";
export type EditorSelectionSource = "timeline" | "canvas";

type OpenDrawersByPanel = Record<EditorPanelType, ReadonlySet<string>>;

function createInitialOpenDrawers(): OpenDrawersByPanel {
  return {
    slide: new Set(),
    text: new Set(),
    media: new Set(),
  };
}

type UploadState = {
  fileName: string;
  errorMessage: string | null;
};

type PendingUploadQueue = {
  files: File[];
  replaceElementId: string | null;
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
  const [ctaDraft, setCtaDraft] = useState({ label: "", route: "" });
  const [ctaRouteError, setCtaRouteError] = useState<string | null>(null);
  const [inlineEditingElementId, setInlineEditingElementId] = useState<string | null>(null);
  const [openDrawersByPanel, setOpenDrawersByPanel] = useState<OpenDrawersByPanel>(
    createInitialOpenDrawers,
  );
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryUploadQueueRef = useRef<PendingUploadQueue | null>(null);
  const uploadQueueGenerationRef = useRef(0);
  const compositionFailureNotifiedRef = useRef(new Set<string>());
  const compositionFlushesRef = useRef(new Map<string, Promise<boolean>>());
  const mediaRefreshRef = useRef<Promise<Slide[] | null> | null>(null);
  const flushAllRef = useRef<() => Promise<boolean>>(async () => true);

  const detail = usePresentationDetail(presentationId);
  const preview = usePresentationPreview(presentationId, { enabled: false });
  const addSlide = useAddSlide();
  const deleteSlide = useDeleteSlide();
  const reorderSlides = useReorderSlides();
  const replaceComposition = useReplaceComposition();
  const updateSlide = useUpdateSlide();
  const updateMetadata = useUpdatePresentationMetadata();
  const uploadMedia = useUploadSlideMedia();
  const cancelUploadMutation = uploadMedia.cancel;
  const deleteMedia = useDeleteSlideMedia();
  const replaceAudience = useReplaceAudience();
  const publishPresentation = usePublishPresentation();
  const archivePresentation = useArchivePresentation();
  const createNewVersion = useCreateNewVersion();

  const ensureDrawerOpen = useCallback((panel: EditorPanelType, drawerId: string) => {
    setOpenDrawersByPanel((current) => {
      if (current[panel].has(drawerId)) return current;
      return {
        ...current,
        [panel]: new Set([...current[panel], drawerId]),
      };
    });
  }, []);

  const toggleDrawer = useCallback((panel: EditorPanelType, drawerId: string) => {
    setOpenDrawersByPanel((current) => {
      const next = new Set(current[panel]);
      if (next.has(drawerId)) next.delete(drawerId);
      else next.add(drawerId);
      return { ...current, [panel]: next };
    });
  }, []);

  useEffect(() => {
    if (titleTimerRef.current !== null) {
      clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    store.reset();
    setTitleDraft("");
    setNotice(null);
    setUploadState(null);
    setInlineEditingElementId(null);
    setOpenDrawersByPanel(createInitialOpenDrawers());
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

  const flushSlide = useCallback(async (slideId: string): Promise<boolean> => {
    const existingFlush = compositionFlushesRef.current.get(slideId);
    if (existingFlush) return existingFlush;
    const current = store.getState();
    if (current.presentation?.status !== "draft" || !current.dirtySlideIds.has(slideId)) return true;
    const slide = slideById(current.presentation, slideId);
    const elements = current.localCompositions[slideId];
    if (!slide || !elements) return true;
    const flushedRevision = current.slideRevisions[slideId] ?? 0;
    const flush = (async () => {
      try {
        const effectiveDurationMs = slide.duration_ms ?? 4_000;
        const body = editorCompositionToPutBody(
          serverElementsToEditorComposition(
            effectiveDurationMs,
            elements,
            slide.background_color,
          ),
          measureText,
        );
        const response = await replaceComposition.replaceCompositionAsync({
          presentationId,
          slideId,
          ...body,
        });
        store.reconcileAfterFlush(response, slideId, flushedRevision);
        compositionFailureNotifiedRef.current.delete(slideId);
        setNotice(null);
        return true;
      } catch (error) {
        const message = errorMessage(error);
        setNotice(message);
        if (!compositionFailureNotifiedRef.current.has(slideId)) {
          compositionFailureNotifiedRef.current.add(slideId);
          notify.error("Your timeline changes are still local. Choose Save draft to retry.", "Composition save failed");
        }
        return false;
      }
    })();
    compositionFlushesRef.current.set(slideId, flush);
    void flush.finally(() => {
      if (compositionFlushesRef.current.get(slideId) === flush) compositionFlushesRef.current.delete(slideId);
    });
    return flush;
  }, [presentationId, replaceComposition, store]);

  const flushAll = useCallback(async (): Promise<boolean> => {
    const dirtyIds = [...store.getState().dirtySlideIds];
    let succeeded = true;
    for (const slideId of dirtyIds) {
      if (!(await flushSlide(slideId))) succeeded = false;
    }
    return succeeded;
  }, [flushSlide, store]);
  flushAllRef.current = flushAll;

  const selectSlide = useCallback(
    (slideId: string) => {
      const previousSlideId = store.getState().selectedSlideId;
      if (previousSlideId === slideId) return;
      if (previousSlideId) void flushSlide(previousSlideId);
      setInlineEditingElementId(null);
      store.selectSlide(slideId);
    },
    [flushSlide, store],
  );

  useEffect(() => {
    const selected = selectedSlideFromState(draft);
    setCtaDraft({
      label: selected?.action?.label ?? "",
      route: selected?.action?.route ?? "",
    });
    setCtaRouteError(null);
  }, [draft.selectedSlideId]);

  useEffect(() => {
    if (readOnly || inlineEditingElementId !== null || draft.dirtySlideIds.size === 0) return;
    const timer = setTimeout(() => void flushAllRef.current(), COMPOSITION_AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft.revision, draft.dirtySlideIds.size, inlineEditingElementId, readOnly]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (store.getState().presentation?.status !== "draft" || store.getState().dirtySlideIds.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [store]);

  const commitCta = useCallback(async () => {
    const slideId = store.getState().selectedSlideId;
    if (readOnly || !slideId) return;
    const route = ctaDraft.route.trim();
    if (route !== "" && (!route.startsWith("/") || route.startsWith("//"))) {
      setCtaRouteError("Must start with / and use an in-app path");
      return;
    }
    setCtaRouteError(null);
    await flushSlide(slideId);
    try {
      const response = await updateSlide.updateSlideAsync({
        presentationId,
        slideId,
        action_label: ctaDraft.label.trim() || null,
        action_route: route || null,
      });
      reconcile(response, slideId);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }, [ctaDraft, flushSlide, presentationId, readOnly, reconcile, store, updateSlide]);

  useEffect(() => {
    if (ctaRouteError) {
      ensureDrawerOpen("slide", SLIDE_PANEL_DRAWERS.button);
    }
  }, [ctaRouteError, ensureDrawerOpen]);

  const updateElement = useCallback(
    (elementId: string, update: (element: CompositionElement) => CompositionElement) => {
      const slideId = store.getState().selectedSlideId;
      if (!readOnly && slideId) store.updateElement(slideId, elementId, update);
    },
    [readOnly, store],
  );

  const add = useCallback(async () => {
    if (readOnly || !presentation) return;
    await flushAll();
    setNotice(null);
    try {
      const previousIds = new Set(presentation.slides.map((slide) => slide.client_id));
      const response = await addSlide.addSlideAsync({
        presentationId,
        duration_ms: 4_000,
        playback_mode: "timed",
      });
      const added = response.slides.find((slide) => !previousIds.has(slide.client_id));
      reconcile(response, added?.client_id ?? response.slides.at(-1)?.client_id ?? null);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }, [addSlide, flushAll, presentation, presentationId, readOnly, reconcile]);

  // A draft deck always has at least one slide (design invariant: the editor's
  // timeline/text tools are inert without one). Fresh presentations arrive with
  // slides: [] — append the first slide automatically, once per mount.
  const autoFirstSlideRef = useRef(false);
  useEffect(() => {
    if (
      autoFirstSlideRef.current ||
      readOnly ||
      !presentation ||
      presentation.slides.length > 0
    )
      return;
    autoFirstSlideRef.current = true;
    void add();
  }, [add, presentation, readOnly]);

  const remove = useCallback(
    async (slideId: string) => {
      if (readOnly || !presentation || presentation.slides.length <= 1) return;
      await flushAll();
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
    [deleteSlide, draft.selectedSlideId, flushAll, presentation, presentationId, readOnly, reconcile],
  );

  const removeMedia = useCallback(
    async (mediaId: string, slideId = draft.selectedSlideId) => {
      if (readOnly || !presentation || !slideId) return;
      await flushAll();
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
    [deleteMedia, draft.selectedSlideId, flushAll, presentation, presentationId, readOnly, reconcile],
  );

  const reorder = useCallback(
    async (slideId: string, targetIndex: number) => {
      if (readOnly || !presentation) return;
      await flushAll();
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
    [draft.selectedSlideId, flushAll, presentation, presentationId, readOnly, reconcile, reorderSlides],
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
    async (file: File, replaceElementId: string | null): Promise<boolean> => {
      if (readOnly || !presentation) return false;
      const currentState = store.getState();
      const slide = selectedSlideFromState(currentState);
      if (!slide) return false;
      const elements = currentState.localCompositions[slide.client_id] ?? slide.elements;
      const previousMediaIds = new Set(slide.media.map((item) => item.client_id));
      const durationMs = slide.duration_ms ?? 4_000;
      const playheadMs = currentState.playbackBySlide[slide.client_id]?.playheadMs ?? 0;
      setUploadState({ fileName: file.name, errorMessage: null });
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
          (media) => !previousMediaIds.has(media.client_id),
        ) ?? responseSlide?.media.at(-1);
        if (!uploadedMedia) throw new Error(`Upload completed without media for ${file.name}.`);
        reconcile(response, slide.client_id);
        const nextElements = replaceElementId === null
          ? appendMediaElement(elements, uploadedMedia, durationMs, playheadMs)
          : replaceMediaElementSource(elements, replaceElementId, uploadedMedia);
        store.setLocalComposition(slide.client_id, nextElements);
        setUploadState(null);
        return true;
      } catch (error) {
        if (!isAbortError(error)) {
          setUploadState((current) => current ? { ...current, errorMessage: errorMessage(error) } : current);
          setNotice(errorMessage(error));
        }
        return false;
      }
    },
    [presentation, presentationId, readOnly, reconcile, store, uploadMedia],
  );

  const uploadFiles = useCallback(
    async (files: readonly File[], replaceElementId: string | null = null) => {
      if (files.length === 0 || readOnly || !presentation) return;
      const queue = [...files];
      const generation = ++uploadQueueGenerationRef.current;
      retryUploadQueueRef.current = null;
      await flushAll();
      for (let index = 0; index < queue.length; index += 1) {
        if (uploadQueueGenerationRef.current !== generation) return;
        const succeeded = await uploadFile(queue[index]!, replaceElementId);
        if (uploadQueueGenerationRef.current !== generation) return;
        if (!succeeded) {
          retryUploadQueueRef.current = {
            files: queue.slice(index),
            replaceElementId,
          };
          return;
        }
        replaceElementId = null;
      }
    },
    [flushAll, presentation, readOnly, uploadFile],
  );

  const onFilesDropped = useCallback(
    (files: File[]) => {
      void uploadFiles(files);
    },
    [uploadFiles],
  );

  const retryUpload = useCallback(() => {
    const pending = retryUploadQueueRef.current;
    if (pending) void uploadFiles(pending.files, pending.replaceElementId);
  }, [uploadFiles]);

  const cancelUpload = useCallback(() => {
    uploadQueueGenerationRef.current += 1;
    retryUploadQueueRef.current = null;
    cancelUploadMutation();
    setUploadState(null);
  }, [cancelUploadMutation]);

  const dismissUploadError = useCallback(() => setUploadState(null), []);

  const refetchLatest = useCallback(async () => {
    const result = await detail.refetch();
    if (result.data) reconcile(result.data, store.getState().selectedSlideId);
  }, [detail, reconcile, store]);

  const refreshMediaUrls = useCallback((): Promise<Slide[] | null> => {
    if (mediaRefreshRef.current) return mediaRefreshRef.current;
    const refresh = (async () => {
      const result = await detail.refetch();
      if (result.isError || !result.data) {
        setNotice(`Media could not be refreshed: ${errorMessage(result.error)}`);
        return null;
      }
      store.refreshMediaUrls(result.data);
      const current = store.getState();
      return current.presentation?.slides.map((slide) => ({
        ...slide,
        elements: current.localCompositions[slide.client_id] ?? slide.elements,
      })) ?? null;
    })().catch((error: unknown) => {
      setNotice(`Media could not be refreshed: ${errorMessage(error)}`);
      return null;
    }).finally(() => {
      mediaRefreshRef.current = null;
    });
    mediaRefreshRef.current = refresh;
    return refresh;
  }, [detail, store]);

  const openPreview = useCallback(async (): Promise<Slide[] | null> => {
    if (!(await flushAll())) {
      setNotice("Save the local timeline changes before previewing.");
      return null;
    }
    const current = store.getState();
    if (!current.presentation) return null;
    const slides = current.presentation.slides.map((slide) => ({
      ...slide,
      elements: current.localCompositions[slide.client_id] ?? slide.elements,
    }));
    if (import.meta.env.DEV) {
      const result = await preview.refetch();
      if (result.data) assertPreviewCompositionParity(slides, result.data);
    }
    return slides;
  }, [flushAll, preview, store]);

  const publish = useCallback(async (form: PublishFormState): Promise<PublishIssueState | null> => {
    const built = buildPublishPayloads(presentationId, form);
    if (!built.success) return built.issues;
    let step: PublishStep = "flush";
    try {
      if (!(await flushAll())) {
        return mapPublishFailure(new Error("Local timeline changes are still unsaved."), "flush");
      }
      step = "audience";
      const withAudience = await replaceAudience.replaceAudienceAsync(built.payloads.audience);
      reconcile(withAudience, store.getState().selectedSlideId);
      step = "metadata";
      const withMetadata = await updateMetadata.updatePresentationMetadataAsync(built.payloads.metadata);
      reconcile(withMetadata, store.getState().selectedSlideId);
      step = "publish";
      const published = await publishPresentation.publishPresentationAsync(presentationId);
      reconcile(published, store.getState().selectedSlideId);
      notify.success("Announcement published");
      return null;
    } catch (error) {
      const issues = mapPublishFailure(error, step);
      if (issues.raced) {
        setNotice(issues.summary.join(" "));
        await refetchLatest();
      }
      return issues;
    }
  }, [flushAll, presentationId, publishPresentation, reconcile, refetchLatest, replaceAudience, store, updateMetadata]);

  const archive = useCallback(async (): Promise<boolean> => {
    if (!presentation || presentation.status === "archived") return false;
    if (presentation.status === "draft" && !(await flushAll())) return false;
    try {
      const archived = await archivePresentation.archivePresentationAsync(presentationId);
      reconcile(archived, store.getState().selectedSlideId);
      notify.success("Announcement archived");
      return true;
    } catch (error) {
      const issues = mapPublishFailure(error, "publish");
      setNotice(issues.summary.join(" "));
      if (issues.raced) await refetchLatest();
      return false;
    }
  }, [archivePresentation, flushAll, presentation, presentationId, reconcile, refetchLatest, store]);

  const editAsNewVersion = useCallback(async (): Promise<string | null> => {
    if (!presentation || presentation.status === "draft") return null;
    try {
      const next = await createNewVersion.createNewVersionAsync(presentationId);
      notify.success(`Draft v${next.version} created`);
      return next.client_id;
    } catch (error) {
      const issues = mapPublishFailure(error, "publish");
      setNotice(issues.raced
        ? "Another version was created first. The announcement has been refreshed."
        : issues.summary.join(" "));
      if (issues.raced) await refetchLatest();
      return null;
    }
  }, [createNewVersion, presentation, presentationId, refetchLatest]);

  const selectElement = useCallback(
    (elementId: string, source: EditorSelectionSource) => {
      const current = store.getState();
      const slideId = current.selectedSlideId;
      if (!slideId) return;
      store.selectElement(slideId, elementId);

      const elements =
        current.localCompositions[slideId] ??
        slideById(current.presentation, slideId)?.elements ??
        [];
      const element = elements.find((candidate) => compositionElementId(candidate) === elementId);
      if (!element) return;

      const panel = element.element_type === "text" ? "text" : "media";
      const drawerId = source === "timeline"
        ? element.element_type === "text"
          ? TEXT_PANEL_DRAWERS.animations
          : MEDIA_PANEL_DRAWERS.animations
        : element.element_type === "text"
          ? TEXT_PANEL_DRAWERS.content
          : MEDIA_PANEL_DRAWERS.media;
      ensureDrawerOpen(panel, drawerId);
    },
    [ensureDrawerOpen, store],
  );

  const deselectElement = useCallback(() => {
    const slideId = store.getState().selectedSlideId;
    if (slideId) store.selectElement(slideId, null);
  }, [store]);

  return {
    presentation,
    selectedSlide,
    selectedSlideId: draft.selectedSlideId,
    localCompositions: draft.localCompositions,
    dirty: draft.dirtySlideIds.size > 0,
    dirtySlideIds: draft.dirtySlideIds,
    revision: draft.revision,
    slideRevisions: draft.slideRevisions,
    hydrated: draft.hydrated,
    isLoading: detail.isLoading,
    error: detail.error ?? (notice ? new Error(notice) : null),
    notice,
    readOnly,
    isMutating: addSlide.isPending || deleteSlide.isPending || reorderSlides.isPending || updateMetadata.isPending || uploadMedia.isPending || deleteMedia.isPending || replaceComposition.isPending || updateSlide.isPending || replaceAudience.isPending || publishPresentation.isPending || archivePresentation.isPending || createNewVersion.isPending,
    isSavingComposition: replaceComposition.isPending,
    title: titleDraft,
    onTitleChange: setTitleDraft,
    onTitleCommit: commitTitle,
    onSelectSlide: selectSlide,
    selectedElementId: selectedSlide ? draft.selectedElementIds[selectedSlide.client_id] ?? null : null,
    inlineEditingElementId,
    openDrawersByPanel,
    toggleDrawer,
    playback: selectedSlide ? draft.playbackBySlide[selectedSlide.client_id] ?? { playheadMs: 0, playing: false } : { playheadMs: 0, playing: false },
    onSelectElement: selectElement,
    onDeselectElement: deselectElement,
    onBeginInlineEdit: (elementId: string) => {
      if (!readOnly) setInlineEditingElementId(elementId);
    },
    onFinishInlineEdit: () => setInlineEditingElementId(null),
    onAddText: () => {
      const slideId = store.getState().selectedSlideId;
      if (!readOnly && slideId) {
        const elementId = store.addTextElement(slideId);
        if (elementId) setInlineEditingElementId(elementId);
      }
    },
    onUpdateElement: updateElement,
    onDeleteElement: (elementId: string) => {
      const slideId = store.getState().selectedSlideId;
      if (!readOnly && slideId) {
        store.deleteElement(slideId, elementId);
        setInlineEditingElementId((current) => current === elementId ? null : current);
      }
    },
    onDurationChange: (durationMs: number) => {
      const slideId = store.getState().selectedSlideId;
      if (!readOnly && slideId) store.setSlideDuration(slideId, durationMs);
    },
    onBackgroundColorChange: (color: string | null) => {
      const slideId = store.getState().selectedSlideId;
      if (!readOnly && slideId) store.setSlideBackgroundColor(slideId, color);
    },
    onPlaybackCheckpoint: (patch: Partial<{ playheadMs: number; playing: boolean }>) => {
      const slideId = store.getState().selectedSlideId;
      if (slideId) store.setPlayback(slideId, patch);
    },
    onSaveDraft: flushAll,
    onOpenPreview: openPreview,
    onPublish: publish,
    isPublishing: replaceAudience.isPending || updateMetadata.isPending || publishPresentation.isPending,
    onArchive: archive,
    isArchiving: archivePresentation.isPending,
    onEditAsNewVersion: editAsNewVersion,
    isCreatingNewVersion: createNewVersion.isPending,
    ctaLabel: ctaDraft.label,
    ctaRoute: ctaDraft.route,
    ctaRouteError,
    onCtaLabelChange: (label: string) => setCtaDraft((current) => ({ ...current, label })),
    onCtaRouteChange: (route: string) => {
      setCtaDraft((current) => ({ ...current, route }));
      setCtaRouteError(null);
    },
    onCtaCommit: commitCta,
    onAddSlide: add,
    onDeleteSlide: remove,
    onDeleteMedia: removeMedia,
    onReorder: reorder,
    onFilesDropped,
    onUploadFile: (file: File, replaceElementId?: string) =>
      uploadFiles([file], replaceElementId ?? null),
    uploadProgress: uploadMedia.progress,
    uploadState,
    cancelUpload,
    dismissUploadError,
    retryUpload,
    onMediaError: refreshMediaUrls,
    refetch: detail.refetch,
  };
}
