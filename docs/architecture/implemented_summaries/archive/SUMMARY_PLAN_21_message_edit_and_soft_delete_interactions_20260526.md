# SUMMARY_PLAN_21_message_edit_and_soft_delete_interactions_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_21_message_edit_and_soft_delete_interactions_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T12:39:43Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_21_message_edit_and_soft_delete_interactions_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added dedicated case-message edit and soft-delete action hooks that wrap the backend endpoints and invalidate the case detail, conversation pages, and case lists so the thread stays consistent after mutations.
- Added a new case message actions bottom sheet surface with conditional edit/delete actions, including confirm-tap delete protection and stable test IDs for runtime validation.
- Extended the case conversation controller and basic composer with explicit edit-mode state, separate send-vs-edit drafts, save/cancel affordances, and edit-submit orchestration without discarding the in-progress send draft.
- Updated conversation message rows and bubbles to expose an own-message action trigger, show edited indicators, and keep soft-deleted placeholders in-place in the thread.
- Extended the case composer Playwright coverage to validate the action sheet, edit request body, edited rendering, send-draft preservation, and soft-delete placeholder behavior on both mobile and desktop.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-edit-case-message.ts`: added the edit-message mutation hook and case-query invalidation flow.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-delete-case-message.ts`: added the soft-delete mutation hook and conversation-query invalidation flow.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: added edit-mode orchestration, message-actions opening, edit-submit handling, and soft-delete integration.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`: added edit/save/cancel composer mode while preserving the separate send draft.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageRow.tsx`: added the own-message action trigger and edited indicator rendering.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`: refined deleted-message bubble rendering for soft-deleted placeholders.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`: registered the new message-actions sheet surface and props.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseMessageActionsSheetPage.tsx`: implemented the sheet UI and edit/delete actions.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/case-message-edit-events.ts`: added the sheet-to-controller edit handoff event.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new case action hooks and message-actions surface ids/types.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`: added the message-actions, edit, and soft-delete runtime scenarios plus endpoint mocks.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 21 linkage and progress note.

## Contract adherence

- `architecture/05_server_state.md`: kept write operations inside dedicated mutation hooks and invalidated the authoritative case-detail and conversation-page queries after edit/delete.
- `architecture/08_hooks.md`: preserved feature-owned action hooks and controller-owned permission/orchestration logic instead of pushing mutation logic into row components.
- `architecture/28_surfaces.md`: added the message-actions interaction as a feature sheet surface rather than embedding ad hoc modal logic into the thread UI.
- `architecture/34_runtime_validation.md`: extended the existing Playwright conversation coverage with explicit edit/delete endpoint and rendering assertions.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/case-composer.spec.ts --project=mobile`: pass
- `npx playwright test tests/playwright/features/cases/case-composer.spec.ts --project=desktop`: pass
- `npm run test`: not run

## Known gaps or deferred items

- Message actions are still limited to the current user’s own non-deleted messages; broader moderation/permission variants remain future work.
- Edit mode still rebuilds the backend payload as a single plain-text block and does not attempt rich-content block parity yet.
- The thread exposes an explicit action affordance for now; gesture-only long-press coverage can be added later without changing the controller contract.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_21_message_edit_and_soft_delete_interactions_20260526.md`
