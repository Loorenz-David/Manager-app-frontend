import { cva } from 'class-variance-authority';

/** Circular step badge: check when completed, alert when flagged, step number otherwise. */
export const stepIndicatorVariants = cva(
  [
    'flex size-7 shrink-0 items-center justify-center rounded-full',
    'text-xs font-semibold leading-none tabular-nums',
    'transition-colors duration-200',
  ].join(' '),
  {
    variants: {
      status: {
        active: 'bg-foreground text-card',
        completed: 'bg-success/15 text-success',
        pending: 'bg-muted/60 text-muted-foreground',
        warning: 'bg-warning/15 text-warning',
        error: 'bg-destructive/10 text-destructive',
        locked: 'bg-muted/60 text-muted-foreground',
      },
      interactive: {
        true: 'cursor-pointer',
        false: 'cursor-default',
      },
    },
    defaultVariants: {
      status: 'pending',
      interactive: false,
    },
  },
);

export const stepLabelVariants = cva('truncate text-sm leading-none tracking-tight', {
  variants: {
    status: {
      active: 'font-semibold text-foreground',
      completed: 'font-medium text-muted-foreground',
      pending: 'font-medium text-muted-foreground',
      warning: 'font-medium text-warning',
      error: 'font-medium text-destructive',
      locked: 'font-medium text-muted-foreground',
    },
  },
  defaultVariants: {
    status: 'pending',
  },
});

/** Fill bar inside a connector track — width carries the progress, colour the state. */
export const connectorVariants = cva('h-full rounded-full transition-[width] duration-300 ease-out', {
  variants: {
    filled: {
      true: 'w-full bg-foreground',
      false: 'w-0 bg-foreground',
    },
  },
  defaultVariants: {
    filled: false,
  },
});
