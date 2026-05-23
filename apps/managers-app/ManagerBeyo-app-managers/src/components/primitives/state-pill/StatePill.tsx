import { cn } from '@/lib/utils';

export type StatePillVariant = 'neutral' | 'active' | 'warning' | 'success' | 'danger';

const VARIANT_CLASS: Record<StatePillVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export type StatePillProps = {
  label: string;
  variant: StatePillVariant;
  className?: string;
};

export function StatePill({ label, variant, className }: StatePillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
