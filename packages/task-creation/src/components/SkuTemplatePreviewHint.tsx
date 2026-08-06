type SkuTemplatePreviewHintProps = {
  /** The previewed SKU, or null/undefined when the assist doesn't apply. */
  preview: string | null | undefined;
  /** Hide once the seller has typed their own value — a preview and an override never show together. */
  hidden?: boolean;
  testId: string;
};

/**
 * Ghost-text hint shown under an item identity field when a SKU template can
 * auto-assign a value on save. Shared by every form that offers that assist,
 * so the copy and markup only live in one place.
 */
export function SkuTemplatePreviewHint({
  preview,
  hidden = false,
  testId,
}: SkuTemplatePreviewHintProps): React.JSX.Element | null {
  if (!preview || hidden) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground" data-testid={testId}>
      Leave empty to assign{" "}
      <span className="font-medium text-foreground">≈ {preview}</span>{" "}
      automatically on save.
    </p>
  );
}
