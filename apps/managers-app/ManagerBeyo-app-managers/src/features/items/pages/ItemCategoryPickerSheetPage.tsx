import { BoxPicker } from '@/components/primitives';
import { TEST_ITEM_CATEGORIES } from '@/features/items/item-test-data';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type ItemCategoryPickerProps = {
  majorCategory: string;
  currentCategoryId: string | null | undefined;
  onSelect: (categoryId: string) => void;
};

export function ItemCategoryPickerSheetPage() {
  const { majorCategory, currentCategoryId, onSelect } =
    useSurfaceProps<ItemCategoryPickerProps>();

  const options = TEST_ITEM_CATEGORIES.filter(
    (category) => category.major_category === majorCategory,
  ).map((category) => ({
    value: category.client_id,
    label: category.name,
    icon: category.icon,
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
