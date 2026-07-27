# PLAN_presentation_editor_panel_drawers_20260723

## Metadata

- Plan ID: `PLAN_presentation_editor_panel_drawers_20260723`
- Status: `archived`
- Owner agent: `codex` (logic) + `claude-builder` (drawer kit + panel regrouping, pre-built)
- Created at (UTC): `2026-07-23T13:30:00Z`
- Last updated at (UTC): `2026-07-23T15:45:45Z`
- Related issue/ticket: operator intention (editor panel drawers), 2026-07-23
- Intention plan: `docs/architecture/under_construction/intention/presentation_capability_improvments.md`
- Knowledge base (READ FIRST): `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`
  — docs 21 (editor logic), 22 (kits)
- **Sequencing**: `PLAN_presentation_slide_background_color_20260723` (in
  flight) wires `SlidePropertiesPanel`, `EditorView.tsx`, and the controller.
  This plan starts only after that plan is **archived**. The kit pre-build
  (PanelDrawer + panel regrouping) also waits for it — the regrouping wraps the
  background-color field that session is currently wiring and must not break
  its in-flight Playwright selectors.

## Goal and intent

- Goal: restructure the editor's right panel into collapsible **drawers**
  grouped by responsibility. All drawers closed by default; the user may open
  any number simultaneously. Selecting a block auto-opens the drawer of
  concern — in particular, tapping a bar/label in the timeline opens that
  block's tools directly.
- Business/user intent: the panel has outgrown a flat list (content,
  animations, size, role, five styling controls, background color, duration,
  CTA…); grouping restores scannability and turns selection into direct tool
  access instead of scrolling.
- Non-goals: no persistence of drawer state across sessions/reloads; no
  drag-reordering of drawers; no changes to which tools exist; no phone-app or
  player changes.

## Scope

- In scope: `packages/presentation-builder` — panels kit (`PanelPrimitives`,
  `SlidePropertiesPanel`, `TextBlockPanel`, `MediaElementPanel`, new
  `PanelDrawer`), controller (drawer + selection-source state), `EditorView`
  (tap-source plumbing, drawers wiring), kit preview, tests; studio editor
  Playwright spec (selectors move inside drawers).
- Out of scope: runtime, presentations, dashboard, publish dialog, backend.
- Assumptions: none beyond current source (verified panel inventory below).

## Current panel inventory (verified 2026-07-23)

- **Slide panel**: replace-media button · duration slider · background color
  (being wired by the in-flight plan) · CTA label · CTA route · hint.
- **Text panel**: content textarea · appears · disappears · size slider ·
  body/heading role · `TextStylingSection` (align, text color, background,
  radius, padding) · window label · delete.
- **Media panel**: media label · fit · appears · disappears · geometry label ·
  replace · window label · delete.
- Selection paths today: canvas box `onSelect`, timeline bar `onSelect`, track
  label `onSelectLabel` — all funnel into `controller.onSelectElement(id)`
  with **no source information**; rail/deselect shows the slide panel.

## Drawer grouping (proposed — clarification 1)

| Panel | Drawer | Contents |
|---|---|---|
| Slide | `media` | replace image/video |
| Slide | `timing` | duration slider |
| Slide | `background` | background color picker |
| Slide | `button` | CTA label + route (+ route error) |
| Text | `content` | content textarea |
| Text | `style` | size, body/heading role, TextStylingSection |
| Text | `animations` | appears, disappears |
| Media | `media` | media label, fit, replace |
| Media | `animations` | appears, disappears |

Persistent (never inside a drawer): panel header/close, window label, geometry
label, delete button, slide-panel hint.

## Clarifications required

All resolved 2026-07-23 — operator confirmed the recommended defaults.

- [x] **1 — Grouping**: confirmed as tabled above.
- [x] **2 — Auto-open mapping**: SOURCE-AWARE — timeline tap (bar OR track
  label) → open `animations`; canvas tap → open the block's primary drawer
  (`content` for text, `media` for media).
- [x] **3 — Auto-open behavior**: ENSURE-OPEN — the concern drawer opens;
  other open drawers stay untouched.
- Resolved by the operator's brief: multi-open allowed; default all closed;
  drawer state is session-local (not persisted), kept per panel type so
  reopening a text block restores the last text-panel arrangement.

## Acceptance criteria

1. Each panel renders its tools inside drawers per the confirmed grouping;
   all closed by default; any number can be open; open/close is animated,
   keyboard-accessible (button semantics, `aria-expanded`), and read-only mode
   still allows browsing drawers.
2. Tapping a timeline bar or track label selects the element AND auto-opens
   the confirmed drawer of concern; tapping a canvas box auto-opens its
   confirmed drawer; auto-open follows the confirmed clarification-3 behavior.
3. Drawer state survives selection changes within a session (per panel type)
   and resets on editor reload; nothing is persisted to the backend.
