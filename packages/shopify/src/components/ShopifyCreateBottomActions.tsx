import { ArrowLeft, Plug } from "lucide-react";

export type ShopifyCreateBottomActionsProps = {
  formId: string;
  isSubmitting: boolean;
  canCreate: boolean;
  onBack: () => void;
};

export function ShopifyCreateBottomActions({
  formId,
  isSubmitting,
  canCreate,
  onBack,
}: ShopifyCreateBottomActionsProps): React.JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      data-testid="shopify-create-bottom-actions"
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
    >
      <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="flex gap-3 px-4 pb-4 pt-3">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Back</span>
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="shopify-create-submit"
            disabled={isSubmitting || !canCreate}
            form={formId}
            type="submit"
          >
            <Plug aria-hidden="true" className="size-4" />
            <span>{isSubmitting ? "Opening Shopify..." : "Connect"}</span>
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
