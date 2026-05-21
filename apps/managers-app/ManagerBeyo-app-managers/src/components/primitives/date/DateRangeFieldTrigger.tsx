import { cva } from 'class-variance-authority';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

type DateRangeFieldTriggerProps = {
  fromValue: string | undefined;
  toValue: string | undefined;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  onPress: (target: 'from' | 'to') => void;
  id?: string;
  className?: string;
  'data-testid'?: string;
};

const triggerVariants = cva(
  [
    'flex h-12 w-full items-center rounded-lg border bg-input px-3',
    'text-sm transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.99]',
  ].join(' '),
  {
    variants: {
      invalid: {
        true: 'border-destructive/45 bg-destructive/[0.06] ring-1 ring-destructive/20',
        false: 'border-border',
      },
    },
    defaultVariants: {
      invalid: false,
    },
  },
);

export function DateRangeFieldTrigger({
  fromValue,
  toValue,
  fromPlaceholder = 'Select start',
  toPlaceholder = 'Select end',
  invalid = false,
  disabled,
  onPress,
  id,
  className,
  'data-testid': dataTestId,
}: DateRangeFieldTriggerProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    const target = relativeX < bounds.width / 2 ? 'from' : 'to';

    onPress(target);
  }

  return (
    <button
      aria-haspopup="dialog"
      aria-invalid={invalid || undefined}
      className={cn(triggerVariants({ invalid }), className)}
      data-testid={dataTestId}
      disabled={disabled}
      id={id}
      onClick={handleClick}
      type="button"
    >
      <span className="grid flex-1 grid-cols-2 text-left">
        <span className="pr-3">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            From
          </span>
          <span
            className={cn(
              'block truncate text-sm font-medium',
              fromValue ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {fromValue ?? fromPlaceholder}
          </span>
        </span>
        <span className="border-l pl-3">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <span
            className={cn(
              'block truncate text-sm font-medium',
              toValue ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {toValue ?? toPlaceholder}
          </span>
        </span>
      </span>
      <CalendarIcon
        aria-hidden="true"
        className="ml-3 h-4 w-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
