import { cn } from '@/lib/utils';
import type { ImageAnnotationItemData, ImageAnnotationViewModel } from '../types';
import { readImageAnnotationItems } from '../types';

type ImageAnnotationSvgLayerProps = {
  annotations: ImageAnnotationViewModel[];
  widthPx?: number | null;
  heightPx?: number | null;
  coverMode?: boolean;
  className?: string;
  markerId?: string;
  testId?: string;
};

function buildPoints(points: number[], width: number, height: number): string {
  const pairs: string[] = [];

  for (let index = 0; index < points.length - 1; index += 2) {
    pairs.push(`${points[index] * width},${points[index + 1] * height}`);
  }

  return pairs.join(' ');
}

function renderAnnotationItem(
  item: ImageAnnotationItemData,
  key: string,
  width: number,
  height: number,
  markerId: string,
): React.JSX.Element | null {
  switch (item.tool) {
    case 'draw':
      return (
        <polyline
          key={key}
          fill="none"
          points={buildPoints(item.points, width, height)}
          stroke={item.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={item.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'arrow':
      return (
        <line
          key={key}
          markerEnd={`url(#${markerId})`}
          stroke={item.color}
          strokeWidth={item.strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={item.fromX * width}
          x2={item.toX * width}
          y1={item.fromY * height}
          y2={item.toY * height}
        />
      );
    case 'circle':
      return (
        <ellipse
          key={key}
          cx={item.centerX * width}
          cy={item.centerY * height}
          fill="none"
          rx={item.radiusX * width}
          ry={item.radiusY * height}
          stroke={item.color}
          strokeWidth={item.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'rectangle':
      return (
        <rect
          key={key}
          fill="none"
          height={item.height * height}
          stroke={item.color}
          strokeWidth={item.strokeWidth}
          vectorEffect="non-scaling-stroke"
          width={item.width * width}
          x={item.x * width}
          y={item.y * height}
        />
      );
    case 'text':
      return (
        <text
          key={key}
          dominantBaseline="hanging"
          fill={item.color}
          fontSize={item.fontSize * height}
          x={item.x * width}
          y={item.y * height}
        >
          {item.text}
        </text>
      );
    case 'highlight':
      return (
        <rect
          key={key}
          fill={item.color}
          height={item.height * height}
          opacity={item.opacity}
          width={item.width * width}
          x={item.x * width}
          y={item.y * height}
        />
      );
  }
}

export function ImageAnnotationSvgLayer({
  annotations,
  widthPx,
  heightPx,
  coverMode = false,
  className,
  markerId = 'img-ann-arrow',
  testId,
}: ImageAnnotationSvgLayerProps): React.JSX.Element | null {
  const width = widthPx ?? 1000;
  const height = heightPx ?? 1000;
  const allItems = annotations.flatMap((annotation) => readImageAnnotationItems(annotation.data));

  if (allItems.length === 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
      data-testid={testId}
      preserveAspectRatio={coverMode ? 'xMidYMid slice' : 'xMidYMid meet'}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <marker
          id={markerId}
          markerHeight="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          orient="auto"
          refX="4"
          refY="2.5"
        >
          <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
        </marker>
      </defs>

      {allItems.map((item, index) => renderAnnotationItem(item, `${item.tool}-${index}`, width, height, markerId))}
    </svg>
  );
}
