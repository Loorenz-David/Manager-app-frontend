import type { ReactNode } from 'react';

type PanelProps = {
  /** e.g. "Terminal settings" */
  title: string;
  /** e.g. "Only managers should be here. Changes apply to this device only." */
  subtitle?: string;
  /** SettingsRow children — rendered as one white card with dividers. */
  children: ReactNode;
  /**
   * Danger zone — device log out button etc. Visually separated below the
   * settings card.
   */
  footer?: ReactNode;
};

/**
 * Chrome for the device-settings rise surface. The host page composes this
 * inside the kiosk frame; rows and the danger footer are injected.
 */
export function DeviceSettingsPanel({
  title,
  subtitle,
  children,
  footer,
}: PanelProps): React.JSX.Element {
  return (
    <div
      className="mx-auto w-full max-w-[560px] py-8 sm:py-12"
      data-testid="device-settings-panel"
    >
      <p className="font-kiosk-mono text-[11px] font-medium uppercase tracking-[0.22em] text-kiosk-tertiary">
        This device
      </p>
      <h2 className="mt-3 text-[24px] font-semibold leading-tight text-kiosk-ink">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-[15px] leading-relaxed text-kiosk-secondary">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-7 divide-y divide-kiosk-line overflow-hidden rounded-[20px] bg-kiosk-card shadow-[0_1px_2px_rgba(30,27,23,0.04)]">
        {children}
      </div>
      {footer ? <div className="mt-7">{footer}</div> : null}
    </div>
  );
}

type RowProps = {
  label: string;
  description?: string;
  /** The interactive control (input, stepper, value + chevron…), host-supplied. */
  control: ReactNode;
};

export function DeviceSettingsRow({
  label,
  description,
  control,
}: RowProps): React.JSX.Element {
  return (
    <div
      className="flex min-h-[64px] items-center justify-between gap-6 px-5 py-4"
      data-testid="device-settings-row"
    >
      <div className="min-w-0">
        <p className="text-[16px] font-medium text-kiosk-ink">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-snug text-kiosk-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
