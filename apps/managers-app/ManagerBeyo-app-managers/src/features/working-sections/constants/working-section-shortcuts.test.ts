import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKING_SECTION_SHORTCUTS,
  resolveWorkingSectionShortcutsByMajorCategory,
} from "./working-section-shortcuts";

describe("resolveWorkingSectionShortcutsByMajorCategory", () => {
  it("returns all shortcuts when major category is not provided", () => {
    expect(resolveWorkingSectionShortcutsByMajorCategory()).toEqual(
      DEFAULT_WORKING_SECTION_SHORTCUTS,
    );
  });

  it("returns only seat shortcuts when major category is seat", () => {
    expect(resolveWorkingSectionShortcutsByMajorCategory("seat")).toEqual({
      "Full job": DEFAULT_WORKING_SECTION_SHORTCUTS["Full job"],
      Upholstery: DEFAULT_WORKING_SECTION_SHORTCUTS.Upholstery,
      "Chair Fix": DEFAULT_WORKING_SECTION_SHORTCUTS["Chair Fix"],
    });
  });

  it("returns only wood shortcuts when major category is wood", () => {
    expect(resolveWorkingSectionShortcutsByMajorCategory("wood")).toEqual({
      "wood fix": DEFAULT_WORKING_SECTION_SHORTCUTS["wood fix"],
    });
  });

  it("falls back to all shortcuts for unsupported major category", () => {
    expect(resolveWorkingSectionShortcutsByMajorCategory("metal")).toEqual(
      DEFAULT_WORKING_SECTION_SHORTCUTS,
    );
  });
});
