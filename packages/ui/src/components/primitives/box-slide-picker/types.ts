import type { ReactNode } from 'react';

export type BoxSlidePickerSize = 'sm' | 'md';
export type BoxSlidePickerDistribution = 'fill' | 'content';

export type BoxSlidePickerOption<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

export type BoxSlidePickerProps<T extends string> = {
  value: T | null | undefined;
  options: readonly BoxSlidePickerOption<T>[];
  /**
   * Names the group for a screen reader. The options announce themselves, but
   * the radiogroup around them has no label of its own to say what is being
   * chosen — so a picker that is not already introduced by nearby copy should
   * pass one.
   */
  ariaLabel?: string;
  size?: BoxSlidePickerSize;
  distribution?: BoxSlidePickerDistribution;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
  onValueChange: (value: T) => void;
};

export type BoxSlidePickerOptionButtonProps = {
  label: ReactNode;
  selected: boolean;
  size: BoxSlidePickerSize;
  distribution: BoxSlidePickerDistribution;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  onPress: () => void;
};
