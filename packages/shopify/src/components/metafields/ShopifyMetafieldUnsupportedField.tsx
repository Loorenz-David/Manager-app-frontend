export function ShopifyMetafieldUnsupportedField({
  type,
}: {
  type: string;
}): React.JSX.Element {
  return (
    <div
      className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
      data-testid="shopify-metafield-unsupported"
    >
      Metafield type “{type}” is not supported in this form.
    </div>
  );
}
