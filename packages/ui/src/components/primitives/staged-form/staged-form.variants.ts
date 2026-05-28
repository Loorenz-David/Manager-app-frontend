import { cva } from 'class-variance-authority';

export const stepIndicatorVariants = cva(
  [
    'absolute top-1/2 flex shrink-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
    'transition-[transform,colors] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),
  {
    variants: {
      status: {
        active: 'size-6 border-[5px] border-primary bg-background text-transparent shadow-sm',
        completed: 'size-3 border border-primary bg-primary text-transparent',
        pending: 'size-3 border border-border bg-border text-transparent',
        warning: 'size-5 border-2 border-yellow-500 bg-yellow-50 text-yellow-700',
        error: 'size-5 border-2 border-destructive bg-destructive/10 text-destructive',
        locked: 'size-4 border border-muted bg-muted text-muted-foreground',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-105',
        false: 'cursor-default',
      },
    },
    defaultVariants: {
      status: 'pending',
      interactive: false,
    },
  },
);

export const stepLabelVariants = cva('truncate px-2 text-center text-xl font-semibold leading-none tracking-tight', {
  variants: {
    status: {
      active: 'text-foreground',
      completed: 'text-foreground',
      pending: 'text-muted-foreground',
      warning: 'text-yellow-700',
      error: 'text-destructive',
      locked: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    status: 'pending',
  },
});

export const connectorVariants = cva('absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full transition-colors duration-150', {
  variants: {
    filled: {
      true: 'bg-primary',
      false: 'bg-muted',
    },
  },
  defaultVariants: {
    filled: false,
  },
});
