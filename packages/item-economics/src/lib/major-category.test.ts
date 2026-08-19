import { describe, expect, it } from "vitest";

// The canonical definition lives in @beyo/lib; this package re-exports it and
// is where a runner exists, so the domain is pinned here.
import {
  MAJOR_CATEGORIES,
  MajorCategorySchema,
  isMajorCategory,
} from "@beyo/lib";

describe("MajorCategorySchema", () => {
  it("accepts the two categories the pricing surface can render", () => {
    expect(MajorCategorySchema.parse("wood")).toBe("wood");
    expect(MajorCategorySchema.parse("seat")).toBe("seat");
    expect(MAJOR_CATEGORIES).toEqual(["wood", "seat"]);
  });

  it("rejects an unknown category rather than letting it through", () => {
    // The point of the enum (review N13): a value the pricing card cannot
    // render must fail at the form boundary, not pass validation and then be
    // dropped by a render condition — which submits a multiplied purchase
    // price with nothing on screen.
    expect(MajorCategorySchema.safeParse("metal").success).toBe(false);
  });
});

describe("isMajorCategory", () => {
  it("narrows the read side's untyped value", () => {
    expect(isMajorCategory("seat")).toBe(true);
    expect(isMajorCategory("metal")).toBe(false);
    expect(isMajorCategory(null)).toBe(false);
    expect(isMajorCategory(undefined)).toBe(false);
    expect(isMajorCategory("")).toBe(false);
  });
});
