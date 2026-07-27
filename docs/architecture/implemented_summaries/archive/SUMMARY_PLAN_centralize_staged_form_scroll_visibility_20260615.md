# SUMMARY_PLAN_centralize_staged_form_scroll_visibility_20260615

## Metadata

- Plan ID: `PLAN_centralize_staged_form_scroll_visibility_20260615`
- Status: `implemented`
- Implemented at (UTC): `2026-06-15T14:47:43Z`
- Implementation plan: `docs/architecture/archives/implementation/PLAN_centralize_staged_form_scroll_visibility_20260615.md`

## Summary

Centralized the manager app's staged-form and scroll-visibility primitive subtrees on `@beyo/ui`
while preserving existing manager import paths through thin compatibility re-export files.

## Changes

- Ported the shipped manager staged-form behavior into `packages/ui`:
  - timeline remains in normal document flow;
  - timeline collapse/expand uses `ResizeObserver` scroll compensation;
  - timeline uses grid-row height animation and progress-bar margin animation;
  - navigation keeps the first-step close-button feature and `text-md` button sizing;
  - `enableKeyboardAccessory` remains supported through `KeyboardAccessoryBar`.
- Added shared exports for compatibility paths:
  - raw `ScrollVisibilityContext`;
  - `useScrollState`;
  - staged-form context, navigation, timeline, and variant helpers.
- Replaced manager-local `scroll-visibility/` and `staged-form/` implementation files with
  re-export shims to `@beyo/ui`.
- Replaced local staged-form type definitions with re-exported `@beyo/lib` staged-form types.

### Beyond original plan scope (mid-flight additions)

- Extended the shared scroll-visibility API with asymmetric relative-mode thresholds
  `hideThreshold` / `showThreshold` (each falling back to `threshold`), alongside the existing
  `mode` / `inverted`. Backward-compatible — absolute-mode and threshold-only callers are unchanged.
- Added a new consumer: `pages/tasks/TaskDetailSlidePage.tsx` now uses
  `useScrollVisibility({ mode: "relative", hideThreshold: 16, showThreshold: 8 })` (imported from
  `@beyo/ui`) to drive its header hide/show.
- Documented `hideThreshold` / `showThreshold` in `architecture/36_scroll_visibility.md`.
- Note: the working tree for this change also contains unrelated feature edits (search bar,
  upholstery fields, sheet pages, etc.) that should be committed separately from the centralization.

## Validation

- `npm run typecheck` passed.

## Notes

- Existing manager imports remain valid, including deep paths such as
  `@/components/primitives/scroll-visibility/ScrollVisibilityContext` and
  `@/components/primitives/staged-form/StagedFormNavigation`.
- No query/action/domain contracts were changed.
