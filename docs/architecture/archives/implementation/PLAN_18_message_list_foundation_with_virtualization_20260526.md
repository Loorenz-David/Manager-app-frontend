# PLAN_18_message_list_foundation_with_virtualization_20260526

## Metadata

- Plan ID: `PLAN_18_message_list_foundation_with_virtualization_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T08:44:05Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Build the conversation message list on top of `react-virtuoso`, including pagination, date separators, alignment, avatars, and deleted-message rendering.
- Business/user intent: The conversation should already behave like a real chat thread before the composer lands.
- Non-goals: Read/unread mutation behavior, rich composer, mentions authoring.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-conversation-messages.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageRow.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageDateSeparator.tsx`
  - updates to `CaseConversationSlideView.tsx` and `CaseConversationProvider.tsx`
- Out of scope:
  - Message editing
  - Composer
  - Read receipts
- Assumptions:
  - Use the enriched `GET /api/v1/cases/{case_client_id}` pages for message rendering because `list-messages` lacks `created_by`, `images`, and `mentions`.

## Clarifications required

_(none)_

## Acceptance criteria

1. Messages render in chronological order with centered date separators.
2. Current-user messages align right and use `bg-primary`; other-user messages align left and use `bg-card`.
3. Avatars/profile pictures render for non-current-user messages.
4. Soft-deleted messages render a deleted placeholder instead of empty space.
5. Reaching the top loads older messages using `before_message_seq`, `messages_limit`, `has_more`, and `next_before_message_seq`.
6. Prepending older messages preserves the user’s visual scroll position.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts`.
- Mock paginated `GET /api/v1/cases/:id` responses with two or more message pages.
- Validate browser behavior through scroll and DOM updates, not through unit-style message-array inspection.

### Required test IDs

- `case-message-list`
- `case-message-row-<messageClientId>`
- `case-message-bubble-<messageClientId>`
- `case-message-date-separator-<key>`
- `case-message-deleted-placeholder-<messageClientId>`

### Required scenarios

1. Messages render in the thread with separators and own/other alignment.
2. Deleted message renders a placeholder.
3. Scrolling to the top loads older messages.
4. After older messages prepend, the viewport anchor is preserved closely enough that the user does not jump to a different part of the thread.

### Runtime assertions

- Assert the second page network request includes the correct pagination query param.
- Assert the previously visible anchor message remains visible after prepend.
- Run this spec in mobile and desktop once mobile passes, because virtualization and scroll behavior can differ.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: server-state and pagination hook rules
- `architecture/07_components.md`: list row and bubble component boundaries
- `architecture/08_hooks.md`: controller aggregation
- `architecture/18_performance.md`: virtualization and render restraint
- `architecture/24_dto.md`: view-model shaping

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/store/auth.store.ts` - current user identity source
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md` - exact message page fields and pagination semantics

There is no existing `react-virtuoso` usage in this app, so do not hunt for a local pattern that does not exist.

## Implementation plan

1. Create an infinite-query-style hook over the paginated `get-case` endpoint.
2. Flatten messages into render items with explicit date-separator items.
3. Render with Virtuoso and preserve scroll anchor when older pages prepend.
4. Feed scroll callbacks back into PLAN_17 banner-collapse logic.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-conversation-messages.ts`
   - Use `useInfiniteQuery`.
   - Query function calls raw `getCase(caseClientId, { before_message_seq, messages_limit })`.
   - Page param should be `before_message_seq | null`.
   - `getNextPageParam` returns `messages_pagination.next_before_message_seq` only when `has_more === true`.
   - Use `initialData` seeded from the already-loaded detail query when present to avoid a duplicate first fetch.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`
   - Read current user ID from `useAuthStore(selectUser)?.id`.
   - Produce:
     - `items` as a flat list of render items (`date-separator` or `message`)
     - `hasOlderPages`
     - `loadOlder`
     - `isLoadingOlder`
     - `scrollToBottom`
     - `handleListScroll`
   - Keep `message_seq` on every message item for later read/unread and edit actions.
   - Derive `isOwnMessage` in the controller, not inline in JSX.

3. Item modeling
   - Define a local render-item type in the controller or a small feature-local file:
     - `CaseMessageRenderItem = { kind: 'date-separator'; key; label } | { kind: 'message'; key; message; isOwnMessage }`
   - Insert a separator whenever the local calendar day changes between adjacent messages.
   - Time labels inside message rows should use a compact local time formatter.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`
   - Render `Virtuoso`.
   - Use the controller’s `items`.
   - Hook top reach to `loadOlder`.
   - Preserve scroll position on prepend by managing `firstItemIndex` or the equivalent supported prepend strategy; document the chosen approach in code comments because this is non-obvious.
   - Forward scroll position into both:
     - PLAN_17 banner state
     - future PLAN_19 read-visibility logic

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageRow.tsx`
   - Branch only on render-item kind.
   - `date-separator` rows render centered, muted chips.
   - Message rows render:
     - left/right layout
     - avatar for other users
     - bubble container
     - bottom-right time label

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`
   - Initial renderer in this plan handles:
     - text-only `plain_text`
     - deleted placeholder when `has_been_deleted`
   - Reserve a child content slot so PLAN_22 can later replace the inner content renderer without changing row layout.
   - Use `bg-primary text-card` for own messages and `bg-card text-foreground` for others.

7. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageDateSeparator.tsx`
   - Keep this separate from row logic so later styling changes do not touch the virtualization list glue.

8. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
   - Replace the placeholder body with `CaseMessageList`.
   - Keep the fixed header and banner from PLAN_15/17.
   - Leave bottom padding for the future composer even if it is only static spacing in this plan.
