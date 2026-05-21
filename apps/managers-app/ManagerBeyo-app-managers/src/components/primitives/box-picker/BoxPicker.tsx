import { cn } from '@/lib/utils';

import { GRID_COLUMNS } from './box-picker.variants';
import { BoxPickerOption } from './BoxPickerOption';
import type { BoxPickerProps, BoxPickerOption as BoxPickerOptionType } from './box-picker.types';

function isOptionSelected<Value extends string>(
  mode: BoxPickerProps<Value>['mode'],
  value: Value | Value[] | null | undefined,
  optionValue: Value,
) {
  if (mode === 'multiple') {
    return (value as Value[]).includes(optionValue);
  }

  return value === optionValue;
}

function getOptionTestId<Value extends string>(
  option: BoxPickerOptionType<Value>,
  resolver?: (option: BoxPickerOptionType<Value>) => string,
) {
  return resolver ? resolver(option) : option.testId;
}

export function BoxPicker<Value extends string = string>({
  mode,
  value,
  onValueChange,
  options,
  layout = 'grid',
  visualVariant = 'default',
  columns = 2,
  showIcon = true,
  showLabel = true,
  showDescription = true,
  className,
  optionClassName,
  selectedOptionClassName,
  unselectedOptionClassName,
  disabledOptionClassName,
  getOptionTestId: getOptionTestIdProp,
  renderSelectedAction,
  'data-testid': testId,
}: BoxPickerProps<Value>) {
  function handlePress(optionValue: Value) {
    if (mode === 'multiple') {
      const currentValue = value as Value[];
      const nextValue = currentValue.includes(optionValue)
        ? currentValue.filter((entry) => entry !== optionValue)
        : [...currentValue, optionValue];

      (onValueChange as (value: Value[]) => void)(nextValue);
      return;
    }

    (onValueChange as (value: Value) => void)(optionValue);
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        layout === 'grid'
          ? ['grid', GRID_COLUMNS[columns], 'gap-2']
          : 'flex flex-col gap-2',
        className,
      )}
    >
      {options.map((option) => (
        <BoxPickerOption
          key={option.value}
          option={option}
          isSelected={isOptionSelected(mode, value, option.value)}
          visualVariant={visualVariant}
          showIcon={showIcon}
          showLabel={showLabel}
          showDescription={showDescription}
          optionClassName={optionClassName}
          selectedOptionClassName={selectedOptionClassName}
          unselectedOptionClassName={unselectedOptionClassName}
          disabledOptionClassName={disabledOptionClassName}
          testId={getOptionTestId(option, getOptionTestIdProp)}
          onPress={handlePress}
          renderSelectedAction={renderSelectedAction}
        />
      ))}
    </div>
  );
}
