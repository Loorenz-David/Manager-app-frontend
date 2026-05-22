import type { ReactNode } from 'react';

export type BoxSlidePickerSize = 'sm' | 'md';

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
  size?: BoxSlidePickerSize;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
  onValueChange: (value: T) => void;
};

export type BoxSlidePickerOptionButtonProps = {
  label: ReactNode;
  selected: boolean;
  size: BoxSlidePickerSize;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  onPress: () => void;
};
