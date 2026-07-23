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

  it.each([
    { label: "omitted", slide: { ...consumerPresentationFixture.slides[0] } },
    {
      label: "null",
      slide: { ...consumerPresentationFixture.slides[0], background_color: null },
    },
  ])("parses a slide when background_color is $label", ({ slide }) => {
    if (slide.background_color === undefined) delete slide.background_color;
    const parsed = ConsumerPresentationSchema.safeParse({
      ...consumerPresentationFixture,
      slides: [slide],
    });
    expect(parsed.success).toBe(true);
  });
});
