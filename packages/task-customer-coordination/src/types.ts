import { z } from "zod";

import { TaskListItemRawSchema } from "@beyo/tasks";
import type { EmailInboxThreadVM, EmailMessageVM } from "@beyo/emails";

export const CUSTOMER_COORDINATION_STATE = [
  "pending",
  "coordinating",
  "completed",
  "failed",
] as const;

export const CustomerCoordinationRecordSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: z.enum(CUSTOMER_COORDINATION_STATE),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type CustomerCoordinationRecord = z.infer<
  typeof CustomerCoordinationRecordSchema
>;

export const CustomerCoordinationCountsSchema = z.object({
  pending: z.number().int().optional(),
  coordinating: z.number().int().optional(),
  completed: z.number().int().optional(),
});
export type CustomerCoordinationCounts = z.infer<
  typeof CustomerCoordinationCountsSchema
>;

export const TaskListItemWithCoordinationRawSchema = TaskListItemRawSchema.extend(
  {
    task: TaskListItemRawSchema.shape.task.extend({
      customer_coordination: z
        .array(CustomerCoordinationRecordSchema)
        .nullable(),
    }),
  },
);
export type TaskListItemWithCoordinationRaw = z.infer<
  typeof TaskListItemWithCoordinationRawSchema
>;

export type ListTasksWithCoordinationResult = {
  items: TaskListItemWithCoordinationRaw[];
  limit: number;
  offset: number;
  has_more: boolean;
};

export type ListTasksWithCoordinationParams = {
  limit?: number;
  offset?: number;
  q?: string | null;
  task_types?: string;
  task_states?: string;
  task_step_states?: string;
  step_readiness_statuses?: string;
  priorities?: string;
  return_sources?: string;
  working_section_ids?: string;
  ready_from_date?: string;
  ready_to_date?: string;
  scheduled_from_date?: string;
  scheduled_to_date?: string;
  upholstery_requirement_states?: string;
  post_handling_states?: string;
  customer_coordination_states?: string;
  deleted?: boolean;
  order_by?: string;
};

export const SendEmailBatchSkippedEntrySchema = z.object({
  task_client_id: z.string(),
  reason: z.enum([
    "task_not_found",
    "no_coordination_record",
    "no_customer_email",
  ]),
});

export const SendEmailBatchResponseDataSchema = z.object({
  job_id: z.string().nullable(),
  status: z.enum(["queued", "nothing_to_send"]),
  queued_count: z.number().int(),
  skipped_count: z.number().int(),
  skipped: z.array(SendEmailBatchSkippedEntrySchema),
});
export type SendEmailBatchResponseData = z.infer<
  typeof SendEmailBatchResponseDataSchema
>;

export type SendEmailBatchInput = {
  connection_client_id?: string | null;
  task_ids: string[];
  subject: string;
  text_body: string | null;
  html_body: string | null;
};

export type SendCoordinationReplyInput = {
  thread_client_id: string;
  subject: string;
  text_body: string | null;
  html_body?: string | null;
};

export const SendCoordinationReplyResponseDataSchema = z.object({
  enqueued: z.boolean(),
  task_client_id: z.string().nullable(),
  thread_client_id: z.string(),
  message_client_id: z.string(),
});
export type SendCoordinationReplyResponseData = z.infer<
  typeof SendCoordinationReplyResponseDataSchema
>;

export type CustomerCoordinationState =
  (typeof CUSTOMER_COORDINATION_STATE)[number];

export type CoordinationInboxFilterState = {
  coordinationStates: CustomerCoordinationState[];
};

export const DEFAULT_COORDINATION_INBOX_FILTER: CoordinationInboxFilterState = {
  coordinationStates: ["coordinating"],
};

export const EmailMessageRawSchema = z
  .object({
    client_id: z.string(),
    direction: z.enum(["inbound", "outbound"]),
    from_name: z.string().nullable().optional(),
    from_address: z.string().nullable().optional(),
    to_addresses_json: z.array(z.string()).nullable().optional(),
    cc_addresses_json: z.array(z.string()).nullable().optional(),
    bcc_addresses_json: z.array(z.string()).nullable().optional(),
    subject: z.string().nullable().optional(),
    text_body: z.string().nullable().optional(),
    text_body_clean: z.string().nullable().optional(),
    html_body: z.string().nullable().optional(),
    body_preview: z.string().nullable().optional(),
    sent_or_received_at: z.string().nullable().optional(),
    send_attempted_at: z.string().nullable().optional(),
    send_error: z.string().nullable().optional(),
  })
  .passthrough();
export type EmailMessageRaw = z.infer<typeof EmailMessageRawSchema>;

const CoordinationInboxThreadCoreSchema = z.object({
  client_id: z.string(),
  entity_client_id: z.string().nullable().optional(),
  major_entity_client_id: z.string().nullable().optional(),
  is_unread: z.boolean(),
  last_message_at: z.string().nullable().optional(),
});

const CoordinationInboxImageSchema = z
  .object({
    client_id: z.string().optional(),
    image_url: z.string().nullable().optional(),
  })
  .passthrough();

export const CoordinationInboxThreadRawSchema = z.object({
  thread: CoordinationInboxThreadCoreSchema,
  task: TaskListItemRawSchema.shape.task.extend({
    customer_coordination: z.array(CustomerCoordinationRecordSchema).nullable(),
  }),
  primary_item: TaskListItemRawSchema.shape.primary_item,
  item_images: z.array(CoordinationInboxImageSchema),
  message_count: z.number().int(),
  // The inbox endpoint returns the most recent N messages (currently 2, but the
  // count may grow). Keep this flexible: accept any array length, and tolerate a
  // missing/null field from older responses.
  last_messages: z.array(EmailMessageRawSchema).nullish().default([]),
});
export type CoordinationInboxThreadRaw = z.infer<
  typeof CoordinationInboxThreadRawSchema
>;

export type CoordinationInboxThreadsParams = {
  coordination_states?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export type CoordinationInboxThreadsResult = {
  items: EmailInboxThreadVM[];
  has_more: boolean;
  limit: number;
  offset: number;
};

export type ThreadMessagesResult = {
  messages: EmailMessageVM[];
  has_more: boolean;
};
