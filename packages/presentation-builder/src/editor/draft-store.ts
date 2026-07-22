import type { CompositionElement, SlideMedia } from "@beyo/presentation-runtime";
import { useSyncExternalStore } from "react";

import type { Presentation, Slide } from "../types";

export type EditorDraftState = {
  presentation: Presentation | null;
  selectedSlideId: string | null;
  localCompositions: Record<string, CompositionElement[]>;
  dirtySlideIds: ReadonlySet<string>;
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
  reset: () => void;
};

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

function firstExistingSlideId(presentation: Presentation, requested: string | null | undefined): string | null {
  if (requested && presentation.slides.some((slide) => slide.client_id === requested)) return requested;
  return presentation.slides[0]?.client_id ?? null;
}

export function createEditorDraftStore(): EditorDraftStore {
  let state: EditorDraftState = {
    presentation: null,
    selectedSlideId: null,
    localCompositions: {},
    dirtySlideIds: new Set(),
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
        revision: state.revision + 1,
      });
    },
    reset: () => {
      publish({
        presentation: null,
        selectedSlideId: null,
        localCompositions: {},
        dirtySlideIds: new Set(),
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
  return elements.some((element) => element.element_type === "media" && element.layer_index === 0);
}

export function mediaElementForAsset(media: SlideMedia, layerIndex: number): CompositionElement {
  return {
    client_id: null,
    element_type: "media",
    sequence_order: 0,
    layer_index: layerIndex,
    start_ms: 0,
    end_ms: null,
    media,
    text_content: null,
    layout: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fit: layerIndex === 0 ? "cover" : "contain",
    },
    style: null,
    enter_animation: null,
    exit_animation: null,
  };
}

/** Replace only the background track; every overlay/text element survives. */
export function replaceBackgroundMediaElement(
  elements: readonly CompositionElement[],
  media: SlideMedia,
): CompositionElement[] {
  const overlays = elements.filter(
    (element) => !(element.element_type === "media" && element.layer_index === 0),
  );
  return [mediaElementForAsset(media, 0), ...overlays].map((element, sequence_order) => ({
    ...element,
    sequence_order,
  }));
}

export function appendOverlayMediaElement(
  elements: readonly CompositionElement[],
  media: SlideMedia,
): CompositionElement[] {
  const layerIndex = Math.max(0, ...elements.map((element) => element.layer_index)) + 1;
  return [...elements, mediaElementForAsset(media, layerIndex)].map((element, sequence_order) => ({
    ...element,
    sequence_order,
  }));
}

