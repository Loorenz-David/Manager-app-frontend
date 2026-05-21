import { cva } from 'class-variance-authority';

export const phoneInputWrapperVariants = cva(
  [
    'relative flex h-12 items-center overflow-hidden rounded-lg border bg-transparent',
    'transition-colors duration-150',
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

export const phoneInputFieldClasses = [
  'h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground',
  'placeholder:text-border appearance-none outline-none',
  'disabled:cursor-not-allowed',
].join(' ');

export const countryPrefixSelectorVariants = cva(
  [
    'flex h-full shrink-0 items-center gap-2 px-3 text-sm text-foreground',
    'outline-none transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
);
