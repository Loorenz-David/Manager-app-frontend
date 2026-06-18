import type { ImageViewModel } from "@beyo/images";
import {
  toItemFromPendingRaw,
  toTaskFromPendingRaw,
} from "@/features/pending-upholstery";
import { toTaskViewModel } from "@/features/tasks/types";

import { formatLocalDate, formatMetersValue, toTitleCaseLabel } from "./format";
import type {
  OrderCardViewModel,
  OrderingImage,
  OrderingItemCardViewModel,
  OrderingItemRow,
  OrderNeedRow,
  OrderRow,
  ShortageCardViewModel,
} from "../types";

function toImageViewModel(
  image: OrderingImage,
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

export function toShortageCardViewModel(
  row: OrderNeedRow,
): ShortageCardViewModel {
  return {
    upholsteryId: row.upholstery_id,
    name: row.upholstery_name ?? "Unnamed upholstery",
    code: row.upholstery_code,
    imageUrl: row.upholstery_image_url,
    itemCount: row.item_count,
    totalAmountMeters: row.amount_to_order_meters,
    totalAmountLabel: formatMetersValue(row.amount_to_order_meters),
    earliestDueDate: row.earliest_due_date,
    earliestDueDateLabel: formatLocalDate(row.earliest_due_date),
  };
}

export function toOrderCardViewModel(row: OrderRow): OrderCardViewModel {
  const received = row.received_amount_meters ?? 0;
  const remaining = Math.max(row.order_amount_meters - received, 0);
  const date =
    row.state === "received" ? row.received_at : row.expected_receive_at;

  return {
    orderId: row.client_id,
    upholsteryId: row.upholstery_id,
    name: row.upholstery_name ?? "Unnamed upholstery",
    code: row.upholstery_code,
    imageUrl: row.upholstery_image_url,
    orderAmountMeters: row.order_amount_meters,
    orderAmountLabel: formatMetersValue(row.order_amount_meters),
    receivedAmountMeters: received,
    receivedAmountLabel: formatMetersValue(received),
    remainingReceivableMeters: remaining,
    remainingReceivableLabel: formatMetersValue(remaining),
    expectedReceiveAt: row.expected_receive_at,
    receivedAt: row.received_at,
    dateLabel: formatLocalDate(date),
    state: row.state,
    stateLabel: toTitleCaseLabel(row.state),
  };
}

export function toOrderingItemCardViewModel(
  row: OrderingItemRow,
): OrderingItemCardViewModel | null {
  const itemUpholstery = row.item_upholstery;
  if (!itemUpholstery) return null;
  const primaryItem = row.primary_item
    ? toItemFromPendingRaw(row.primary_item)
    : null;
  const images = row.item_images.map((image, index) =>
    toImageViewModel(image, primaryItem?.id ?? null, index),
  );
  const amountMeters = itemUpholstery.amount_meters ?? 0;

  return {
    itemUpholsteryId: itemUpholstery.client_id,
    taskId: row.task.client_id,
    task: toTaskViewModel(toTaskFromPendingRaw(row.task)),
    primaryItem,
    firstImage: images[0] ?? null,
    images,
    amountMeters,
    amountLabel:
      itemUpholstery.amount_meters == null
        ? null
        : formatMetersValue(amountMeters),
    dueDate: row.task.ready_by_at,
    dueDateLabel: formatLocalDate(row.task.ready_by_at),
  };
}
