import { motion } from 'framer-motion';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import {
  boxSlidePickerContainerVariants,
  boxSlidePickerIndicatorVariants,
} from './box-slide-picker.variants';
import { BoxSlidePickerOption } from './BoxSlidePickerOption';
import type { BoxSlidePickerProps } from './types';

type IndicatorFrame = {
  x: number;
  width: number;
};

const INDICATOR_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 34,
  mass: 0.82,
} as const;

export function BoxSlidePicker<T extends string>({
  value,
  options,
  size = 'md',
  disabled = false,
  className,
  dataTestId,
  onValueChange,
}: BoxSlidePickerProps<T>): React.JSX.Element {
  const optionRefs = useRef(new Map<T, HTMLButtonElement | null>());
  const [indicatorFrame, setIndicatorFrame] = useState<IndicatorFrame | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useLayoutEffect(() => {
    function updateIndicatorFrame() {
      if (!selectedOption) {
        setIndicatorFrame(null);
        return;
      }

      const node = optionRefs.current.get(selectedOption.value);
      if (!node) {
        setIndicatorFrame(null);
        return;
      }

      setIndicatorFrame({
        x: node.offsetLeft,
        width: node.offsetWidth,
      });
    }

    updateIndicatorFrame();
    window.addEventListener('resize', updateIndicatorFrame);

    return () => {
      window.removeEventListener('resize', updateIndicatorFrame);
    };
  }, [options, selectedOption]);

  return (
    <div
      className={cn(boxSlidePickerContainerVariants({ size }), className)}
      data-testid={dataTestId}
      role="radiogroup"
    >
      <div className="relative flex items-stretch">
        {indicatorFrame ? (
          <motion.div
            animate={{
              x: indicatorFrame.x,
              width: indicatorFrame.width,
            }}
            className={cn(boxSlidePickerIndicatorVariants({ size }))}
            initial={false}
            transition={INDICATOR_SPRING}
          />
        ) : null}
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <BoxSlidePickerOption
              key={option.value}
              ref={(node) => {
                optionRefs.current.set(option.value, node);
              }}
              ariaLabel={option.ariaLabel}
              disabled={disabled || option.disabled}
              label={
                <span className="flex min-w-0 items-center justify-center gap-2">
                  {option.icon}
                  <span className="min-w-0">{option.label}</span>
                  {option.badge}
                </span>
              }
              selected={selected}
              size={size}
              testId={option.testId}
              onPress={() => {
                if (disabled || option.disabled || selected) {
                  return;
                }

                onValueChange(option.value);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
