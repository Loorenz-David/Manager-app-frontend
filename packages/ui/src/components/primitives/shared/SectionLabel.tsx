import { cn } from '@beyo/lib';

type SectionLabelProps = {
  children: React.ReactNode;
  as?: 'span' | 'h3';
  tone?: 'icon' | 'muted';
  className?: string;
  'data-testid'?: string;
};

const toneClassName: Record<NonNullable<SectionLabelProps['tone']>, string> = {
  icon: 'text-[color:var(--color-icon)]',
  muted: 'text-[color:var(--color-muted-foreground)]',
};

export function SectionLabel({
  children,
  as: Component = 'span',
  tone = 'icon',
  className,
  'data-testid': dataTestId,
}: SectionLabelProps): React.JSX.Element {
  return (
    <Component
      className={cn('text-sm font-medium', toneClassName[tone], className)}
      data-testid={dataTestId}
    >
      {children}
    </Component>
  );
}
