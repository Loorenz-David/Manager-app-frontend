import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

import {
  boxSlidePickerOptionDistributionClass,
  boxSlidePickerOptionVariants,
} from './box-slide-picker.variants';
import type { BoxSlidePickerOptionButtonProps } from './types';

export const BoxSlidePickerOption = forwardRef<
  HTMLButtonElement,
  BoxSlidePickerOptionButtonProps
>(
  ({ label, selected, size, distribution, disabled = false, testId, ariaLabel, onPress }, ref) => (
  <button
    ref={ref}
    aria-checked={selected}
    aria-label={ariaLabel}
    aria-selected={selected}
    className={cn(
      boxSlidePickerOptionVariants({ selected, size }),
      boxSlidePickerOptionDistributionClass(distribution),
    )}
    data-testid={testId}
    disabled={disabled}
    role="radio"
    type="button"
    onClick={onPress}
  >
    {label}
  </button>
));

BoxSlidePickerOption.displayName = 'BoxSlidePickerOption';
