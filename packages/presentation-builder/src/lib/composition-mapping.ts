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
import type { TextMeasurementAdapter } from "./text-measurement";
import { clampWindowToDuration } from "./timeline-geometry";

export type {
  TextMeasurement,
  TextMeasurementAdapter,
  TextMeasurementInput,
} from "./text-measurement";

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
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
};

export type EditorMediaElement = EditorElementBase & {
  kind: "media";
  media: SlideMedia;
  fit: Exclude<LayoutFit, "none">;
  anchor?: NonNullable<CompositionElement["layout"]>["anchor"];
};

export type EditorCompositionElement = EditorTextElement | EditorMediaElement;

export type EditorComposition = {
  durationMs: number;
  backgroundColor: string | null;
  elements: EditorCompositionElement[];
};

export type CompositionPutBody = {
  playback_mode: "timed";
  duration_ms: number;
  composition_schema_version: typeof COMPOSITION_SCHEMA_VERSION;
  background_color?: string | null;
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

export function editorFontSizeToWire(sizePx: number): number {
  return Math.round(sizePx * REFERENCE_CANVAS_WIDTH / EDITOR_CANVAS_WIDTH);
}

export function wireFontSizeToEditor(fontSize: number): number {
  return Math.round(fontSize * EDITOR_CANVAS_WIDTH / REFERENCE_CANVAS_WIDTH);
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
        ...(element.anchor === undefined
          ? element.layerIndex === 0 ? {} : { anchor: "center" as const }
          : { anchor: element.anchor }),
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
      font_size: editorFontSizeToWire(element.sizePx),
      font_weight: element.weight,
      ...(element.textColor === undefined ? {} : { text_color: element.textColor }),
      ...(element.backgroundColor === undefined
        ? {}
        : { background_color: element.backgroundColor }),
      ...(element.borderRadius === undefined
        ? {}
        : { border_radius: element.borderRadius }),
      ...(element.padding === undefined ? {} : { padding: element.padding }),
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
    background_color: composition.backgroundColor,
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
  backgroundColor: string | null = null,
): EditorComposition {
  return {
    durationMs,
    backgroundColor,
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
            ...(element.layout?.anchor === undefined
              ? {}
              : { anchor: element.layout.anchor }),
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
          sizePx: wireFontSizeToEditor(
            element.style?.font_size ?? 30 * REFERENCE_CANVAS_WIDTH / EDITOR_CANVAS_WIDTH,
          ),
          weight,
          role: weight === 700 ? "heading" : "body",
          textAlign: element.style?.text_align ?? "center",
          ...(element.style?.text_color === undefined
            ? {}
            : { textColor: element.style.text_color }),
          ...(element.style?.background_color === undefined
            ? {}
            : { backgroundColor: element.style.background_color }),
          ...(element.style?.border_radius === undefined
            ? {}
            : { borderRadius: element.style.border_radius }),
          ...(element.style?.padding === undefined
            ? {}
            : { padding: element.style.padding }),
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
