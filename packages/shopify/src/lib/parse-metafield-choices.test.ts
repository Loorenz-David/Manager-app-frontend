import { describe, expect, it } from "vitest";

import { parseMetafieldChoices } from "./parse-metafield-choices";

describe("parseMetafieldChoices", () => {
  it("returns string choices and safely rejects malformed values", () => {
    expect(
      parseMetafieldChoices([{ name: "choices", value: '["One","Two"]' }]),
    ).toEqual(["One", "Two"]);
    expect(
      parseMetafieldChoices([{ name: "choices", value: "not-json" }]),
    ).toEqual([]);
    expect(
      parseMetafieldChoices([{ name: "choices", value: '["One",2]' }]),
    ).toEqual([]);
  });
});
