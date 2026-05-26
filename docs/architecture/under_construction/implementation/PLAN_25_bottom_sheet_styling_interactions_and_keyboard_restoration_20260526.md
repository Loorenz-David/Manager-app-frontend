# PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526

## Metadata

- Plan ID: `PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Handle style options that require a bottom sheet, starting with color, while restoring focus, keyboard, and selection reliably.
- Business/user intent: Picking a style from a sheet should feel native on iPhone and Android instead of breaking the typing flow.
- Non-goals: Custom keyboard implementation, voice-message composer.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseComposerColorSheetPage.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseColorPalette.tsx`
  - updates to `CaseComposerEditor.tsx`
  - updates to `CaseRichComposer.tsx`
  - updates to `use-case-conversation.controller.ts` if controller state is needed for sheet orchestration
- Out of scope:
  - Additional sheet-backed style tools beyond color in this plan
  - Custom keyboard rows
- Assumptions:
  - PLAN_24 already introduced toolbar action entry points.

## Clarifications required

_(none)_

## Acceptance criteria

1. Tapping the color control opens a bottom sheet.
2. The current Lexical selection/caret is preserved before opening the sheet.
3. Opening the sheet dismisses the keyboard.
4. Choosing a color closes the sheet, restores focus, reopens the keyboard, and reapplies the selection at the prior position.
5. The behavior is documented with iPhone/Android reliability notes and avoids hidden one-off hacks spread through the UI tree.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`.
- This is a mobile-first runtime check; run `--project=mobile` before desktop.
- Use the existing sheet helper patterns where useful, but assert the editor can keep functioning after the sheet closes.

### Required test IDs

- `case-composer-color-sheet`
- `case-composer-color-option-<token>`

### Required scenarios

1. Tapping the color toolbar control opens the sheet.
2. Selecting a color closes the sheet.
3. After the sheet closes, the editor regains focus and further typing works.

### Runtime assertions

- Assert focus restoration indirectly by typing additional text after selection and verifying it appears in the editor.
- Assert no keyboard/focus-related console errors during the flow.

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md`: bottom-sheet registration
- `architecture/30_dynamic_loading.md`: lazy-loaded sheet page
- `architecture/33_vaul_drawer.md`: sheet/keyboard interaction expectations

### Local extensions loaded

- `architecture/28_surfaces_local.md`: app uses `sheet`
- `architecture/30_dynamic_loading_local.md`: use `lazyWithPreload`

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/BottomSheetSurface.tsx` - close timing and Vaul semantics

## Implementation plan

1. Add a dedicated color-picker sheet surface.
2. Centralize selection snapshot/restore logic at the editor boundary.
3. Re-focus the editor after sheet close using one controlled restoration path.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
   - Add `CASE_COMPOSER_COLOR_SHEET_SURFACE_ID = 'case-composer-color-sheet'`.
   - Add props containing the currently selected color if needed for initial highlighting.
   - Register as a `sheet` with `lazyWithPreload`.

2. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`
   - Add explicit editor-bound helpers:
     - `captureSelectionSnapshot()`
     - `restoreSelectionSnapshot()`
     - `focusEditor()`
     - `applyColor(colorToken)`
   - Keep the snapshot representation editor-internal; other layers should treat it as opaque.
   - The editor component should own the only code that talks directly to Lexical selection APIs.

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`
   - Before opening the color sheet:
     - capture the selection snapshot
     - blur the editor so the keyboard can dismiss cleanly
   - After color selection:
     - close the sheet
     - restore selection
     - re-focus editor
     - re-open keyboard
   - Keep the sequence in one orchestrator callback so it is debuggable.

4. `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseComposerColorSheetPage.tsx`
   - Set a simple title such as `Color`.
   - Render a lightweight palette using feature-owned color choices, not arbitrary CSS free entry.
   - Emit a chosen token/value back through surface props callbacks or controller methods.

5. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseColorPalette.tsx`
   - Present a mobile-friendly palette grid/list.
   - Highlight the active selection.
   - Keep color semantics app-owned; the serializer still decides how unsupported persistence degrades.

6. Mobile reliability notes to encode in the plan implementation
   - iPhone Safari may require a `requestAnimationFrame` or short timeout between sheet close and `focusEditor()`.
   - Android may require avoiding synchronous focus during the same close tick.
   - Keep these timing shims local to the composer-sheet bridge, not scattered across components.
