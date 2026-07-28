import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

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
  onDismiss?: () => void;
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
  onDismiss,
}: TaskCreationSubmitOverlayProps): React.JSX.Element {
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
        if (
          onDismiss &&
          (event.key === "Enter" || event.key === " ")
        ) {
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
          data-testid="task-creation-submit-overlay-sku"
        >
          <span>SKU:</span>
          <span
            className="text-lg font-bold text-foreground"
            data-testid="task-creation-submit-overlay-sku-value"
          >
            {sku}
          </span>
        </p>
      </div>
    </div>
  );
}
