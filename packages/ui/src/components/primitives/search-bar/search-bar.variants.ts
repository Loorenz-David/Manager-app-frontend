import { cva } from 'class-variance-authority';

export const SEARCH_BAR_WRAPPER =
  'relative flex h-12 items-center overflow-hidden rounded-xl border border-border bg-card transition-colors duration-150';

export const searchBarActionButtonVariants = cva(
  [
    'flex h-full min-w-11 shrink-0 items-center justify-center',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
    'disabled:pointer-events-none disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      active: {
        true: 'text-primary',
        false: 'text-icon',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);
