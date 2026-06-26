import { ImagePlaceholder, SectionLabel } from "@beyo/ui";

import { useItemCategoryByIdFlow } from "../flows/use-item-category-by-id";
import type { ItemCategoryId } from "../types";

type ItemCategoryDetailLabelProps = {
  categoryId: string | null | undefined;
  fallbackSnapshot?: string | null;
};

export function ItemCategoryDetailLabel({
  categoryId,
  fallbackSnapshot,
}: ItemCategoryDetailLabelProps): React.JSX.Element | null {
  const { category, isPending } = useItemCategoryByIdFlow(
    categoryId as ItemCategoryId | null | undefined,
  );

  const label =
    category?.name ??
    fallbackSnapshot ??
    (isPending && categoryId ? "Loading…" : null);

  if (!label && !category) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {category ? (
        category.imageUrl ? (
          <img
            src={category.imageUrl}
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
      <SectionLabel tone="muted">{label ?? "—"}</SectionLabel>
    </div>
  );
}
