import { ContentCard, PullToRefresh, useScrollHide } from "@beyo/ui";

import { ShopifyConnectFab } from "../components/ShopifyConnectFab";
import { ShopifyIntegrationCard } from "../components/ShopifyIntegrationCard";
import type { ShopifyShopIntegration } from "../types";

type ShopifyIntegrationsListContainerProps = {
  shops: ShopifyShopIntegration[];
  isLoading: boolean;
  error: Error | null;
  canView: boolean;
  canCreate: boolean;
  onClose: () => void;
  onOpenShop: (shop: ShopifyShopIntegration) => void;
  onOpenCreate: () => void;
  onRefresh: () => Promise<void> | void;
};

function ShopifyListFooter({
  onClose,
}: {
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
    >
      <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="px-4 pb-4 pt-3">
          <button
            className="w-full rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm"
            type="button"
            onClick={onClose}
          >
            Close &amp; Back
          </button>
        </div>
        <div
          aria-hidden="true"
          className="h-(--safe-bottom,0px) bg-background"
        />
      </div>
    </div>
  );
}

export function ShopifyIntegrationsListContainer({
  shops,
  isLoading,
  error,
  canView,
  canCreate,
  onClose,
  onOpenShop,
  onOpenCreate,
  onRefresh,
}: ShopifyIntegrationsListContainerProps): React.JSX.Element {
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex-1 min-h-0"
      data-testid="shopify-integrations-list-pane"
    >
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{
          transform:
            "translateY(calc(-1 * var(--header-height, 72px) * var(--scroll-hide-progress, 0)))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <div className="bg-background px-4 pb-3 pt-4 ">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Shopify</h1>
              <p className="text-sm text-muted-foreground">
                Connected stores and install flow
              </p>
            </div>
          </div>
        </div>
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={84}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={onRefresh}
      >
        <div className="pt-24">
          <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2">
            {!canView ? (
              <div className="mx-4">
                <ContentCard>
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    You do not have access to manage Shopify integrations.
                  </p>
                </ContentCard>
              </div>
            ) : null}

            {canView && isLoading && shops.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                  />
                ))
              : null}

            {canView && error ? (
              <div className="mx-4">
                <ContentCard>
                  <div className="flex flex-col gap-3 px-1 py-2">
                    <p className="text-sm text-muted-foreground">
                      Shopify integrations could not be loaded.
                    </p>
                    <button
                      className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                      type="button"
                      onClick={() => {
                        void onRefresh();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </ContentCard>
              </div>
            ) : null}

            {canView && !isLoading && !error && shops.length === 0 ? (
              <div className="mx-4">
                <ContentCard>
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    No Shopify shops are connected yet.
                  </p>
                </ContentCard>
              </div>
            ) : null}

            {canView && !error
              ? shops.map((shop) => (
                  <ShopifyIntegrationCard
                    key={shop.client_id}
                    shop={shop}
                    onPress={onOpenShop}
                  />
                ))
              : null}
          </div>
        </div>
      </PullToRefresh>

      {canView && canCreate ? (
        <ShopifyConnectFab onPress={onOpenCreate} />
      ) : null}

      <ShopifyListFooter onClose={onClose} />
    </div>
  );
}
