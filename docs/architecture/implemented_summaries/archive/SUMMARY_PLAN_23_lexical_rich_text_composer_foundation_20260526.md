# SUMMARY_PLAN_23_lexical_rich_text_composer_foundation_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_23_lexical_rich_text_composer_foundation_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T16:49:36Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_23_lexical_rich_text_composer_foundation_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a feature-owned composer mode selector so the case conversation can switch between the existing basic composer and a Lexical-backed rich composer without changing the backend DTO contract.
- Added Lexical editor wiring plus a dedicated serialization boundary that converts editor state into app-owned `CaseMessageContent`, backend-compatible message blocks, and backend-safe plain text while preserving bold, underline, large-text, and small-text marks inside the app layer.
- Added a rich composer shell that keeps the existing bottom-docked chat layout, edit/retry/send flows, and send-button semantics while loading the Lexical editor behind a dedicated rich-composer boundary.
- Refactored the conversation controller and edit mutation path so both composer modes share the same app-owned draft abstraction, and outgoing send/edit requests serialize through the PLAN 22 adapter instead of relying on raw textarea strings.
- Extended the case composer Playwright spec to cover the rich composer by default and the basic fallback mode through the new composer-mode override.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/config.ts`: added the feature composer-mode selector, default rich mode, and a localStorage override for runtime fallback validation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/case-lexical-serialization.ts`: added Lexical-to-app serialization, editor initialization/reset helpers, backend serialization helpers, formatting shortcuts, meaningful-content detection, and outgoing trim normalization.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`: added the Lexical composer surface, content sync bridge, controlled change callbacks, and minimal rich-text editor shell.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`: added the rich composer dock, lazy editor loading boundary, and shared send/edit/retry controls.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: replaced the draft-text-only model with a composer abstraction that stores app-owned content plus plain text and serializes send/edit requests through the DTO adapter.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-edit-case-message.ts`: updated the edit mutation input shape to accept pre-serialized backend blocks and plain text from the controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: switched the conversation footer to branch between the basic and rich composer at the page boundary.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`: added rich-composer selectors/helpers, rich-mode coverage, and a basic fallback regression check.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 23 linkage and progress note.

## Contract adherence

- `architecture/08_hooks.md`: kept the composer-mode decision and draft orchestration inside the controller so components remain view-only.
- `architecture/24_dto.md`: preserved the backend contract boundary by keeping Lexical state inside the editor/serialization layer and sending only backend-compatible DTO blocks plus `plain_text`.
- `architecture/30_dynamic_loading.md`: kept the heavy rich-editor dependency behind a dedicated lazy editor boundary instead of leaking it across the broader cases surface.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/case-composer.spec.ts --project=mobile`: pass

## Known gaps or deferred items

- The rich composer currently exposes formatting through editor-layer shortcuts and serialization support, but not through the later toolbar UX planned in PLAN 24.
- Unsupported backend rich semantics still degrade through the PLAN 22 adapter, so persisted payloads remain block-based rather than editor-native.
- Mention authoring, color controls, and image attachments remain deferred to the follow-on composer plans.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_23_lexical_rich_text_composer_foundation_20260526.md`
