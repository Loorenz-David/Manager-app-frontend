import { TextInput } from "@beyo/ui";

import { isValidShopifyMetafieldUrl } from "../../../lib/shopify-metafield-value";

export function ShopifyMetafieldUrlInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <TextInput
      id={id}
      type="url"
      inputMode="url"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      invalid={value.trim().length > 0 && !isValidShopifyMetafieldUrl(value.trim())}
      data-testid="shopify-metafield-url-input"
    />
  );
}
