import { AlertTriangle, Loader2 } from "lucide-react";

import type { StockVersionCreatePhase } from "../controllers/use-stock-report-hub-controller";

type StockVersionCreateOverlayProps = {
  phase: Exclude<StockVersionCreatePhase, "idle">;
  errorMessage?: string;
  /** Failed only: leaves the overlay and stays on the hub. */
  onDismiss?: () => void;
};

/**
 * Blocks the hub while a version is being opened (owner, 2026-09-26). The
 * backend freezes every row in one transaction, so there is nothing to show
 * but the wait; on success the stack slides to the board and this unmounts.
 * Same anatomy as the task-creation submit overlay, without its SKU line.
 */
export function StockVersionCreateOverlay({
  phase,
  errorMessage,
  onDismiss,
}: StockVersionCreateOverlayProps): React.JSX.Element {
  const isFailed = phase === "failed";
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      data-phase={phase}
      data-testid="stock-version-create-overlay"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-card px-6 py-8 text-center shadow-xl">
        {isFailed ? (
          <AlertTriangle className="h-8 w-8 text-destructive" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
        <p className="text-base font-medium text-foreground">
          {isFailed ? "Version not created" : "Creating new version"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isFailed
            ? (errorMessage ?? "The version could not be opened. Try again.")
            : "Freezing today's stock needs…"}
        </p>
        {isFailed && onDismiss ? (
          <button
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground"
            data-testid="stock-version-create-overlay-back"
            type="button"
            onClick={onDismiss}
          >
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
