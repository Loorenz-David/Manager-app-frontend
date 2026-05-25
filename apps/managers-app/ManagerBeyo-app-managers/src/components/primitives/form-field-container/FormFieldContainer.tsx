export type ContentCardProps = {
  children: React.ReactNode;
  "data-testid"?: string;
};

export function ContentCard({
  children,
  "data-testid": testId,
}: ContentCardProps): React.JSX.Element {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-4 shadow-sm"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
