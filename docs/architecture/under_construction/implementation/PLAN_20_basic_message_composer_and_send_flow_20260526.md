# PLAN_20_basic_message_composer_and_send_flow_20260526

## Metadata

- Plan ID: `PLAN_20_basic_message_composer_and_send_flow_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Add a stable plain-text composer fixed to the bottom of the conversation and wire the initial send flow.
- Business/user intent: Users must be able to hold a basic conversation before the richer composer layers are introduced.
- Non-goals: Rich formatting, mentions authoring, image attachments.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-send-case-message.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`
  - updates to `use-case-conversation.controller.ts`
  - updates to `use-case-conversation-messages.controller.ts`
  - updates to `CaseConversationSlideView.tsx`
- Out of scope:
  - Rich text
  - Edit/delete
  - Image upload
- Assumptions:
  - `conversation_client_id` is available from case detail.
  - Backend message ordering is authoritative, so the first implementation should favor correctness over aggressive optimistic reconciliation.

## Clarifications required

_(none)_

## Acceptance criteria

1. A fixed bottom composer renders inside the conversation slide with safe-area padding.
2. Empty or whitespace-only drafts cannot be sent.
3. Sending a plain message posts:
   - `content: [{ type: "text", text: "..." }]`
   - `plain_text: "..."`
4. After successful send, the draft clears and the list scrolls to the bottom.
5. Failure leaves the draft recoverable and exposes a retry path.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`.
- Mock the send endpoint and the refetched conversation page after success.
- Use mobile project first because keyboard and fixed composer behavior matter here.

### Required test IDs

- `case-composer`
- `case-composer-textarea`
- `case-composer-send-button`
- `case-composer-error`

### Required scenarios

1. Empty draft keeps send disabled.
2. Typing enables send.
3. Sending posts one text block and the message appears in the thread after success.
4. Draft clears after success.
5. On mocked failure, the draft remains and the error state is visible.

### Runtime assertions

- Assert request body shape for `content` and `plain_text`.
- Assert no layout overlap between the fixed composer and the last visible message row.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: mutation invalidation rules
- `architecture/08_hooks.md`: send-message action hook
- `architecture/14_styling.md`: fixed composer styling with tokens

### File read intent - pattern vs. relational

Permitted relational reads:
- backend handoff send-message contract
- `apps/managers-app/ManagerBeyo-app-managers/package.json` - confirms `react-textarea-autosize` is installed
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts` - correct message client ID generator prefix

## Implementation plan

1. Create the send-message action hook.
2. Add draft state and send orchestration to the conversation controller.
3. Render a mobile-safe basic composer with `react-textarea-autosize`.
4. Connect send success to scroll-bottom and future read-position updates.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-send-case-message.ts`
   - Wrap raw `sendMessage`.
   - Always generate a `client_id` with `generateClientId('CaseConversationMessage')`, even for plain-text sends.
   - First implementation should be pessimistic:
     - do not inject a synthetic optimistic message row yet
     - invalidate/refetch the conversation messages on success
   - Return:
     - `sendCaseMessage`
     - `sendCaseMessageAsync`
     - `isPending`
     - `error`
     - `reset`

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Add composer state:
     - `draftText`
     - `setDraftText`
     - `isSending`
     - `sendError`
     - `sendDraft`
   - `sendDraft` responsibilities:
     - trim text for validation
     - keep original draft until success
     - build `content` array with one text block
     - build `plain_text` from the trimmed text
     - require `conversation_client_id`; if missing, no-op and expose a stable error state
   - On success:
     - clear draft
     - call message-controller `scrollToBottom()`
     - call PLAN_19's already-implemented `requestMarkRead(createdMessage.message_seq)` from `useCaseConversationController`
   - On failure:
     - preserve the draft text
     - expose retry by allowing `sendDraft` to be called again with unchanged draft

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`
   - Use `react-textarea-autosize`.
   - Read all values from `useCaseConversationContext()`.
   - Layout:
     - fixed bottom dock
     - `bg-background`
     - top border
     - bottom padding using `var(--safe-bottom)`
   - Controls:
     - text area
     - send button
   - Disable send when:
     - `draftText.trim().length === 0`
     - `isSending === true`
   - Add `data-testid` values for textarea and send button.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
   - Render `CaseBasicComposer` beneath the virtualized message area.
   - Increase bottom content padding so the last message never hides behind the composer.
   - Keep the header and banner fixed.

5. Keyboard behavior baseline
   - Prefer simple stable behavior in this plan:
     - no custom keyboard observer
     - no animated toolbar stacking
   - The message list only needs enough bottom padding for the fixed composer and safe area.
