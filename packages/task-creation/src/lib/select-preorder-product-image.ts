import type { EntityImage } from "@beyo/images";

/**
 * Shopify product-image limits, mirrored from
 * HANDOFF_TO_FRONTEND_item_image_urls_and_preorder_images_20260728. The backend
 * validates an `image_id` against these at request time and rejects the whole
 * task creation, so we pre-check here rather than lose a submitted form to a
 * photo that was merely too big.
 */
export const SHOPIFY_PRODUCT_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const SHOPIFY_PRODUCT_IMAGE_MAX_PIXELS = 25_000_000;
export const SHOPIFY_PRODUCT_IMAGE_MAX_EDGE_PX = 5000;

/**
 * Dimensions and size are optional on the wire. Unknown values are treated as
 * eligible: the backend is authoritative, and refusing to send an image we
 * simply couldn't measure would lose photos far more often than it saves a 400.
 */
export function isShopifyProductImageEligible(image: EntityImage): boolean {
  const { file_size_bytes, width_px, height_px } = image.image;

  if (
    typeof file_size_bytes === "number" &&
    file_size_bytes > SHOPIFY_PRODUCT_IMAGE_MAX_BYTES
  ) {
    return false;
  }

  if (typeof width_px === "number" && width_px > SHOPIFY_PRODUCT_IMAGE_MAX_EDGE_PX) {
    return false;
  }

  if (
    typeof height_px === "number" &&
    height_px > SHOPIFY_PRODUCT_IMAGE_MAX_EDGE_PX
  ) {
    return false;
  }

  if (
    typeof width_px === "number" &&
    typeof height_px === "number" &&
    width_px * height_px > SHOPIFY_PRODUCT_IMAGE_MAX_PIXELS
  ) {
    return false;
  }

  return true;
}

export type PreorderProductImageSelection = {
  /** `client_id` to send as `shopify_preorder.product.image_id`. */
  imageClientId: string | null;
  /** True when images exist but every one of them exceeds Shopify's limits. */
  hasOnlyOversizedImages: boolean;
};

/**
 * Picks the item photo that rides along to Shopify: the first by display order
 * that fits Shopify's limits. Only one image is sent — the pre-order contract
 * takes a single `image_id`.
 */
export function selectPreorderProductImage(
  images: EntityImage[] | undefined,
): PreorderProductImageSelection {
  const itemImages = (images ?? []).filter(
    (entry) => entry.entity_type === "item",
  );

  if (itemImages.length === 0) {
    return { imageClientId: null, hasOnlyOversizedImages: false };
  }

  const eligible = [...itemImages]
    .sort((left, right) => left.display_order - right.display_order)
    .find(isShopifyProductImageEligible);

  return {
    imageClientId: eligible?.image.client_id ?? null,
    hasOnlyOversizedImages: !eligible,
  };
}
