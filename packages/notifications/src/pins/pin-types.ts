import { z } from "zod";
import {
  ClientIdSchema,
  generateClientId,
  type Branded,
} from "@beyo/lib";

export type NotificationPinId = Branded<string, "NotificationPinId">;

export const NotificationPinIdSchema = ClientIdSchema.refine(
  (value) => value.startsWith("npin_"),
  "Invalid notification pin client ID prefix.",
).transform((value) => value as NotificationPinId);

export const PinEntityTypeSchema = z.enum([
  "task",
  "task_step",
  "item_upholstery",
]);
export type PinEntityType = z.infer<typeof PinEntityTypeSchema>;

export const TaskPinStateSchema = z.enum([
  "pending",
  "assigned",
  "working",
  "stalled",
  "ready",
  "resolved",
  "failed",
  "cancelled",
]);
export type TaskPinState = z.infer<typeof TaskPinStateSchema>;

export const TaskStepPinStateSchema = z.enum([
  "pending",
  "working",
  "paused",
  "ended_shift",
  "blocked",
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);
export type TaskStepPinState = z.infer<typeof TaskStepPinStateSchema>;

export const ItemUpholsteryPinStateSchema = z.enum([
  "missing_quantity",
  "available",
  "needs_ordering",
  "ordered",
  "in_use",
  "completed",
  "failed",
]);
export type ItemUpholsteryPinState = z.infer<
  typeof ItemUpholsteryPinStateSchema
>;

export type PinState =
  | TaskPinState
  | TaskStepPinState
  | ItemUpholsteryPinState;

export const PinConditionSchema = z.object({
  type: z.literal("state"),
  op: z.enum(["eq", "in", "not_in"]),
  value: z.union([z.string(), z.array(z.string())]),
});
export type PinCondition = z.infer<typeof PinConditionSchema>;

export const NotificationPinUserSchema = z.object({
  client_id: z.string(),
  username: z.string().nullable(),
  profile_picture: z.string().nullable(),
});

export const NotificationPinDtoSchema = z.object({
  client_id: NotificationPinIdSchema,
  entity_type: PinEntityTypeSchema,
  entity_client_id: z.string(),
  major_entity_type: PinEntityTypeSchema.nullable(),
  major_client_entity_id: z.string().nullable(),
  conditions: z.array(PinConditionSchema).nullable(),
  fire_once: z.boolean(),
  pinned_at: z.string().datetime({ offset: true }),
  user: NotificationPinUserSchema,
});
export type NotificationPinDto = z.infer<typeof NotificationPinDtoSchema>;

export const ListPinsParamsSchema = z
  .object({
    entity_client_ids: z.array(z.string()).optional(),
    major_client_entity_ids: z.array(z.string()).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.entity_client_ids?.length) !==
      Boolean(value.major_client_entity_ids?.length),
    "Provide exactly one pin lookup target.",
  );
export type ListPinsParams = z.infer<typeof ListPinsParamsSchema>;

export const ListPinsResponseSchema = z.object({
  pins: z.array(NotificationPinDtoSchema),
});
export type ListPinsResponse = z.infer<typeof ListPinsResponseSchema>;

export const CreatePinInputSchema = z.object({
  client_id: NotificationPinIdSchema,
  entity_type: PinEntityTypeSchema,
  entity_client_id: z.string(),
  major_entity_type: PinEntityTypeSchema,
  major_client_entity_id: z.string(),
  conditions: z.array(PinConditionSchema).nullable(),
  fire_once: z.boolean(),
});
export type CreatePinInput = z.infer<typeof CreatePinInputSchema>;

export const DeletePinTargetSchema = z.union([
  z.object({
    client_id: NotificationPinIdSchema,
  }),
  z.object({
    major_entity_type: PinEntityTypeSchema,
    major_client_entity_id: z.string(),
  }),
]);
export type DeletePinTarget = z.infer<typeof DeletePinTargetSchema>;

export const UpdatePinInputSchema = z.object({
  client_id: NotificationPinIdSchema,
  conditions: z.array(PinConditionSchema).nullable().optional(),
  fire_once: z.boolean().optional(),
});
export type UpdatePinInput = z.infer<typeof UpdatePinInputSchema>;

export function generateNotificationPinId(): NotificationPinId {
  return NotificationPinIdSchema.parse(generateClientId("NotificationPin"));
}

export function serializeStatesToConditions(
  states: readonly string[],
): PinCondition[] {
  return states.length > 0
    ? [{ type: "state", op: "in", value: [...states] }]
    : [];
}

export function parseConditionsToStates(
  conditions: PinCondition[] | null,
): string[] {
  const stateCondition = conditions?.find(
    (condition) => condition.type === "state",
  );

  if (!stateCondition) {
    return [];
  }

  return Array.isArray(stateCondition.value)
    ? stateCondition.value
    : [stateCondition.value];
}
