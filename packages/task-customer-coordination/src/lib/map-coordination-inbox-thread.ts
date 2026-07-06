import type { EmailInboxThreadVM } from "@beyo/emails";

import { mapEmailMessage } from "./map-email-message";
import type { CoordinationInboxThreadRaw } from "../types";

export function mapCoordinationInboxThread(
  raw: CoordinationInboxThreadRaw,
): EmailInboxThreadVM {
  // Backend returns the most recent messages (newest-first, currently 2). Sort
  // oldest-first so the thread view can seed directly, and treat the last entry
  // as the newest for the card summary fields.
  const lastMessages = (raw.last_messages ?? [])
    .map(mapEmailMessage)
    .sort(
      (a, b) =>
        new Date(a.sentOrReceivedAtIso).getTime() -
        new Date(b.sentOrReceivedAtIso).getTime(),
    );
  const newestMessage = lastMessages.at(-1) ?? null;
  const images = raw.item_images.flatMap((image) => {
    const clientId = typeof image.client_id === "string" ? image.client_id : null;
    const imageUrl = typeof image.image_url === "string" ? image.image_url : null;

    return clientId && imageUrl
      ? [{ client_id: clientId, image_url: imageUrl }]
      : [];
  });
  const title =
    newestMessage?.fromName ??
    raw.task.primary_email ??
    (newestMessage?.fromAddress || null) ??
    "Unknown";

  return {
    threadId: raw.thread.client_id,
    entityClientId:
      raw.thread.entity_client_id ??
      raw.task.customer_coordination?.[0]?.client_id ??
      null,
    majorEntityClientId: raw.task.client_id ?? raw.thread.major_entity_client_id ?? null,
    isUnread: raw.thread.is_unread,
    title,
    messageCount: raw.message_count ?? null,
    subject: newestMessage?.subject ?? null,
    preview: newestMessage?.bodyPreview ?? newestMessage?.textBody ?? "",
    timeIso: newestMessage?.sentOrReceivedAtIso ?? raw.thread.last_message_at ?? null,
    imageUrl: images[0]?.image_url ?? null,
    quantity: raw.primary_item?.quantity ?? null,
    lastMessageDirection: newestMessage?.direction ?? null,
    lastMessageSendError: newestMessage?.sendError ?? null,
    lastMessages,
    imageClientIds: images,
    itemClientId: raw.primary_item?.client_id ?? null,
  };
}
