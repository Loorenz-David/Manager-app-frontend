import type { ComponentType, ReactNode } from 'react';

export type BoxPickerOption<Value extends string = string> = {
  value: Value;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
  disabled?: boolean;
  testId?: string;
};

export type BoxPickerSelectionMode = 'single' | 'multiple';
export type BoxPickerLayout = 'grid' | 'stack';
export type BoxPickerVisualVariant = 'default' | 'horizontalDescription' | 'pill';
export type BoxPickerSize = 'sm' | 'xs';

type BoxPickerSingleProps<Value extends string> = {
  mode: 'single';
  value: Value | null | undefined;
  onValueChange: (value: Value) => void;
};

type BoxPickerMultipleProps<Value extends string> = {
  mode: 'multiple';
  value: Value[];
  onValueChange: (value: Value[]) => void;
};

export type BoxPickerProps<Value extends string = string> = (
  | BoxPickerSingleProps<Value>
  | BoxPickerMultipleProps<Value>
) & {
  options: BoxPickerOption<Value>[];
  layout?: BoxPickerLayout;
  visualVariant?: BoxPickerVisualVariant;
  size?: BoxPickerSize;
  columns?: 2 | 3 | 4;
  showIcon?: boolean;
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  unselectedOptionClassName?: string;
  disabledOptionClassName?: string;
  getOptionTestId?: (option: BoxPickerOption<Value>) => string;
  renderSelectedAction?: (option: BoxPickerOption<Value>) => ReactNode;
  'data-testid'?: string;
};
