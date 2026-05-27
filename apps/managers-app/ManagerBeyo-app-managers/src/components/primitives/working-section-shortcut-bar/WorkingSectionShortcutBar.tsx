import { useMemo } from 'react';

import { useScrollVisibilityContext } from '@/components/primitives/scroll-visibility';
import type {
  WorkingSectionOption,
  WorkingSectionShortcutConfig,
} from '@/features/working-sections/types';
import { cn } from '@/lib/utils';

import { HorizontalScrollArea } from '../horizontal-scroll-area';

export type WorkingSectionShortcutBarProps = {
  shortcuts: WorkingSectionShortcutConfig;
  availableSections: WorkingSectionOption[];
  onShortcutPress: (matchedIds: string[]) => void;
  animationMode?: 'collapse' | 'translate';
  className?: string;
  trackClassName?: string;
  'data-testid'?: string;
};

function toShortcutTestId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function WorkingSectionShortcutBar({
  shortcuts,
  availableSections,
  onShortcutPress,
  animationMode = 'collapse',
  className,
  trackClassName,
  'data-testid': testId = 'working-section-shortcut-bar',
}: WorkingSectionShortcutBarProps): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  const pillEntries = useMemo(
    () =>
      Object.entries(shortcuts).map(([label, patterns]) => {
        const normalizedPatterns = patterns.map((pattern) => pattern.toLowerCase());
        const matchedIds = availableSections
          .filter((section) =>
            normalizedPatterns.some((pattern) =>
              section.name.toLowerCase().includes(pattern),
            ),
          )
          .map((section) => section.client_id);

        return { label, matchedIds };
      }),
    [availableSections, shortcuts],
  );

  return (
    <div
      className={cn(
        animationMode === 'translate'
          ? [
              'transition-[transform,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
              isHidden
                ? 'pointer-events-none translate-y-full opacity-0'
                : 'translate-y-0 opacity-100',
            ]
          : [
              'overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
              isHidden
                ? 'pointer-events-none max-h-0 opacity-0'
                : 'max-h-24 opacity-100',
            ],
        className,
      )}
      data-testid={testId}
    >
      <HorizontalScrollArea trackClassName={trackClassName}>
        <div className="flex min-w-max items-center gap-2">
          {pillEntries.map(({ label, matchedIds }) => (
            <button
              key={label}
              type="button"
              className="min-h-11 shrink-0 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium leading-none text-muted-foreground transition-colors duration-150 hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              data-testid={`shortcut-pill-${toShortcutTestId(label)}`}
              onClick={() => onShortcutPress(matchedIds)}
            >
              {label}
            </button>
          ))}
        </div>
      </HorizontalScrollArea>
    </div>
  );
}
