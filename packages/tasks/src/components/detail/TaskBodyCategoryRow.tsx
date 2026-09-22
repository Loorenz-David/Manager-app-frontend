import { ItemCategoryDetailLabel } from "@beyo/item-categories";
import { ItemPositionZonePreview } from "@beyo/items";
import { SectionLabel } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";

type TaskBodyCategoryRowProps = {
  taskDetail: TaskDetailRaw | null;
  /** Both omitted for a read-only role: the row renders as plain labels. */
  onOpenPositionField?: (field: "zone" | "position") => void;
  onOpenQuantity?: () => void;
};

export function TaskBodyCategoryRow({
  taskDetail,
  onOpenPositionField,
  onOpenQuantity,
}: TaskBodyCategoryRowProps): React.JSX.Element | null {
  if (!taskDetail?.item) {
    return null;
  }

  const { item } = taskDetail;
  const isSeatItem =
    item.item_major_category_snapshot?.toLowerCase() === "seat";
  const quantityLabel = item.quantity > 0 ? `( ${item.quantity} )` : null;

  if (
    !item.item_category_id &&
    !item.item_category_snapshot &&
    !quantityLabel &&
    !item.item_zone &&
    !item.item_position &&
    !isSeatItem
  ) {
    return null;
  }

  const categoryContent = (
    <>
      <ItemCategoryDetailLabel
        categoryId={item.item_category_id}
        fallbackSnapshot={item.item_category_snapshot}
      />
      {quantityLabel ? (
        <SectionLabel tone="muted">{quantityLabel}</SectionLabel>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      {onOpenQuantity ? (
        <button
          className="flex min-w-0 items-center gap-1.5 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-body-category-quantity-button"
          type="button"
          onClick={onOpenQuantity}
        >
          {categoryContent}
        </button>
      ) : (
        <span
          className="flex min-w-0 items-center gap-1.5"
          data-testid="task-body-category-quantity-button"
        >
          {categoryContent}
        </span>
      )}
      {isSeatItem ? (
        <span
          data-testid="task-body-position-button"
          className="rounded-full"
        >
          {/* Passed through as `undefined`, not wrapped, so the preview
              degrades to plain text for a read-only role. */}
          <ItemPositionZonePreview
            isSeat={isSeatItem}
            position={item.item_position}
            zone={item.item_zone}
            onOpenPosition={
              onOpenPositionField
                ? () => onOpenPositionField("position")
                : undefined
            }
            onOpenZone={
              onOpenPositionField
                ? () => onOpenPositionField("zone")
                : undefined
            }
          />
        </span>
      ) : null}
    </div>
  );
}
