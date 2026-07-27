import { StatePill } from "@beyo/ui";
import { RotateCcw } from "lucide-react";

type ShopifyCustomerStatus = "idle" | "loading" | "found" | "not_found";

type ShopifyCustomerStatusPillProps = {
  status: ShopifyCustomerStatus;
  onRetry: () => void;
};

export function ShopifyCustomerStatusPill({
  status,
  onRetry,
}: ShopifyCustomerStatusPillProps): React.JSX.Element | null {
  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <div data-testid="shopify-customer-status-pill" className="px-4">
        <StatePill label="Looking up Shopify customer" variant="neutral" />
      </div>
    );
  }

  if (status === "found") {
    return (
      <div data-testid="shopify-customer-status-pill" className="px-4">
        <StatePill label="Shopify customer" variant="success" />
      </div>
    );
  }

  return (
    <div data-testid="shopify-customer-status-pill" className="px-4">
      <button
        aria-label="Retry Shopify customer lookup"
        className="inline-flex min-h-11 items-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        data-testid="shopify-customer-retry-button"
        onClick={onRetry}
        type="button"
      >
        <StatePill
          icon={RotateCcw}
          label="Shopify customer not found"
          variant="danger"
        />
      </button>
    </div>
  );
}
