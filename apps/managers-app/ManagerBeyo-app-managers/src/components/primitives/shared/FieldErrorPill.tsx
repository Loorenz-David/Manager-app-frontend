type FieldErrorPillProps = {
  message?: string;
  'data-testid'?: string;
};

export function FieldErrorPill({
  message,
  'data-testid': dataTestId,
}: FieldErrorPillProps) {
  if (!message) return null;

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full border border-destructive/20 bg-destructive/8 px-2.5 py-0.5 text-[11px] font-medium leading-none text-destructive"
      data-testid={dataTestId}
      role="alert"
    >
      {message}
    </span>
  );
}
