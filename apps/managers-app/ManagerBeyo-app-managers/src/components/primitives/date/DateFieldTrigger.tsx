import { cva } from 'class-variance-authority';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type DateFieldTriggerProps = {
  value: string | undefined;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  onPress: () => void;
  id?: string;
  className?: string;
  'data-testid'?: string;
};

const triggerVariants = cva(
  [
    'flex h-12 w-full items-center justify-between rounded-lg border bg-input px-3',
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

export function DateFieldTrigger({
  value,
  placeholder = 'Select date',
  invalid = false,
  disabled,
  onPress,
  id,
  className,
  'data-testid': dataTestId,
}: DateFieldTriggerProps) {
  return (
    <button
      aria-haspopup="dialog"
      aria-invalid={invalid || undefined}
      className={cn(triggerVariants({ invalid }), className)}
      data-testid={dataTestId}
      disabled={disabled}
      id={id}
      onClick={onPress}
      type="button"
    >
      <span
        className={cn(
          'flex-1 text-left',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {value ?? placeholder}
      </span>
      <CalendarIcon
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
