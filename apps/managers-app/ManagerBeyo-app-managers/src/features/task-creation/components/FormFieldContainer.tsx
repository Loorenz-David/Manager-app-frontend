type FormFieldContainerProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function FormFieldContainer({
  children,
  'data-testid': testId,
}: FormFieldContainerProps): React.JSX.Element {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-xl bg-[var(--color-card)] px-4 py-4 shadow-sm"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
