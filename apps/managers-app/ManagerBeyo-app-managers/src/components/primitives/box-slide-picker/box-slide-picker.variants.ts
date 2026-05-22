import { cva } from 'class-variance-authority';

export const boxSlidePickerContainerVariants = cva(
  ['relative bg-muted/70 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-card)_55%,transparent)]'].join(
    ' ',
  ),
  {
    variants: {
      size: {
        sm: 'rounded-xl p-0.5',
        md: 'rounded-2xl p-1',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export const boxSlidePickerIndicatorVariants = cva(
  [
    'absolute bg-card',
    'shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_10%,transparent),0_6px_14px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'inset-y-0.5 rounded-[10px]',
        md: 'inset-y-1 rounded-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export const boxSlidePickerOptionVariants = cva(
  [
    'relative z-10 flex min-w-0 flex-1 items-center justify-center text-center',
    'transition-colors duration-150 outline-none',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-45',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'min-h-8 rounded-[10px] px-2.5 py-1 text-xs font-medium leading-none',
        md: 'min-h-12 rounded-xl px-4 py-2.5',
      },
      selected: {
        true: 'text-foreground',
        false: 'text-muted-foreground',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
    },
  },
);
