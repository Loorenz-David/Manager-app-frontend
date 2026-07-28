import type { ItemLookupResult } from "@beyo/items";
import { ItemIdentityField, ItemQuantityField } from "@beyo/items";
import { BackendImage, ContentCard } from "@beyo/ui";

const ARTICLE_NUMBER_ONLY_TABS = ["article_number"] as const;

export function QuickPreOrderItemStep({
  hasItem,
  itemPreview,
  onLookupResult,
}: {
  hasItem: boolean;
  itemPreview: {
    articleNumber: string | null;
    imageUrl: string | null;
    sku: string | null;
  };
  onLookupResult: (items: ItemLookupResult[]) => boolean | "invalid";
}): React.JSX.Element {
  const articleNumber = itemPreview.articleNumber?.trim() ?? "";
  const sku = itemPreview.sku?.trim() || "SKU unavailable";

  if (!hasItem) {
    return (
      <div className="mx-4 mt-3">
        <ContentCard data-testid="quick-preorder-item-missing">
          <p className="px-0 py-2 text-sm text-muted-foreground">
            This pre-order has no item attached, so it cannot be assigned here.
          </p>
        </ContentCard>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mt-3 flex flex-col gap-3"
      data-testid="quick-preorder-item-step"
    >
      {/* The item as it is on record. It deliberately does not track the form
          below: after an edit or a lookup write-back the field holds the draft
          article number while this still shows what is stored. */}
      <ContentCard
        data-testid="quick-preorder-item-preview"
        paddingClassName="p-3"
      >
        <div className="flex items-center gap-3">
          <div
            className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
            data-testid="quick-preorder-item-preview-image"
          >
            <BackendImage
              alt=""
              className="size-full object-cover"
              src={itemPreview.imageUrl}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">SKU</p>
            <p
              className="truncate text-sm font-semibold text-foreground"
              data-testid="quick-preorder-item-preview-sku"
            >
              {sku}
            </p>

            {articleNumber ? (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Article number
                </p>
                <p
                  className="truncate text-sm text-foreground"
                  data-testid="quick-preorder-item-preview-article-number"
                >
                  {articleNumber}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </ContentCard>

      <ContentCard gapClassName="gap-4">
        <ItemIdentityField
          availableTabs={ARTICLE_NUMBER_ONLY_TABS}
          defaultTab="article_number"
          onLookupResult={onLookupResult}
        />
        <ItemQuantityField />
      </ContentCard>
    </div>
  );
}
