import { cn } from '@/lib/utils';

type EyebrowLabelProps = {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

export function EyebrowLabel({
  children,
  className,
  'data-testid': dataTestId,
}: EyebrowLabelProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'text-[10px] tracking-wide text-[color:var(--color-icon)]',
        className,
      )}
      data-testid={dataTestId}
    >
      {children}
    </span>
  );
}
