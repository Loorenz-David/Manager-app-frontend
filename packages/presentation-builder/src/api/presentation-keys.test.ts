import { describe, expect, it } from "vitest";
import { presentationKeys } from "./presentation-keys";

describe("presentationKeys", () => {
  it("builds hierarchical list, detail, and preview keys", () => {
    const filters = { q: "search", status: "draft" as const, limit: 20, offset: 0 };
    expect(presentationKeys.list(filters)).toEqual([
      "app-update-presentations",
      "list",
      filters,
    ]);
    expect(presentationKeys.detail("aup_01JONE")).toEqual([
      "app-update-presentations",
      "detail",
      "aup_01JONE",
    ]);
    expect(presentationKeys.preview("aup_01JONE")).toEqual([
      "app-update-presentations",
      "preview",
      "aup_01JONE",
    ]);
  });
});
