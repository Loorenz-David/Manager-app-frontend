import { Check } from "lucide-react";

import { cn } from "@beyo/lib";

type ChipCheckboxGroupProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  testId: string;
  /** Shown under the chips, e.g. "Empty = all apps". */
  hint?: string;
};

/** Multi-select chips for audience dimensions (apps, roles). */
export function ChipCheckboxGroup<T extends string>({
  options,
  selected,
  onToggle,
  disabled,
  ariaLabel,
  testId,
  hint,
}: ChipCheckboxGroupProps<T>): React.JSX.Element {
  return (
    <div role="group" aria-label={ariaLabel} data-testid={testId}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onToggle(option.value)}
              data-testid={`${testId}-${option.value}`}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2.5 py-[6px] text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-[#3f78a8] bg-[rgba(63,120,168,0.12)] text-[#2c5372]"
                  : "border-[#dcdcdc] bg-white text-[#767676] hover:border-[#9a9a9a] hover:text-[#303030]",
              )}
            >
              {isSelected && <Check aria-hidden className="size-3" strokeWidth={2.5} />}
              {option.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-[#9a9a9a]">{hint}</p>}
    </div>
  );
}
