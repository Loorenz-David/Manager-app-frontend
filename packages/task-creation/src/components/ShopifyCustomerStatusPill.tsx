import { StatePill } from "@beyo/ui";

type ShopifyCustomerStatus = "idle" | "loading" | "found" | "not_found";

type ShopifyCustomerStatusPillProps = {
  status: ShopifyCustomerStatus;
};

export function ShopifyCustomerStatusPill({
  status,
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
      <StatePill label="Shopify customer not found" variant="danger" />
    </div>
  );
}
