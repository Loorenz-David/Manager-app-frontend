type CaseMessageDateSeparatorProps = {
  separatorKey: string;
  label: string;
};

export function CaseMessageDateSeparator({
  separatorKey,
  label,
}: CaseMessageDateSeparatorProps): React.JSX.Element {
  return (
    <div className="flex justify-center px-4 py-2">
      <span
        className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-muted-intense)]"
        data-testid={`case-message-date-separator-${separatorKey}`}
      >
        {label}
      </span>
    </div>
  );
}
