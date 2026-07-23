import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";

import { cn } from "@beyo/lib";

export type TextAlignmentChoice = "left" | "center" | "right";

const OPTIONS = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
] as const;

export type AlignmentPickerProps = {
  value: TextAlignmentChoice;
  onChange: (value: TextAlignmentChoice) => void;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
};

export function AlignmentPicker({
  value,
  onChange,
  disabled,
  ariaLabel = "Text alignment",
  testId = "text-alignment-picker",
}: AlignmentPickerProps): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className="flex rounded-lg bg-[#f0f0f0] p-0.5"
    >
      {OPTIONS.map(({ value: option, label, Icon }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-label={label}
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option)}
            data-testid={`${testId}-${option}`}
            className={cn(
              "flex flex-1 items-center justify-center rounded-[6px] py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
              active ? "bg-[#3f78a8] text-white" : "text-[#666666] hover:text-[#303030]",
            )}
          >
            <Icon aria-hidden className="size-3.5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
