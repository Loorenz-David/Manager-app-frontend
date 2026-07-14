import { cn } from "@beyo/lib";

import type { SearchableSelectOption } from "./option-list.types";

export type OptionListProps<TValue extends string = string> = {
  options: readonly SearchableSelectOption<TValue>[];
  activeValue: TValue | null;
  selectedValue: TValue | null;
  onSelect: (option: SearchableSelectOption<TValue>) => void;
  onActiveChange: (value: TValue | null) => void;
  emptyMessage?: string;
  listboxId: string;
  getOptionId: (value: TValue) => string;
  className?: string;
};

export function OptionList<TValue extends string = string>({
  options,
  activeValue,
  selectedValue,
  onSelect,
  onActiveChange,
  emptyMessage = "No options found",
  listboxId,
  getOptionId,
  className,
}: OptionListProps<TValue>): React.JSX.Element {
  return (
    <div
      id={listboxId}
      role="listbox"
      className={cn("w-full overflow-y-auto outline-none", className)}
    >
      {options.length === 0 ? (
        <div className="px-3 py-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        options.map((option) => {
          const isActive = option.value === activeValue;
          const isSelected = option.value === selectedValue;

          return (
            <div
              key={option.value}
              id={getOptionId(option.value)}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              className={cn(
                "flex min-h-12 cursor-pointer items-center px-3 text-sm text-foreground",
                isActive && "bg-muted",
                isSelected && "font-medium",
                option.disabled &&
                  "cursor-not-allowed text-muted-foreground opacity-60",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => {
                if (!option.disabled) {
                  onActiveChange(option.value);
                }
              }}
              onMouseLeave={() => onActiveChange(null)}
              onClick={() => {
                if (!option.disabled) {
                  onSelect(option);
                }
              }}
            >
              {option.displayValue}
            </div>
          );
        })
      )}
    </div>
  );
}
