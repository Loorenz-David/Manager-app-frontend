import { ImagePlaceholder, SectionLabel } from "@/components/primitives";
import { useItemCategoryPickerFlow } from "@/features/items";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskBodyCategoryRow(): React.JSX.Element | null {
  const { taskDetail } = useTaskDetailContext();
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
        <span className="text-sm text-muted-foreground">
          {item.item_position}
        </span>
      ) : null}
    </div>
  );
}
