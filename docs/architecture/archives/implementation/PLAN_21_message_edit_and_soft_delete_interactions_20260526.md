# PLAN_21_message_edit_and_soft_delete_interactions_20260526

## Metadata

- Plan ID: `PLAN_21_message_edit_and_soft_delete_interactions_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T12:39:43Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Support editing and soft deleting case-conversation messages with mobile-friendly interactions.
- Business/user intent: Managers need lightweight correction tools without leaving the conversation.
- Non-goals: Full moderation permissions, rich-text edit parity.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-edit-case-message.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-delete-case-message.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseMessageActionsSheetPage.tsx`
  - updates to `use-case-conversation.controller.ts`
  - updates to `CaseMessageRow.tsx` and `CaseMessageBubble.tsx`
  - updates to `CaseBasicComposer.tsx`
- Out of scope:
  - Editing other users’ messages
  - Audit history UI
- Assumptions:
  - Current-user ownership is derived from `message.created_by.client_id === auth.user.id`.

## Clarifications required

_(none)_

## Acceptance criteria

1. Long-pressing or otherwise invoking the message action affordance opens a bottom sheet for eligible messages.
2. Only the current user’s messages expose edit/delete actions unless later permission work says otherwise.
3. Editing uses the backend edit endpoint and shows an edited indicator after success.
4. Delete uses the soft-delete endpoint and renders the deleted placeholder in the thread.
5. Cache updates or invalidation keep the thread consistent without requiring a full app refresh.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts` or add `case-message-actions.spec.ts`.
- Mock edit and delete endpoints separately so both success and failure paths can be asserted.
- Prefer explicit message action triggers in tests even if long-press exists; gesture-only coverage should be additive, not exclusive.

### Required test IDs

- `case-message-actions-trigger-<messageClientId>`
- `case-message-actions-sheet`
- `case-message-edit-button`
- `case-message-delete-button`
- `case-message-edited-indicator-<messageClientId>`

### Required scenarios

1. Own message opens the action sheet.
2. Editing updates the rendered bubble and shows the edited indicator.
3. Soft delete replaces the bubble content with the deleted placeholder.

### Runtime assertions

- Assert edit request body contains both `message_client_id` and the updated backend text block.
- Assert delete request uses the correct `DELETE` endpoint.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: cache reconciliation
- `architecture/08_hooks.md`: action hooks for edit/delete
- `architecture/28_surfaces.md`: message-actions sheet

### Local extensions loaded

- `architecture/28_surfaces_local.md`: use `sheet`
- `architecture/30_dynamic_loading_local.md`: use `lazyWithPreload`

### File read intent - pattern vs. relational

Permitted relational reads:
- backend handoff edit-message and delete-message contracts
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailMenuSheetPage.tsx` - confirm-action sheet flow

## Implementation plan

1. Add edit and delete action hooks.
2. Add a message-actions sheet surface.
3. Put the composer into edit mode when requested.
4. Update bubble rendering for edited and deleted states.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-edit-case-message.ts`
   - Wrap raw `editMessage`.
   - Initial edit mode stays plain-text only:
     - rebuild `content` as a single text block
     - rebuild `plain_text` from trimmed input
   - On success:
     - invalidate the message list query
     - keep enough return data to update edit mode and read state

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-delete-case-message.ts`
   - Wrap raw `deleteMessage`.
   - On success:
     - invalidate the conversation messages query
     - preserve the thread scroll position as much as possible by avoiding a full surface remount

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
   - Add `CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID`.
   - Add props:
     - `caseClientId: string`
     - `messageClientId: string`
     - `messageSeq: number`
     - `canEdit: boolean`
     - `canDelete: boolean`
   - Register a `sheet` page with `lazyWithPreload`.

4. `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseMessageActionsSheetPage.tsx`
   - Use `useSurfaceProps`.
   - Set a simple header title like `Message`.
   - Render edit and delete buttons conditionally from the passed props.
   - For delete, use a confirm-tap button or equivalent to prevent accidental destructive taps.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Add edit mode state:
     - `editingMessageId`
     - `editingDraftText`
     - `startEditing(message)`
     - `cancelEditing()`
     - `submitEdit()`
   - Add `openMessageActions(message)` which opens the sheet only for allowed messages.
   - Keep ownership checks in the controller, not in every row component.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`
   - Support two modes:
     - normal send mode
     - edit mode with save/cancel affordances
   - Edit mode should not silently discard the original draft; keep send draft and edit draft separate in controller state.

7. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageRow.tsx` and `CaseMessageBubble.tsx`
   - Add long-press or explicit overflow affordance that calls `openMessageActions`.
   - Render edited state when `has_been_edited === true` and `has_been_deleted === false`.
   - Deleted messages must keep their place in the list and show the deleted placeholder instead of disappearing.
