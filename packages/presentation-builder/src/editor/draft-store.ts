import type { CompositionElement, SlideMedia } from "@beyo/presentation-runtime";
import { useSyncExternalStore } from "react";

import { roundSlideDurationMs } from "../lib/slide-duration";
import type { Presentation, Slide } from "../types";

export type EditorDraftState = {
  presentation: Presentation | null;
  selectedSlideId: string | null;
  localCompositions: Record<string, CompositionElement[]>;
  dirtySlideIds: ReadonlySet<string>;
  selectedElementIds: Record<string, string | null>;
  playbackBySlide: Record<string, { playheadMs: number; playing: boolean }>;
  slideRevisions: Record<string, number>;
  revision: number;
  hydrated: boolean;
};

export type EditorDraftStore = {
  getState: () => EditorDraftState;
  subscribe: (listener: () => void) => () => void;
  hydrate: (presentation: Presentation) => void;
  reconcile: (presentation: Presentation, selectedSlideId?: string | null) => void;
  selectSlide: (slideId: string) => void;
  setLocalComposition: (slideId: string, elements: readonly CompositionElement[]) => void;
  selectElement: (slideId: string, elementId: string | null) => void;
  addTextElement: (slideId: string) => string | null;
  updateElement: (
    slideId: string,
    elementId: string,
    update: (element: CompositionElement) => CompositionElement,
  ) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  setSlideDuration: (slideId: string, durationMs: number) => void;
  setSlideBackgroundColor: (slideId: string, color: string | null) => void;
  setPlayback: (slideId: string, patch: Partial<{ playheadMs: number; playing: boolean }>) => void;
  reconcileAfterFlush: (
    presentation: Presentation,
    slideId: string,
    flushedRevision: number,
  ) => void;
  refreshMediaUrls: (presentation: Presentation) => void;
  reset: () => void;
};

export function compositionElementId(element: CompositionElement): string {
  return element.client_id ?? `legacy-${element.sequence_order}`;
}

function windowStartingAtPlayhead(
  durationMs: number,
  playheadMs: number,
): { startMs: number; endMs: number } {
  const startMs = Math.min(Math.max(0, playheadMs), Math.max(0, durationMs - 400));
  return { startMs, endMs: Math.min(durationMs, startMs + 2_500) };
}

function cloneElements(elements: readonly CompositionElement[]): CompositionElement[] {
  return elements.map((element) => ({
    ...element,
    layout: element.layout ? { ...element.layout } : null,
    style: element.style ? { ...element.style } : null,
    media: element.media ? { ...element.media } : null,
    enter_animation: element.enter_animation ? { ...element.enter_animation } : null,
    exit_animation: element.exit_animation ? { ...element.exit_animation } : null,
  }));
}

function clonePresentation(presentation: Presentation): Presentation {
  return {
    ...presentation,
    slides: presentation.slides.map((slide) => ({
      ...slide,
      media: slide.media.map((media) => ({ ...media })),
      elements: cloneElements(slide.elements),
    })),
    audience: {
      ...presentation.audience,
      app_keys: [...presentation.audience.app_keys],
      role_keys: [...presentation.audience.role_keys],
      workspace_ids: [...presentation.audience.workspace_ids],
      user_ids: [...presentation.audience.user_ids],
    },
  };
}

function compositionsFor(presentation: Presentation): Record<string, CompositionElement[]> {
  return Object.fromEntries(
    presentation.slides.map((slide) => [slide.client_id, cloneElements(slide.elements)]),
  );
}

function mediaById(presentation: Presentation): Map<string, SlideMedia> {
  const media = new Map<string, SlideMedia>();
  for (const slide of presentation.slides) {
    for (const item of slide.media) media.set(item.client_id, item);
    for (const element of slide.elements) {
      if (element.media) media.set(element.media.client_id, element.media);
    }
  }
  return media;
}

function refreshElementMedia(
  elements: readonly CompositionElement[],
  refreshedMedia: ReadonlyMap<string, SlideMedia>,
): CompositionElement[] {
  return elements.map((element) => ({
    ...element,
    media: element.media
      ? { ...(refreshedMedia.get(element.media.client_id) ?? element.media) }
      : null,
  }));
}

