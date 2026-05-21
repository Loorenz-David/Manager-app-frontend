import { Armchair as ArmchairIcon, Box as BoxIcon, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { BoxPicker } from '@/components/primitives';
import { TEST_ITEM_CATEGORIES } from '@/features/items/item-test-data';
import { preloadItemCategoryPickerSurface } from '@/features/items/surfaces';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

const MAJOR_CATEGORY_OPTIONS = [
  {
    value: 'wood',
    label: 'Wood',
    icon: BoxIcon,
    testId: 'item-major-category-wood-option',
  },
  {
    value: 'seat',
    label: 'Seat',
    icon: ArmchairIcon,
    testId: 'item-major-category-seat-option',
  },
] as const;

export function ItemCategorySelectionField() {
  const { control } = useFormContext();
  const { field: majorField, fieldState: majorFieldState } = useController({
    name: 'item.major_category',
    control,
  });
  const { field: categoryField, fieldState: categoryFieldState } = useController({
    name: 'item.item_category_id',
    control,
  });

  useEffect(() => {
    void preloadItemCategoryPickerSurface();

    if (categoryField.value && !majorField.value) {
      const foundCategory = TEST_ITEM_CATEGORIES.find(
        (category) => category.client_id === categoryField.value,
      );

      if (foundCategory) {
        majorField.onChange(foundCategory.major_category);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCategoryPicker(
    majorCategory: string,
    currentId: string | null | undefined,
  ) {
    useSurfaceStore.getState().open('item-category-picker', {
      majorCategory,
      currentCategoryId: currentId ?? null,
      onSelect: (id: string) => categoryField.onChange(id),
    });
  }

  function handleMajorCategoryChange(newMajor: string) {
    majorField.onChange(newMajor);

    const currentCategory = TEST_ITEM_CATEGORIES.find(
      (category) => category.client_id === categoryField.value,
    );
    const shouldClear = !currentCategory || currentCategory.major_category !== newMajor;

    if (shouldClear) {
      categoryField.onChange(null);
    }

    openCategoryPicker(newMajor, shouldClear ? null : categoryField.value);
  }

  const selectedCategory = TEST_ITEM_CATEGORIES.find(
    (category) => category.client_id === categoryField.value,
  );

  return (
    <div className="flex flex-col gap-3" data-testid="item-category-selection-field">
      <label className="text-sm font-medium text-foreground">Category</label>
      <BoxPicker
        mode="single"
        value={majorField.value ?? null}
        options={MAJOR_CATEGORY_OPTIONS.map((option) => ({ ...option }))}
        onValueChange={handleMajorCategoryChange}
        layout="grid"
        visualVariant="default"
        columns={2}
        data-testid="item-major-category-picker"
      />

      <div className="min-h-12">
        {selectedCategory ? (
          <button
            type="button"
            data-testid="item-category-selected-trigger"
            className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background px-4 text-sm"
            onClick={() =>
              openCategoryPicker(
                majorField.value ?? selectedCategory.major_category,
                categoryField.value,
              )
            }
          >
            <span>{selectedCategory.name}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className="h-12 w-full rounded-xl border border-transparent"
          />
        )}
      </div>

      {majorFieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="item-major-category-error"
          role="alert"
        >
          {majorFieldState.error.message}
        </p>
      ) : null}
      {categoryFieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="item-category-id-error"
          role="alert"
        >
          {categoryFieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
