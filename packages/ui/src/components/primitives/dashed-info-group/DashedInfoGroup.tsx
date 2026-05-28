export type DashedInfoGroupProps = {
  children: React.ReactNode;
  "data-testid"?: string;
};

export function DashedInfoGroup({
  children,
  "data-testid": testId,
}: DashedInfoGroupProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-dashed border-[var(--color-between-border)] bg-[var(--color-light-container)] divide-y divide-dashed divide-[var(--color-between-border)]"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
