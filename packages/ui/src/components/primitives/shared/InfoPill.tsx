import { cn } from '@beyo/lib';

type InfoPillProps = {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

export function InfoPill({
  children,
  className,
  'data-testid': dataTestId,
}: InfoPillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--color-between-border)] bg-[var(--color-light-border)] px-3 py-1.5 text-sm font-medium text-foreground',
        className,
      )}
      data-testid={dataTestId}
    >
      {children}
    </span>
  );
}
