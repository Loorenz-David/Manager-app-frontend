import { cn } from '@/lib/utils';

type DateRangeSelectionTabsProps = {
  fromLabel: string | undefined;
  toLabel: string | undefined;
  activeTarget: 'from' | 'to';
  onFromPress: () => void;
  onToPress: () => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
};

export function DateRangeSelectionTabs({
  fromLabel,
  toLabel,
  activeTarget,
  onFromPress,
  onToPress,
  fromPlaceholder = 'Select start',
  toPlaceholder = 'Select end',
}: DateRangeSelectionTabsProps) {
  return (
    <div className="grid grid-cols-2 border-b" data-testid="date-range-selection-tabs" role="tablist">
      <button
        aria-selected={activeTarget === 'from'}
        className="relative px-4 py-3 text-left"
        data-testid="date-range-from-tab"
        onClick={onFromPress}
        role="tab"
        type="button"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          From
        </p>
        <p
          className={cn(
            'mt-0.5 text-sm font-medium',
            fromLabel ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {fromLabel ?? fromPlaceholder}
        </p>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-150',
            activeTarget === 'from' ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>
      <button
        aria-selected={activeTarget === 'to'}
        className="relative border-l px-4 py-3 text-left"
        data-testid="date-range-to-tab"
        onClick={onToPress}
        role="tab"
        type="button"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          To
        </p>
        <p
          className={cn(
            'mt-0.5 text-sm font-medium',
            toLabel ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {toLabel ?? toPlaceholder}
        </p>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-150',
            activeTarget === 'to' ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>
    </div>
  );
}
