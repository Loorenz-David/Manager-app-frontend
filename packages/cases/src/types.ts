import { z } from "zod";

import { ImageAnnotationSchema } from "@beyo/images";
import {
  BackendRichTextBlockSchema,
  BackendRichTextInlinePartMarksSchema,
  BackendRichTextMentionSchema,
  ClientIdSchema,
} from "@beyo/lib";
import type { BackendMentionResolution, BackendRichTextBlock } from "@beyo/lib";
import type {
  CaseConversationId,
  CaseConversationMessageId,
  CaseId,
  CaseLinkId,
  CaseParticipantId,
  UserId,
} from "@beyo/lib";

export const CASE_STATE = ["open", "resolving", "resolved"] as const;
export const CASE_LINK_ENTITY_TYPE = ["task", "customer"] as const;
export const CASE_LINK_ROLE = [
  "origin",
  "subject",
  "context",
  "actor",
  "resolution",
] as const;

export type CaseTypeId = string & { readonly _brand: "CaseTypeId" };

export const CaseTypeSchema = z.object({
  client_id: z.string().transform((v) => v as CaseTypeId),
  name: z.string(),
  image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
});
export type CaseType = z.infer<typeof CaseTypeSchema>;

export type ListCaseTypesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  entity_type?: string;
};

export type CaseTypeSelectedDisplay = {
  clientId: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
};

export const MESSAGE_CONTENT_BLOCK_TYPE = ["text", "mention", "label", "link"] as const;

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

export const CaseTypeSnapshotSchema = z.object({
  name: z.string(),
  image_url: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});
export type CaseTypeSnapshot = z.infer<typeof CaseTypeSnapshotSchema>;

export function getCaseTypeImageUrl(
  caseType: CaseTypeSnapshot | null | undefined,
): string | null {
  if (!caseType) {
    return null;
  }

  return caseType.image_url ?? caseType.image ?? null;
}

export const CaseListCardRawSchema = z.object({
  client_id: z.string().transform((v) => v as CaseId),
  created_at: z.string().datetime({ offset: true }),
  state: z.enum(CASE_STATE),
  case_type_id: z.string().nullable(),
  case_type: CaseTypeSnapshotSchema.nullable().optional(),
  type_label: z.string().nullable().optional(),
  participant_count: z.number().int(),
  messages_count: z.number().int(),
  created_by: CaseUserSnapshotSchema,
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE).nullable(),
  last_message_seq: z.number().int(),
  task: CaseTaskSnapshotSchema.nullable().optional(),
});
export type CaseListCardRaw = z.infer<typeof CaseListCardRawSchema>;

export const MessageMentionSchema = BackendRichTextMentionSchema;
export const MessageContentBlockMarksSchema = BackendRichTextInlinePartMarksSchema;
export const MessageContentBlockSchema = BackendRichTextBlockSchema;
export type MessageContentBlock = BackendRichTextBlock;

export const InitialMessageInputSchema = z.object({
  client_id: z.string().nullable().optional(),
  content: z.array(MessageContentBlockSchema),
  plain_text: z.string().optional(),
});
export type InitialMessageInput = z.infer<typeof InitialMessageInputSchema>;

export const MessageImageSnapshotSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  storage_provider: z.string(),
  source_type: z.string(),
  source_reference: z.string().nullable().optional(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  last_event: z.unknown().nullable().optional(),
  events: z.array(z.unknown()).optional(),
  image_annotation: ImageAnnotationSchema.nullable().optional(),
  image_annotations: z.array(ImageAnnotationSchema).optional(),
});

export const MentionResolutionSchema = z.object({
  mention_table: z.string(),
  mention_id: z.string(),
  mention_data: CaseUserSnapshotSchema.nullable(),
});
export type MentionResolution = BackendMentionResolution<CaseUserSnapshot>;

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
  case_type: CaseTypeSnapshotSchema.nullable().optional(),
  type_label: z.string().nullable().optional(),
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
  entity_type: z.string().optional(),
  entity_client_id: z.string().optional(),
  participants: z.array(z.string()).optional(),
  selected_all: z.boolean().optional(),
  skip_participants: z.array(z.string()).optional(),
  initial_message: InitialMessageInputSchema.nullable().optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const CaseCreationFormSchema = z
  .object({
    case_type_id: z.string().min(1).optional(),
    type_label: z.string().trim().min(1, "Case type is required.").max(128),
    participants: z.array(z.string()).optional(),
    selected_all: z.boolean().optional(),
    skip_participants: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      (data.participants != null && data.participants.length > 0) ||
      data.selected_all === true,
    {
      message: "At least one participant is required.",
      path: ["participants"],
    },
  );
export type CaseCreationFormValues = z.infer<typeof CaseCreationFormSchema>;

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

export const UserCompactRoleSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});

export const UserCompactSchema = z.object({
  client_id: z.string().transform((v) => v as UserId),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: UserCompactRoleSchema.nullable().optional(),
});
export type UserCompact = z.infer<typeof UserCompactSchema>;

export type ListUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
  compact?: boolean;
};

export type ParticipantSelectedDisplay = {
  userId: string;
  username: string;
  profilePicture: string | null;
  roleName: string | null;
};

export type ParticipantSelectionResult = {
  participants: string[];
  selectedAll: boolean;
  skipParticipants: string[];
  selectedUsers: ParticipantSelectedDisplay[];
  totalCount: number | null;
};

export type ListCasesParams = {
  case_state?: string;
  state?: (typeof CASE_STATE)[number];
  q?: string;
  created_by_id?: string;
  entity_type?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  entity_client_id?: string;
  includes_participants?: string;
  offset?: number;
  limit?: number;
};

export type CasesFilterState = {
  caseStates: (typeof CASE_STATE)[number][];
  onlyForMe: boolean;
};

export type CaseFilterPill = "unread" | "active" | "in-progress";

export const DEFAULT_CASES_FILTER: CasesFilterState = {
  caseStates: ["open", "resolving"],
  onlyForMe: true,
};

export type ListMessagesParams = {
  conversation_client_id: CaseConversationId;
  before_seq?: number;
  limit?: number;
};

export type CaseListCardViewModel = CaseListCardRaw & {
  state_label: string;
};

export function getCaseTypeName(
  caseType: CaseTypeSnapshot | null | undefined,
  fallback = "Case",
): string {
  return caseType?.name?.trim() || fallback;
}

export function toCaseListCardViewModel(
  c: CaseListCardRaw,
): CaseListCardViewModel {
  const stateLabels: Record<(typeof CASE_STATE)[number], string> = {
    open: "Open",
    resolving: "In-Progress",
    resolved: "Resolved",
  };

  return {
    ...c,
    state_label: stateLabels[c.state],
  };
}
