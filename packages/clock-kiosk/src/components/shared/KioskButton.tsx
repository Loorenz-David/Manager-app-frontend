import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@beyo/lib';

type Variant = 'success' | 'accent' | 'muted' | 'danger' | 'ghost';
type Size = 'xl' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  'data-testid'?: string;
  /**
   * success = clock in · accent = clock out / primary neutral action ·
   * muted = Done-style soft action · danger = destructive (device log out) ·
   * ghost = quiet inline action ("Not you? Go back")
   */
  variant: Variant;
  /** xl = kiosk primary (full-width, ~88px tall) · md = settings/forms. */
  size?: Size;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  success: 'bg-kiosk-success text-white active:brightness-95',
  accent: 'bg-kiosk-accent text-white active:brightness-95',
  muted: 'bg-kiosk-key text-kiosk-ink active:brightness-95',
  danger: 'bg-kiosk-error/10 text-kiosk-error active:bg-kiosk-error/15',
  ghost: 'bg-transparent text-kiosk-secondary active:text-kiosk-ink',
};

const SIZE_CLASSES: Record<Size, string> = {
  xl: 'h-[88px] w-full rounded-[26px] text-[22px] font-semibold',
  md: 'h-14 rounded-2xl px-6 text-[16px] font-semibold',
};

/**
 * The kiosk action button. Touch-first: nothing below 44px, xl actions match
 * the design's 86–96px primary bar. Purely presentational — behavior comes
 * from the standard button props (onClick, disabled, type).
 */
export function KioskButton({
  variant,
  size = 'xl',
  className,
  type,
  ...rest
}: Props): React.JSX.Element {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex min-h-11 items-center justify-center transition-[filter,background-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      type={type ?? 'button'}
    />
  );
}
