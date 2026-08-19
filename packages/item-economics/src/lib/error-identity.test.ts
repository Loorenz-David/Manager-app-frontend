import { describe, expect, it } from "vitest";
import { parseErrorIdentity } from "./error-identity";

describe("parseErrorIdentity", () => {
  it("returns the leading token up to the first colon", () => {
    expect(
      parseErrorIdentity("ITEM_COST_GROUP_NAME_TAKEN: that name is taken"),
    ).toBe("ITEM_COST_GROUP_NAME_TAKEN");
  });

  it("returns the whole string when there is no colon", () => {
    expect(parseErrorIdentity("SOMETHING_BROKE")).toBe("SOMETHING_BROKE");
  });

  it("returns null for empty input", () => {
    expect(parseErrorIdentity(null)).toBeNull();
    expect(parseErrorIdentity("")).toBeNull();
    expect(parseErrorIdentity("  : detail")).toBeNull();
  });
});
