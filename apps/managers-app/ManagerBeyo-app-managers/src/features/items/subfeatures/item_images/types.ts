import { z } from 'zod';

import { ClientIdSchema } from '@beyo/lib';
import type { ItemId, ItemImageId } from '@/types/common';

export const IMAGE_SOURCE_TYPE = ['uploaded', 'shopify_sync', 'generated'] as const;
export const IMAGE_SOURCE_REFERENCE = ['s3_image_url', 'shopify_image_url'] as const;

export const ItemImageSchema = z.object({
  id: z.string().transform((v) => v as ItemImageId),
  image_url: z.string(),
  source_type: z.enum(IMAGE_SOURCE_TYPE),
  source_reference: z.enum(IMAGE_SOURCE_REFERENCE).nullable(),
  width_px: z.number().int().nullable(),
  height_px: z.number().int().nullable(),
  file_size_bytes: z.number().int().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string(),
  display_order: z.number().int(),
});

export type ItemImage = z.infer<typeof ItemImageSchema>;

export const RequestItemImageUploadInputSchema = z.object({
  entity_type: z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
  file_name: z.string().min(1, 'File name is required.'),
  content_type: z.string().min(1, 'Content type is required.'),
  file_size_bytes: z.number().int().positive().optional(),
});
export type RequestItemImageUploadInput = z.infer<typeof RequestItemImageUploadInputSchema>;

export const ConfirmItemImageUploadInputSchema = z.object({
  pending_upload_client_id: ClientIdSchema,
  entity_type: z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
});
export type ConfirmItemImageUploadInput = z.infer<typeof ConfirmItemImageUploadInputSchema>;

export const ReorderItemImagesInputSchema = z.object({
  entity_type: z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
  ordered_image_client_ids: z.array(z.string()),
});
export type ReorderItemImagesInput = z.infer<typeof ReorderItemImagesInputSchema>;

export const UnlinkItemImageInputSchema = z.object({
  image_client_id: z.string().transform((v) => v as ItemImageId),
  entity_type: z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
});
export type UnlinkItemImageInput = z.infer<typeof UnlinkItemImageInputSchema>;

export type ListItemImagesParams = {
  entity_type: 'item';
  entity_client_id: ItemId;
};

export type ItemImageViewModel = ItemImage & {
  aspect_ratio: number | null;
  size_formatted: string | null;
};

export function toItemImageViewModel(image: ItemImage): ItemImageViewModel {
  const aspectRatio =
    image.width_px && image.height_px ? image.width_px / image.height_px : null;
  const sizeFormatted =
    image.file_size_bytes !== null
      ? image.file_size_bytes > 1_000_000
        ? `${(image.file_size_bytes / 1_000_000).toFixed(1)} MB`
        : `${Math.round(image.file_size_bytes / 1000)} KB`
      : null;

  return { ...image, aspect_ratio: aspectRatio, size_formatted: sizeFormatted };
}