function firstExistingSlideId(presentation: Presentation, requested: string | null | undefined): string | null {
  if (requested && presentation.slides.some((slide) => slide.client_id === requested)) return requested;
  return presentation.slides[0]?.client_id ?? null;
}

export function createEditorDraftStore(): EditorDraftStore {
  let localElementSequence = 0;
  let state: EditorDraftState = {
    presentation: null,
    selectedSlideId: null,
    localCompositions: {},
    dirtySlideIds: new Set(),
    selectedElementIds: {},
    playbackBySlide: {},
    slideRevisions: {},
    revision: 0,
    hydrated: false,
  };
  const listeners = new Set<() => void>();

  const publish = (next: EditorDraftState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const replaceFromServer = (presentation: Presentation, selectedSlideId?: string | null) => {
    const nextPresentation = clonePresentation(presentation);
    publish({
      presentation: nextPresentation,
      selectedSlideId: firstExistingSlideId(nextPresentation, selectedSlideId ?? state.selectedSlideId),
      localCompositions: compositionsFor(nextPresentation),
      dirtySlideIds: new Set(),
      selectedElementIds: Object.fromEntries(nextPresentation.slides.map((slide) => [slide.client_id, null])),
      playbackBySlide: Object.fromEntries(nextPresentation.slides.map((slide) => [slide.client_id, { playheadMs: 0, playing: false }])),
      slideRevisions: Object.fromEntries(nextPresentation.slides.map((slide) => [slide.client_id, 0])),
      revision: state.revision + 1,
      hydrated: true,
    });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate: (presentation) => replaceFromServer(presentation, null),
    reconcile: replaceFromServer,
    selectSlide: (slideId) => {
      if (!state.presentation || !state.presentation.slides.some((slide) => slide.client_id === slideId)) return;
      publish({ ...state, selectedSlideId: slideId, revision: state.revision + 1 });
    },
    setLocalComposition: (slideId, elements) => {
      if (!state.presentation || !state.presentation.slides.some((slide) => slide.client_id === slideId)) return;
      publish({
        ...state,
        localCompositions: { ...state.localCompositions, [slideId]: cloneElements(elements) },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        slideRevisions: {
          ...state.slideRevisions,
          [slideId]: (state.slideRevisions[slideId] ?? 0) + 1,
        },
        revision: state.revision + 1,
      });
    },
    selectElement: (slideId, elementId) => {
      if (!(slideId in state.localCompositions)) return;
      publish({
        ...state,
        selectedElementIds: { ...state.selectedElementIds, [slideId]: elementId },
        revision: state.revision + 1,
      });
    },
    addTextElement: (slideId) => {
      const slide = state.presentation?.slides.find((candidate) => candidate.client_id === slideId);
      if (!slide) return null;
      const elements = state.localCompositions[slideId] ?? slide.elements;
      const durationMs = slide.duration_ms ?? 4_000;
      const playheadMs = state.playbackBySlide[slideId]?.playheadMs ?? 0;
      const { startMs, endMs } = windowStartingAtPlayhead(durationMs, playheadMs);
      const id = `local-text-${++localElementSequence}`;
      const layerIndex = Math.max(9, ...elements.filter((element) => element.element_type === "text").map((element) => element.layer_index)) + 1;
      const next: CompositionElement = {
        client_id: id,
        element_type: "text",
        sequence_order: elements.length,
        layer_index: layerIndex,
        start_ms: startMs,
        end_ms: endMs,
        media: null,
        text_content: "New text",
        layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.1, anchor: "center" },
        style: {
          text_role: "body",
          text_align: "center",
          font_size: 44,
          font_weight: 400,
        },
        enter_animation: { type: "fade_up", duration_ms: 450 },
        exit_animation: { type: "fade", duration_ms: 450 },
      };
      const nextElements = [...elements, next];
      publish({
        ...state,
        localCompositions: { ...state.localCompositions, [slideId]: cloneElements(nextElements) },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        selectedElementIds: { ...state.selectedElementIds, [slideId]: id },
        slideRevisions: { ...state.slideRevisions, [slideId]: (state.slideRevisions[slideId] ?? 0) + 1 },
        revision: state.revision + 1,
      });
      return id;
    },
    updateElement: (slideId, elementId, update) => {
      const elements = state.localCompositions[slideId];
      if (!elements) return;
      let changed = false;
      const next = elements.map((element) => {
        if (compositionElementId(element) !== elementId) return element;
        changed = true;
        return update(cloneElements([element])[0]!);
      });
      if (!changed) return;
      publish({
        ...state,
        localCompositions: { ...state.localCompositions, [slideId]: cloneElements(next) },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        slideRevisions: { ...state.slideRevisions, [slideId]: (state.slideRevisions[slideId] ?? 0) + 1 },
        revision: state.revision + 1,
      });
    },
    deleteElement: (slideId, elementId) => {
      const elements = state.localCompositions[slideId];
      if (!elements?.some((element) => compositionElementId(element) === elementId)) return;
      const next = elements
        .filter((element) => compositionElementId(element) !== elementId)
        .map((element, sequence_order) => ({ ...element, sequence_order }));
      publish({
        ...state,
        localCompositions: { ...state.localCompositions, [slideId]: cloneElements(next) },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        selectedElementIds: { ...state.selectedElementIds, [slideId]: null },
        slideRevisions: { ...state.slideRevisions, [slideId]: (state.slideRevisions[slideId] ?? 0) + 1 },
        revision: state.revision + 1,
      });
    },
    setSlideDuration: (slideId, durationMs) => {
      if (!state.presentation) return;
      const roundedDuration = roundSlideDurationMs(durationMs);
      const elements = state.localCompositions[slideId];
      if (!elements) return;
      const nextElements = elements.map((element) => {
        if (element.end_ms === null) return { ...element, start_ms: Math.min(element.start_ms, roundedDuration) };
        const end_ms = Math.min(element.end_ms, roundedDuration);
        const start_ms = Math.min(element.start_ms, Math.max(0, end_ms - 400));
        return { ...element, start_ms, end_ms };
      });
      const nextPresentation = {
        ...state.presentation,
        slides: state.presentation.slides.map((slide) =>
          slide.client_id === slideId ? { ...slide, duration_ms: roundedDuration, playback_mode: "timed" as const } : slide),
      };
      const playback = state.playbackBySlide[slideId] ?? { playheadMs: 0, playing: false };
      publish({
        ...state,
        presentation: nextPresentation,
        localCompositions: { ...state.localCompositions, [slideId]: cloneElements(nextElements) },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        playbackBySlide: {
          ...state.playbackBySlide,
          [slideId]: { ...playback, playheadMs: Math.min(playback.playheadMs, roundedDuration) },
        },
        slideRevisions: { ...state.slideRevisions, [slideId]: (state.slideRevisions[slideId] ?? 0) + 1 },
        revision: state.revision + 1,
      });
    },
    setSlideBackgroundColor: (slideId, color) => {
      if (!state.presentation) return;
      const slide = state.presentation.slides.find(
        (candidate) => candidate.client_id === slideId,
      );
      if (!slide || slide.background_color === color) return;
      publish({
        ...state,
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((candidate) =>
            candidate.client_id === slideId
              ? { ...candidate, background_color: color }
              : candidate),
        },
        dirtySlideIds: new Set([...state.dirtySlideIds, slideId]),
        slideRevisions: {
          ...state.slideRevisions,
          [slideId]: (state.slideRevisions[slideId] ?? 0) + 1,
        },
        revision: state.revision + 1,
      });
    },
    setPlayback: (slideId, patch) => {
      if (!(slideId in state.localCompositions)) return;
      const current = state.playbackBySlide[slideId] ?? { playheadMs: 0, playing: false };
      publish({
        ...state,
        playbackBySlide: { ...state.playbackBySlide, [slideId]: { ...current, ...patch } },
        revision: state.revision + 1,
      });
    },
    reconcileAfterFlush: (presentation, slideId, flushedRevision) => {
      const nextPresentation = clonePresentation(presentation);
      const hasNewerLocalEdits =
        (state.slideRevisions[slideId] ?? 0) !== flushedRevision;
      const dirtySlideIds = new Set(state.dirtySlideIds);
      if (!hasNewerLocalEdits) dirtySlideIds.delete(slideId);
      const presentationWithLocalDurations = {
        ...nextPresentation,
        slides: nextPresentation.slides.map((slide) => {
          if (!dirtySlideIds.has(slide.client_id)) return slide;
          const localSlide = state.presentation?.slides.find((candidate) => candidate.client_id === slide.client_id);
          return localSlide
            ? {
                ...slide,
                playback_mode: localSlide.playback_mode,
                duration_ms: localSlide.duration_ms,
                background_color: localSlide.background_color,
              }
            : slide;
        }),
      };
      publish({
        ...state,
        presentation: presentationWithLocalDurations,
        selectedSlideId: firstExistingSlideId(presentationWithLocalDurations, state.selectedSlideId),
        dirtySlideIds,
        revision: state.revision + 1,
      });
    },
    refreshMediaUrls: (presentation) => {
      if (!state.presentation) return;
      const refreshedMedia = mediaById(presentation);
      const incomingSlides = new Map(
        presentation.slides.map((slide) => [slide.client_id, slide]),
      );
      publish({
        ...state,
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((slide) => {
            const incoming = incomingSlides.get(slide.client_id);
            if (!incoming) return slide;
            return {
              ...slide,
              media: slide.media.map((item) => ({
                ...(refreshedMedia.get(item.client_id) ?? item),
              })),
              elements: refreshElementMedia(slide.elements, refreshedMedia),
            };
          }),
        },
        localCompositions: Object.fromEntries(
          Object.entries(state.localCompositions).map(([slideId, elements]) => [
            slideId,
            refreshElementMedia(elements, refreshedMedia),
          ]),
        ),
        revision: state.revision + 1,
      });
    },
    reset: () => {
      publish({
        presentation: null,
        selectedSlideId: null,
        localCompositions: {},
        dirtySlideIds: new Set(),
        selectedElementIds: {},
        playbackBySlide: {},
        slideRevisions: {},
        revision: state.revision + 1,
        hydrated: false,
      });
    },
  };
}

