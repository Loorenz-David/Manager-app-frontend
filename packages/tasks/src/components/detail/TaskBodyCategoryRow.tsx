import { ItemCategoryDetailLabel } from "@beyo/item-categories";
import { ItemPositionPill } from "@beyo/items";
import { SectionLabel } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";

type TaskBodyCategoryRowProps = {
  taskDetail: TaskDetailRaw | null;
  onOpenPosition: () => void;
  onOpenQuantity: () => void;
};

export function TaskBodyCategoryRow({
  taskDetail,
  onOpenPosition,
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
    !item.item_position &&
    !isSeatItem
  ) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <button
        className="flex min-w-0 items-center gap-1.5 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        data-testid="task-body-category-quantity-button"
        type="button"
        onClick={onOpenQuantity}
      >
        <ItemCategoryDetailLabel
          categoryId={item.item_category_id}
          fallbackSnapshot={item.item_category_snapshot}
        />
        {quantityLabel ? (
          <SectionLabel tone="muted">{quantityLabel}</SectionLabel>
        ) : null}
      </button>
      {isSeatItem ? (
        <button
          data-testid="task-body-position-button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          type="button"
          onClick={onOpenPosition}
        >
          <ItemPositionPill position={item.item_position} isSeat={isSeatItem} />
        </button>
      ) : null}
    </div>
  );
}
