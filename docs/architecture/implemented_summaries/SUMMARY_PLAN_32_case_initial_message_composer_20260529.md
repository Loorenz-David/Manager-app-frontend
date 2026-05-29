# SUMMARY_PLAN_32_case_initial_message_composer_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_32_case_initial_message_composer_20260529`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T12:49:10Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_32_case_initial_message_composer_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Added `InitialMessageInputSchema` and `InitialMessageInput` in `@beyo/cases` types.
- Extended `CreateCaseInputSchema` with optional `initial_message` payload.
- Extended `CaseCreationFormProvider` context with composer state:
  - `composerContent`
  - `composerPlainText`
  - `setComposerContent(content, plainText)`
- Added new `CaseInitialMessageComposer` component:
  - Reuses `CaseComposerEditor` + `CaseComposerToolbar` stack.
  - Renders toolbar above input while focused.
  - Shows `Done` button to blur editor without form submit.
  - Includes mobile `visualViewport.resize` blur guard.
  - Writes content to provider state.
- Updated `CaseCreationFormContent`:
  - Renders `CaseInitialMessageComposer` below `CaseTypePickerTriggerField`.
  - On submit, trims content and conditionally includes `initial_message` only when meaningful.
  - Uses `generateClientId("CaseConversationMessage")` for `initial_message.client_id`.
  - Serializes content using `toBackendMessageContent` and `toBackendPlainText`.
  - Clears composer state only after successful case creation.
  - Preserves composer content on failed submission.
- Exported `CaseInitialMessageComposer` from package barrel for future placement changes (Option A/C).

## Files changed

- `packages/cases/src/types.ts`
- `packages/cases/src/providers/CaseCreationFormProvider.tsx`
- `packages/cases/src/components/CaseInitialMessageComposer.tsx` (new)
- `packages/cases/src/components/CaseCreationFormContent.tsx`
- `packages/cases/src/index.ts`

## Validation

- `npm run typecheck --workspace managerbeyo-app-workers` passed.
- `npm run typecheck --workspace managerbeyo-app-managers` passed.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_32_case_initial_message_composer_20260529_1249.md`
