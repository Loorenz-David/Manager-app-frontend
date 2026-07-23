# Codex — Timeline/Media Stage C: media canvas resize + transitions

You are implementing **Stage C only** (the final stage) of an approved
corrections plan, working in the `frontend/` monorepo root.

**Verify first — STOP and report if any fails:**
1. Stage B's Review-log line exists in the plan (unified media tracks landed)
   and `rg "appendMediaElement" packages/presentation-builder/src/editor/draft-store.ts`
   is non-empty.
2. The Stage-C kit is pre-built (kit files are READ-ONLY for you):
   `rg "onResize" packages/presentation-builder/src/components/editor/CanvasDraggableBox.tsx`
   and `rg "appears" packages/presentation-builder/src/components/panels/MediaElementPanel.tsx`
   are both non-empty.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_corrections_20260723.md`
— Stage C steps 9–11, close-out step 12, acceptance criteria 3, 4, 7, and the
"Resize behavior" clarification resolution recorded in the plan.

Key facts (already verified — don't re-derive): the wire format, mapping
(`editorAnimationToWire`, both media branches), and runtime renderer already
support enter/exit animations and layout on media elements — no runtime package
changes. The kit emits raw resize gestures
(`onResize({handle, deltaXFraction, deltaYFraction})`, unclamped); ALL
arithmetic belongs in a pure logic module (kit gesture contract, doc 22).

## Read (only this)

1. The plan sections named above.
2. Knowledge base: `presentation_documentation/frontend/22_builder_component_kits.md`
   (gesture contract) and `21_builder_editor_logic.md` (geometry ownership).
3. Relational: the kit's new prop types (`CanvasDraggableBox.tsx`,
   `MediaElementPanel.tsx` — read-only), `src/lib/timeline-geometry.ts`,
   `src/views/EditorView.tsx` (canvas box wiring, panel wiring),
   `src/lib/composition-mapping.ts` (media layout mapping).

## Deliver

1. Pure resize math — `resizeElementLayout` in `src/lib/timeline-geometry.ts`
   or a new sibling `canvas-geometry.ts`: handle + delta fractions → next
   `{x, y, width, height}`; aspect-locked corners, free edges (per the plan's
   recorded clarification), minimum size, canvas clamping. Exhaustive unit
   tests (every handle, both aspect cases, all clamps).
2. Wire in `EditorView`: selected media boxes get resize handles; gestures →
   `controller.onUpdateElement` layout patches. Media elements only — text
   resize is out of scope.
3. `MediaElementPanel` appears/disappears → enter/exit animation patches
   through the same `updateElement` path text uses.
4. Tests: geometry suite (step 1); view-level resize round-trip; panel
   interaction test. Playwright: select media → drag a corner handle → layout
   width changed and persists after reload.
5. Close-out (this stage only): run
   `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` for the plan
   (summary, archive, review-log). Update the knowledge base per plan step 12:
   `presentation_documentation/frontend/21_builder_editor_logic.md` (transport
   hotkey, unified media model, upload queue, resize geometry),
   `22_builder_component_kits.md` (resize-handle gesture contract, new kit
   pieces), `50_invariants_and_pitfalls.md` (add "no untimed elements — every
   canvas element is a timeline track"; retire background/overlay terminology).

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-builder`
- `npm run test:presentation-runtime`
- Studio Playwright editor spec `--project=desktop` (operator starts servers)

## Finish

Review-log line "Stage C implemented — <validation results>", then the
lifecycle close-out from Deliver step 5. Clean-boundary rule: never stop before
writing code.
