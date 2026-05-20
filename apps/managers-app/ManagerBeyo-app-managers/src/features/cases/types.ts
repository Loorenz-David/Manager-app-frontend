import { z } from 'zod';

import { ClientIdSchema } from '@/lib/client-id';
import type {
  CaseConversationId,
  CaseId,
  CaseLinkId,
  CaseParticipantId,
  UserId,
} from '@/types/common';

export const CASE_STATE = ['open', 'resolving', 'resolved'] as const;
export const CASE_LINK_ENTITY_TYPE = ['task', 'customer'] as const;
export const CASE_LINK_ROLE = [
  'origin',
  'subject',
  'context',
  'actor',
  'resolution',
] as const;

export const CaseSchema = z.object({
  id: z.string().transform((v) => v as CaseId),
  state: z.enum(CASE_STATE),
  case_type_id: z.string().nullable(),
  type_label: z.string().nullable(),
  participants_count: z.number().int(),
  conversations_count: z.number().int(),
  messages_count: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
});
export type Case = z.infer<typeof CaseSchema>;

export const CaseLinkSchema = z.object({
  id: z.string().transform((v) => v as CaseLinkId),
  case_id: z.string().transform((v) => v as CaseId),
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  role: z.enum(CASE_LINK_ROLE),
  created_at: z.string().datetime({ offset: true }),
});
export type CaseLink = z.infer<typeof CaseLinkSchema>;

export const CaseParticipantSchema = z.object({
  id: z.string().transform((v) => v as CaseParticipantId),
  case_id: z.string().transform((v) => v as CaseId),
  user_id: z.string().transform((v) => v as UserId),
  last_read_message_seq: z.number().int(),
  joined_at: z.string().datetime({ offset: true }),
});
export type CaseParticipant = z.infer<typeof CaseParticipantSchema>;

export const CaseConversationSummarySchema = z.object({
  id: z.string().transform((v) => v as CaseConversationId),
  case_id: z.string().transform((v) => v as CaseId),
  state: z.enum(CASE_STATE),
  last_message_seq: z.number().int(),
  messages_count: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
});
export type CaseConversationSummary = z.infer<typeof CaseConversationSummarySchema>;

export const CreateCaseInputSchema = z.object({
  client_id: ClientIdSchema,
  case_type_id: z.string().min(1).optional(),
  type_label: z.string().max(128).optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const UpdateCaseStateInputSchema = z.object({
  id: z.string().transform((v) => v as CaseId),
  new_state: z.enum(CASE_STATE, { message: 'State is required.' }),
});
export type UpdateCaseStateInput = z.infer<typeof UpdateCaseStateInputSchema>;

export const LinkEntityToCaseInputSchema = z.object({
  case_id: z.string().transform((v) => v as CaseId),
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE),
  entity_client_id: z.string().min(1),
  role: z.enum(CASE_LINK_ROLE),
});
export type LinkEntityToCaseInput = z.infer<typeof LinkEntityToCaseInputSchema>;

export const AddCaseParticipantsInputSchema = z.object({
  case_id: z.string().transform((v) => v as CaseId),
  user_ids: z.array(z.string().min(1)).min(1, 'Select at least one user.'),
});
export type AddCaseParticipantsInput = z.infer<typeof AddCaseParticipantsInputSchema>;

export type ListCasesParams = {
  state?: Case['state'];
  created_by_id?: string;
  entity_type?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  entity_client_id?: string;
  offset?: number;
  limit?: number;
};

export type CaseViewModel = Case & {
  state_label: string;
  has_activity: boolean;
};

export function toCaseViewModel(c: Case): CaseViewModel {
  return {
    ...c,
    state_label: c.state,
    has_activity: c.messages_count > 0,
  };
}
