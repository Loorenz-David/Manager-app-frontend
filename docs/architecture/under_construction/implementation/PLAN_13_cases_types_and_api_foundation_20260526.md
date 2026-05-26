# PLAN_13_cases_types_and_api_foundation_20260526

## Metadata

- Plan ID: `PLAN_13_cases_types_and_api_foundation_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Replace the incorrect stub `types.ts`, align all Zod schemas to the backend contract, add a `CaseConversationMessageId` branded type, extend `case-keys.ts`, and create all API functions required by the Cases feature.
- Business/user intent: Lay a correct, zero-breaking data layer so every subsequent plan can build on solid typed foundations without backtracking.
- Non-goals: No UI, no query hooks, no mutations, no surfaces. Pure data layer only.

## Scope

- In scope:
  - `src/features/cases/types.ts` — full replacement
  - `src/types/common.ts` — add `CaseConversationMessageId` branded type
  - `src/features/cases/api/case-keys.ts` — extend with messages, unread, participants, conversations sub-keys
  - `src/features/cases/api/list-cases.ts` — new
  - `src/features/cases/api/get-case.ts` — new
  - `src/features/cases/api/create-case.ts` — new
  - `src/features/cases/api/update-case-state.ts` — new
  - `src/features/cases/api/send-message.ts` — new
  - `src/features/cases/api/edit-message.ts` — new
  - `src/features/cases/api/delete-message.ts` — new
  - `src/features/cases/api/list-messages.ts` — new
  - `src/features/cases/api/mark-read.ts` — new
  - `src/features/cases/api/get-unread-counts.ts` — new
  - `src/features/cases/api/link-entity.ts` — new
  - `src/features/cases/api/add-participants.ts` — new
  - `src/features/cases/index.ts` — re-export updated types

- Out of scope: query hooks, mutations, UI components, surfaces, stores.

- Assumptions:
  - `ApiEnvelopeSchema` from `@/types/api` is used for all response parsing.
  - `apiClient.get/post/patch/delete` pattern follows the same shape as `list-tasks.ts`.
  - Backend always returns `client_id` (not `id`) on all case entities.
  - The backend path ID and the body ID must both be sent for endpoints that require it (documented below).

## Clarifications required

_(none — backend contract is fully documented in the handoff)_

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after replacing `types.ts`.
2. All new API function files compile without errors.
3. `case-keys.ts` exports keys for lists, details, messages, unread, participants, and conversations.
4. `features/cases/index.ts` exports all new public types.

## Contracts and skills

### Contracts loaded

- `architecture/04_api_client.md`: API function shape, `apiClient` usage, response parsing with Zod
- `architecture/02_types.md`: Zod schema conventions, branded types
- `architecture/05_server_state.md`: query key structure

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/tasks/api/list-tasks.ts` — to confirm `apiClient.get` call shape and `ApiEnvelopeSchema` usage ✓ (already read)
- `src/features/tasks/api/task-keys.ts` — to confirm query key pattern ✓ (already read)
- `src/types/common.ts` — to confirm existing branded type style before adding `CaseConversationMessageId`
- `src/lib/client-id.ts` — to confirm `ClientIdSchema` usage ✓ (already read)
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md` — authoritative backend shapes ✓ (already read)

## Implementation plan

### Step 1 — Add `CaseConversationMessageId` to `src/types/common.ts`

Add after the `CaseParticipantId` line:
```ts
export type CaseConversationMessageId = Branded<string, 'CaseConversationMessageId'>;
```

### Step 2 — Replace `src/features/cases/types.ts`

The existing file uses `id` field names that do not match the backend (`client_id`). Replace entirely.

**Enums / constants:**
```ts
export const CASE_STATE = ['open', 'resolving', 'resolved'] as const;
export const CASE_LINK_ENTITY_TYPE = ['task', 'customer'] as const;
export const CASE_LINK_ROLE = ['origin', 'subject', 'context', 'actor', 'resolution'] as const;
export const MESSAGE_CONTENT_BLOCK_TYPE = ['text', 'mention', 'label', 'link'] as const;
```

**User snapshot (appears in list cards and message `created_by`):**
```ts
export const CaseUserSnapshotSchema = z.object({
  client_id: z.string().transform((v) => v as UserId),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type CaseUserSnapshot = z.infer<typeof CaseUserSnapshotSchema>;
```

**Task item image snapshot (nested inside task.item):**
```ts
export const CaseTaskItemImageSnapshotSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().int(),
  height_px: z.number().int(),
  file_size_bytes: z.number().int(),
});
```

**Task item snapshot:**
```ts
export const CaseTaskItemSnapshotSchema = z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  sku: z.string().nullable(),
  item_image: CaseTaskItemImageSnapshotSchema.nullable(),
});
```

**Task snapshot (inside list card):**
```ts
export const CaseTaskSnapshotSchema = z.object({
  client_id: z.string(),
  state: z.string(),
  return_source: z.string().nullable(),
  task_type: z.string(),
  ready_by_at: z.string().datetime({ offset: true }).nullable(),
  item: CaseTaskItemSnapshotSchema.nullable(),
});
export type CaseTaskSnapshot = z.infer<typeof CaseTaskSnapshotSchema>;
```

**List card shape (from `GET /api/v1/cases`):**
```ts
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
  task: CaseTaskSnapshotSchema.nullable(),
});
export type CaseListCardRaw = z.infer<typeof CaseListCardRawSchema>;
```

**Message content block:**
```ts
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
```

**Message image snapshot (inside message.images):**
```ts
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
```

**Mention resolution (inside case detail `case.mentions` and `message.mentions`):**
```ts
export const MentionResolutionSchema = z.object({
  mention_table: z.string(),
  mention_id: z.string(),
  mention_data: CaseUserSnapshotSchema.nullable(),
});
export type MentionResolution = z.infer<typeof MentionResolutionSchema>;
```

**Conversation message (from case detail + list-messages):**
```ts
export const CaseConversationMessageRawSchema = z.object({
  case_id: z.string().transform((v) => v as CaseId).optional(),
  client_id: z.string().transform((v) => v as CaseConversationMessageId),
  message_seq: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
  created_by: CaseUserSnapshotSchema.optional(), // present in detail endpoint, absent in list-messages
  content: z.array(MessageContentBlockSchema).nullable(),
  plain_text: z.string(),
  has_been_edited: z.boolean(),
  has_been_deleted: z.boolean(),
  updated_at: z.string().datetime({ offset: true }).nullable().optional(),
  images: z.array(MessageImageSnapshotSchema).optional(),
  mentions: z.array(MentionResolutionSchema).optional(),
});
export type CaseConversationMessageRaw = z.infer<typeof CaseConversationMessageRawSchema>;
```

**Messages pagination:**
```ts
export const MessagesPaginationSchema = z.object({
  limit: z.number().int(),
  has_more: z.boolean(),
  next_before_message_seq: z.number().int().nullable(),
});
export type MessagesPagination = z.infer<typeof MessagesPaginationSchema>;
```

**Case detail base shape (from create/update/state-change responses and GET detail):**
```ts
export const CaseDetailBaseSchema = z.object({
  client_id: z.string().transform((v) => v as CaseId),
  state: z.enum(CASE_STATE),
  type_label: z.string().nullable(),
  participants_count: z.number().int(),
  conversations_count: z.number().int(),
  messages_count: z.number().int(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().transform((v) => v as UserId),
  conversation_client_id: z.string().transform((v) => v as CaseConversationId).nullable(),
  conversation_messages_count: z.number().int().nullable(),
  conversation_last_message_seq: z.number().int().nullable(),
  conversation_created_at: z.string().datetime({ offset: true }).nullable(),
  mentions: z.array(MentionResolutionSchema).optional(),
});
export type CaseDetailBase = z.infer<typeof CaseDetailBaseSchema>;
```

**Full case detail (from GET /api/v1/cases/{id}):**
```ts
export const CaseDetailRawSchema = z.object({
  case: CaseDetailBaseSchema,
  case_conversation_messages: z.array(CaseConversationMessageRawSchema),
  messages_pagination: MessagesPaginationSchema,
});
export type CaseDetailRaw = z.infer<typeof CaseDetailRawSchema>;
```

**Input types (replace existing ones, use client_id):**
```ts
export const CreateCaseInputSchema = z.object({
  client_id: ClientIdSchema,
  case_type_id: z.string().min(1).optional(),
  type_label: z.string().max(128).optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const UpdateCaseStateInputSchema = z.object({
  case_client_id: z.string().transform((v) => v as CaseId),
  new_state: z.enum(CASE_STATE, { message: 'State is required.' }),
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
  message_client_id: z.string().transform((v) => v as CaseConversationMessageId),
  content: z.array(MessageContentBlockSchema).min(1),
  plain_text: z.string().min(1),
});
export type EditMessageInput = z.infer<typeof EditMessageInputSchema>;

export const MarkReadInputSchema = z.object({
  case_participant_client_id: z.string().transform((v) => v as CaseParticipantId),
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
  case_state?: string;  // comma-separated: 'open,resolving'
  state?: (typeof CASE_STATE)[number]; // legacy single-value
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
```

**View model (updated to work with list card raw):**
```ts
export type CaseListCardViewModel = CaseListCardRaw & {
  state_label: string;
};

export function toCaseListCardViewModel(c: CaseListCardRaw): CaseListCardViewModel {
  const stateLabels: Record<(typeof CASE_STATE)[number], string> = {
    open: 'Open',
    resolving: 'Resolving',
    resolved: 'Resolved',
  };
  return {
    ...c,
    state_label: stateLabels[c.state],
  };
}
```

### Step 3 — Extend `src/features/cases/api/case-keys.ts`

Replace the file:
```ts
import type { CaseConversationId, CaseId } from '@/types/common';
import type { ListCasesParams, ListMessagesParams } from '@/features/cases/types';

export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (params: ListCasesParams = {}) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: CaseId) => [...caseKeys.details(), id] as const,
  unreadCounts: () => [...caseKeys.all, 'unread-counts'] as const,
  participantsList: (caseId: CaseId) => [...caseKeys.all, 'participants', caseId] as const,
  conversationMessages: (conversationId: CaseConversationId, params: Partial<ListMessagesParams> = {}) =>
    [...caseKeys.all, 'conversation-messages', conversationId, params] as const,
};
```

### Step 4 — Create API functions

**`src/features/cases/api/list-cases.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseListCardRawSchema, type CaseListCardRaw, type ListCasesParams } from '../types';

const ListCasesResponseSchema = ApiEnvelopeSchema(
  z.object({ cases: z.array(CaseListCardRawSchema) }),
).extend({ ok: z.literal(true) });

export async function listCases(params: ListCasesParams): Promise<CaseListCardRaw[]> {
  const q: Record<string, string | number> = {};
  if (params.case_state) q.case_state = params.case_state;
  if (params.state) q.state = params.state;
  if (params.q) q.q = params.q;
  if (params.created_by_id) q.created_by_id = params.created_by_id;
  if (params.entity_type) q.entity_type = params.entity_type;
  if (params.entity_client_id) q.entity_client_id = params.entity_client_id;
  if (params.offset != null) q.offset = params.offset;
  if (params.limit != null) q.limit = params.limit;

  const parsed = await apiClient.get('/api/v1/cases', ListCasesResponseSchema, q);
  return parsed.data.cases;
}
```

**`src/features/cases/api/get-case.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import type { CaseId } from '@/types/common';
import { CaseDetailRawSchema, type CaseDetailRaw } from '../types';

const GetCaseResponseSchema = ApiEnvelopeSchema(CaseDetailRawSchema).extend({ ok: z.literal(true) });

export type GetCaseParams = {
  case_client_id: CaseId;
  before_message_seq?: number;
  messages_limit?: number;
};

export async function getCase(params: GetCaseParams): Promise<CaseDetailRaw> {
  const q: Record<string, number> = {};
  if (params.before_message_seq != null) q.before_message_seq = params.before_message_seq;
  if (params.messages_limit != null) q.messages_limit = params.messages_limit;

  const parsed = await apiClient.get(
    `/api/v1/cases/${params.case_client_id}`,
    GetCaseResponseSchema,
    q,
  );
  return parsed.data;
}
```

**`src/features/cases/api/create-case.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseDetailBaseSchema, type CaseDetailBase, type CreateCaseInput } from '../types';

const CreateCaseResponseSchema = ApiEnvelopeSchema(
  z.object({ case: CaseDetailBaseSchema }),
).extend({ ok: z.literal(true) });

export async function createCase(input: CreateCaseInput): Promise<CaseDetailBase> {
  const parsed = await apiClient.post('/api/v1/cases', CreateCaseResponseSchema, input);
  return parsed.data.case;
}
```

**`src/features/cases/api/update-case-state.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseDetailBaseSchema, type CaseDetailBase, type UpdateCaseStateInput } from '../types';

