import { cva } from 'class-variance-authority';

export const boxOptionVariants = cva(
  [
    'relative flex w-full min-h-12 select-none cursor-pointer',
    'border transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      visualVariant: {
        default:
          'flex-col items-center justify-center gap-2 rounded-xl bg-card p-3 text-center',
        horizontalDescription:
          'flex-row items-center gap-3 rounded-xl bg-card px-4 py-3 text-left',
        pill: 'flex-row items-center justify-between gap-2 rounded-full px-4 py-2',
      },
      selected: {
        true: 'border-primary bg-primary text-card',
        false: 'border-border bg-card text-foreground',
      },
    },
    compoundVariants: [
      // Pill unselected gets a dashed border to signal "tap to add".
      // Solid selected styles take precedence (higher specificity via cva order).
      { visualVariant: 'pill', selected: false, className: 'border-dashed' },
    ],
    defaultVariants: {
      visualVariant: 'default',
      selected: false,
    },
  },
);

export const GRID_COLUMNS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};
