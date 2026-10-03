import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ItemCategoryOptionsPicker } from "../components/ItemCategoryOptionsPicker";

import type { ItemCategoryPickerSurfaceProps } from "../surface-ids";

export function ItemCategoryPickerSheetPage(): React.JSX.Element {
  const { majorCategory, categories, currentCategoryId, onSelect } =
    useSurfaceProps<ItemCategoryPickerSurfaceProps>();
  const header = useSurfaceHeader();

  const options = (categories ?? []).filter(
    (category) => category.major_category === majorCategory,
  );

  function handleSelect(categoryId: string) {
    onSelect?.(categoryId);
    header?.requestClose();
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="item-category-picker-sheet">
      <p className="text-base font-semibold text-foreground">Select category</p>
      <ItemCategoryOptionsPicker
        mode="single"
        value={currentCategoryId ?? null}
        categories={options}
        onValueChange={handleSelect}
      />
    </div>
  );
}
