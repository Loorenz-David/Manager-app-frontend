/**
 * Shown when task creation was refused because the matched item already carries
 * a valuation (operational handoff §9.1). The whole creation was rolled back,
 * so the message has to say what to do about it, not merely that it failed.
 *
 * The remedy is a button rather than an instruction to empty the fields: the
 * purchase price arrives from the external purchase system and has no input, so
 * a user told to "clear both prices" could only clear one — and the submit
 * would be refused again, forever.
 *
 * The closing clause points at the item's own price surface. Do not ship this
 * copy before that surface exists — see the plan's §Copy ordering constraint.
 */
export const ITEM_PRICING_REFUSAL_TITLE = "This item already has a price";
export const ITEM_PRICING_REFUSAL_BODY =
  "Remove the prices from this task to create it — you can update the item's price afterwards from the item itself.";
export const ITEM_PRICING_REFUSAL_ACTION = "Remove prices";

export type ItemPricingRefusalNoticeProps = {
  /**
   * Clears both pricing values. Omitted only in previews — without it the
   * notice states a remedy the user has no way to perform.
   */
  onClearPrices?: () => void;
};

export function ItemPricingRefusalNotice({
  onClearPrices,
}: ItemPricingRefusalNoticeProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-xl border border-[#ecb0aa] bg-[#fdecea] px-3 py-2.5"
      data-testid="item-pricing-refusal-notice"
      role="status"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-[#b9382a]">
          {ITEM_PRICING_REFUSAL_TITLE}
        </p>
        <p className="text-sm text-[#b9382a]">{ITEM_PRICING_REFUSAL_BODY}</p>
      </div>
      {onClearPrices ? (
        <button
          className="rounded-full border border-[#ecb0aa] bg-white/70 px-3 py-1.5 text-sm font-medium text-[#b9382a] transition-colors active:bg-white"
          data-testid="item-pricing-refusal-action"
          type="button"
          onClick={onClearPrices}
        >
          {ITEM_PRICING_REFUSAL_ACTION}
        </button>
      ) : null}
    </div>
  );
}
