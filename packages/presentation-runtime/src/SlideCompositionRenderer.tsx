import type { CSSProperties, ReactElement } from "react";

import { sortCompositionElements } from "./ordering";
import type {
  CompositionElement,
  ElementLayout,
  LayoutAnchor,
  TextStyle,
} from "./schemas";
import { getElementAnimationFrame, mergeAnimationStyle } from "./animation-registry";

export const REFERENCE_CANVAS_WIDTH = 390;

export type SlideCompositionRendererProps = {
  elements: readonly CompositionElement[];
  timeMs: number;
  containerWidth: number;
  containerHeight: number;
  className?: string;
  /** Editor-only affordance: keep one selected element faintly renderable outside its timing window. */
  forceVisibleElementId?: string | null;
  forceVisibleOpacity?: number;
  /** Called when a backend media URL fails so the host can refetch short-lived URLs. */
  onMediaError?: () => void;
};

type AnchorFactor = readonly [x: number, y: number];

const ANCHOR_FACTORS: Record<LayoutAnchor, AnchorFactor> = {
  top_left: [0, 0],
  top_center: [0.5, 0],
  top_right: [1, 0],
  center_left: [0, 0.5],
  center: [0.5, 0.5],
  center_right: [1, 0.5],
  bottom_left: [0, 1],
  bottom_center: [0.5, 1],
  bottom_right: [1, 1],
};

function isVisible(element: CompositionElement, timeMs: number): boolean {
  return timeMs >= element.start_ms && (element.end_ms === null || timeMs < element.end_ms);
}

function elementFrame(
  layout: ElementLayout | null,
  containerWidth: number,
  containerHeight: number,
): CSSProperties {
  const x = layout?.x ?? 0;
  const y = layout?.y ?? 0;
  const width = layout?.width ?? 1;
  const height = layout?.height ?? 1;
  const [anchorX, anchorY] = ANCHOR_FACTORS[layout?.anchor ?? "top_left"];
  const transforms: string[] = [];

  if (layout?.rotation_deg !== undefined) transforms.push(`rotate(${layout.rotation_deg}deg)`);
  if (layout?.scale !== undefined) transforms.push(`scale(${layout.scale})`);

  return {
    position: "absolute",
    left: (x - width * anchorX) * containerWidth,
    top: (y - height * anchorY) * containerHeight,
    width: width * containerWidth,
    height: height * containerHeight,
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    transformOrigin: "center",
  };
}

function textElementStyle(
  element: CompositionElement,
  containerWidth: number,
): CSSProperties {
  const style: TextStyle | null = element.style;
  const overflow = style?.overflow;
  const maxLines = style?.max_lines;

  return {
    fontSize:
      style?.font_size === undefined
        ? undefined
        : style.font_size * (containerWidth / REFERENCE_CANVAS_WIDTH),
    fontWeight: style?.font_weight,
    color: style?.text_color,
    backgroundColor: style?.background_color,
    borderRadius: style?.border_radius,
    padding: style?.padding,
    textAlign: style?.text_align ?? element.layout?.align,
    overflow: overflow === "visible" ? "visible" : overflow === undefined ? undefined : "hidden",
    textOverflow: overflow === "ellipsis" ? "ellipsis" : undefined,
    display: maxLines === undefined ? undefined : "-webkit-box",
    WebkitBoxOrient: maxLines === undefined ? undefined : "vertical",
    WebkitLineClamp: maxLines,
  };
}

function renderElement(
  element: CompositionElement,
  index: number,
  containerWidth: number,
  containerHeight: number,
  timeMs: number,
  forceVisible: boolean,
  forceVisibleOpacity: number,
  onMediaError?: () => void,
): ReactElement | null {
  const animationFrame = getElementAnimationFrame(element, timeMs);
  const frame = mergeAnimationStyle(
    elementFrame(element.layout, containerWidth, containerHeight),
    forceVisible ? { ...animationFrame, opacity: forceVisibleOpacity } : animationFrame,
  );
  const sharedProps = {
    "data-composition-element": "",
    "data-element-id": element.client_id ?? "legacy",
    "data-element-type": element.element_type,
    style: { ...frame, zIndex: element.layer_index },
  } as const;
  const key = `${element.client_id ?? "legacy"}-${index}`;

  if (element.element_type === "media") {
    if (element.media === null) return null;
    const mediaStyle: CSSProperties = {
      ...sharedProps.style,
      objectFit: element.layout?.fit ?? "cover",
    };

    if (element.media.media_type === "video") {
      return (
        <video
          key={key}
          {...sharedProps}
          style={mediaStyle}
          src={element.media.media_url}
          poster={element.media.poster_url ?? undefined}
          preload="metadata"
          muted
          playsInline
          aria-label={element.media.alt_text ?? undefined}
          onError={onMediaError}
        />
      );
    }

    return (
      <img
        key={key}
        {...sharedProps}
        style={mediaStyle}
        src={element.media.media_url}
        alt={element.media.alt_text ?? ""}
        onError={onMediaError}
      />
    );
  }

  return (
    <div
      key={key}
      {...sharedProps}
      style={{
        ...sharedProps.style,
        ...textElementStyle(element, containerWidth),
      }}
    >
      {element.text_content}
    </div>
  );
}

export function SlideCompositionRenderer({
  elements,
  timeMs,
  containerWidth,
  containerHeight,
  className,
  forceVisibleElementId = null,
  forceVisibleOpacity = 0.25,
  onMediaError,
}: SlideCompositionRendererProps): ReactElement {
  const visibleElements = sortCompositionElements(elements).filter((element) =>
    isVisible(element, timeMs) || element.client_id === forceVisibleElementId,
  );

  return (
    <div
      data-testid="slide-composition-renderer"
      className={className}
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        overflow: "hidden",
      }}
    >
      {visibleElements.map((element, index) =>
        renderElement(
          element,
          index,
          containerWidth,
          containerHeight,
          timeMs,
          element.client_id === forceVisibleElementId && !isVisible(element, timeMs),
          forceVisibleOpacity,
          onMediaError,
        ),
      )}
    </div>
  );
}
