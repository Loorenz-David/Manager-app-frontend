import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker } from "@beyo/ui";

import type { ItemCategoryPickerSurfaceProps } from "../surface-ids";

export function ItemCategoryPickerSheetPage(): React.JSX.Element {
  const { majorCategory, categories, currentCategoryId, onSelect } =
    useSurfaceProps<ItemCategoryPickerSurfaceProps>();
  const header = useSurfaceHeader();

  const options = (categories ?? [])
    .filter((category) => category.major_category === majorCategory)
    .map((category) => ({
      value: category.client_id,
      label: category.name,
      image: category.image_url,
      testId: `item-category-${category.client_id}-option`,
    }));

  function handleSelect(categoryId: string) {
    onSelect?.(categoryId);
    header?.requestClose();
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="item-category-picker-sheet">
      <p className="text-base font-semibold text-foreground">Select category</p>
      <BoxPicker
        mode="single"
        value={currentCategoryId ?? null}
        options={options}
        onValueChange={handleSelect}
        layout="grid"
        visualVariant="default"
        columns={2}
      />
    </div>
  );
}
