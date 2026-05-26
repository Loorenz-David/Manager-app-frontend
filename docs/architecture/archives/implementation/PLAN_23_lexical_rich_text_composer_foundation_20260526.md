# PLAN_23_lexical_rich_text_composer_foundation_20260526

## Metadata

- Plan ID: `PLAN_23_lexical_rich_text_composer_foundation_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T16:49:36Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Replace or extend the basic composer with a Lexical-backed editor while keeping backend DTO independence intact.
- Business/user intent: The conversation should start feeling like a modern chat composer without forcing the app to persist editor internals.
- Non-goals: Full styling toolbar, bottom-sheet style controls, image attachments.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/case-lexical-serialization.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/config.ts`
  - updates to `use-case-conversation.controller.ts`
  - updates to `CaseConversationSlideView.tsx`
- Out of scope:
  - Final toolbar UX
  - Color bottom sheet
  - Mentions picker
- Assumptions:
  - Backend persistence still uses the PLAN_22 adapter output, not editor JSON.

## Clarifications required

_(none)_

## Acceptance criteria

1. The composer can run in a Lexical-backed mode without changing the backend contract.
2. Plain-text extraction is available for send validation and the backend `plain_text` field.
3. Initial formatting support exists for bold, underline, big text, and small text at the editor layer.
4. If rich mode is disabled or unstable, the feature can fall back cleanly to the PLAN_20 basic composer.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`.
- Run mobile first; editor focus/input behavior often fails in the browser even when TypeScript is clean.
- Mock send and validate that the outgoing payload still uses backend-compatible blocks, not Lexical JSON.

### Required test IDs

- `case-rich-composer`
- `case-rich-composer-editor`
- `case-composer-send-button`

### Required scenarios

1. Rich composer mounts and accepts typing.
2. Sending from rich composer succeeds and appends the message to the thread.
3. Feature fallback mode still works if configured back to basic composer.

### Runtime assertions

- Assert the send request body does not contain raw Lexical JSON.
- Assert focus remains in the editor after normal typing interactions.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: controller owns editor-mode selection
- `architecture/30_dynamic_loading.md`: heavy-library boundary awareness
- `architecture/24_dto.md`: adapter path remains DTO-driven

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/package.json` - confirms Lexical packages are installed
- PLAN_22 output types - app-owned content contract

There is no existing Lexical integration in this repo; treat this as a new feature foundation rather than searching for hidden local precedent.

## Implementation plan

1. Add a feature-level composer mode switch so the basic composer remains a fallback.
2. Set up Lexical editor wiring and serialization into app-owned message content.
3. Keep send flow unchanged except for consuming serialized app content instead of a raw textarea string.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/config.ts`
   - Add an explicit feature-level flag or mode selector such as `CASE_COMPOSER_MODE = 'basic' | 'rich'`.
   - Default to the safer mode until the rich path is verified.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/case-lexical-serialization.ts`
   - Export helpers that convert editor state to:
     - `CaseMessageContent`
     - backend-compatible blocks via the PLAN_22 adapter
     - `plain_text`
   - Supported initial semantics:
     - bold
     - underline
     - big
     - small
   - Do not expose raw Lexical JSON beyond this file boundary.

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`
   - Own the `LexicalComposer` setup and the editable surface.
   - Keep the UI minimal and chat-like:
     - no heavy document chrome
     - no full-page editor affordances
   - Expose controlled callbacks upward for:
     - content changed
     - plain text changed
     - focus/blur if needed

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`
   - Wrap the editor surface in the existing bottom-dock layout.
   - Reuse the send button behavior from PLAN_20.
   - The send path must call:
     - `toBackendMessageContent`
     - `toBackendPlainText`
   - If serialization yields no meaningful text and no supported blocks, disable send.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Replace `draftText`-only state with a composer abstraction:
     - plain text
     - app-owned content
     - current composer mode
   - Keep the raw send action backend contract unchanged.
   - Leave PLAN_20 basic-composer code path available as fallback.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`
   - Switch between `CaseBasicComposer` and `CaseRichComposer` from the feature config.
   - Do not branch on this in many files; keep the mode switch close to the page layout or controller boundary.
