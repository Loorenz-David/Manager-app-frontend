import { z } from "zod";

/**
 * An item's major category — the two-value domain the whole pricing surface is
 * built on. It lives here, in the lowest shared package, because four packages
 * need to agree on it and none of them may depend on the others.
 *
 * **This is the write-side schema: strict on purpose.** An unknown value must
 * fail loudly at the form boundary rather than pass validation and then be
 * dropped by some component's render condition further down. That gap — a form
 * accepting a category the pricing card cannot render, so a looked-up purchase
 * price is multiplied and submitted with nothing on screen — is review finding
 * N13, and its ancestor B3 shipped the same way.
 *
 * The read side is deliberately different: `ItemCategorySchema.major_category`
 * in `@beyo/item-categories` stays `z.string()`, because a backend that adds a
 * third category must never blank the picker. Tight on the way out, forgiving
 * on the way in.
 *
 * Adding a category means: this enum, then the picker's `MAJOR_CATEGORY_OPTIONS`
 * (a type check there fails until you do), then deciding what the pricing
 * breakdown should say for it.
 */
export const MajorCategorySchema = z.enum(["wood", "seat"]);
export type MajorCategory = z.infer<typeof MajorCategorySchema>;

/** The categories themselves — use this rather than re-listing them inline. */
export const MAJOR_CATEGORIES = MajorCategorySchema.options;

/** Narrows an unknown form value to a category the UI knows how to render. */
export function isMajorCategory(
  value: string | null | undefined,
): value is MajorCategory {
  return (
    value != null && (MAJOR_CATEGORIES as readonly string[]).includes(value)
  );
}
