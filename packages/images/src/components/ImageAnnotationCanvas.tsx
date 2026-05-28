import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Arrow, Ellipse, Layer, Line, Rect, Stage, Text as KonvaText } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

import type {
  AnnotatedCanvasItem,
  ArrowAnnotationData,
  CircleAnnotationData,
  DrawAnnotationData,
  HighlightAnnotationData,
  ImageAnnotationTool,
  ImageAnnotationItemData,
  RectangleAnnotationData,
} from '../types';

const TOOL_COLOR = '#ff5a36';
const TOOL_HIGHLIGHT = '#facc15';
const TOOL_STROKE_WIDTH = 3;

type Point = {
  x: number;
  y: number;
};

type ImageAnnotationCanvasProps = {
  width: number;
  height: number;
  activeTool: ImageAnnotationTool;
  annotations: AnnotatedCanvasItem[];
  onAnnotationComplete: (item: ImageAnnotationItemData) => void;
  onAnnotationTap?: (item: AnnotatedCanvasItem) => void;
  onTextPlacementRequest: (point: Point) => void;
};

export type ImageAnnotationCanvasHandle = {
  reset: () => void;
  setInteractionEnabled: (enabled: boolean) => void;
};

function denormalizeX(value: number, width: number): number {
  return value * width;
}

function denormalizeY(value: number, height: number): number {
  return value * height;
}

function toNormalizedPoint(point: Point, width: number, height: number): Point {
  return {
    x: point.x / width,
    y: point.y / height,
  };
}

function renderAnnotation(
  annotation: ImageAnnotationItemData,
  width: number,
  height: number,
  key: string,
  onTap?: () => void,
): React.JSX.Element | null {
  const tapProps = onTap
    ? {
        onMouseDown: (event: KonvaEventObject<MouseEvent>) => {
          event.cancelBubble = true;
        },
        onTouchStart: (event: KonvaEventObject<TouchEvent>) => {
          event.cancelBubble = true;
        },
        onClick: onTap,
        onTap,
      }
    : {};

  switch (annotation.tool) {
    case 'draw':
      return (
        <Line
          key={key}
          {...tapProps}
          hitStrokeWidth={onTap ? 20 : undefined}
          lineCap="round"
          lineJoin="round"
          points={annotation.points.map((value, index) =>
            index % 2 === 0 ? denormalizeX(value, width) : denormalizeY(value, height),
          )}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          tension={0.2}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={key}
          {...tapProps}
          fill={annotation.color}
          hitStrokeWidth={onTap ? 20 : undefined}
          points={[
            denormalizeX(annotation.fromX, width),
            denormalizeY(annotation.fromY, height),
            denormalizeX(annotation.toX, width),
            denormalizeY(annotation.toY, height),
          ]}
          pointerLength={10}
          pointerWidth={10}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
        />
      );
    case 'circle':
      return (
        <Ellipse
          key={key}
          {...tapProps}
          radiusX={denormalizeX(annotation.radiusX, width)}
          radiusY={denormalizeY(annotation.radiusY, height)}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          x={denormalizeX(annotation.centerX, width)}
          y={denormalizeY(annotation.centerY, height)}
        />
      );
    case 'rectangle':
      return (
        <Rect
          key={key}
          {...tapProps}
          height={denormalizeY(annotation.height, height)}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          width={denormalizeX(annotation.width, width)}
          x={denormalizeX(annotation.x, width)}
          y={denormalizeY(annotation.y, height)}
        />
      );
    case 'text':
      return (
        <KonvaText
          key={key}
          {...tapProps}
          fill={annotation.color}
          fontSize={annotation.fontSize * height}
          text={annotation.text}
          x={denormalizeX(annotation.x, width)}
          y={denormalizeY(annotation.y, height)}
        />
      );
    case 'highlight':
      return (
        <Rect
          key={key}
          {...tapProps}
          fill={annotation.color}
          height={denormalizeY(annotation.height, height)}
          opacity={annotation.opacity}
          width={denormalizeX(annotation.width, width)}
          x={denormalizeX(annotation.x, width)}
          y={denormalizeY(annotation.y, height)}
        />
      );
  }
}

