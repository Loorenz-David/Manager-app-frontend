import type { CompositionElement } from "@beyo/presentation-runtime";

import type { PresentationPreview, Slide } from "../types";

function comparable(elements: readonly CompositionElement[]): string {
  return JSON.stringify(elements.map((element) => ({
    element_type: element.element_type,
    sequence_order: element.sequence_order,
    layer_index: element.layer_index,
    start_ms: element.start_ms,
    end_ms: element.end_ms,
    media_id: element.media?.client_id ?? null,
    text_content: element.text_content,
    layout: element.layout,
    style: element.style,
    enter_animation: element.enter_animation,
    exit_animation: element.exit_animation,
  })));
}

export function previewCompositionIsInParity(
  localSlides: readonly Pick<Slide, "client_id" | "elements">[],
  preview: PresentationPreview,
): boolean {
  return localSlides.length === preview.slides.length
    && localSlides.every((slide, index) => {
      const previewSlide = preview.slides[index];
      return previewSlide?.client_id === slide.client_id
        && comparable(slide.elements) === comparable(previewSlide.elements);
    });
}

export function assertPreviewCompositionParity(
  localSlides: readonly Pick<Slide, "client_id" | "elements">[],
  preview: PresentationPreview,
): void {
  console.assert(
    previewCompositionIsInParity(localSlides, preview),
    "Presentation preview composition differs from the flushed editor draft.",
  );
}
