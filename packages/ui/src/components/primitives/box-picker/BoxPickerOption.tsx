import type { KeyboardEvent, ReactNode } from "react";

import { cn } from '@beyo/lib';

import { boxOptionVariants } from "./box-picker.variants";
import type {
  BoxPickerOption as BoxPickerOptionType,
  BoxPickerSize,
  BoxPickerVisualVariant,
} from "./box-picker.types";

type BoxPickerOptionProps<Value extends string> = {
  option: BoxPickerOptionType<Value>;
  isSelected: boolean;
  size?: BoxPickerSize;
  visualVariant?: BoxPickerVisualVariant;
  showIcon?: boolean;
  showLabel?: boolean;
  showDescription?: boolean;
  optionClassName?: string;
  selectedOptionClassName?: string;
  unselectedOptionClassName?: string;
  disabledOptionClassName?: string;
  testId?: string;
  onPress: (value: Value) => void;
  renderSelectedAction?: (option: BoxPickerOptionType<Value>) => ReactNode;
};

export function BoxPickerOption<Value extends string>({
  option,
  isSelected,
  size = "sm",
  visualVariant = "default",
  showIcon = true,
  showLabel = true,
  showDescription = true,
  optionClassName,
  selectedOptionClassName,
  unselectedOptionClassName,
  disabledOptionClassName,
  testId,
  onPress,
  renderSelectedAction,
}: BoxPickerOptionProps<Value>) {
  const Icon = option.icon;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.key === "Enter" || event.key === " ") && !option.disabled) {
      event.preventDefault();
      onPress(option.value);
    }
  }

  return (
    <div
      role="button"
      tabIndex={option.disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={option.disabled}
      data-testid={testId}
      onClick={!option.disabled ? () => onPress(option.value) : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        boxOptionVariants({ visualVariant, selected: isSelected }),
        size === "xs" && visualVariant === "pill" && "min-h-0 px-3 py-1",
        optionClassName,
        isSelected && selectedOptionClassName,
        !isSelected && unselectedOptionClassName,
        option.disabled && disabledOptionClassName,
      )}
    >
      <span
        className={cn(
          "flex min-w-0 flex-1 gap-2",
          visualVariant === "default"
            ? "flex-col items-center justify-center"
            : "flex-row items-center",
        )}
      >
        {showIcon && option.image ? (
          <img
            src={option.image}
            alt=""
            aria-hidden="true"
            className={cn(
              "size-8 shrink-0 rounded object-contain",
              option.imageClassName,
            )}
          />
        ) : showIcon && Icon ? (
          <Icon className="size-5 shrink-0" />
        ) : null}
        <span className="flex min-w-0 flex-col gap-0.5">
          {showLabel ? (
            <span
              className={cn(
                "truncate font-medium",
                size === "xs" ? "text-xs" : "text-sm",
              )}
            >
              {option.label}
            </span>
          ) : null}
          {showDescription &&
          option.description &&
          visualVariant === "horizontalDescription" ? (
            <span className="text-xs opacity-70">{option.description}</span>
          ) : null}
        </span>
      </span>

      {isSelected && renderSelectedAction ? (
        <span
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {renderSelectedAction(option)}
        </span>
      ) : null}
    </div>
  );
}
