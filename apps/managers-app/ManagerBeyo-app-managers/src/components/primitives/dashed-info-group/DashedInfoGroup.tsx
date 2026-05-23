export type DashedInfoGroupProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function DashedInfoGroup({
  children,
  'data-testid': testId,
}: DashedInfoGroupProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-dashed border-(--color-border)/50 bg-background divide-y divide-dashed divide-(--color-border)/50"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
