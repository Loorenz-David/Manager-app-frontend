import { BoxPicker } from "@beyo/ui";
import type { ItemCategoryPickerOption } from "../types/picker";

type SelectionProps =
  | { mode: "single"; value: string | null; onValueChange: (id: string) => void }
  | { mode: "multiple"; value: string[]; onValueChange: (ids: string[]) => void };

export function ItemCategoryOptionsPicker({
  categories,
  ...selection
}: { categories: ItemCategoryPickerOption[] } & SelectionProps): React.JSX.Element {
  const options = categories.map((category) => ({
    value: category.client_id,
    label: category.name,
    image: category.image_url,
    testId: `item-category-${category.client_id}-option`,
  }));

  return selection.mode === "single" ? (
    <BoxPicker
      mode="single"
      value={selection.value}
      options={options}
      onValueChange={selection.onValueChange}
      layout="grid"
      visualVariant="default"
      columns={2}
    />
  ) : (
    <BoxPicker
      mode="multiple"
      value={selection.value}
      options={options}
      onValueChange={selection.onValueChange}
      layout="grid"
      visualVariant="default"
      columns={2}
    />
  );
}
