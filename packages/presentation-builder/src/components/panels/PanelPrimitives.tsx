import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

export function PanelHeading({ children }: { children: string }): React.JSX.Element {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
      {children}
    </p>
  );
}

/** Header row for element panels: heading + close (back to the slide panel). */
export function PanelHeaderRow({
  heading,
  onClose,
  closeTestId,
}: {
  heading: string;
  onClose: () => void;
  closeTestId: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <PanelHeading>{heading}</PanelHeading>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close and show slide settings"
        data-testid={closeTestId}
        className="-mr-1 flex size-6 items-center justify-center rounded-md text-[#9a9a9a] transition-colors duration-150 hover:bg-[#f0f0f0] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

export function PanelFieldLabel({ children }: { children: string }): React.JSX.Element {
  return <p className="mb-1.5 text-xs font-semibold text-[#767676]">{children}</p>;
}

export function PanelSection({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="mt-4 first:mt-0">{children}</div>;
}

export function PanelHint({ children }: { children: string }): React.JSX.Element {
  return <p className="mt-4 text-xs leading-4 text-[#9a9a9a]">{children}</p>;
}

export function PanelDeleteButton({
  label,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="mt-5 text-[13px] font-semibold text-[#c05a5a] transition-colors duration-150 hover:text-[#a03e3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  testId: string;
};

/** The design's segmented control: #f0f0f0 track, accent active segment. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
  testId,
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className="flex rounded-lg bg-[#f0f0f0] p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            data-testid={`${testId}-${option.value}`}
            className={cn(
              "flex-1 rounded-[6px] px-2 py-[5px] text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50",
              isActive ? "bg-[#3f78a8] text-white" : "text-[#666666] hover:text-[#303030]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type PanelSliderProps = {
  label: string;
  /** Right-aligned value display, e.g. "30px" or "4.0s". */
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  testId: string;
};

export function PanelSlider({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
  testId,
}: PanelSliderProps): React.JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#767676]">{label}</span>
        <span className="font-mono text-[11px] text-[#9a9a9a]">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        data-testid={testId}
        className="w-full accent-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
