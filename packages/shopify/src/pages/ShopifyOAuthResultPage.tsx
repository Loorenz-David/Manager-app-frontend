import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { ContentCard } from "@beyo/ui";
import { CircleCheckBig, CircleX } from "lucide-react";

import { shopifyKeys } from "../api/shopify-keys";
import { ShopifyOAuthErrorCodeSchema } from "../types";
import type { ShopifyOAuthErrorCode, ShopifyOAuthResultParams } from "../types";

const OAUTH_ERROR_MESSAGES: Record<ShopifyOAuthErrorCode, string> = {
  invalid_signature:
    "The Shopify response could not be verified. Please try connecting again.",
  invalid_state:
    "This Shopify connection attempt is no longer valid. Please try again.",
  state_shop_mismatch:
    "This Shopify callback did not match the expected shop. Please try again.",
  state_already_consumed:
    "This Shopify connection link has already been used. Start a new connection.",
  state_expired:
    "This Shopify connection link expired. Start a new connection and try again.",
  access_denied:
    "Shopify access was denied. You can try connecting the shop again.",
  missing_code:
    "Shopify did not return the expected authorization code. Please try again.",
  token_exchange_failed:
    "We could not finish connecting to Shopify. Please try again.",
  oauth_callback_failed:
    "Something went wrong while finishing the Shopify connection. Please try again.",
};

export type ShopifyOAuthResultPageProps = {
  onBackToSettings?: () => void;
};

function parseShopifyOAuthResultParams(search: string): ShopifyOAuthResultParams {
  const params = new URLSearchParams(search);
  const rawErrorCode = params.get("error_code");
  const parsedErrorCode = ShopifyOAuthErrorCodeSchema.safeParse(rawErrorCode);

  return {
    success: params.get("success") === "true",
    shop_domain: params.get("shop_domain"),
    error_code: parsedErrorCode.success ? parsedErrorCode.data : null,
  };
}

export function ShopifyOAuthResultPage({
  onBackToSettings,
}: ShopifyOAuthResultPageProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const result = parseShopifyOAuthResultParams(window.location.search);

  useEffect(() => {
    if (!result.success) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: shopifyKeys.shops(),
    });
  }, [queryClient, result.success]);

  return (
    <div className="flex h-full flex-col justify-center bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <ContentCard paddingClassName="px-5 py-5">
          <div className="flex flex-col items-center gap-3 text-center">
            {result.success ? (
              <CircleCheckBig
                aria-hidden="true"
                className="size-10 text-primary"
              />
            ) : (
              <CircleX
                aria-hidden="true"
                className="size-10 text-destructive"
              />
            )}

            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {result.success
                  ? "Shopify shop connected"
                  : "Shopify connection could not be completed"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {result.success
                  ? "Your Shopify integration is ready to manage from Settings."
                  : "The Shopify connection did not finish successfully. Please try again from Settings."}
              </p>
            </div>

            {!result.success && result.error_code ? (
              <p className="text-sm text-muted-foreground">
                {OAUTH_ERROR_MESSAGES[result.error_code]}
              </p>
            ) : null}

            {result.shop_domain ? (
              <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                {result.shop_domain}
              </div>
            ) : null}
          </div>
        </ContentCard>

        {onBackToSettings ? (
          <button
            type="button"
            className="w-full rounded-2xl bg-primary px-5 py-3.5 text-md font-semibold text-card shadow-sm"
            onClick={onBackToSettings}
          >
            View Shopify integrations
          </button>
        ) : null}
      </div>
    </div>
  );
}
