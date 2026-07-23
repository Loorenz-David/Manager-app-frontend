# Codex — Editor panel drawers: grouped tools + selection-aware auto-open

You are implementing an approved plan, working in the `frontend/` monorepo root.
Single session.

**Verify first — STOP and report if any fails:**
1. The slide-background-color plan is ARCHIVED:
   `PLAN_presentation_slide_background_color_20260723.md` exists in
   `docs/architecture/archives/implementation/`.
2. The drawer kit is pre-built (kit files are READ-ONLY for you):
   `rg "PanelDrawer" packages/presentation-builder/src/components/panels/`
   is non-empty AND the three panels accept a `drawers` prop
   (`rg "drawers" packages/presentation-builder/src/components/panels/SlidePropertiesPanel.tsx`
   non-empty).

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_editor_panel_drawers_20260723.md`
— confirmed drawer grouping table, resolved clarifications 1–3 (read the
resolutions recorded in the plan — they decide the auto-open mapping and
behavior), implementation steps 1–5, acceptance criteria 1–6.

Key facts (already verified — don't re-derive): all three selection paths
(canvas box `onSelect`, timeline bar `onSelect`, track label `onSelectLabel`)
funnel into `controller.onSelectElement(id)` with no source information — you
are adding the source. The panels render FLAT when the `drawers` prop is
absent; your wiring is what activates the drawers.

## Read (only this)

1. The plan (sections above).
2. Knowledge base doc 22 (`PanelDrawer` contract + drawers prop convention —
   updated by the kit pre-build) and doc 21 (controller state ownership).
3. Relational: the three panel files' prop types + exported drawer-id
   constants (read-only), `EditorView.tsx` (three tap sites, panel render
   site), controller (selection state), the studio editor Playwright spec.

## Deliver

Follow plan steps 1–5 exactly:

1. Controller: session-local drawer-state per panel type + `toggleDrawer`;
   `onSelectElement(id, source: "timeline" | "canvas")`; auto-open mapping per
   the plan's resolved clarifications (ensure-open semantics unless the plan
   says exclusive). Validation-error auto-open rule for the CTA drawer per the
   plan's risk section.
2. `EditorView`: thread source from all three tap sites; pass `drawers` to the
   active panel; rail/deselect leaves slide-panel drawer state untouched.
3. Tests: drawer state (toggle, per-panel isolation, remount reset); auto-open
   per source; flat-without-prop regression (criterion 4).
4. Playwright: update panel interactions to open drawers first (NO testId
   renames — drawer headers are `presentation-panel-drawer-<id>`); add the
   timeline-tap → concern-drawer-open scenario.
5. Close-out: plan lifecycle skill (summary → archive → review log); KB
   updates per plan step 5.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-builder`
- Studio editor Playwright spec `--project=desktop` (ask the operator to start
  the studio server — NEVER start it yourself)

## Finish

Lifecycle close-out per Deliver step 5. Clean-boundary rule: never stop before
writing code; if blocked, report precisely where.
