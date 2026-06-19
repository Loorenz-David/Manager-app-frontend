import { z } from "zod";
import { ClientIdSchema, type Branded } from "@beyo/lib";

export type NotificationId = Branded<string, "NotificationId">;

export const NotificationIdSchema = ClientIdSchema.refine(
  (value) => value.startsWith("not_"),
  "Invalid notification client ID prefix.",
).transform((value) => value as NotificationId);

export const NotificationDtoSchema = z.object({
  client_id: NotificationIdSchema,
  notification_type: z.string(),
  title: z.string(),
  body: z.string(),
  entity_type: z.string().nullable(),
  entity_client_id: z.string().nullable(),
  read_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

export const ListNotificationsParamsSchema = z.object({
  unread_only: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  before_client_id: NotificationIdSchema.optional(),
});

export type ListNotificationsParams = z.infer<
  typeof ListNotificationsParamsSchema
>;

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationDtoSchema),
  has_more: z.boolean(),
  unread_count: z.number().int().nonnegative(),
});

export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;

export const UnreadCountResponseSchema = z.object({
  unread_count: z.number().int().nonnegative(),
});

export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

export const MarkNotificationsReadInputSchema = z
  .object({
    notification_client_ids: z.array(NotificationIdSchema).nullable(),
    mark_all_read: z.boolean(),
  })
  .refine(
    (value) =>
      value.mark_all_read || (value.notification_client_ids?.length ?? 0) > 0,
    "Choose notifications to mark read or set mark_all_read.",
  );

export type MarkNotificationsReadInput = z.infer<
  typeof MarkNotificationsReadInputSchema
>;

export type NotificationViewModel = NotificationDto & {
  is_unread: boolean;
  created_at_display: string;
};

export function toNotificationViewModel(
  notification: NotificationDto,
): NotificationViewModel {
  return {
    ...notification,
    is_unread: notification.read_at === null,
    created_at_display: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(notification.created_at)),
  };
}
