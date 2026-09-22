import { BackendImage, ImagePlaceholder } from "@beyo/ui";
import { cn } from "@beyo/lib";

export type StockNeedQuantityPanelSize = "card" | "summary";

export type StockNeedQuantityPanelProps = {
  /** The *requested* quantity — the goal, not what is left (design `03`). */
  quantity: number;
  /** The item category's own picture; `null` falls back to the placeholder. */
  imageUrl: string | null;
  imageAlt: string;
  size?: StockNeedQuantityPanelSize;
  "data-testid"?: string;
};

// w-18 is 72px. The summary column is 82px, which no spacing token reaches —
// 5.125rem is that value at the default 16px root.
const PANEL_WIDTH_CLASS: Record<StockNeedQuantityPanelSize, string> = {
  card: "w-18",
  summary: "w-[5.125rem]",
};

const PICTURE_SIZE_CLASS: Record<StockNeedQuantityPanelSize, string> = {
  card: "size-10",
  summary: "size-11",
};

const QUANTITY_CLASS: Record<StockNeedQuantityPanelSize, string> = {
  card: "text-2xl",
  summary: "text-[1.625rem]", // 26px — the design's summary numeral
};

/**
 * The card's fixed left column: the item category's picture above, the required
 * quantity below. The mockup drew CSS furniture outlines here; the product uses
 * the category's own picture instead, matched by category id (intention §6.3).
 *
 * The picture is an **icon on a transparent background**, so it gets no frame of
 * its own — no border, no radius, no fill (owner, 2026-09-22). It is also
 * `object-contain`, not `object-cover`: these icons are not all square, and
 * cover fills the box by cropping whatever does not fit, which sliced the legs
 * and top off the wider ones.
 */
export function StockNeedQuantityPanel({
  quantity,
  imageUrl,
  imageAlt,
  size = "card",
  "data-testid": testId,
}: StockNeedQuantityPanelProps): React.JSX.Element {
  return (
    <div
      className={cn("flex shrink-0 flex-col ", PANEL_WIDTH_CLASS[size])}
      data-testid={testId}
    >
      <div className="flex flex-1 items-end justify-center px-2 pb-2 pt-3">
        {/* The span keeps the box sized so the placeholder, which is
            `h-full w-full`, has something to fill when there is no picture. */}
        <span className={cn("block", PICTURE_SIZE_CLASS[size])}>
          <BackendImage
            alt={imageAlt}
            className="size-full object-contain"
            fallback={
              <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
            }
            src={imageUrl}
          />
        </span>
      </div>

      <div className="flex flex-1 items-start justify-center gap-1 px-2 pb-3 pt-1">
        <span
          className={cn(
            "font-bold leading-none tracking-tight text-foreground",
            QUANTITY_CLASS[size],
          )}
          data-testid={testId ? `${testId}-quantity` : undefined}
        >
          {quantity}
        </span>
      </div>
    </div>
  );
}
