import { cva } from 'class-variance-authority';

export const numberInputWrapperVariants = cva(
  [
    'relative flex min-h-12 items-stretch overflow-hidden rounded-lg border bg-transparent',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      invalid: {
        true: '',
        false: 'border-border',
      },
    },
    defaultVariants: {
      invalid: false,
    },
  },
);

export const numberInputFieldClasses = [
  'h-full min-w-0 flex-1 bg-transparent py-0 text-base text-foreground',
  'placeholder:text-border appearance-none outline-none',
  'disabled:cursor-not-allowed',
].join(' ');

export const numberInputUnitClasses = [
  'shrink-0 text-sm font-medium text-muted-foreground',
  'transition-opacity duration-150',
].join(' ');

export const numberStepperButtonVariants = cva(
  [
    'flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-icon transition-colors',
    'outline-none focus-visible:bg-muted/50 focus-visible:text-foreground',
    'active:bg-muted/60 active:text-foreground',
    'disabled:pointer-events-none disabled:opacity-40',
  ].join(' '),
);
