import { Info } from "lucide-react";

export type StockInfoNoteProps = {
  children: React.ReactNode;
  "data-testid"?: string;
};

/**
 * The sheets' informative note (owner, 2026-09-28): the house `active` pill's
 * light blue, with its ink as the text and the border, and an info icon.
 * Stack several lines as `<p>`s.
 */
export function StockInfoNote({ children, "data-testid": testId }: StockInfoNoteProps): React.JSX.Element {
  return (
    <div className="flex gap-2.5 rounded-lg border border-[#1f5ea8] bg-[#eaf4ff] p-3 text-sm text-[#1f5ea8]" data-testid={testId}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}
