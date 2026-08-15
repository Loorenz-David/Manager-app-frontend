import { AlertTriangle, CheckCircle2, Loader2, Plus } from "lucide-react";

export type TaskCreationSubmitOverlayPhase =
  | "creating"
  | "succeeded"
  | "failed"
  | "still_processing";

type TaskCreationSubmitOverlayProps = {
  phase: TaskCreationSubmitOverlayPhase;
  title: string;
  description?: string;
  sku: string;
  /**
   * The SKU shown is the pre-save preview, not the one the backend assigned —
   * marked so a seller reading it mid-submit doesn't take it as final.
   */
  isSkuProvisional?: boolean;
  /**
   * Leaves the creation slide entirely. Drives both the "Back" button and the
   * backdrop tap, which stay the same action — the backdrop was the only exit
   * before the buttons existed and keeps working.
   */
  onDismiss?: () => void;
  /**
   * Starts a blank form of the same type without leaving the slide. Only
   * passed on a phase where the task is confirmed created, so an unresolved
   * submit can never be walked away from into a new one.
   */
  onCreateAnother?: () => void;
};

/**
 * Full-form blocking overlay shown while a submitted pre-order is being
 * created and its Shopify order provisioned. Rendered inside the form's
 * relatively-positioned root so it covers the whole slide page.
 */
export function TaskCreationSubmitOverlay({
  phase,
  title,
  description,
  sku,
  isSkuProvisional = false,
  onDismiss,
  onCreateAnother,
}: TaskCreationSubmitOverlayProps): React.JSX.Element {
  const hasActions = Boolean(onDismiss ?? onCreateAnother);

  return (
    <div
      aria-label={onDismiss ? "Dismiss pre-order status" : undefined}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6 ${
        onDismiss ? "cursor-pointer" : ""
      }`}
      data-testid="task-creation-submit-overlay"
      data-phase={phase}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss?.();
        }
      }}
      onKeyDown={(event) => {
        // Only the backdrop's own key events dismiss — without this the
        // action buttons inside the card would fire twice, since their
        // Enter/Space keydown bubbles up to here.
        if (event.target !== event.currentTarget) {
          return;
        }

        if (onDismiss && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onDismiss();
        }
      }}
      role={onDismiss ? "button" : undefined}
      tabIndex={onDismiss ? 0 : undefined}
    >
      <div className="flex w-full max-w-xs cursor-default flex-col items-center gap-3 rounded-2xl bg-card px-6 py-8 text-center shadow-xl">
        {phase === "succeeded" ? (
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        ) : phase === "failed" ? (
          <AlertTriangle className="h-8 w-8 text-destructive" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
        <p className="text-base font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        <p
          className="mt-1 flex items-baseline gap-1.5 text-sm text-muted-foreground"
          data-provisional={isSkuProvisional ? "true" : "false"}
          data-testid="task-creation-submit-overlay-sku"
        >
          <span>SKU:</span>
          <span
            className="text-lg font-bold text-foreground"
            data-testid="task-creation-submit-overlay-sku-value"
          >
            {isSkuProvisional && sku ? `≈ ${sku}` : sku}
          </span>
        </p>
        {hasActions ? (
          <div
            className={`mt-3 grid w-full gap-3 ${
              onDismiss && onCreateAnother ? "grid-cols-2" : "grid-cols-1"
            }`}
            data-testid="task-creation-submit-overlay-actions"
          >
            {onDismiss ? (
              <button
                className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground transition"
                data-testid="task-creation-submit-overlay-back-button"
                type="button"
                onClick={onDismiss}
              >
                Back
              </button>
            ) : null}
            {onCreateAnother ? (
              <button
                className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition"
                data-testid="task-creation-submit-overlay-create-another-button"
                type="button"
                onClick={onCreateAnother}
              >
                <Plus aria-hidden="true" className="size-4 shrink-0" />
                Another
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
