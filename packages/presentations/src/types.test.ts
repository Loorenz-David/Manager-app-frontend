import { describe, expect, it } from "vitest";

import { consumerPresentationFixture } from "./test/fixtures";
import { ConsumerPresentationSchema } from "./types";

describe("consumer presentation schema", () => {
  // Regression (live matrix, 2026-07-23): announcements published without a
  // category serve `category: null` and silently failed the consumer parse,
  // leaving the player closed with no error. Nullable per backend 07_enums.md.
  it("parses a presentation with a null category", () => {
    const parsed = ConsumerPresentationSchema.safeParse({
      ...consumerPresentationFixture,
      category: null,
    });
    expect(parsed.success).toBe(true);
  });
});