export const ImageAnnotationCanvas = forwardRef<ImageAnnotationCanvasHandle, ImageAnnotationCanvasProps>(function ImageAnnotationCanvas({
  width,
  height,
  activeTool,
  annotations,
  onAnnotationComplete,
  onAnnotationTap,
  onTextPlacementRequest,
}: ImageAnnotationCanvasProps, ref): React.JSX.Element {
  const isDrawingRef = useRef(false);
  const isInteractionEnabledRef = useRef(true);
  const [draftPoints, setDraftPoints] = useState<number[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  function getPointerPosition(event: KonvaEventObject<MouseEvent | TouchEvent>): Point | null {
    return event.target.getStage()?.getPointerPosition() ?? null;
  }

  function resetDraft(): void {
    isDrawingRef.current = false;
    setDraftPoints([]);
    setStartPoint(null);
    setCurrentPoint(null);
  }

  useImperativeHandle(
    ref,
    () => ({
      reset: resetDraft,
      setInteractionEnabled: (enabled: boolean) => {
        isInteractionEnabledRef.current = enabled;

        if (!enabled) {
          resetDraft();
        }
      },
    }),
    [],
  );

  function handlePointerStart(event: KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!isInteractionEnabledRef.current) {
      return;
    }

    const point = getPointerPosition(event);

    if (!point) {
      return;
    }

    if (activeTool === 'text') {
      onTextPlacementRequest(toNormalizedPoint(point, width, height));
      return;
    }

    isDrawingRef.current = true;

    if (activeTool === 'draw') {
      setDraftPoints([point.x, point.y]);
      return;
    }

    setStartPoint(point);
    setCurrentPoint(point);
  }

  function handlePointerMove(event: KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!isInteractionEnabledRef.current) {
      return;
    }

    if (!isDrawingRef.current) {
      return;
    }

    const point = getPointerPosition(event);

    if (!point) {
      return;
    }

    if (activeTool === 'draw') {
      setDraftPoints((current) => [...current, point.x, point.y]);
      return;
    }

    setCurrentPoint(point);
  }

  function handlePointerEnd(): void {
    if (!isInteractionEnabledRef.current) {
      return;
    }

    if (!isDrawingRef.current) {
      return;
    }

    if (activeTool === 'draw') {
      if (draftPoints.length >= 4) {
        const item: DrawAnnotationData = {
          tool: 'draw',
          points: draftPoints.map((value, index) =>
            index % 2 === 0 ? value / width : value / height,
          ),
          color: TOOL_COLOR,
          strokeWidth: TOOL_STROKE_WIDTH,
        };

        onAnnotationComplete(item);
      }

      resetDraft();
      return;
    }

    if (!startPoint || !currentPoint) {
      resetDraft();
      return;
    }

    const start = toNormalizedPoint(startPoint, width, height);
    const end = toNormalizedPoint(currentPoint, width, height);
    let item:
      | ArrowAnnotationData
      | CircleAnnotationData
      | RectangleAnnotationData
      | HighlightAnnotationData
      | null = null;

    switch (activeTool) {
      case 'arrow':
        item = {
          tool: 'arrow',
          fromX: start.x,
          fromY: start.y,
          toX: end.x,
          toY: end.y,
          color: TOOL_COLOR,
          strokeWidth: TOOL_STROKE_WIDTH,
        };
        break;
      case 'circle':
        item = {
          tool: 'circle',
          centerX: (start.x + end.x) / 2,
          centerY: (start.y + end.y) / 2,
          radiusX: Math.abs(end.x - start.x) / 2,
          radiusY: Math.abs(end.y - start.y) / 2,
          color: TOOL_COLOR,
          strokeWidth: TOOL_STROKE_WIDTH,
        };
        break;
      case 'rectangle':
        item = {
          tool: 'rectangle',
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          color: TOOL_COLOR,
          strokeWidth: TOOL_STROKE_WIDTH,
        };
        break;
      case 'highlight':
        item = {
          tool: 'highlight',
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          color: TOOL_HIGHLIGHT,
          opacity: 0.35,
        };
        break;
      case 'text':
        break;
    }

    if (item) {
      onAnnotationComplete(item);
    }

    resetDraft();
  }

  const previewShape =
    startPoint && currentPoint && activeTool !== 'draw' && activeTool !== 'text'
      ? renderAnnotation(
          activeTool === 'arrow'
            ? {
                tool: 'arrow',
                fromX: startPoint.x / width,
                fromY: startPoint.y / height,
                toX: currentPoint.x / width,
                toY: currentPoint.y / height,
                color: TOOL_COLOR,
                strokeWidth: TOOL_STROKE_WIDTH,
              }
            : activeTool === 'circle'
              ? {
                  tool: 'circle',
                  centerX: (startPoint.x + currentPoint.x) / (2 * width),
                  centerY: (startPoint.y + currentPoint.y) / (2 * height),
                  radiusX: Math.abs(currentPoint.x - startPoint.x) / (2 * width),
                  radiusY: Math.abs(currentPoint.y - startPoint.y) / (2 * height),
                  color: TOOL_COLOR,
                  strokeWidth: TOOL_STROKE_WIDTH,
                }
              : activeTool === 'rectangle'
                ? {
                    tool: 'rectangle',
                    x: Math.min(startPoint.x, currentPoint.x) / width,
                    y: Math.min(startPoint.y, currentPoint.y) / height,
                    width: Math.abs(currentPoint.x - startPoint.x) / width,
                    height: Math.abs(currentPoint.y - startPoint.y) / height,
                    color: TOOL_COLOR,
                    strokeWidth: TOOL_STROKE_WIDTH,
                  }
                : {
                    tool: 'highlight',
                    x: Math.min(startPoint.x, currentPoint.x) / width,
                    y: Math.min(startPoint.y, currentPoint.y) / height,
                    width: Math.abs(currentPoint.x - startPoint.x) / width,
                    height: Math.abs(currentPoint.y - startPoint.y) / height,
                    color: TOOL_HIGHLIGHT,
                    opacity: 0.35,
                  },
          width,
          height,
          'annotation-preview',
        )
      : null;

  return (
    <Stage
      data-testid="annotation-canvas"
      height={height}
      onMouseDown={handlePointerStart}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerEnd}
      onTouchEnd={handlePointerEnd}
      onTouchMove={handlePointerMove}
      onTouchStart={handlePointerStart}
      width={width}
    >
      <Layer>
        {annotations.map((annotation, index) =>
          renderAnnotation(
            annotation.data,
            width,
            height,
            `annotation-${index}`,
            onAnnotationTap ? () => onAnnotationTap(annotation) : undefined,
          ),
        )}

        {draftPoints.length >= 4 ? (
          <Line
            lineCap="round"
            lineJoin="round"
            points={draftPoints}
            stroke={TOOL_COLOR}
            strokeWidth={TOOL_STROKE_WIDTH}
            tension={0.2}
          />
        ) : null}

        {previewShape}
      </Layer>
    </Stage>
  );
});
