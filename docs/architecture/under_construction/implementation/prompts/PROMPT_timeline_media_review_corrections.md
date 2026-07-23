# Codex — Timeline/media review corrections: real layer-0 parity pin

You are implementing a small, test-only corrections plan produced by the Opus
review of the timeline/media work. Working directory: `frontend/` monorepo
root. No behavior changes — you are replacing a vacuous test with one that can
fail.

**Verify first — STOP and report if any fails:**
1. The slide-background-color plan is ARCHIVED:
   `PLAN_presentation_slide_background_color_20260723.md` exists in
   `docs/architecture/archives/implementation/` (it is editing
   `rendering-parity-fixture.ts` right now; running early corrupts both).
2. The tree is GREEN before you start: `npm run typecheck` exit 0,
   `npm run test:presentation-builder` and `npm run test:presentation-runtime`
   and `npm run test:presentations` all pass. If not, STOP — the red belongs
   to another session; report what you saw.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_review_corrections_20260723.md`
— written by the reviewer; follow its scope exactly.

The defect (verified by the reviewer — don't re-derive):
`packages/presentation-builder/src/preview/rendering-parity.test.tsx` renders
`SlideCompositionRenderer` twice with identical props and asserts the outputs
equal each other — tautological, pins nothing, and never reaches the player.
Real three-way parity flows through the shared
`rendering-parity-fixture.ts` (runtime + builder + `PresentationPlayer.parity.test.tsx`).
The legacy layer-0 media element was never added to that fixture. The file also
mounts two renderers without `afterEach(cleanup)`, leaking DOM into sibling
tests ("Found multiple elements").

## Deliver

1. Add a legacy layer-0 media element (old-wire shape: `layer_index: 0`,
   untimed defaults as published decks carry) to
   `rendering-parity-fixture.ts`.
2. Delete the self-comparison test; replace with concrete-output assertions
   (the same file's other test shows the pattern: pinned px positions,
   fontSize, colors). Ensure the fixture case flows through ALL THREE parity
   suites (runtime, builder preview, player).
3. Add `afterEach(cleanup)` (or scoped render helpers) so nothing leaks into
   sibling tests.
4. Run the three parity-touching suites and confirm the new assertions FAIL if
   you intentionally flip a pinned value (prove the test can fail — mention
   this check in your report), then restore.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime`
- `npm run test:presentation-builder`
- `npm run test:presentations`

## Finish

Run `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` for this plan
(summary → archive → review-log entry on the ARCHIVED timeline/media plan
noting the defect is closed). Clean-boundary rule: never stop before writing
code; if blocked, report precisely where.
