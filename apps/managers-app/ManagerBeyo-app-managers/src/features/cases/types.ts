import { z } from "zod";

import { ClientIdSchema } from "@/lib/client-id";
import type {
  CaseConversationId,
  CaseConversationMessageId,
  CaseId,
  CaseLinkId,
  CaseParticipantId,
  UserId,
} from "@/types/common";

export const CASE_STATE = ["open", "resolving", "resolved"] as const;
export const CASE_LINK_ENTITY_TYPE = ["task", "customer"] as const;
export const CASE_LINK_ROLE = [
  "origin",
  "subject",
  "context",
  "actor",
  "resolution",
] as const;
export const MESSAGE_CONTENT_BLOCK_TYPE = [
  "text",
  "mention",
  "label",
  "link",
] as const;

export const CaseUserSnapshotSchema = z.object({
  client_id: z.string().transform((v) => v as UserId),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type CaseUserSnapshot = z.infer<typeof CaseUserSnapshotSchema>;

export const CaseTaskItemImageSnapshotSchema = z.object({
  client_id: z.string(),
  image_url: z.string().nullable().optional(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
});

export const CaseTaskItemSnapshotSchema = z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  sku: z.string().nullable(),
  item_image: CaseTaskItemImageSnapshotSchema.nullable(),
});

export const CaseTaskSnapshotSchema = z.object({
  client_id: z.string(),
  state: z.string(),
  return_source: z.string().nullable(),
  task_type: z.string(),
  ready_by_at: z.string().datetime({ offset: true }).nullable(),
  item: CaseTaskItemSnapshotSchema.nullable(),
});
export type CaseTaskSnapshot = z.infer<typeof CaseTaskSnapshotSchema>;

export const CaseListCardRawSchema = z.object({
  client_id: z.string().transform((v) => v as CaseId),
  created_at: z.string().datetime({ offset: true }),
  state: z.enum(CASE_STATE),
  case_type_id: z.string().nullable(),
  type_label: z.string().nullable(),
  participant_count: z.number().int(),
  messages_count: z.number().int(),
  created_by: CaseUserSnapshotSchema,
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE).nullable(),
  last_message_seq: z.number().int(),
  task: CaseTaskSnapshotSchema.nullable().optional(),
});
export type CaseListCardRaw = z.infer<typeof CaseListCardRawSchema>;

export const MessageMentionSchema = z.object({
  mention_table: z.string(),
  mention_id: z.string(),
  client_id: z.string(),
});

export const MessageContentBlockSchema = z.object({
  type: z.enum(MESSAGE_CONTENT_BLOCK_TYPE),
  text: z.string(),
  mention: MessageMentionSchema.nullable().optional(),
  label_value: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
});
export type MessageContentBlock = z.infer<typeof MessageContentBlockSchema>;

export const MessageImageSnapshotSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  storage_provider: z.string(),
  source_type: z.string(),
  width_px: z.number().int(),
  height_px: z.number().int(),
  file_size_bytes: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
});

export const MentionResolutionSchema = z.object({
  mention_table: z.string(),
  mention_id: z.string(),
  mention_data: CaseUserSnapshotSchema.nullable(),
});
export type MentionResolution = z.infer<typeof MentionResolutionSchema>;

export const CaseConversationMessageRawSchema = z.object({
  case_id: z
    .string()
    .transform((v) => v as CaseId)
    .optional(),
  client_id: z.string().transform((v) => v as CaseConversationMessageId),
  message_seq: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
  created_by: CaseUserSnapshotSchema.optional(),
  content: z.array(MessageContentBlockSchema).nullable(),
  plain_text: z.string(),
  has_been_edited: z.boolean(),
  has_been_deleted: z.boolean(),
  updated_at: z.string().datetime({ offset: true }).nullable().optional(),
  images: z.array(MessageImageSnapshotSchema).optional(),
  mentions: z.array(MentionResolutionSchema).optional(),
});
export type CaseConversationMessageRaw = z.infer<
  typeof CaseConversationMessageRawSchema
>;

export const CaseLinkSchema = z.object({
  client_id: z.string().transform((v) => v as CaseLinkId),
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  role: z.enum(CASE_LINK_ROLE),
  created_at: z.string().datetime({ offset: true }),
});
export type CaseLink = z.infer<typeof CaseLinkSchema>;

