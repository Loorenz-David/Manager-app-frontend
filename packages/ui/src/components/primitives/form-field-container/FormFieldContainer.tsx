export type ContentCardProps = {
  children: React.ReactNode;
  gapClassName?: string;
  paddingClassName?: string;
  "data-testid"?: string;
};

export function ContentCard({
  children,
  gapClassName = "gap-3",
  paddingClassName = "px-4 py-4",
  "data-testid": testId,
}: ContentCardProps): React.JSX.Element {
  return (
    <div
      className={`flex w-full flex-col ${gapClassName} rounded-2xl bg-[var(--color-card)] ${paddingClassName} shadow-sm`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
