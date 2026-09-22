import type { MajorCategory } from "@beyo/lib";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

/** Fails to compile if a category has no option — see the assertion below. */
type AssertNever<T extends never> = T;

/**
 * Tied to the domain so adding a category to `MajorCategorySchema` fails to
 * compile until the picker gains its option — otherwise a category exists that
 * nobody can choose, and the pricing card silently never renders for it (N13).
 */
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
] as const satisfies ReadonlyArray<{
  value: MajorCategory;
  label: string;
  image: string;
  imageClassName: string;
  testId: string;
}>;

/**
 * Compile-time exhaustiveness: this alias resolves only while every category in
 * `MajorCategorySchema` has an option above. Add one to the enum without adding
 * it here and the type error lands on this line — see the comment above.
 */
export type EveryMajorCategoryHasAnOption = AssertNever<
  Exclude<MajorCategory, (typeof MAJOR_CATEGORY_OPTIONS)[number]["value"]>
>;

export type ItemMajorCategoryPickerProps = {
  value: MajorCategory | null;
  /**
   * Fires with the tapped category, the current one included — `BoxPicker`
   * never deselects in single mode. A caller that wants "tap again to clear"
   * compares against `value` itself.
   */
  onValueChange: (value: MajorCategory) => void;
  getOptionTestId?: (option: BoxPickerOptionType<MajorCategory>) => string;
  "data-testid"?: string;
};

/**
 * The two-option Wood / Seat picker, one source for its labels and images.
 * The creation forms wrap it in `ItemCategorySelectionField`; the stock-report
 * filter sheet uses it bare.
 */
export function ItemMajorCategoryPicker({
  value,
  onValueChange,
  getOptionTestId,
  "data-testid": testId = "item-major-category-picker",
}: ItemMajorCategoryPickerProps): React.JSX.Element {
  return (
    <BoxPicker<MajorCategory>
      mode="single"
      value={value}
      options={MAJOR_CATEGORY_OPTIONS.map((option) => ({ ...option }))}
      onValueChange={onValueChange}
      layout="grid"
      visualVariant="default"
      columns={2}
      getOptionTestId={getOptionTestId}
      data-testid={testId}
    />
  );
}
