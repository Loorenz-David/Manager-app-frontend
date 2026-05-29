export type ContentCardProps = {
  children: React.ReactNode;
  gapClassName?: string;
  "data-testid"?: string;
};

export function ContentCard({
  children,
  gapClassName = "gap-3",
  "data-testid": testId,
}: ContentCardProps): React.JSX.Element {
  return (
    <div
      className={`flex w-full flex-col ${gapClassName} rounded-2xl bg-[var(--color-card)] px-4 py-4 shadow-sm`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
