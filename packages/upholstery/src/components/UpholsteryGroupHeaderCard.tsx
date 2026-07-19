import { ChevronDown } from "lucide-react";

import { Avatar } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { getUpholsteryImageUrl } from "../image-url";
import { formatMeters } from "../types";
import type { UpholsteryGroupHeaderViewModel } from "../upholstery-grouping";

type UpholsteryGroupHeaderCardProps = {
  header: UpholsteryGroupHeaderViewModel;
  itemCount?: number;
  isFolded?: boolean;
  onToggle?: () => void;
  testId?: string;
};

/**
 * Section divider rendered between upholstery groups in a grouped list. No card
 * background: fabric image (via Avatar) on the left; the upholstery name and an
 * inventory-amount pill row stacked in the column on the right. A `null` group
 * key renders the "Upholstery not selected" bucket, whose missing image falls
 * back to Avatar's neutral placeholder.
 *
 * When `onToggle` is provided the header becomes a fold toggle: a chevron marks
 * the state, and while folded the hidden item count (summed item quantities) is
 * surfaced so the collapsed upholstery list stays legible.
 */
export function UpholsteryGroupHeaderCard({
  header,
  itemCount,
  isFolded = false,
  onToggle,
  testId = "upholstery-group-header",
}: UpholsteryGroupHeaderCardProps): React.JSX.Element {
  const inventory = header.inventory;
  const storedLabel = inventory
    ? formatMeters(inventory.current_stored_amount_meters)
    : null;
  const orderedLabel = inventory
    ? formatMeters(inventory.current_amount_ordered_meters)
    : null;
  const hasPills = storedLabel !== null || orderedLabel !== null;
  const foldable = typeof onToggle === "function";

  const content = (
    <>
      <Avatar
        name={header.label}
        imageSrc={
          header.imageUrl
            ? getUpholsteryImageUrl(header.imageUrl, {
                width: 44,
                height: 44,
                fillCanvas: true,
              })
            : null
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-foreground">
          {header.label}
        </span>
        {hasPills ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {storedLabel !== null ? (
              <span data-testid="upholstery-group-stored-pill">
                {storedLabel} stored
              </span>
            ) : null}
            {storedLabel !== null && orderedLabel !== null ? (
              <span aria-hidden="true">&bull;</span>
            ) : null}
            {orderedLabel !== null ? (
              <span data-testid="upholstery-group-ordered-pill">
                {orderedLabel} ordered
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {foldable ? (
        <div className="flex shrink-0 items-center gap-2">
          {isFolded && itemCount != null ? (
            <span
              className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              data-testid="upholstery-group-item-count"
            >
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isFolded && "-rotate-90",
            )}
          />
        </div>
      ) : null}
    </>
  );

  if (foldable) {
    return (
      <button
        type="button"
        aria-expanded={!isFolded}
        className="flex w-full items-center gap-3 px-4 py-2 text-left"
        data-testid={testId}
        onClick={onToggle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2" data-testid={testId}>
      {content}
    </div>
  );
}
