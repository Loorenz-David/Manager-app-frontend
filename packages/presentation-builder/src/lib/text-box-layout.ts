import type { CompositionElement } from "@beyo/presentation-runtime";

import { REFERENCE_CANVAS_WIDTH } from "@beyo/presentation-runtime";

import { EDITOR_CANVAS_HEIGHT, EDITOR_CANVAS_WIDTH, wireFontSizeToEditor } from "./composition-mapping";
import { measureText } from "./text-measurement";

/** Padding is authored at the reference width and scales with the font (`compositionTextStyle`). */
const editorPadding = (padding: number | undefined): number =>
  (padding ?? 0) * EDITOR_CANVAS_WIDTH / REFERENCE_CANVAS_WIDTH;

/** One line at the smallest supported size still needs a grabbable box. */
export const MIN_TEXT_BOX_HEIGHT = 0.02;
/** Fraction tolerance for "this box is still hugging its text" (~0.5 px of canvas). */
const HUG_EPSILON = 0.001;

/**
 * Height of this element's text wrapped at its authored `layout.width` — what the box
 * measures when it is hugging its content.
 */
export function textBoxHeightFraction(element: CompositionElement): number {
  const { heightPx } = measureText({
    content: element.text_content ?? "",
    fontSizePx: wireFontSizeToEditor(element.style?.font_size ?? 44),
    fontWeight: element.style?.font_weight === 700 ? 700 : 400,
    maxWidthPx: Math.max(1, (element.layout?.width ?? 0.5) * EDITOR_CANVAS_WIDTH),
    paddingPx: editorPadding(element.style?.padding),
  });
  return Math.min(1, Math.max(MIN_TEXT_BOX_HEIGHT, heightPx / EDITOR_CANVAS_HEIGHT));
}

/**
 * A text box hugs its content until the author drags it off that height; from then on the
 * height is theirs. No stored flag is needed — the box tells us, because "hugging" means
 * the stored height still equals the measured one. Dragging back onto the measured height
 * hands it back to auto.
 */
export function isHuggingTextHeight(element: CompositionElement): boolean {
  if (element.element_type !== "text") return false;
  const height = element.layout?.height;
  if (height === undefined) return true;
  return Math.abs(height - textBoxHeightFraction(element)) <= HUG_EPSILON;
}

/**
 * Re-hugs a text box after an edit, but only while it is still auto-height. `previous` is
 * the element before the edit: a font-size or text change moves the measured height, so
 * asking the *new* element whether it hugs would read as "the author fixed it".
 */
export function withMeasuredTextHeight(
  previous: CompositionElement,
  next: CompositionElement,
): CompositionElement {
  if (next.element_type !== "text" || !isHuggingTextHeight(previous)) return next;
  const height = textBoxHeightFraction(next);
  if (next.layout?.height === height) return next;
  return { ...next, layout: { ...(next.layout ?? {}), height } };
}
