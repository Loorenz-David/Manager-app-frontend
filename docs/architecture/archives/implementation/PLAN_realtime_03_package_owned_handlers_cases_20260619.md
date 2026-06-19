# PLAN_realtime_03_package_owned_handlers_cases_20260619

## Metadata

- Plan ID: `PLAN_realtime_03_package_owned_handlers_cases_20260619`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T08:43:31Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Add `caseSocketEvents` to `@beyo/cases` — the case + conversation socket handlers — exported as a `SocketEventHandlers` object the apps merge into their registry.
- Business/user intent: Cases and conversation threads update live (new participants, state changes, new messages) for any app that consumes `@beyo/cases`.
- Non-goals: app-owned handlers (tasks/items/sections — PLAN_04); registry mounting (PLAN_04).

## Scope

- In scope: `packages/cases/src/socket-events.ts` covering `case:created/updated/state-changed/participant-added/participant-removed/conversation-created` and `conversation:message-created/edited/deleted`; export from the package index.
- Out of scope: any handler whose query keys are app-owned.
- Assumptions: `@beyo/cases` owns `caseKeys` (confirmed: `packages/cases/src/api/case-keys.ts`). The realtime types (`SocketEventHandlers`) come from `@beyo/realtime` (PLAN_01).

## Clarifications required

- [ ] Conversation message events carry the **message** `client_id`, not the conversation id. The handler cannot derive the conversation key from the payload alone. Confirm the chosen strategy (predicate invalidation over active conversation-message queries) is acceptable vs. tracking the active conversation id. Does not block — predicate approach is implemented below.

## Acceptance criteria

1. `@beyo/cases` exports `caseSocketEvents: SocketEventHandlers` (added to `packages/cases/src/index.ts`).
2. Each handler invalidates the correct `caseKeys` entry with `refetchType: 'active'`; deletes use `removeQueries`.
3. `conversation:message-*` handlers invalidate only conversation-message queries (predicate filter), not the whole cache.
4. `@beyo/cases` typechecks with the new `@beyo/realtime` peer dependency.

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: per-feature `socket-events.ts` declaration pattern + the conversation-message predicate note.
- `architecture/05_server_state.md`: query-key semantics for targeted invalidation.

### Local extensions loaded

- none specific.

### File read intent — pattern vs. relational

Permitted relational reads (establish exact keys/shapes):
- `packages/cases/src/api/case-keys.ts` — exact `caseKeys` factory (already reviewed: `detail`, `lists`, `participantsList`, `conversationMessages(conversationId, params)`, `conversationDetailPagesForCase`, `unreadCountsRoot`, `globalUnreadCount`).
- `packages/cases/src/index.ts` — current public exports (to add `caseSocketEvents`).
- `packages/cases/src/types.ts` — `CaseId`, `CaseConversationId` and message types.

Prohibited: reading an app controller to learn handler structure (use `21_realtime.md`).

### Skill selection

- Trigger terms: `socket, realtime, cases, conversation`.

## Implementation plan

1. **Add peer dep** `@beyo/realtime: "*"` to `packages/cases/package.json`.

2. **Create `packages/cases/src/socket-events.ts`**:
   ```ts
   import type { SocketEventHandlers } from '@beyo/realtime';
   import type { CaseId } from '@beyo/lib';
   import { caseKeys } from './api/case-keys';

   export const caseSocketEvents: SocketEventHandlers = {
     'case:created': (_p, { queryClient }) =>
       queryClient.invalidateQueries({ queryKey: caseKeys.lists(), refetchType: 'active' }),

     'case:updated': ({ client_id }, { queryClient }) => {
       queryClient.invalidateQueries({ queryKey: caseKeys.detail(client_id as CaseId), refetchType: 'active' });
       queryClient.invalidateQueries({ queryKey: caseKeys.lists(), refetchType: 'active' });
     },

     'case:state-changed': ({ client_id }, { queryClient }) => {
       queryClient.invalidateQueries({ queryKey: caseKeys.detail(client_id as CaseId), refetchType: 'active' });
       queryClient.invalidateQueries({ queryKey: caseKeys.lists(), refetchType: 'active' });
     },

     'case:participant-added': ({ client_id }, { queryClient }) =>
       queryClient.invalidateQueries({ queryKey: caseKeys.participantsList(client_id as CaseId), refetchType: 'active' }),

     'case:participant-removed': ({ client_id }, { queryClient }) =>
       queryClient.invalidateQueries({ queryKey: caseKeys.participantsList(client_id as CaseId), refetchType: 'active' }),

     'case:conversation-created': ({ client_id }, { queryClient }) =>
       queryClient.invalidateQueries({ queryKey: caseKeys.detail(client_id as CaseId), refetchType: 'active' }),

     // Conversation messages — payload carries the MESSAGE client_id, not the conversation.
     // Invalidate only active conversation-message queries via predicate (see clarification).
     'conversation:message-created': (_p, { queryClient }) =>
       queryClient.invalidateQueries({
         predicate: (q) => q.queryKey[0] === 'cases' && q.queryKey[1] === 'conversation-messages',
         refetchType: 'active',
       }),
     'conversation:message-edited': (_p, { queryClient }) =>
       queryClient.invalidateQueries({
         predicate: (q) => q.queryKey[0] === 'cases' && q.queryKey[1] === 'conversation-messages',
         refetchType: 'active',
       }),
     'conversation:message-deleted': (_p, { queryClient }) =>
       queryClient.invalidateQueries({
         predicate: (q) => q.queryKey[0] === 'cases' && q.queryKey[1] === 'conversation-messages',
         refetchType: 'active',
       }),
   };
   ```
   Note: the predicate matches the `caseKeys.conversationMessages(...)` prefix (`['cases','conversation-messages', conversationId, params]`). Because conversation-message events are only delivered while the user is in the conversation room (`view_entity`), at most the active conversation's query is observed — `refetchType: 'active'` refetches only that one.

3. **Export** `caseSocketEvents` from `packages/cases/src/index.ts`.

4. **Verify** the unread-count keys: if a `conversation:message-created` should also bump `caseKeys.globalUnreadCount()` / `unreadCountsRoot()`, add those invalidations (relational check of how unread counts are currently fed).

## Risks and mitigations

- Risk: predicate over-matches and refetches stale conversation queries. Mitigation: conversation-message queries are only active while viewing; `refetchType: 'active'` bounds the work to observed queries.
- Risk: `client_id as CaseId` cast hides a real id mismatch. Mitigation: all `caseKeys` already key on `CaseId`; the cast is the established pattern in this package.

## Validation plan

- `npm run typecheck`: zero errors for `@beyo/cases`.
- Unit (MSW): each handler invalidates the expected key; message handlers match only the conversation-messages predicate.
- Integration (PLAN_04): in a case detail with a conversation open, a backend `conversation:message-created` refetches the message list and nothing else.

## Implementation summary

- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_realtime_03_package_owned_handlers_cases_20260619.md`
- Archive record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_03_package_owned_handlers_cases_20260619_0843.md`
- Validation: `npx tsc -p packages/cases/tsconfig.json --noEmit` passed; `npm run typecheck` passed.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
