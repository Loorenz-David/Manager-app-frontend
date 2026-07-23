export type SliderFieldRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  testId?: string;
};

export function SliderFieldRow({
  label,
  value,
  min,
  max,
  step = 1,
  valueLabel = `${value}`,
  onChange,
  disabled,
  testId = "slider-field-row",
}: SliderFieldRowProps): React.JSX.Element {
  return (
    <div data-testid={testId}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#767676]">{label}</span>
        <span className="rounded bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[11px] text-[#666666]">
          {valueLabel}
        </span>
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
        data-testid={`${testId}-input`}
        className="w-full accent-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