export function useEditorDraftStore(store: EditorDraftStore): EditorDraftState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function selectedSlideFromState(state: EditorDraftState): Slide | null {
  return (
    state.presentation?.slides.find((slide) => slide.client_id === state.selectedSlideId) ??
    state.presentation?.slides[0] ??
    null
  );
}

export function slideHasBackground(elements: readonly CompositionElement[]): boolean {
  return elements.some((element) => element.element_type === "media");
}

export function appendMediaElement(
  elements: readonly CompositionElement[],
  media: SlideMedia,
  durationMs: number,
  playheadMs: number,
): CompositionElement[] {
  const isFirstMedia = !slideHasBackground(elements);
  const layerIndex = isFirstMedia
    ? 0
    : Math.max(0, ...elements.map((element) => element.layer_index)) + 1;
  const window = isFirstMedia
    ? { startMs: 0, endMs: null }
    : windowStartingAtPlayhead(durationMs, playheadMs);
  const next: CompositionElement = {
    client_id: null,
    element_type: "media",
    sequence_order: elements.length,
    layer_index: layerIndex,
    start_ms: window.startMs,
    end_ms: window.endMs,
    media,
    text_content: null,
    layout: {
      x: 0.5,
      y: 0.5,
      width: isFirstMedia ? 1 : 0.6,
      height: isFirstMedia ? 1 : 0.6,
      fit: isFirstMedia ? "cover" : "contain",
      anchor: "center",
    },
    style: null,
    enter_animation: null,
    exit_animation: null,
  };

  return [...elements, next].map((element, sequence_order) => ({
    ...element,
    sequence_order,
  }));
}

export function replaceMediaElementSource(
  elements: readonly CompositionElement[],
  elementId: string,
  media: SlideMedia,
): CompositionElement[] {
  return elements.map((element) =>
    compositionElementId(element) === elementId && element.element_type === "media"
      ? { ...element, media }
      : element,
  );
}
