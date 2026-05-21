import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const switchTrackVariants = cva(
  [
    'relative block shrink-0 rounded-full bg-muted transition-colors duration-200',
    'group-has-[:checked]:bg-primary',
    'group-has-[:focus-visible]:ring-2',
    'group-has-[:focus-visible]:ring-primary',
    'group-has-[:focus-visible]:ring-offset-2',
    'group-has-[:disabled]:cursor-not-allowed',
    'group-has-[:disabled]:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const switchThumbVariants = cva(
  [
    'absolute top-0.5 left-0.5 rounded-full bg-card shadow-sm transition-transform duration-200',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-4 w-4 group-has-[:checked]:translate-x-4',
        md: 'h-5 w-5 group-has-[:checked]:translate-x-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export type SwitchCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> &
  VariantProps<typeof switchTrackVariants> & {
    invalid?: boolean;
    wrapperClassName?: string;
  };

export const SwitchCheckbox = forwardRef<HTMLInputElement, SwitchCheckboxProps>(
  ({ size, invalid = false, wrapperClassName, className, ...props }, ref) => (
    <label
      className={cn(
        'group relative inline-flex min-h-11 min-w-11 cursor-pointer select-none items-center',
        invalid && 'rounded-full ring-2 ring-destructive ring-offset-2',
        wrapperClassName,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        aria-invalid={invalid || undefined}
        className={cn('sr-only', className)}
        {...props}
      />
      <span className={switchTrackVariants({ size })}>
        <span className={switchThumbVariants({ size })} />
      </span>
    </label>
  ),
);

SwitchCheckbox.displayName = 'SwitchCheckbox';
