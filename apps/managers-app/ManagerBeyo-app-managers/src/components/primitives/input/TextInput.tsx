import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { DISABLED_BASE, FOCUS_WITHIN_RING, INVALID_RING } from '../shared';

const inputWrapperVariants = cva(
  [
    'relative flex items-center rounded-lg border bg-input',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        sm: 'h-10 px-0',
        md: 'h-12 px-0',
        lg: 'h-14 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

const inputFieldClasses = [
  'h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground',
  'placeholder:text-muted-foreground appearance-none outline-none',
  'disabled:cursor-not-allowed',
].join(' ');

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof inputWrapperVariants> & {
    invalid?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    wrapperClassName?: string;
  };

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      variant,
      size,
      invalid = false,
      leftIcon,
      rightIcon,
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        inputWrapperVariants({ variant, size }),
        FOCUS_WITHIN_RING,
        DISABLED_BASE,
        invalid && INVALID_RING,
        wrapperClassName,
      )}
    >
      {leftIcon ? (
        <span className="pointer-events-none shrink-0 pl-3 text-muted-foreground">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputFieldClasses, className)}
        {...props}
      />
      {rightIcon ? (
        <span className="pointer-events-none shrink-0 pr-3 text-muted-foreground">
          {rightIcon}
        </span>
      ) : null}
    </div>
  ),
);

TextInput.displayName = 'TextInput';
