import { ImagePlaceholder, SectionLabel } from "@/components/primitives";
import { useItemCategoryPickerFlow } from "@/features/items";
import { TrainFront } from "lucide-react";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskBodyCategoryRow(): React.JSX.Element | null {
  const { openPositionSheet, taskDetail } = useTaskDetailContext();
  const { isLoading, options } = useItemCategoryPickerFlow();

  if (!taskDetail?.item) {
    return null;
  }

  const { item } = taskDetail;
  const category = item.item_category_id
    ? (options.find((option) => option.client_id === item.item_category_id) ??
      null)
    : null;
  const categoryLabel =
    category?.name ??
    item.item_category_snapshot ??
    (isLoading ? "Loading…" : null);

  if (!categoryLabel && !item.item_position) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <div className="flex items-center gap-1.5">
        {category ? (
          category.image_url ? (
            <img
              src={category.image_url}
              alt=""
              aria-hidden="true"
              className="size-4 rounded-sm object-contain"
            />
          ) : (
            <div className="size-4 shrink-0 overflow-hidden rounded-sm">
              <ImagePlaceholder
                className="bg-transparent"
                iconClassName="size-4"
              />
            </div>
          )
        ) : null}
        <SectionLabel tone="muted">{categoryLabel ?? "—"}</SectionLabel>
      </div>
      {item.item_position ? (
        <button
          data-testid="task-body-position-button"
          className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          type="button"
          onClick={openPositionSheet}
        >
          <TrainFront className="size-3.5 shrink-0 text-muted-foreground" />
          <SectionLabel tone="muted">Wagon : #{item.item_position}</SectionLabel>
        </button>
      ) : null}
    </div>
  );
}
