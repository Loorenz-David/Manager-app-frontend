import { NumberInput } from "@beyo/ui";

export function ShopifyMetafieldDimensionInput({
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
  const numericValue = value.trim() === "" ? null : Number(value);

  return (
    <NumberInput
      id={id}
      value={Number.isFinite(numericValue) ? numericValue : null}
      step={50}
      min={0}
      allowDecimal={false}
      onValueChange={(nextValue) =>
        onChange(nextValue === null ? "" : String(nextValue))
      }
      disabled={disabled}
      inputTestId="shopify-metafield-dimension-input"
    />
  );
}
