import type { ReactNode } from 'react';

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
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
  onValueChange: (value: T) => void;
};

export type BoxSlidePickerOptionButtonProps = {
  label: ReactNode;
  selected: boolean;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  onPress: () => void;
};
