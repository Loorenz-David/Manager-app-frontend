# PLAN_24_composer_styling_toolbar_and_inline_style_toggles_20260526

## Metadata

- Plan ID: `PLAN_24_composer_styling_toolbar_and_inline_style_toggles_20260526`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T17:04:21Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Add visible style controls above the composer for chat-style formatting toggles.
- Business/user intent: The composer should feel expressive and social without becoming a heavy document editor.
- Non-goals: Bottom-sheet color flow, final mentions picker, backend persistence of unsupported styling semantics.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerToolbar.tsx`
  - updates to `CaseRichComposer.tsx`
  - updates to `CaseComposerEditor.tsx`
  - updates to `case-lexical-serialization.ts`
- Out of scope:
  - Custom keyboard
  - Voice attachments
- Assumptions:
  - PLAN_23 established a Lexical-backed composer and app-owned content adapter.

## Clarifications required

_(none)_

## Acceptance criteria

1. Toolbar buttons exist for `Bold`, `Underline`, `Big`, `Small`, `Color`, `Shake`, `Pulse`, and `Mention`.
2. Active styles show an active state.
3. Tapping an active toggle removes that style.
4. If no range selection exists, the behavior is deterministic and documented.
5. Style semantics remain app-owned; unsupported persisted styles degrade safely when sent to the current backend.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`.
- Do not over-assert styling internals; validate user-visible active state and continued typing/send behavior.

### Required test IDs

- `case-composer-toolbar`
- `case-composer-toolbar-bold`
- `case-composer-toolbar-underline`
- `case-composer-toolbar-big`
- `case-composer-toolbar-small`
- `case-composer-toolbar-color`
- `case-composer-toolbar-shake`
- `case-composer-toolbar-pulse`
- `case-composer-toolbar-mention`

### Required scenarios

1. Toolbar buttons render and can be toggled.
2. Active toggles visibly switch state on and off.
3. After toggling styles, typing still works and send still succeeds.

### Runtime assertions

- Assert the active-state DOM contract, not low-level editor implementation details.
- If collapsed-selection fallback is user-visible, assert the documented behavior rather than an unstated ideal.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: toolbar is a feature component
- `architecture/14_styling.md`: token-based button states
- PLAN_22 / PLAN_23: app-owned content semantics and editor serialization boundary

### File read intent - pattern vs. relational

Permitted relational reads:
- none beyond the new cases composer files; there is no existing toolbar pattern for this exact feature.

## Implementation plan

1. Add a dedicated toolbar component above the rich composer.
2. Expose style-toggle commands from the editor layer.
3. Define deterministic collapsed-selection fallback behavior.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerToolbar.tsx`
   - Render the eight visible actions as compact pill or icon buttons.
   - Keep this component dumb:
     - receives state and callbacks from the rich-composer/editor layer
     - does not parse Lexical state itself
   - Add `data-testid` hooks per action.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`
   - Expose toolbar command helpers:
     - `toggleBold`
     - `toggleUnderline`
     - `toggleBig`
     - `toggleSmall`
     - `openColorPicker`
     - `toggleShake`
     - `togglePulse`
     - `openMentionPicker`
   - Expose current active-style state for the current selection.

3. Collapsed-selection fallback behavior
   - Preferred behavior:
     - if there is a reliable current-word selection helper, apply style to the current or previous word
   - Required fallback if reliability is poor on mobile:
     - treat the toggle as an active insertion style for subsequent typing only
   - Document which behavior was chosen in code comments and keep it consistent across all style buttons.

4. Unsupported persistence note
   - `Color`, `Shake`, `Pulse`, `Big`, and `Small` may exist in the app-owned composer state before the backend can persist them.
   - The serializer must collapse them to backend-safe text blocks until the backend contract grows.
   - Do not invent hidden persistence channels or stash raw Lexical JSON in the message DTO.

5. One-shot animation affordance
   - On selecting `Shake` or `Pulse`, play a small local one-shot preview on the toolbar control or editor preview only.
   - Do not create infinite animation loops in the composer chrome.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`
   - Mount the toolbar above the editor surface.
   - Ensure the toolbar remains visible when the composer is focused and the keyboard is open.
