import { lazy, Suspense } from "react";

import { loadShopifyOAuthResultPage } from "@beyo/shopify";
import { useNavigate } from "react-router-dom";

import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ROUTES } from "@/lib/routes";

const ShopifyOAuthResultRouteEntry = lazy(loadShopifyOAuthResultPage);

export function ShopifyOAuthResultPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ShopifyOAuthResultRouteEntry
        onBackToSettings={() => navigate(ROUTES.settings)}
      />
    </Suspense>
  );
}
