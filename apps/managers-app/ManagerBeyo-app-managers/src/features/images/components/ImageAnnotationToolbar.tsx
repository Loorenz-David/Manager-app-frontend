import {
  ArrowUpRight,
  Circle,
  Highlighter,
  PenLine,
  Square,
  Type,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ImageAnnotationTool } from '../types';

export const TOOLS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: ImageAnnotationTool;
}> = [
  { type: 'draw', label: 'Draw', icon: PenLine },
  { type: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'highlight', label: 'Highlight', icon: Highlighter },
];

type ImageAnnotationToolbarProps = {
  activeTool: ImageAnnotationTool;
  onToolChange: (tool: ImageAnnotationTool) => void;
  testId?: string;
};

export function ImageAnnotationToolbar({
  activeTool,
  onToolChange,
  testId = 'annotation-toolbar',
}: ImageAnnotationToolbarProps): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      data-testid={testId}
      role="toolbar"
      aria-label="Annotation tools"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;

        return (
          <button
            key={tool.type}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.type}
            className={cn(
              'inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 text-sm transition-colors duration-150',
              activeTool === tool.type
                ? 'border-white bg-white text-black'
                : 'border-white/15 bg-white/8 text-white hover:bg-white/14',
            )}
            data-testid={`annotation-tool-${tool.type}`}
            type="button"
            onClick={() => onToolChange(tool.type)}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
