import { TrainFront } from "lucide-react";

import { ImagePlaceholder, SectionLabel } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";

type ItemCategoryOption = {
  client_id: string;
  name: string | null;
  image_url: string | null;
};

type TaskBodyCategoryRowProps = {
  taskDetail: TaskDetailRaw | null;
  isCategoryLoading?: boolean;
  itemCategoryOptions?: ItemCategoryOption[];
  onOpenPosition: () => void;
};

export function TaskBodyCategoryRow({
  taskDetail,
  isCategoryLoading = false,
  itemCategoryOptions = [],
  onOpenPosition,
}: TaskBodyCategoryRowProps): React.JSX.Element | null {
  if (!taskDetail?.item) {
    return null;
  }

  const { item } = taskDetail;
  const category = item.item_category_id
    ? (itemCategoryOptions.find((option) => option.client_id === item.item_category_id) ??
      null)
    : null;
  const categoryLabel =
    category?.name ??
    item.item_category_snapshot ??
    (isCategoryLoading ? "Loading…" : null);
  const isSeatItem =
    item.item_major_category_snapshot?.toLowerCase() === "seat";
  const positionLabel = item.item_position?.trim() ? item.item_position : "?";

  if (!categoryLabel && !item.item_position && !isSeatItem) {
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
      {isSeatItem ? (
        <button
          data-testid="task-body-position-button"
          className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          type="button"
          onClick={onOpenPosition}
        >
          <TrainFront className="size-3.5 shrink-0 text-muted-foreground" />
          <SectionLabel tone="muted">Wagon : #{positionLabel}</SectionLabel>
        </button>
      ) : null}
    </div>
  );
}