4. Kit purity: `PanelDrawer` is props-only (controlled `isOpen`/`onToggle`);
   panels expose a `drawers` prop and render FLAT (today's layout) when it is
   absent — the kit regroup alone must not change any behavior until wired.
5. All existing panel-dependent tests/selectors updated; no testId renames —
   selectors gain only the "open the drawer first" step.
6. Root `npm run typecheck` green; builder vitest green with new drawer
   state/auto-open coverage; studio editor Playwright spec green on desktop
   (updated to open drawers where needed).

## Contracts and skills

### Contracts loaded

- `packages/presentation-builder/presentation_documentation/frontend/22_builder_component_kits.md`: props-only kits, panel kit ownership
- `packages/presentation-builder/presentation_documentation/frontend/21_builder_editor_logic.md`: controller/view state ownership
- `task_system/frontend_contract_goal_mapping_guide.md`: file-read discipline

### Local extensions loaded

- none

### File read intent — pattern vs. relational

Standard rule applies. Relational reads: the three panel files +
`PanelPrimitives.tsx` (kit — read-only), `EditorView.tsx` (selection taps,
panel wiring), controller (selection state), `TimelineKitPreview.tsx`
(reference consumer), the studio editor Playwright spec.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: plan lifecycle, summary, archive
- Excluded alternatives: none

## Implementation plan

Single Codex session; drawer kit + regrouped panels pre-built by the builder
agent (read-only for Codex).

Kit (builder agent, pre-session, AFTER the slide-background plan archives):
`PanelDrawer` in the panels kit — controlled collapsible section (header
button with title + chevron, `aria-expanded`, animated height, optional
closed-state summary line); the three panels regrouped per the confirmed
table behind an optional `drawers?: { open: readonly string[]; onToggle:
(id: string) => void }` prop (absent → flat, unchanged render); exported
drawer-id constants per panel; kit preview demos drawers + a flat fallback.

1. Controller: drawer state per panel type (`Record<"slide"|"text"|"media",
   ReadonlySet<string>>`, session-local) + `toggleDrawer`; selection gains a
   source — `onSelectElement(id, source: "timeline" | "canvas")` — and the
   auto-open mapping per resolved clarifications 2/3 runs on selection.
2. `EditorView`: thread the source from the three tap sites (canvas box,
   timeline bar, track label); pass `drawers` to whichever panel renders;
   deselect/rail keeps slide-panel drawer state as-is.
3. Tests: drawer-state unit coverage (toggle, per-panel isolation, reset on
   remount); auto-open per source (timeline tap opens the concern drawer
   without closing others — or per resolved behavior); view test that panels
   render flat without the prop (criterion 4).
4. Playwright: update the editor spec — every panel interaction now opens its
   drawer first; add one scenario: select via timeline bar → assert concern
   drawer open → interact without scrolling assumptions.
5. Close-out: plan lifecycle skill; KB updates — doc 21 (drawer/selection-
   source state), doc 22 (`PanelDrawer` contract + drawers prop convention).

## Risks and mitigations

- Risk: closed-by-default hides validation feedback (e.g. CTA route error
  inside a closed `button` drawer).
  Mitigation: a drawer containing an active validation error renders an error
  badge on its header and auto-opens when the error first appears (small,
  explicit rule — include in kit summary line support).
- Risk: Playwright churn — many selectors now sit behind closed drawers.
  Mitigation: criterion 5's rule (no testId renames, add open-drawer steps);
  drawer headers get stable testIds `presentation-panel-drawer-<id>`.
- Risk: collision with the in-flight slide-background session.
  Mitigation: hard gate — kit pre-build AND Codex session both wait for that
  plan's archive; the prompt verifies it.

## Validation plan

- `npm run typecheck`: zero errors
- `npm run test:presentation-builder`: green incl. drawer/auto-open suites
- Studio editor Playwright spec `--project=desktop` (operator starts servers)
- Manual (operator): tap timeline bar → concern drawer opens; multi-open;
  defaults closed on reload

## Review log

- 2026-07-23 operator: clarifications 1–3 resolved (grouping confirmed;
  source-aware auto-open; ensure-open behavior); plan flipped to `approved`.
  Kit pre-build next (claude-builder), then Codex via
  `prompts/PROMPT_editor_panel_drawers.md`.
- 2026-07-23 claude-builder: drawer kit pre-built (read-only for Codex) —
  `PanelDrawer` (controlled, animated, `aria-expanded`, error-badge support,
  header testId `presentation-panel-drawer-<id>`), drawer-id constants
  (`SLIDE/TEXT/MEDIA_PANEL_DRAWERS`), all three panels regrouped behind
  optional `drawers` prop (absent → flat, exact current order preserved; CTA
  route error badges the button drawer), `PanelDrawersProp` + constants
  exported from the package index. `TimelineKitPreview` is the reference
  consumer: per-panel multi-open state, source-aware ensure-open auto-open
  demo, drawers/flat toggle. Builder typecheck clean, 150/150 tests green
  (flat fallback verified by the untouched suites). Codex prompt gates pass.
- 2026-07-23 codex: implementation and review complete — controller owns
  independent slide/text/media drawer sets; canvas, timeline-bar, and
  timeline-label selections carry their source and ensure-open the resolved
  concern; CTA validation opens the button drawer; `EditorView`, unit tests,
  Playwright interactions, and KB docs 21/22 were updated. Validation passed:
  root typecheck, 155/155 builder tests, and the desktop studio editor
  Playwright spec (1/1). Summary and archive record written; no debug loop
  required.

## Lifecycle transition

- Current state: `archived`
- Next state: none; reopen through a nested debug plan if a defect is found
- Transition owner: codex / operator
