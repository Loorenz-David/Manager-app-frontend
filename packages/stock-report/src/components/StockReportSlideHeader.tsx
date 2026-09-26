import type { ReactNode } from "react";

export type StockReportSlideHeaderProps = {
  title: string;
  onBack: () => void;
  /** Right-hand slot, e.g. a ⋮ button. */
  actions?: ReactNode;
  "data-testid"?: string;
};

/**
 * The slide surface's header, re-drawn by the page **inside** its scroll
 * container so it scrolls away with the content (owner, 2026-09-26). The
 * surface's own fixed header cannot do that, so the page mutes it
 * (`setHeaderHidden(true)`) and renders this one with the same anatomy — the
 * same back glyph, the same 36 px round target, the same title weight — so a
 * user cannot tell which of the two they are looking at.
 */
export function StockReportSlideHeader({
  title,
  onBack,
  actions,
  "data-testid": testId = "stock-report-slide-back",
}: StockReportSlideHeaderProps): React.JSX.Element {
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 px-4 py-3">
      <button
        aria-label="Go back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        data-testid={testId}
        type="button"
        onClick={onBack}
      >
        ‹
      </button>
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}
