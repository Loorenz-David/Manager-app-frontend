import { ShopifyProductSyncStagedFormHeader } from "./ShopifyProductSyncStagedFormHeader";

type ShopifyProductSyncStatusPanelProps = {
  title: string;
  message: string;
  tone?: "muted" | "error";
  closeLabel: string;
  onClose: () => void;
  onRetry?: () => void;
};

/**
 * Shown instead of the form while the product is being read from Shopify, while
 * a previous save is still being processed, or when Shopify could not be read.
 * Closing stays possible so the worker is never stuck.
 */
export function ShopifyProductSyncStatusPanel({
  title,
  message,
  tone = "muted",
  closeLabel,
  onClose,
  onRetry,
}: ShopifyProductSyncStatusPanelProps): React.JSX.Element {
  return (
    <div
      className="flex h-full flex-col bg-background"
      data-testid="shopify-product-sync-status-panel"
    >
      <ShopifyProductSyncStagedFormHeader title={title} />
      <div className="flex flex-1 items-center justify-center px-6">
        <p
          className={
            tone === "error"
              ? "text-center text-sm text-destructive"
              : "text-center text-sm text-muted-foreground"
          }
          data-testid="shopify-product-sync-status-message"
        >
          {message}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border/50 bg-background px-6 pt-3 pb-4">
        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-card px-5 py-3.5 text-md font-semibold text-foreground shadow-sm transition"
          data-testid="shopify-product-sync-status-close"
          type="button"
          onClick={onClose}
        >
          {closeLabel}
        </button>
        {onRetry ? (
          <button
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-md font-semibold text-white shadow-sm transition"
            data-testid="shopify-product-sync-status-retry"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : (
          <span />
        )}
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
