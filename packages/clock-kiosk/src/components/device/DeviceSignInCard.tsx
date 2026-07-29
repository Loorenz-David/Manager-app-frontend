import type { ReactNode } from 'react';

type Props = {
  /** e.g. "Set up this terminal" */
  title: string;
  /** e.g. "Sign in with a manager account to bind this device to the floor." */
  subtitle: string;
  /** The form body — the host places the auth form + terminal-label field here. */
  children: ReactNode;
  /** Small mono footnote under the card body (e.g. scope/rate-limit hint). */
  footnote?: string;
};

/**
 * Chrome for the one-time device sign-in screen. Pure layout: the host app
 * supplies the actual form (SignInForm from @beyo/auth + the terminal-label
 * field) as children.
 */
export function DeviceSignInCard({
  title,
  subtitle,
  children,
  footnote,
}: Props): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-6">
      <div
        className="w-full max-w-[420px] rounded-[24px] bg-kiosk-card p-7 shadow-[0_1px_2px_rgba(30,27,23,0.04),0_8px_24px_rgba(30,27,23,0.05)] sm:p-9"
        data-testid="device-sign-in-card"
      >
        <p className="font-kiosk-mono text-[11px] font-medium uppercase tracking-[0.22em] text-kiosk-tertiary">
          Terminal setup
        </p>
        <h1 className="mt-3 text-[26px] font-semibold leading-tight text-kiosk-ink">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-kiosk-secondary">
          {subtitle}
        </p>
        <div className="mt-7 space-y-4">{children}</div>
        {footnote ? (
          <p className="mt-6 text-center font-kiosk-mono text-[12px] text-kiosk-tertiary">
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
