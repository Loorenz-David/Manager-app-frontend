# PLAN_19_message_read_unread_integration_20260526

## Metadata

- Plan ID: `PLAN_19_message_read_unread_integration_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Connect conversation visibility to the backend read-position model and keep cases-page unread badges in sync.
- Business/user intent: Opening and reading a case should clear unread counts reliably without spamming the backend.
- Non-goals: Read receipts UI beyond the backend-aligned unread state.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-participants.ts` if missing from PLAN_13
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-participants.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-mark-case-read.ts`
  - updates to `use-case-conversation.controller.ts`
  - updates to `use-case-conversation-messages.controller.ts`
  - updates to `use-unread-counts.ts` and cases-page invalidation points where needed
- Out of scope:
  - Seen indicators on individual bubbles
  - Push notifications
- Assumptions:
  - Participant rows are the source of truth for `last_read_message_seq`.
  - Case detail itself does not include the current participant row.

## Clarifications required

_(none)_

## Acceptance criteria

1. The controller can resolve the current user’s participant row for a case.
2. Read position is advanced when:
   - the conversation opens and the newest message is already visible
   - the newest message becomes visible while scrolling
   - a new message is successfully sent
3. Unread count badges on the cases page refresh after read-position changes.
4. Duplicate read calls are suppressed when the same or lower message sequence has already been acknowledged.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts`.
- Mock participants and unread-count endpoints.
- Assert read behavior through network requests and badge DOM updates, not through internal refs or counters.

### Required test IDs

- `case-card-unread-badge-<caseClientId>`
- `case-message-list`

### Required scenarios

1. Opening a conversation with the latest message visible triggers one mark-read request.
2. Returning to the cases list refreshes or reflects the cleared unread badge state.
3. Re-scrolling without a newer latest message does not spam duplicate mark-read calls.

### Runtime assertions

- Assert `POST /api/v1/cases/messages/mark-read` payload includes the resolved participant ID and highest visible message sequence.
- Assert unread badge count changes in the DOM after the read flow completes.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: invalidation and cache updates
- `architecture/08_hooks.md`: action hook lifecycle
- `architecture/23_providers.md`: keep read logic inside controllers/actions

### File read intent - pattern vs. relational

Permitted relational reads:
- backend handoff participant and mark-read endpoints
- `apps/managers-app/ManagerBeyo-app-managers/src/store/auth.store.ts` - current user lookup
- the existing cases unread-count query hook from PLAN_14

## Implementation plan

1. Add the missing participants query layer.
2. Create a monotonic mark-read action hook.
3. Extend the conversation/message controllers with visibility-driven read tracking.
4. Refresh unread counts and list badges from authoritative server state.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-participants.ts` and `use-case-participants.ts`
   - Add these if PLAN_13 did not already include them.
   - Parse `data.participants`.
   - Expose `useCaseParticipantsQuery(caseClientId)`.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-mark-case-read.ts`
   - Wrap raw `markRead`.
   - Inputs:
     - `caseParticipantClientId`
     - `upToMessageSeq`
     - `caseClientId`
   - On success:
     - invalidate participants for that case
     - invalidate unread counts
     - optionally patch the detail cache if the current detail view stores a local participant summary

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Query participants and resolve `currentParticipant` by matching `participant.user_id` against `useAuthStore(selectUser)?.id`.
   - Expose:
     - `currentParticipant`
     - `lastReadMessageSeq`
     - `requestMarkRead(upToMessageSeq: number)`
   - Maintain a `lastRequestedReadSeqRef` so the controller never submits the same or lower sequence twice in one session.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`
   - Track whether the latest message is currently visible.
   - Call `requestMarkRead(latestMessageSeq)` when:
     - initial render already shows the latest row
     - the user scrolls to a state where the latest row becomes visible
   - Keep this logic tolerant of empty conversations.

5. Send-flow integration
   - PLAN_20 must call `requestMarkRead(createdMessage.message_seq)` after successful send.
   - Document this dependency in both plans so the implementing agent does not forget the cross-step connection.

6. Cases page invalidation
   - Ensure all read-position successes invalidate `caseKeys.unreadCounts()`.
   - If the cases page caches unread badges separately inside controller state, remove that duplication and rely on TanStack Query.
