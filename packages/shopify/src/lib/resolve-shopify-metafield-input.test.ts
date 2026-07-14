import { describe, expect, it } from "vitest";

import { resolveMetafieldInputKind } from "./resolve-shopify-metafield-input";

describe("resolveMetafieldInputKind", () => {
  it("resolves supported inputs and explicit unsupported fields", () => {
    expect(
      resolveMetafieldInputKind({
        type: "single_line_text_field",
        validations: [],
      }),
    ).toBe("text");
    expect(
      resolveMetafieldInputKind({
        type: "single_line_text_field",
        validations: [{ name: "choices", value: '["One"]' }],
      }),
    ).toBe("choice");
    expect(resolveMetafieldInputKind({ type: "url", validations: [] })).toBe(
      "url",
    );
    expect(
      resolveMetafieldInputKind({ type: "dimension", validations: [] }),
    ).toBe("dimension");
    expect(
      resolveMetafieldInputKind({
        type: "list.single_line_text_field",
        validations: [],
      }),
    ).toBe("tags");
    expect(resolveMetafieldInputKind({ type: "list.url", validations: [] })).toBe(
      "tags",
    );
    expect(
      resolveMetafieldInputKind({ type: "list.dimension", validations: [] }),
    ).toBe("tags");
  });
});
