import { PanelFieldLabel } from "../panels/PanelPrimitives";

type ScheduleFieldProps = {
  label: string;
  /** datetime-local string ("" = unset). Timezone/UTC conversion is logic-side. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  testId: string;
};

function ScheduleField({
  label,
  value,
  onChange,
  error,
  disabled,
  testId,
}: ScheduleFieldProps): React.JSX.Element {
  return (
    <div className="min-w-0 flex-1">
      <PanelFieldLabel>{label}</PanelFieldLabel>
      <input
        type="datetime-local"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        data-testid={testId}
        className="h-9 w-full rounded-lg border border-[#dcdcdc] bg-white px-2.5 text-[13px] text-[#303030] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error && (
        <p className="mt-1 text-xs text-[#c05a5a]" data-testid={`${testId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type SchedulePickersProps = {
  startsAtValue: string;
  onStartsAtChange: (value: string) => void;
  startsAtError?: string | null;
  expiresAtValue: string;
  onExpiresAtChange: (value: string) => void;
  expiresAtError?: string | null;
  disabled?: boolean;
};

/** starts_at / expires_at scheduling window. Empty = immediate / never. */
export function SchedulePickers({
  startsAtValue,
  onStartsAtChange,
  startsAtError,
  expiresAtValue,
  onExpiresAtChange,
  expiresAtError,
  disabled,
}: SchedulePickersProps): React.JSX.Element {
  return (
    <div>
      <div className="flex gap-3">
        <ScheduleField
          label="Starts (optional)"
          value={startsAtValue}
          onChange={onStartsAtChange}
          error={startsAtError}
          disabled={disabled}
          testId="presentation-publish-starts-at"
        />
        <ScheduleField
          label="Expires (optional)"
          value={expiresAtValue}
          onChange={onExpiresAtChange}
          error={expiresAtError}
          disabled={disabled}
          testId="presentation-publish-expires-at"
        />
      </div>
      <p className="mt-1.5 text-xs text-[#9a9a9a]">
        Empty starts now and never expires. A future start shows as “Scheduled”.
      </p>
    </div>
  );
}
