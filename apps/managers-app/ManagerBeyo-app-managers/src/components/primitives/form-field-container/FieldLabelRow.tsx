type FieldLabelRowProps = {
  label: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
  children?: React.ReactNode;
};

export function FieldLabelRow({
  label,
  htmlFor,
  optional = false,
  children,
}: FieldLabelRowProps): React.JSX.Element {
  const LabelTag = htmlFor ? "label" : "p";

  return (
    <div className="flex items-center justify-between gap-3">
      <LabelTag
        {...(htmlFor ? { htmlFor } : {})}
        className="text-sm font-medium text-muted-foreground"
      >
        {label}
      </LabelTag>
      <div className="flex items-center justify-end gap-2">
        {optional ? (
          <span className="text-xs font-light text-[var(--color-border)]">
            optional
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}
