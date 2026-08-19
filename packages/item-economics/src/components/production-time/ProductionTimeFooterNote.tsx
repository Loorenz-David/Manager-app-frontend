export type ProductionTimeFooterNoteProps = {
  note: string;
};

export function ProductionTimeFooterNote({
  note,
}: ProductionTimeFooterNoteProps): React.JSX.Element {
  return (
    <p
      className="px-4 py-3 text-sm text-muted-foreground"
      data-testid="production-time-footer-note"
    >
      {note}
    </p>
  );
}
