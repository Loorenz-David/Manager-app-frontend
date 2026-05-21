import { cva } from 'class-variance-authority';

export const boxSlidePickerContainerVariants = cva(
  [
    'relative rounded-2xl bg-muted/70 p-1',
    'shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-card)_55%,transparent)]',
  ].join(' '),
);

export const boxSlidePickerIndicatorVariants = cva(
  [
    'absolute inset-y-1 rounded-xl bg-card',
    'shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_10%,transparent),0_6px_14px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]',
  ].join(' '),
);

export const boxSlidePickerOptionVariants = cva(
  [
    'relative z-10 flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-center',
    'transition-colors duration-150 outline-none',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-45',
  ].join(' '),
  {
    variants: {
      selected: {
        true: 'text-foreground',
        false: 'text-muted-foreground',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);
