import { useQueryClient } from "@tanstack/react-query";
import { ContentCard, PullToRefresh, useScrollHide } from "@beyo/ui";
import { ArrowLeft } from "lucide-react";

import { shopifyKeys } from "../api/shopify-keys";
import { useGetShopifyScopeStatusesQuery } from "../api/use-get-shopify-scope-statuses-query";
import { useGetShopifyShopQuery } from "../api/use-get-shopify-shop-query";
import { ShopifyDetailBottomActions } from "../components/ShopifyDetailBottomActions";
import { ShopifyIntegrationDetailHeader } from "../components/ShopifyIntegrationDetailHeader";
import { ShopifyIntegrationErrorPreview } from "../components/ShopifyIntegrationErrorPreview";
import { ShopifyIntegrationScopesSection } from "../components/ShopifyIntegrationScopesSection";
import { ShopifyIntegrationTechnicalDetails } from "../components/ShopifyIntegrationTechnicalDetails";
import { ShopifyWebhookHistorySection } from "../components/ShopifyWebhookHistorySection";
import { ShopifyWebhookSubscriptionSummaryPreview } from "../components/ShopifyWebhookSubscriptionSummaryPreview";

type ShopifyIntegrationDetailContainerProps = {
  selectedShopIntegrationId: string | null;
  onBack: () => void;
  onOpenActions?: () => void;
  onOpenSubscriptions?: () => void;
};

function ShopifyDetailMissingState({
  onBack,
}: {
  onBack: () => void;
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-4 pb-3 pt-4 shadow-[0_1px_0_0_var(--color-border)]">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back to Shopify list"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Shop details
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a shop to view its details.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-4">
        <ContentCard>
          <p className="text-sm text-muted-foreground">
            Shopify shop details will appear here after you select a shop.
          </p>
        </ContentCard>
      </div>
    </div>
  );
}

function ShopifyDetailLoadingState(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2">
      <div className="mx-4 h-24 animate-pulse rounded-xl bg-muted" />
      <div className="mx-4 h-28 animate-pulse rounded-xl bg-muted" />
      <div className="mx-4 h-36 animate-pulse rounded-xl bg-muted" />
      <div className="mx-4 h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function ShopifyIntegrationDetailContainer({
  selectedShopIntegrationId,
  onBack,
  onOpenActions,
  onOpenSubscriptions,
}: ShopifyIntegrationDetailContainerProps): React.JSX.Element {
  const { scrollRef, hideProgressContainerRef } = useScrollHide();
  const queryClient = useQueryClient();
  const query = useGetShopifyShopQuery(selectedShopIntegrationId);
  const scopesQuery = useGetShopifyScopeStatusesQuery(selectedShopIntegrationId);

  if (!selectedShopIntegrationId) {
    return <ShopifyDetailMissingState onBack={onBack} />;
  }

  let scrollContent: React.ReactNode;

  if (query.isPending) {
    scrollContent = <ShopifyDetailLoadingState />;
  } else if (query.isError || !query.data) {
    scrollContent = (
      <div className="flex min-h-full flex-col justify-center px-4 py-6">
        <ContentCard>
          <p className="text-sm text-muted-foreground">
            Shopify shop details could not be loaded.
          </p>
          <button
            className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
            type="button"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </button>
        </ContentCard>
      </div>
    );
  } else {
    const { shop_integration, webhook_subscription_summary } = query.data;
    const scopeStatusRecord = scopesQuery.data?.scope_statuses.find(
      (status) => status.shop_integration_id === selectedShopIntegrationId,
    );
    const grantedScopes =
      scopeStatusRecord?.granted_scopes ?? shop_integration.granted_scopes;
    const requestedScopes =
      scopeStatusRecord?.requested_scopes ?? shop_integration.requested_scopes;
    const scopesStatus =
      scopeStatusRecord?.shop_status ?? shop_integration.scopes_status;

    scrollContent = (
      <div
        className="flex flex-col gap-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
        data-testid="shopify-detail-content"
      >
        <ShopifyIntegrationDetailHeader
          shop={shop_integration}
          onOpenActions={onOpenActions}
        />
        <div className="flex flex-col gap-4">
          <ShopifyIntegrationScopesSection
            grantedScopes={grantedScopes}
            requestedScopes={requestedScopes}
            scopesStatus={scopesStatus}
          />
          <ShopifyIntegrationTechnicalDetails shop={shop_integration} />
          <ShopifyIntegrationErrorPreview
            lastErrorCode={shop_integration.last_error_code}
            lastErrorMessage={shop_integration.last_error_message}
          />
          <ShopifyWebhookSubscriptionSummaryPreview
            onOpenSubscriptions={onOpenSubscriptions}
            summary={webhook_subscription_summary}
          />
          <ShopifyWebhookHistorySection
            selectedShopIntegrationId={selectedShopIntegrationId}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="shopify-detail-pane"
    >
      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={84}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={async () => {
          await query.refetch();

          if (selectedShopIntegrationId) {
            await queryClient.invalidateQueries({
              queryKey: shopifyKeys.webhookHistoryRoot(
                selectedShopIntegrationId,
              ),
            });
          }
        }}
      >
        {scrollContent}
      </PullToRefresh>

      <ShopifyDetailBottomActions onBack={onBack} />
    </div>
  );
}