export const CaseParticipantSchema = z.object({
  client_id: z.string().transform((v) => v as CaseParticipantId),
  user_id: z.string().transform((v) => v as UserId),
  last_read_message_seq: z.number().int(),
  joined_at: z.string().datetime({ offset: true }),
});
export type CaseParticipant = z.infer<typeof CaseParticipantSchema>;

export const MessagesPaginationSchema = z.object({
  limit: z.number().int(),
  has_more: z.boolean(),
  next_before_message_seq: z.number().int().nullable(),
});
export type MessagesPagination = z.infer<typeof MessagesPaginationSchema>;

export const CaseDetailBaseSchema = z.object({
  client_id: z.string().transform((v) => v as CaseId),
  state: z.enum(CASE_STATE),
  type_label: z.string().nullable(),
  participants_count: z.number().int(),
  conversations_count: z.number().int(),
  messages_count: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().transform((v) => v as UserId),
  conversation_client_id: z
    .string()
    .transform((v) => v as CaseConversationId)
    .nullable(),
  conversation_messages_count: z.number().int().nullable(),
  conversation_last_message_seq: z.number().int().nullable(),
  conversation_created_at: z.string().datetime({ offset: true }).nullable(),
  mentions: z.array(MentionResolutionSchema).optional(),
});
export type CaseDetailBase = z.infer<typeof CaseDetailBaseSchema>;

export const CaseDetailRawSchema = z.object({
  case: CaseDetailBaseSchema,
  case_conversation_messages: z.array(CaseConversationMessageRawSchema),
  messages_pagination: MessagesPaginationSchema,
});
export type CaseDetailRaw = z.infer<typeof CaseDetailRawSchema>;

export const CreateCaseInputSchema = z.object({
  client_id: ClientIdSchema,
  case_type_id: z.string().min(1).optional(),
  type_label: z.string().max(128).optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const UpdateCaseStateInputSchema = z.object({
  case_client_id: z.string().transform((v) => v as CaseId),
  new_state: z.enum(CASE_STATE, { message: "State is required." }),
});
export type UpdateCaseStateInput = z.infer<typeof UpdateCaseStateInputSchema>;

export const SendMessageInputSchema = z.object({
  client_id: ClientIdSchema.optional(),
  conversation_client_id: z.string().transform((v) => v as CaseConversationId),
  content: z.array(MessageContentBlockSchema).min(1),
  plain_text: z.string().min(1),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const EditMessageInputSchema = z.object({
  message_client_id: z
    .string()
    .transform((v) => v as CaseConversationMessageId),
  content: z.array(MessageContentBlockSchema).min(1),
  plain_text: z.string().min(1),
});
export type EditMessageInput = z.infer<typeof EditMessageInputSchema>;

export const MarkReadInputSchema = z.object({
  case_participant_client_id: z
    .string()
    .transform((v) => v as CaseParticipantId),
  up_to_message_seq: z.number().int(),
});
export type MarkReadInput = z.infer<typeof MarkReadInputSchema>;

export const LinkEntityInputSchema = z.object({
  case_client_id: z.string().transform((v) => v as CaseId),
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE),
  entity_client_id: z.string().min(1),
  role: z.enum(CASE_LINK_ROLE),
});
export type LinkEntityInput = z.infer<typeof LinkEntityInputSchema>;

export const AddParticipantsInputSchema = z.object({
  case_client_id: z.string().transform((v) => v as CaseId),
  user_ids: z.array(z.string().min(1)).min(1),
});
export type AddParticipantsInput = z.infer<typeof AddParticipantsInputSchema>;

export type ListCasesParams = {
  case_state?: string;
  state?: (typeof CASE_STATE)[number];
  q?: string;
  created_by_id?: string;
  entity_type?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  entity_client_id?: string;
  offset?: number;
  limit?: number;
};

export type ListMessagesParams = {
  conversation_client_id: CaseConversationId;
  before_seq?: number;
  limit?: number;
};

export type CaseListCardViewModel = CaseListCardRaw & {
  state_label: string;
};

export function toCaseListCardViewModel(
  c: CaseListCardRaw,
): CaseListCardViewModel {
  const stateLabels: Record<(typeof CASE_STATE)[number], string> = {
    open: "Open",
    resolving: "Resolving",
    resolved: "Resolved",
  };

  return {
    ...c,
    state_label: stateLabels[c.state],
  };
}
