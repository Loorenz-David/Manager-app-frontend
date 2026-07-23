import { useEffect, useState } from "react";

import { cn } from "@beyo/lib";

const DEFAULT_COLORS = [
  "#FFFFFF",
  "#1F2937",
  "#3F78A8",
  "#D97706",
  "#C05A5A",
  "#16A34A",
] as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

export type ColorSwatchPickerProps = {
  value?: string;
  onChange: (value: string | undefined) => void;
  colors?: readonly string[];
  allowNone?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
};

export function ColorSwatchPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  allowNone,
  disabled,
  ariaLabel = "Color",
  testId = "color-swatch-picker",
}: ColorSwatchPickerProps): React.JSX.Element {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => setDraft(value ?? ""), [value]);

  return (
    <div data-testid={testId}>
      <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
        {allowNone && (
          <button
            type="button"
            role="radio"
            aria-label="No color"
            aria-checked={value === undefined}
            disabled={disabled}
            onClick={() => onChange(undefined)}
            data-testid={`${testId}-none`}
            className={cn(
              "relative size-7 overflow-hidden rounded-md border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
              value === undefined ? "border-[#3f78a8] ring-1 ring-[#3f78a8]" : "border-[#dcdcdc]",
            )}
          >
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#c05a5a]"
            />
          </button>
        )}
        {colors.map((color) => {
          const normalized = color.toUpperCase();
          const active = value?.toUpperCase() === normalized;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-label={color}
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(normalized)}
              data-testid={`${testId}-swatch-${color.slice(1).toLowerCase()}`}
              className={cn(
                "size-7 rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
                active ? "border-[#3f78a8] ring-1 ring-[#3f78a8]" : "border-black/15",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <input
        type="text"
        value={draft}
        disabled={disabled}
        aria-label={`${ariaLabel} hex value`}
        placeholder="#RRGGBB"
        spellCheck={false}
        maxLength={9}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (HEX_COLOR.test(next)) onChange(next.toUpperCase());
        }}
        onBlur={() => {
          if (!HEX_COLOR.test(draft)) setDraft(value ?? "");
        }}
        data-testid={`${testId}-hex`}
        className="mt-2 w-full rounded-lg border border-[#dcdcdc] bg-white px-2.5 py-1.5 font-mono text-xs uppercase text-[#303030] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
