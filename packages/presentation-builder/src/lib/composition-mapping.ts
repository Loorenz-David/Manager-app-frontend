import {
  COMPOSITION_SCHEMA_VERSION,
  REFERENCE_CANVAS_WIDTH,
  type CompositionElement,
  type ElementAnimation,
  type LayoutFit,
  type SlideMedia,
  type TextAlign,
} from "@beyo/presentation-runtime";

import type { CompositionElementInput } from "../types";
import { clampWindowToDuration } from "./timeline-geometry";

export const EDITOR_CANVAS_WIDTH = 264;
export const EDITOR_CANVAS_HEIGHT = 470;
export const EDITOR_ANIMATION_DURATION_MS = 450;

export type EditorAnimationChoice = "fade" | "slide" | "none";
export type EditorTextRole = "body" | "heading";

type EditorElementBase = {
  id: string | null;
  sequenceOrder: number;
  layerIndex: number;
  startMs: number;
  endMs: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  animIn: EditorAnimationChoice;
  animOut: EditorAnimationChoice;
};

export type EditorTextElement = EditorElementBase & {
  kind: "text";
  content: string;
  sizePx: number;
  weight: 400 | 700;
  role: EditorTextRole;
  textAlign: TextAlign;
};

export type EditorMediaElement = EditorElementBase & {
  kind: "media";
  media: SlideMedia;
  fit: Exclude<LayoutFit, "none">;
};

export type EditorCompositionElement = EditorTextElement | EditorMediaElement;

export type EditorComposition = {
  durationMs: number;
  elements: EditorCompositionElement[];
};

export type TextMeasurementInput = {
  content: string;
  fontSizePx: number;
  fontWeight: 400 | 700;
};

export type TextMeasurement = { widthPx: number; heightPx: number };
export type TextMeasurementAdapter = (input: TextMeasurementInput) => TextMeasurement;

export type CompositionPutBody = {
  playback_mode: "timed";
  duration_ms: number;
  composition_schema_version: typeof COMPOSITION_SCHEMA_VERSION;
  elements: CompositionElementInput[];
};

const normalizedDimension = (pixels: number, canvasPixels: number): number =>
  Math.min(1, Math.max(Number.EPSILON, pixels / canvasPixels));

export function editorAnimationToWire(choice: EditorAnimationChoice): ElementAnimation {
  if (choice === "none") return { type: "none" };
  return {
    type: choice === "slide" ? "fade_up" : "fade",
    duration_ms: EDITOR_ANIMATION_DURATION_MS,
  };
}

export function wireAnimationToEditor(animation: ElementAnimation | null): EditorAnimationChoice {
  if (animation === null || animation.type === "none") return "none";
  return animation.type === "fade" ? "fade" : "slide";
}

function editorElementToPutInput(
  element: EditorCompositionElement,
  durationMs: number,
  measureText: TextMeasurementAdapter,
): CompositionElementInput {
  const timing = element.endMs === null
    ? { startMs: Math.max(0, Math.min(element.startMs, durationMs)), endMs: null }
    : clampWindowToDuration({ startMs: element.startMs, endMs: element.endMs }, durationMs);
  const enter_animation = editorAnimationToWire(element.animIn);
  const exit_animation = editorAnimationToWire(element.animOut);

  if (element.kind === "media") {
    return {
      element_type: "media",
      media_id: element.media.client_id,
      layer_index: element.layerIndex,
      start_ms: timing.startMs,
      end_ms: timing.endMs,
      layout: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        fit: element.fit,
        ...(element.layerIndex === 0 ? {} : { anchor: "center" as const }),
      },
      enter_animation,
      exit_animation,
    };
  }

  const measured = measureText({
    content: element.content,
    fontSizePx: element.sizePx,
    fontWeight: element.weight,
  });
  return {
    element_type: "text",
    text_content: element.content,
    layer_index: element.layerIndex,
    start_ms: timing.startMs,
    end_ms: timing.endMs,
    layout: {
      x: element.x,
      y: element.y,
      width: normalizedDimension(measured.widthPx, EDITOR_CANVAS_WIDTH),
      height: normalizedDimension(measured.heightPx, EDITOR_CANVAS_HEIGHT),
      anchor: "center",
    },
    style: {
      text_role: element.role === "heading" ? "headline" : "body",
      text_align: element.textAlign,
      font_size: Math.round(element.sizePx * REFERENCE_CANVAS_WIDTH / EDITOR_CANVAS_WIDTH),
      font_weight: element.weight,
    },
    enter_animation,
    exit_animation,
  };
}

