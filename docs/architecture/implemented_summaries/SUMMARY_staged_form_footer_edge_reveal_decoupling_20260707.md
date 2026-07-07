# SUMMARY_staged_form_footer_edge_reveal_decoupling_20260707

## Metadata

- Summary ID: `SUMMARY_staged_form_footer_edge_reveal_decoupling_20260707`
- Source plan: `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md`
- Implemented at (UTC): `2026-07-07T08:40:56Z`

## Implementation summary

- Split relative-mode scroll tracking into separate core and footer channels in `useScrollState()`, so the header and timeline keep using the base direction-only signal while the footer gets its own edge-aware progress signal and `isAtEdge` state.
- Extended `useScrollProgressCssVar()` to animate an optional second CSS custom property, `--scroll-hide-progress-footer`, including shared lerp, snap, and touch-interrupt handling so the footer reveal remains smooth during active drag.
- Updated `useScrollVisibility()` and `StagedForm` to consume the footer-specific signal, keep footer pointer-events/context visibility edge-aware, and leave header/timeline compaction untouched.
- Rewrote the `use-scroll-state` regression tests around the decoupled footer channel semantics and clarified `architecture/36_scroll_visibility.md` to document that edge reveal is footer/navigation only.
- Expanded `packages/tasks/src/types.ts` so `TaskState` matches the broader state set already used elsewhere in the workspace, resolving pre-existing `npm run typecheck` failures unrelated to the staged-form change.

## Verification

- `npm run typecheck`: passed.
- `npx vitest run --environment jsdom packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts`: passed.

## Notes

- Playwright coverage was not run in this pass.
