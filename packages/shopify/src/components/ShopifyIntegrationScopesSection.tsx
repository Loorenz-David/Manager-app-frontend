import { ContentCard, FieldLabelRow, StatePill } from "@beyo/ui";

import {
  shopifyScopesStatusLabel,
  shopifyScopesStatusVariant,
} from "../lib/shopify-status";
import type { ShopifyScopesStatus } from "../types";

export type ShopifyIntegrationScopesSectionProps = {
  grantedScopes: string[];
  requestedScopes: string[];
  scopesStatus: ShopifyScopesStatus;
};

function joinScopes(values: string[]): string {
  if (values.length === 0) {
    return "None";
  }

  return values.join(", ");
}

export function ShopifyIntegrationScopesSection({
  grantedScopes,
  requestedScopes,
  scopesStatus,
}: ShopifyIntegrationScopesSectionProps): React.JSX.Element {
  return (
    <ContentCard data-testid="shopify-scopes-section">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <FieldLabelRow label="Granted scopes" />
            <StatePill
              label={shopifyScopesStatusLabel(scopesStatus)}
              variant={shopifyScopesStatusVariant(scopesStatus)}
            />
          </div>

          <p className="text-sm text-foreground">{joinScopes(grantedScopes)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabelRow label="Requested scopes" />
          <p className="text-sm text-foreground">
            {joinScopes(requestedScopes)}
          </p>
        </div>
      </div>

      {scopesStatus === "outdated" ? (
        <p className="text-sm text-[#8a5a00]">
          This shop&apos;s Shopify permissions are out of date. Reauthorizing
          will be available soon.
        </p>
      ) : null}
    </ContentCard>
  );
}
