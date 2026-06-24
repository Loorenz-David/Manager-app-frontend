import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  BoxPicker,
  ImagePlaceholder,
  useSurfaceStore,
} from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";

import { useItemCategoryPickerFlow } from "../flows/use-item-category-picker.flow";
import { ITEM_CATEGORY_PICKER_SURFACE_ID } from "../surface-ids";
import { preloadItemCategoryPickerSurface } from "../surfaces";

const MAJOR_CATEGORY_OPTIONS = [
  {
    value: "wood",
    label: "Wood",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/wood_category.webp",
    imageClassName: "size-[2.4rem]",
    testId: "item-major-category-wood-option",
  },
  {
    value: "seat",
    label: "Seat",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/seating_category.webp",
    imageClassName: "size-[2.4rem]",
    testId: "item-major-category-seat-option",
  },
] as const;

export function ItemCategorySelectionField(): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useItemCategoryPickerFlow();
  const { field: majorField, fieldState: majorFieldState } = useController({
    name: "item.major_category",
    control,
  });
  const { field: categoryField, fieldState: categoryFieldState } =
    useController({
      name: "item.item_category_id",
      control,
    });

  usePreloadSurface(preloadItemCategoryPickerSurface);

  useEffect(() => {
    if (categoryField.value && !majorField.value) {
      const foundCategory = flow.options.find(
        (category) => category.client_id === categoryField.value,
      );
      if (foundCategory) {
        majorField.onChange(foundCategory.major_category);
      }
    }
  }, [categoryField.value, flow.options, majorField, majorField.value]);

  function openCategoryPicker(
    majorCategory: string,
    currentId: string | null | undefined,
  ) {
    useSurfaceStore.getState().open(ITEM_CATEGORY_PICKER_SURFACE_ID, {
      majorCategory,
      categories: flow.byMajorCategory[majorCategory] ?? [],
      currentCategoryId: currentId ?? null,
      onSelect: (id: string) => categoryField.onChange(id),
    });
  }

  function handleMajorCategoryChange(newMajor: string) {
    majorField.onChange(newMajor);

    const currentCategory = flow.options.find(
      (category) => category.client_id === categoryField.value,
    );
    const shouldClear =
      !currentCategory || currentCategory.major_category !== newMajor;

    if (shouldClear) {
      categoryField.onChange(null);
    }

    const categories = flow.byMajorCategory[newMajor] ?? [];
    if (!flow.isPending && categories.length > 0) {
      openCategoryPicker(newMajor, shouldClear ? null : categoryField.value);
    }
  }

  const selectedCategory = flow.options.find(
    (category) => category.client_id === categoryField.value,
  );
  const canOpenCategoryPicker =
    Boolean(majorField.value) &&
    !flow.isPending &&
    (flow.byMajorCategory[majorField.value] ?? []).length > 0;

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="item-category-selection-field"
    >
      <label className="text-sm font-medium text-muted-foreground">
        Category
      </label>
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
            className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-sm"
            onClick={() =>
              openCategoryPicker(
                majorField.value ?? selectedCategory.major_category,
                categoryField.value,
              )
            }
          >
            <span className="flex items-center gap-3">
              <div className="size-7 shrink-0 overflow-hidden rounded-md">
                {selectedCategory.image_url ? (
                  <img
                    src={selectedCategory.image_url}
                    alt=""
                    aria-hidden="true"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImagePlaceholder
                    className="bg-transparent"
                    iconClassName="size-4"
                  />
                )}
              </div>
              {selectedCategory.name}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ) : majorField.value ? (
          <button
            type="button"
            data-testid="item-category-picker-trigger"
            className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-sm disabled:opacity-60"
            disabled={!canOpenCategoryPicker}
            onClick={() =>
              openCategoryPicker(majorField.value, categoryField.value)
            }
          >
            <span>
              {flow.isPending ? "Loading categories..." : "Select category"}
            </span>
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