export function editorCompositionToPutBody(
  composition: EditorComposition,
  measureText: TextMeasurementAdapter,
): CompositionPutBody {
  return {
    playback_mode: "timed",
    duration_ms: composition.durationMs,
    composition_schema_version: COMPOSITION_SCHEMA_VERSION,
    elements: composition.elements.map((element) =>
      editorElementToPutInput(element, composition.durationMs, measureText)),
  };
}

function positiveDimension(value: number | undefined): number {
  return Math.min(1, Math.max(Number.EPSILON, value ?? 1));
}

export function serverElementsToEditorComposition(
  durationMs: number,
  elements: readonly CompositionElement[],
): EditorComposition {
  return {
    durationMs,
    elements: [...elements]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .flatMap<EditorCompositionElement>((element) => {
        if (element.element_type === "media") {
          if (element.media === null) return [];
          return [{
            id: element.client_id,
            kind: "media",
            sequenceOrder: element.sequence_order,
            layerIndex: element.layer_index,
            startMs: element.start_ms,
            endMs: element.end_ms,
            x: element.layout?.x ?? 0,
            y: element.layout?.y ?? 0,
            width: positiveDimension(element.layout?.width),
            height: positiveDimension(element.layout?.height),
            fit: element.layout?.fit === "contain" || element.layout?.fit === "fill"
              ? element.layout.fit
              : "cover",
            media: element.media,
            animIn: wireAnimationToEditor(element.enter_animation),
            animOut: wireAnimationToEditor(element.exit_animation),
          }];
        }
        if (element.text_content === null) return [];
        const weight: 400 | 700 = element.style?.font_weight === 700 ? 700 : 400;
        return [{
          id: element.client_id,
          kind: "text",
          sequenceOrder: element.sequence_order,
          layerIndex: element.layer_index,
          startMs: element.start_ms,
          endMs: element.end_ms,
          x: element.layout?.x ?? 0.5,
          y: element.layout?.y ?? 0.5,
          width: positiveDimension(element.layout?.width),
          height: positiveDimension(element.layout?.height),
          content: element.text_content,
          sizePx: Math.round((element.style?.font_size ?? 30 * REFERENCE_CANVAS_WIDTH / EDITOR_CANVAS_WIDTH)
            * EDITOR_CANVAS_WIDTH / REFERENCE_CANVAS_WIDTH),
          weight,
          role: weight === 700 ? "heading" : "body",
          textAlign: element.style?.text_align ?? "center",
          animIn: wireAnimationToEditor(element.enter_animation),
          animOut: wireAnimationToEditor(element.exit_animation),
        }];
      }),
  };
}

export type ServerElementFields = {
  clientId: string | null;
  sequenceOrder: number;
  mediaById: ReadonlyMap<string, SlideMedia>;
};

/** Converts a validated PUT element into the server element shape. Production
 * hydration consumes this shape; the explicit adapter also keeps wire round-trip
 * fixtures honest without inventing a second DTO contract in tests. */
export function putElementToServerElement(
  input: CompositionElementInput,
  fields: ServerElementFields,
): CompositionElement {
  const media = input.media_id ? fields.mediaById.get(input.media_id) ?? null : null;
  return {
    client_id: fields.clientId,
    element_type: input.element_type,
    sequence_order: fields.sequenceOrder,
    layer_index: input.layer_index ?? 0,
    start_ms: input.start_ms ?? 0,
    end_ms: input.end_ms ?? null,
    media,
    text_content: input.text_content ?? null,
    layout: input.layout ?? null,
    style: input.style ?? null,
    enter_animation: input.enter_animation ?? null,
    exit_animation: input.exit_animation ?? null,
  };
}