const UpdateCaseStateResponseSchema = ApiEnvelopeSchema(
  z.object({ case: CaseDetailBaseSchema }),
).extend({ ok: z.literal(true) });

export async function updateCaseState(input: UpdateCaseStateInput): Promise<CaseDetailBase> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.patch(
    `/api/v1/cases/${case_client_id}/state`,
    UpdateCaseStateResponseSchema,
    { ...body, case_client_id },
  );
  return parsed.data.case;
}
```

Note: `case_client_id` must appear in both path and body per backend contract.

**`src/features/cases/api/send-message.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseConversationMessageRawSchema, type CaseConversationMessageRaw, type SendMessageInput } from '../types';

const SendMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ message: CaseConversationMessageRawSchema }),
).extend({ ok: z.literal(true) });

export async function sendMessage(input: SendMessageInput): Promise<CaseConversationMessageRaw> {
  const { conversation_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/conversations/${conversation_client_id}/messages`,
    SendMessageResponseSchema,
    { ...body, conversation_client_id },
  );
  return parsed.data.message;
}
```

**`src/features/cases/api/edit-message.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseConversationMessageRawSchema, type CaseConversationMessageRaw, type EditMessageInput } from '../types';

const EditMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ message: CaseConversationMessageRawSchema }),
).extend({ ok: z.literal(true) });

export async function editMessage(input: EditMessageInput): Promise<CaseConversationMessageRaw> {
  const { message_client_id, ...body } = input;
  const parsed = await apiClient.patch(
    `/api/v1/cases/messages/${message_client_id}`,
    EditMessageResponseSchema,
    { ...body, message_client_id },
  );
  return parsed.data.message;
}
```

**`src/features/cases/api/delete-message.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import type { CaseConversationMessageId } from '@/types/common';

const DeleteMessageResponseSchema = ApiEnvelopeSchema(
  z.object({ deleted: z.boolean() }),
).extend({ ok: z.literal(true) });

export async function deleteMessage(messageClientId: CaseConversationMessageId): Promise<boolean> {
  const parsed = await apiClient.delete(
    `/api/v1/cases/messages/${messageClientId}`,
    DeleteMessageResponseSchema,
  );
  return parsed.data.deleted;
}
```

**`src/features/cases/api/list-messages.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseConversationMessageRawSchema, type CaseConversationMessageRaw, type ListMessagesParams } from '../types';

const ListMessagesResponseSchema = ApiEnvelopeSchema(
  z.object({ messages: z.array(CaseConversationMessageRawSchema) }),
).extend({ ok: z.literal(true) });

export async function listMessages(params: ListMessagesParams): Promise<CaseConversationMessageRaw[]> {
  const q: Record<string, number> = {};
  if (params.before_seq != null) q.before_seq = params.before_seq;
  if (params.limit != null) q.limit = params.limit;

  const parsed = await apiClient.get(
    `/api/v1/cases/conversations/${params.conversation_client_id}/messages`,
    ListMessagesResponseSchema,
    q,
  );
  return parsed.data.messages;
}
```

**`src/features/cases/api/mark-read.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import type { MarkReadInput } from '../types';

const MarkReadResponseSchema = ApiEnvelopeSchema(
  z.object({ last_read_message_seq: z.number().int() }),
).extend({ ok: z.literal(true) });

export async function markRead(input: MarkReadInput): Promise<number> {
  const parsed = await apiClient.post(
    '/api/v1/cases/messages/mark-read',
    MarkReadResponseSchema,
    input,
  );
  return parsed.data.last_read_message_seq;
}
```

**`src/features/cases/api/get-unread-counts.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const GetUnreadCountsResponseSchema = ApiEnvelopeSchema(
  z.object({ case_unread_counts: z.record(z.string(), z.number().int()) }),
).extend({ ok: z.literal(true) });

export async function getUnreadCounts(
  caseClientIds?: string[],
): Promise<Record<string, number>> {
  const q: Record<string, string> = {};
  if (caseClientIds && caseClientIds.length > 0) {
    q.case_client_ids = caseClientIds.join(',');
  }
  const parsed = await apiClient.get(
    '/api/v1/cases/unread-counts',
    GetUnreadCountsResponseSchema,
    q,
  );
  return parsed.data.case_unread_counts;
}
```

**`src/features/cases/api/link-entity.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseLinkSchema, type CaseLink, type LinkEntityInput } from '../types';

const LinkEntityResponseSchema = ApiEnvelopeSchema(
  z.object({ link: CaseLinkSchema }),
).extend({ ok: z.literal(true) });

export async function linkEntity(input: LinkEntityInput): Promise<CaseLink> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/${case_client_id}/links`,
    LinkEntityResponseSchema,
    { ...body, case_client_id },
  );
  return parsed.data.link;
}
```

For `CaseLinkSchema` to work here, we need to keep it in types.ts. Update it to use `client_id`:
```ts
export const CaseLinkSchema = z.object({
  client_id: z.string().transform((v) => v as CaseLinkId),
  entity_type: z.enum(CASE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  role: z.enum(CASE_LINK_ROLE),
  created_at: z.string().datetime({ offset: true }),
});
export type CaseLink = z.infer<typeof CaseLinkSchema>;
```

**`src/features/cases/api/add-participants.ts`**

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { CaseParticipantSchema, type CaseParticipant, type AddParticipantsInput } from '../types';

const AddParticipantsResponseSchema = ApiEnvelopeSchema(
  z.object({ added: z.array(CaseParticipantSchema) }),
).extend({ ok: z.literal(true) });

export async function addParticipants(input: AddParticipantsInput): Promise<CaseParticipant[]> {
  const { case_client_id, ...body } = input;
  const parsed = await apiClient.post(
    `/api/v1/cases/${case_client_id}/participants`,
    AddParticipantsResponseSchema,
    { ...body, case_client_id },
  );
  return parsed.data.added;
}
```

For `CaseParticipantSchema`, update to use `client_id` and remove `case_id` (backend response doesn't include it):
```ts
export const CaseParticipantSchema = z.object({
  client_id: z.string().transform((v) => v as CaseParticipantId),
  user_id: z.string().transform((v) => v as UserId),
  last_read_message_seq: z.number().int(),
  joined_at: z.string().datetime({ offset: true }),
});
export type CaseParticipant = z.infer<typeof CaseParticipantSchema>;
```

### Step 5 — Update `src/features/cases/index.ts`

Export all public types, schemas, and helpers:
```ts
export { CasesView } from './components/CasesView';
export { CasesViewProvider } from './providers/CasesViewProvider';
export type {
  CaseListCardRaw,
  CaseListCardViewModel,
  CaseDetailRaw,
  CaseDetailBase,
  CaseConversationMessageRaw,
  MessageContentBlock,
  CaseLink,
  CaseParticipant,
  CaseUserSnapshot,
  CaseTaskSnapshot,
  MentionResolution,
  CreateCaseInput,
  UpdateCaseStateInput,
  SendMessageInput,
  EditMessageInput,
  MarkReadInput,
  LinkEntityInput,
  AddParticipantsInput,
  ListCasesParams,
  ListMessagesParams,
} from './types';
export {
  CASE_STATE,
  CASE_LINK_ENTITY_TYPE,
  CASE_LINK_ROLE,
  MESSAGE_CONTENT_BLOCK_TYPE,
  toCaseListCardViewModel,
} from './types';
```

## Risks and mitigations

- Risk: Existing `CaseViewModel` / `toCaseViewModel` may be imported elsewhere and break.
  Mitigation: Search for all usages of `CaseViewModel` and `toCaseViewModel` before replacing. The only usage found is in `index.ts` itself. Replace cleanly.

- Risk: `CaseConversationMessageRaw` has `created_by` marked `.optional()` because the `list-messages` endpoint does not include it, but the `get-case` detail endpoint does.
  Mitigation: Components should handle `created_by` being undefined and fall back to "unknown user" avatar.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Confirm `case-keys.ts` compiles and all key functions return `readonly` tuples
- Confirm all API function return types match their declared signatures

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
