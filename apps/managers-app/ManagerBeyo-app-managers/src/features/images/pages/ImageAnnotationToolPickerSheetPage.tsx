import { cn } from '@/lib/utils';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { TOOLS } from '../components/ImageAnnotationToolbar';
import type { ImageAnnotationToolPickerSurfaceProps } from '../surfaces';

export function ImageAnnotationToolPickerSheetPage(): React.JSX.Element {
  const { activeTool, onSelect } = useSurfaceProps<ImageAnnotationToolPickerSurfaceProps>();
  const header = useSurfaceHeader();

  return (
    <div className="flex flex-col pb-2" data-testid="annotation-tool-picker-sheet">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.type === activeTool;

        return (
          <button
            key={tool.type}
            aria-label={tool.label}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-4 px-6 py-4 text-left transition-colors duration-150',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
            data-testid={`tool-picker-${tool.type}`}
            type="button"
            onClick={() => {
              onSelect?.(tool.type);
              header?.requestClose();
            }}
          >
            <Icon className="size-5 shrink-0" />
            <span className="text-base font-medium">{tool.label}</span>
            {isActive ? (
              <span className="ml-auto text-sm font-medium text-foreground" aria-hidden="true">
                Active
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
