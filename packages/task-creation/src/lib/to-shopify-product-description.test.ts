import { describe, expect, it } from "vitest";

import type { TaskNoteComposerValue } from "@beyo/task-notes";

import { toShopifyProductDescription } from "./to-shopify-product-description";

function buildNote(plainText: string): TaskNoteComposerValue {
  return { content: { parts: [] }, plainText };
}

describe("toShopifyProductDescription", () => {
  it("returns undefined without a note", () => {
    expect(toShopifyProductDescription(null)).toBeUndefined();
    expect(toShopifyProductDescription(undefined)).toBeUndefined();
  });

  it("returns undefined for whitespace-only text", () => {
    expect(toShopifyProductDescription(buildNote("   \n\n  "))).toBeUndefined();
  });

  it("wraps each line in a paragraph", () => {
    const result = toShopifyProductDescription(
      buildNote("Handmade oak frame.\nDelivery 8–10 weeks."),
    );

    expect(result).toBe(
      "<p>Handmade oak frame.</p><p>Delivery 8–10 weeks.</p>",
    );
  });

  it("drops blank lines between paragraphs", () => {
    const result = toShopifyProductDescription(
      buildNote("First.\n\n\nSecond.\n"),
    );

    expect(result).toBe("<p>First.</p><p>Second.</p>");
  });

  it("handles carriage returns", () => {
    expect(toShopifyProductDescription(buildNote("One.\r\nTwo."))).toBe(
      "<p>One.</p><p>Two.</p>",
    );
  });

  it("escapes HTML so note text can never inject markup", () => {
    const result = toShopifyProductDescription(
      buildNote(`5 < 6 & "quoted" <script>alert('x')</script>`),
    );

    expect(result).toBe(
      "<p>5 &lt; 6 &amp; &quot;quoted&quot; &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</p>",
    );
    expect(result).not.toContain("<script>");
  });

  it("escapes ampersands once, not double-encoding", () => {
    expect(toShopifyProductDescription(buildNote("Tom & Jerry"))).toBe(
      "<p>Tom &amp; Jerry</p>",
    );
  });
});
