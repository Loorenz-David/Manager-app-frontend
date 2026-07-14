import type { ShopifyMetafieldField } from "../../types";

export function ShopifyMetafieldSearchResults({
  fields,
  showShopIdentity,
  onSelect,
}: {
  fields: ShopifyMetafieldField[];
  showShopIdentity: boolean;
  onSelect: (field: ShopifyMetafieldField) => void;
}): React.JSX.Element | null {
  if (!fields.length) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="shopify-metafield-search-results">
      {fields.map((field) => (
        <button
          key={field.identity}
          type="button"
          className="flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left"
          onClick={() => onSelect(field)}
          data-testid={`shopify-metafield-search-result-${field.identity}`}
        >
          <span>
            <span className="block text-sm font-medium">{field.name}</span>
            <span className="block text-xs text-muted-foreground">
              {field.namespace}.{field.key} · {field.type}
            </span>
          </span>
          {showShopIdentity ? (
            <span className="text-xs text-muted-foreground">
              {field.shopDisplayName}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
