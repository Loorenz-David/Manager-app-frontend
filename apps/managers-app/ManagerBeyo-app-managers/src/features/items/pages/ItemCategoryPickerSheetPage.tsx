import { BoxPicker } from '@/components/primitives';
import type { ItemCategoryPickerOption } from '@/features/items/types';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type ItemCategoryPickerProps = {
  majorCategory: string;
  categories: ItemCategoryPickerOption[];
  currentCategoryId: string | null | undefined;
  onSelect: (categoryId: string) => void;
};

export function ItemCategoryPickerSheetPage() {
  const { majorCategory, categories, currentCategoryId, onSelect } =
    useSurfaceProps<ItemCategoryPickerProps>();

  const options = (categories ?? [])
    .filter((category) => category.major_category === majorCategory)
    .map((category) => ({
      value: category.client_id,
      label: category.name,
      testId: `item-category-${category.client_id}-option`,
    }));

  function handleSelect(categoryId: string) {
    onSelect?.(categoryId);
    useSurfaceStore.getState().closeTop();
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
