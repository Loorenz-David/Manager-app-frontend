import type { ImageViewModel } from "@beyo/images";
import { toTaskViewModel } from "@/features/tasks/types";

import {
  toItemFromPendingRaw,
  toTaskFromPendingRaw,
  type PendingSeatCardViewModel,
  type PendingSeatImage,
  type PendingSeatTaskRow,
} from "../types";

export function toImageViewModelFromPendingSeatImage(
  image: PendingSeatImage,
  itemId: string | null,
  index: number,
): ImageViewModel {
  return {
    clientId: image.client_id,
    linkClientId: null,
    entityType: "item",
    entityClientId: itemId,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: image.width_px ?? null,
    heightPx: image.height_px ?? null,
    fileSizeBytes: image.file_size_bytes ?? null,
    createdAt: null,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: null,
    annotations: [],
    isFullyLoaded: index === 0,
  };
}

export function toPendingSeatCardViewModel(
  row: PendingSeatTaskRow,
): PendingSeatCardViewModel {
  const primaryItem = row.primary_item
    ? toItemFromPendingRaw(row.primary_item)
    : null;
  const images = row.item_images.map((image, index) =>
    toImageViewModelFromPendingSeatImage(image, primaryItem?.id ?? null, index),
  );

  return {
    taskId: row.task.client_id,
    task: toTaskViewModel(toTaskFromPendingRaw(row.task)),
    primaryItem,
    firstImage: images[0] ?? null,
    images,
    pendingReason: row.pending_upholstery_reason,
    itemUpholsteryId: row.item_upholstery_id,
  };
}
