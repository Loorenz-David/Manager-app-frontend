import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { DISABLED_BASE, FOCUS_WITHIN_RING, INVALID_RING } from '../shared';

const textareaWrapperVariants = cva(
  [
    'relative flex rounded-lg border bg-input',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border',
        ghost: 'border-transparent bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const textareaFieldClasses = [
  'w-full flex-1 bg-transparent px-3 py-3 text-base text-foreground',
  'placeholder:text-muted-foreground appearance-none outline-none',
  'disabled:cursor-not-allowed',
].join(' ');

type ResizeProp = 'none' | 'vertical' | 'both';

const resizeClassMap: Record<ResizeProp, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  both: 'resize',
};

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaWrapperVariants> & {
    invalid?: boolean;
    resize?: ResizeProp;
    wrapperClassName?: string;
  };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      variant,
      invalid = false,
      resize = 'none',
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        textareaWrapperVariants({ variant }),
        FOCUS_WITHIN_RING,
        DISABLED_BASE,
        invalid && INVALID_RING,
        wrapperClassName,
      )}
    >
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(textareaFieldClasses, resizeClassMap[resize], className)}
        {...props}
      />
    </div>
  ),
);

TextArea.displayName = 'TextArea';
