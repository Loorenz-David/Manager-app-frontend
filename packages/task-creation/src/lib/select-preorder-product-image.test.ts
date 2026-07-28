import { describe, expect, it } from "vitest";

import type { EntityImage } from "@beyo/images";

import { selectPreorderProductImage } from "./select-preorder-product-image";

function buildEntityImage(
  overrides: {
    clientId?: string;
    displayOrder?: number;
    widthPx?: number | null;
    heightPx?: number | null;
    fileSizeBytes?: number | null;
  } = {},
): EntityImage {
  return {
    link_client_id: `lnk_${overrides.clientId ?? "1"}`,
    entity_type: "item",
    entity_client_id: "itm_1",
    display_order: overrides.displayOrder ?? 0,
    image: {
      client_id: overrides.clientId ?? "img_1",
      image_url: "https://example.com/photo.webp",
      storage_provider: "s3",
      source_type: "uploaded",
      width_px: overrides.widthPx === undefined ? 2000 : overrides.widthPx,
      height_px: overrides.heightPx === undefined ? 1500 : overrides.heightPx,
      file_size_bytes:
        overrides.fileSizeBytes === undefined ? 812_345 : overrides.fileSizeBytes,
      created_at: "2026-07-28T00:00:00+00:00",
      events: [],
    },
  };
}

describe("selectPreorderProductImage", () => {
  it("returns no image when there are none", () => {
    expect(selectPreorderProductImage([])).toEqual({
      imageClientId: null,
      hasOnlyOversizedImages: false,
    });
    expect(selectPreorderProductImage(undefined)).toEqual({
      imageClientId: null,
      hasOnlyOversizedImages: false,
    });
  });

  it("picks the first image by display order, not array order", () => {
    const result = selectPreorderProductImage([
      buildEntityImage({ clientId: "img_second", displayOrder: 2 }),
      buildEntityImage({ clientId: "img_first", displayOrder: 1 }),
    ]);

    expect(result.imageClientId).toBe("img_first");
    expect(result.hasOnlyOversizedImages).toBe(false);
  });

  it("skips an oversized image and falls through to an eligible one", () => {
    const result = selectPreorderProductImage([
      buildEntityImage({
        clientId: "img_huge",
        displayOrder: 1,
        fileSizeBytes: 21 * 1024 * 1024,
      }),
      buildEntityImage({ clientId: "img_ok", displayOrder: 2 }),
    ]);

    expect(result.imageClientId).toBe("img_ok");
    expect(result.hasOnlyOversizedImages).toBe(false);
  });

  // The 25 MP rule is not independently reachable: with both edges capped at
  // 5000 px the largest possible area is exactly 25 MP, which is at the limit
  // rather than over it. It stays in the helper to mirror the documented
  // contract if either limit ever moves.
  it.each([
    ["over 20 MB", { fileSizeBytes: 20 * 1024 * 1024 + 1 }],
    ["wider than 5000 px", { widthPx: 5001, heightPx: 10 }],
    ["taller than 5000 px", { widthPx: 10, heightPx: 5001 }],
    ["over 25 MP with both edges oversized", { widthPx: 6000, heightPx: 5001 }],
  ])("rejects an image %s", (_label, overrides) => {
    const result = selectPreorderProductImage([
      buildEntityImage({ clientId: "img_bad", ...overrides }),
    ]);

    expect(result.imageClientId).toBeNull();
    expect(result.hasOnlyOversizedImages).toBe(true);
  });

  it("accepts an image exactly at the 25 MP, 5000 px and 20 MB limits", () => {
    const result = selectPreorderProductImage([
      buildEntityImage({
        clientId: "img_edge",
        widthPx: 5000,
        heightPx: 5000,
        fileSizeBytes: 20 * 1024 * 1024,
      }),
    ]);

    expect(result.imageClientId).toBe("img_edge");
  });

  it("treats unmeasured images as eligible so photos are not silently dropped", () => {
    const result = selectPreorderProductImage([
      buildEntityImage({
        clientId: "img_unknown",
        widthPx: null,
        heightPx: null,
        fileSizeBytes: null,
      }),
    ]);

    expect(result.imageClientId).toBe("img_unknown");
    expect(result.hasOnlyOversizedImages).toBe(false);
  });
});
