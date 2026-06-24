import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useController, useFormContext } from "react-hook-form";

import { useSurface } from "@beyo/hooks";
import {
  FieldErrorPill,
  ImagePlaceholder,
} from "@beyo/ui";
import {
  ITEM_CATEGORY_PICKER_SURFACE_ID,
  useItemCategoryPickerFlow,
} from "@beyo/item-categories";

export function WoodItemCategorySelectionField(): React.JSX.Element {
  const { control, clearErrors } = useFormContext();
  const surface = useSurface();
  const flow = useItemCategoryPickerFlow();
  const { field: majorField } = useController({
    name: "item.major_category",
    control,
  });
  const { field: categoryField, fieldState } = useController({
    name: "item.item_category_id",
    control,
  });

  useEffect(() => {
    if (majorField.value !== "wood") {
      majorField.onChange("wood");
    }
  }, [majorField]);

  const categories = flow.byMajorCategory.wood ?? [];
  const selectedCategory = categories.find(
    (category) => category.client_id === categoryField.value,
  );

  function openPicker(): void {
    surface.open(ITEM_CATEGORY_PICKER_SURFACE_ID, {
      majorCategory: "wood",
      categories,
      currentCategoryId: categoryField.value ?? null,
      onSelect: (categoryId: string) => {
        categoryField.onChange(categoryId);
        clearErrors("item.item_category_id");
      },
    });
  }

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="wood-item-category-selection-field"
    >
      <label className="text-sm font-medium text-muted-foreground">
        Category
      </label>

      <button
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-sm disabled:opacity-60"
        data-testid={
          selectedCategory
            ? "wood-item-category-selected-trigger"
            : "wood-item-category-picker-trigger"
        }
        disabled={flow.isPending || categories.length === 0}
        type="button"
        onClick={openPicker}
      >
        {selectedCategory ? (
          <span className="flex min-w-0 items-center gap-3">
            <span className="size-7 shrink-0 overflow-hidden rounded-md">
              {selectedCategory.image_url ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-full object-cover"
                  src={selectedCategory.image_url}
                />
              ) : (
                <ImagePlaceholder
                  className="bg-transparent"
                  iconClassName="size-4"
                />
              )}
            </span>
            <span className="truncate">{selectedCategory.name}</span>
          </span>
        ) : (
          <span>
            {flow.isPending ? "Loading categories..." : "Select wood category"}
          </span>
        )}

        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      <FieldErrorPill
        data-testid="wood-item-category-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
