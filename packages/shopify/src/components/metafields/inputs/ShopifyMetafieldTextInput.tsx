import { TextInput } from "@beyo/ui";

export function ShopifyMetafieldTextInput({
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
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      data-testid="shopify-metafield-text-input"
    />
  );
}
