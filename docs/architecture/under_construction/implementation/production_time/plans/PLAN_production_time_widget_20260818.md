# PLAN_production_time_widget_20260818

## Metadata

- Plan ID: `PLAN_production_time_widget_20260818`
- Status: `under_construction`
- Owner agent: `Claude Opus 5` (plan author + visual implementer)
- Logic implementer: `Codex`
- Created at (UTC): `2026-08-18T00:00:00Z`
- Last updated at (UTC): `2026-08-18T00:00:00Z`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md`
- Supporting handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` (twelve-value status vocabulary)
- Intention plan: none — this plan is derived directly from the backend handoff and the approved mockup.

---

## Goal and intent

- **Goal:** ship a self-contained **Production time** widget that renders a task's production
  budget as a segmented bar plus one row per working section, fetching its own data from
  `GET /api/v1/item-economics/tasks/{task_client_id}/production-time` and requiring nothing
  from its host but a task client id.
- **User intent:** anyone looking at a task — manager, worker or seller — can see at a glance
  how much of the item's allowed production time has been consumed, which section consumed it,
  and whether the section currently being worked is on track.
- **Non-goals:**
  - The **worker task-step card** progress line (`budget-allocations` + `typical-times`). That is
    the second component referenced by the same handoff and is explicitly out of scope here.
  - Any economics **configuration** UI (cost groups, basis versions, cost model versions).
  - Any monetary display. The endpoint is time-only at every depth; nothing in this plan reads
    or renders money.
  - Committing an evaluation. Resolved 2026-08-18: v1 is read-only — reason lines, no CTAs.

---

## Scope

**In scope**

- New component folder `packages/item-economics/src/components/production-time/`.
- The DTO schema, query key, fetch function, query hook, live clock, view-model transform and
  socket invalidation that feed it — all inside `@beyo/item-economics`.
- Mounting the widget above `TaskFlowTimeline` in:
  - `packages/tasks/src/pages/TaskDetailSlidePage.tsx`
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`
- App wiring (dependency + `@source`) for **managers, workers and sellers** — see the note in
  §Mounting, the packaged page is used by three apps, not one.

**Out of scope**

- Everything in "Non-goals" above.
- `packages/item-economics` scaffolding already created (`package.json`, `tsconfig.json`,
  `vitest.config.ts`, `src/types.ts` primitives, `src/api/item-economics-keys.ts`,
  `src/lib/error-identity.ts`) — this plan extends it, it does not recreate it.

**Assumptions**

- The endpoint is not deployed yet. The UI is built first against fixtures; the logic track
  wires the real call and must not be merged as "done" until a live response has been rendered.
- The response is byte-identical for all four roles, so no role branching is needed anywhere.
  With CTAs deferred, the widget reads identically for admin, manager, worker and seller.

---

## Division of labour — read this before touching anything

Two tracks, one seam. The seam is the **view model** (§The seam contract). Neither track may
change the seam unilaterally.

| Track | Owner | Owns | Must not touch |
|---|---|---|---|
| **A — Visual** | Claude | Presentational components, palette, skeleton, view-model **types**, pure display builders + their tests | `api/`, `controllers/`, `socket-events.ts`, the self-fetching root, app wiring |
| **B — Logic** | Codex | Zod DTO schemas, query key, fetch fn, query hook, live clock hook, DTO→VM transform, self-fetching root, socket events, package `index.ts` exports, mounting, app wiring, tests, e2e | Every file marked `[A]` in §File map — including their class names and layout |

**Sequence:** Track A ships first and is reviewable on its own (rendered from fixtures).
Track B then fills in the machinery behind the already-approved pixels. If Track B discovers
the seam is wrong, it stops and reports rather than editing Track A's files.

**Why this seam:** every Track A component is pure — props in, JSX out, no hooks beyond layout.
That makes the visual approvable without a backend, and makes Track B's job mechanical:
produce a `ProductionTimeViewModel` and hand it to `<ProductionTimeCard>`.

---

## The seam contract

Authoritative file: `packages/item-economics/src/lib/production-time-view-model.ts` **[A]**.

Track A authors the types and the pure builders. Track B imports the types, and calls the
builders from `production-time-dto.ts`. Field names below are binding.

```ts
export type ProductionTimeTone =
  | "completed" | "working" | "paused" | "blocked" | "pending" | "excluded";

/** The server's per-section verdict. Passed into buildRowDetail, never derived. */
export type ProductionTimeShareState =
  | "on_track" | "over_share" | "excluded" | "no_budget";

export type ProductionTimeRowViewModel = {
  key: string;                  // working_section_id, falling back to snapshot+index
  label: string;                // section_name_snapshot ?? section_name ?? "Unnamed section"
  tone: ProductionTimeTone;     // drives swatch colour, segment fill and state-text colour
  stateLabel: string;           // "Completed" | "Paused" | "Working" | …
  workedLabel: string;          // "1h 10m" — live-adjusted when the section is working
  workedSeconds: number;        // live-adjusted
  stepCount: number;            // 2 after a reassignment; the row is still ONE row
  isActive: boolean;            // state === "working" → highlighted, expanded row
  isExcluded: boolean;          // share_state === "excluded" → muted, struck label
  typicalLabel: string | null;  // "typical 1h 0m" — null when the section has no typical
  typicalComparisonLabel: string | null;  // "of typically 50m" — the no-budget row line
  detail: ProductionTimeRowDetailViewModel | null;  // non-null only when isActive && budget
};

export type ProductionTimeRowDetailViewModel = {
  progressPercent: number;              // 0..100, clamped; 100 when allowance_seconds <= 0
  typicalMarkerPercent: number | null;  // 0..100 tick position, null when no typical
  verdictLabel: string;                 // "On track" | "Over share"
  verdictTone: "on_track" | "over_share";
};

export type ProductionTimeSegmentViewModel = {
  key: string;
  tone: ProductionTimeTone;
  widthPercent: number;
};

export type ProductionTimeHeadlineViewModel = {
  workedLabel: string;             // "2h 55m"
  budgetLabel: string | null;      // "of 3h 15m"
  remainingLabel: string | null;   // "20m left" | "12m over"
  isOverBudget: boolean;
  isFinal: boolean;                // headline was taken from `final`, task is closed
};

export type ProductionTimeCardViewModel = {
  headline: ProductionTimeHeadlineViewModel;
  segments: ProductionTimeSegmentViewModel[];
  remainderPercent: number;        // hatched tail; 0 when at/over budget
  rows: ProductionTimeRowViewModel[];
  footerNote: string | null;
};

export type ProductionTimeNoBudgetViewModel = {
  workedLabel: string;             // summed from sections[].worked_seconds
  reasonTitle: string;             // names the missing thing, not the status code
  reasonBody: string;
  rawStatus: string;               // the literal status value — title attr, support only
  cta: { label: string; kind: "commit" | "valuation" } | null;
  rows: ProductionTimeRowViewModel[];   // typical-driven, no bars
};

export type ProductionTimeViewModel =
  | { kind: "budget"; card: ProductionTimeCardViewModel }
  | { kind: "no_budget"; card: ProductionTimeNoBudgetViewModel }
  | { kind: "unavailable"; reason: "detached" | "mismatched" };
```

A discriminated union, not optional fields — `02_types.md §Discriminated unions over optional
fields`. `ProductionTimeCard` switches on `kind` and can never render a half-populated frame.

**Pure builders Track A also authors** (all take explicit inputs, no `Date.now()` inside, so
Track B's transform stays testable):

| Builder | Signature | Rule |
|---|---|---|
| `formatWorkSeconds` | `(seconds: number) => string` | `hours > 0 → "2h 55m"`, else `"50m"`; negatives render as `"0m"` |
| `formatPassCount` | `(stepCount: number) => string \| null` | `"2 passes"` for a reassigned section, `null` for the ordinary single-pass case |
| `buildSegments` | `(rows, budgetSeconds) => { segments, remainderPercent }` | widths = `worked / budget`; when `Σ worked > budget`, normalise to `Σ worked` and set `remainderPercent = 0` |
| `buildRowDetail` | `(worked, allowance, typical, shareState) => ProductionTimeRowDetailViewModel` | **guards the division**: a null or non-positive allowance → `progressPercent = 100`, no tick. The verdict comes from `shareState`, never from comparing worked to allowance |
| `buildFooterNote` | `(remainingSeconds, pendingSectionLabels) => string \| null` | see §Footer note |
| `selectVisibleRows` | `(rows, isExpanded) => ProductionTimeRowViewModel[]` | collapsed → first 4 **plus every `isActive` row**, re-sorted into payload order; expanded → all. See §Row truncation |

---

## Decisions — resolved by the owner, 2026-08-18

- [x] **CTAs — reason lines only in v1.** The widget stays read-only: no action hook, no role
      gating, no valuation surface. The `cta` field stays in the view model and Track B always
      sets it to `null`; Track A renders the button only when it is non-null, so CTAs can be
      switched on later without touching the visual layer.
- [x] **Sellers see the widget.** All three apps (managers, workers, sellers) get the dependency
      and the `@source` line. The endpoint admits all four roles and returns byte-identical,
      time-only bodies — no money at any depth — so there is nothing to gate.
- [x] **Footer note = remaining + unfinished stages.** `"20m left for finishing and QC."`, naming
      every section that is not yet terminal, in payload order. Falls back to `"20m left."` when
      all stages are done and `"25m over the production budget."` when the remainder is negative.
- [x] **Long pipelines truncate.** The row list collapses to the first four rows with a
      *Show all* expander. See §Row truncation — the top bar and the footer note always describe
      the **whole** pipeline regardless of what is visible.
- [x] **Concurrent working sections.** Every `isActive` row expands. Two people on two stages is
      a real state and collapsing one of them would misreport it.
- [x] **Over budget.** Headline reads `2h 55m of 2h 30m` with `25m over` in the danger tone,
      fully consumed bar, no hatched tail.
- [x] **Empty `sections` array.** Render nothing. A budget bar with no pipeline under it carries
      no information, and the managers page already shows its own "Assign Stages" CTA in exactly
      that state.

## Clarifications — closed by the owner, 2026-08-18

- [x] **1. The `state` domain on a section row.** Confirmed: it is the **task-step state
      vocabulary** — `pending | working | paused | ended_shift | blocked | completed | skipped |
      failed | cancelled`. `stateToTone()` already covers exactly that set.

      **Aggregation is the backend's job, not ours.** `step_count > 1` means a reassignment: one
      step was completed and another opened. The backend guarantees two steps of the same section
      are never running at once — a step must complete before the count can pass 1 — and the
      `state` it sends is the later, active one. **The transform renders `state` as received and
      never derives a section state from its steps.** There is no tie-break to implement, and no
      case where a row's state is ambiguous.

      Note this guard is *per section*. Two different sections can still be `working` at the same
      time, so the decision to expand every active row stands.
- [x] **2. The tick on the active row.** Confirmed as read: the bar is the section's allowance,
      the fill is time worked, and the tick is where the section's typical duration falls on that
      same scale — so the row answers "is this section's slice generous or tight compared with
      normal?". It pairs with the `typical 1h 0m` caption directly beneath it.

**No open questions remain.** The plan is fully resolved.

## Acceptance criteria

1. `ProductionTimeSection` renders from a task client id alone. Mounting it requires no
   provider, no context and no props beyond `taskId`.
2. The widget appears immediately above `TaskFlowTimeline` in both target pages, and the two
   pages render identical markup for the same task.
3. `sections` is rendered in the order received. No `sort`, `reverse` or re-ordering appears
   anywhere in the component tree or the transform.
4. A task whose pipeline includes a reassignment renders **one** row for that section, showing
   the summed worked time, with `stepCount === 2`.
5. `share_state` is rendered as received. No file in `packages/item-economics/src` compares
   `worked_seconds` to `allowance_seconds` to decide a verdict.
5a. `stateToTone` and `humanizeSectionState` are asserted **one row per state**, all nine
    (`pending`, `working`, `paused`, `blocked`, `completed`, `failed`, `skipped`, `cancelled`,
    `ended_shift`) — not a sample. Added 2026-08-19 after review F3: five of nine were asserted,
    and deleting `case "paused":` left all 108 tests green.
6. A section with `allowance_seconds <= 0` renders a full over-share bar and performs no
   division. Asserted by a unit test on `buildRowDetail`.
7. When `status` is anything other than `ok` / `infeasible`, the card frame still renders, with
   a reason line naming the missing thing and rows driven by `worked_seconds` + `typical`.
   No zeros, no hidden component, no error state. `budget.actual_worker_seconds` being `null`
   does not produce `NaN` anywhere — the worked total is summed from the rows.
8. A section whose `state` is `working` ticks: its worked label, the headline worked and
   remaining labels, and the bar geometry all advance without a refetch, anchored to
   `state_entered_at` (never to fetch time).
9. Exactly one clock drives the whole widget, and it is disabled when no section is working.
10. A `404` from the endpoint hides the component. `item_binding` of `detached` / `mismatched`
    renders the empty state, never stale numbers.
11. `task:step-state-changed` invalidates the widget's query key.
12. A pipeline of more than four sections collapses to four rows plus a *Show all* toggle, and
    the row currently in `working` state is visible **without** expanding. The segmented bar and
    the footer note still describe every section, expanded or not. **This binds both frames** —
    the budget card and the degraded (`no_budget`) card. Amended 2026-08-19 after review F2: the
    original sentence named no surface, and only the budget frame truncated. The degraded frame
    is the one that matters most — every unvalued task lands there, and on live data 7 of 25
    tasks carry more than four sections.
    The toggle is offered only when rows are actually hidden: derive it from
    `visibleRows.length < rows.length`, never from `rows.length` alone (review N2).
13. An empty `sections` array renders nothing at all.
14. `npm run typecheck` is clean; `npm run test:item-economics` passes; both Playwright projects
    (mobile then desktop) pass for the workers-app task-detail spec.

---

## Contracts and skills

### Domain schemas consulted

- `packages/tasks/src/types.ts` — `StepStateSchema` (`pending | working | paused | ended_shift |
  blocked | completed | skipped | failed | cancelled`); `packages/tasks/src/lib/step-state-variants.ts`
  — `STEP_STATE_VARIANT`, `humanizeStepState`. **Read for reference only.**
  `@beyo/item-economics` must **not** import `@beyo/tasks` (see §Risks, dependency direction) —
  it defines its own local tone map covering the same values.
- `packages/item-economics/src/types.ts` — `ItemEconomicsStatusSchema` (the twelve values),
  `MajorCategorySchema`, `ItemEconomicsPaginationSchema`, already in place.
- `packages/lib/src/types/common.ts` — branded `TaskId`, `DecimalStringSchema`.
- `packages/lib/src/types/api.ts` — `ApiEnvelopeSchema`, `ApiErrorSchema`.

### Selected contracts

- `architecture/01_architecture.md` — layer boundaries.
- `architecture/02_types.md` — no `any`; Zod at every boundary; discriminated unions over
  optional fields (the `ProductionTimeViewModel` union).
- `architecture/04_api_client.md` + `04_api_client_local.md` — `apiClient.get(path, schema, params)`;
  flat-string error shape; `ApiRequestError.status` is how the `404 → hide` rule is detected.

  **Two similarly-named things, do not conflate them:** `ApiRequestError` is the class thrown by
  the client, exported from `@beyo/api-client`. `ApiErrorSchema` is the Zod schema for the error
  *response body*, exported from `@beyo/lib`. You want the class. Precedent:
  `packages/stats/src/pages/WorkerTimelineSlidePage.tsx:186`.
- `architecture/05_server_state.md` — query key factory, one hook per query, `enabled`, the
  "never call the API client from a component" chain.
- `architecture/07_components.md` — feature-component signature, props discipline, "no logic in
  props computation" (every ternary lives in the view model, never in JSX).
- `architecture/08_hooks.md` — controller hook shape.
- `architecture/13_errors.md` — query-hook error handling.
- `architecture/15_feature_structure.md` — folder layout and the `index.ts` public boundary.
- `architecture/24_dto.md` — Response DTO → View Model pipeline; the transform is pure, lives
  beside the DTO, and is called from the controller.
- `architecture/32_loading_skeletons.md` — reflection rule; the skeleton mirrors the real card,
  and uses the global `skeleton-shimmer` utility rather than a local gradient.
- `architecture/35_shared_packages.md` — package rules; §14 does **not** apply (this is not a
  surface page, so it is statically exported from `index.ts`).
- `architecture/21_realtime.md` — the `SocketEventHandlers` map pattern.
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md` +
  `34_runtime_validation_local.md` — vitest + Playwright, and the
  `[feature]-[element-type]-[context?]` testid convention.

### Added from guide

- `35_shared_packages.md` — trigger: new shared package component consumed by three apps.
- `21_realtime.md` — trigger: "refetch after any step transition" in the handoff.
- `32_loading_skeletons.md` — trigger: the widget has a loading state on a card-shaped surface.

### Local extensions loaded

- `04_api_client_local.md` — backend error is a flat string with no `field_errors`; identity is
  the leading token before the first colon (already implemented as `parseErrorIdentity`).
- `34_runtime_validation_local.md` — testid convention, fixture paths, project names.

### Excluded contracts

- `09_forms.md`, `23_providers.md` — no form, and no provider: the widget is a leaf that owns one
  query. A provider would add a layer with a single consumer.
- `28_surfaces.md`, `30_dynamic_loading.md`, `38_slide_stack.md` — the widget is inline content
  inside an existing slide, not a registered surface, so no surface id, no loader function.
- `19_permissions.md` — deferred with clarification 5; pulled in only if CTAs ship.

### Read order

- `architecture/04_api_client.md` (baseline) → `architecture/04_api_client_local.md` (delta)
- `architecture/34_runtime_validation.md` (baseline) → `architecture/34_runtime_validation_local.md` (delta)
- Applied precedence: local extension overrides baseline for this app only.

---

## File map

`[A]` = Claude / visual. `[B]` = Codex / logic.

```
packages/item-economics/src/
├── types.ts                                          [B] extend: production-time Zod DTOs
├── api/
│   ├── item-economics-keys.ts                        [B] extend: taskProductionTime(taskId)
│   ├── fetch-task-production-time.ts                 [B] new
│   └── use-task-production-time-query.ts             [B] new
├── hooks/
│   └── use-production-time-clock.ts                  [B] new — one 30s clock, gated
├── controllers/
│   └── use-production-time.controller.ts             [B] new
├── lib/
│   ├── production-time-view-model.ts                 [A] seam types + pure builders + stateToTone
│   ├── production-time-view-model.test.ts            [A] 22 builder tests
│   ├── production-time-dto.ts                        [B] new — DTO → VM (applies the clock)
│   └── production-time-dto.test.ts                   [B] new
├── components/production-time/                       ← Track A: BUILT 2026-08-18
│   ├── index.ts                                      [A] folder barrel
│   ├── ProductionTimeSection.tsx                     [B] new — self-fetching root
│   ├── ProductionTimeCard.tsx                        [A] switches on vm.kind; owns the expand state
│   ├── ProductionTimeFrame.tsx                       [A] section label + bordered card shell
│   ├── ProductionTimeHeadline.tsx                    [A]
│   ├── ProductionTimeBudgetBar.tsx                   [A] segmented bar + hatched tail
│   ├── ProductionTimeRow.tsx                         [A] one section row
│   ├── ProductionTimeRowDetail.tsx                   [A] active-row bar + typical tick + verdict
│   ├── ProductionTimeRowsToggle.tsx                  [A] Show all / Show less
│   ├── ProductionTimeFooterNote.tsx                  [A]
│   ├── ProductionTimeNoBudgetCard.tsx                [A] degraded frame
│   ├── ProductionTimeUnavailableCard.tsx             [A] detached / mismatched empty state
│   ├── ProductionTimeCardSkeleton.tsx                [A] reflection of the real card
│   ├── production-time-tone.ts                       [A] tone → colour classes only
│   ├── production-time-fixtures.ts                   [A] render fixtures
│   └── ProductionTimeCard.test.tsx                   [A] 18 component tests
├── socket-events.ts                                  [B] new — itemEconomicsSocketEvents
└── index.ts                                          [B] extend: public exports

packages/tasks/src/pages/TaskDetailSlidePage.tsx                         [B] mount
packages/tasks/package.json                                              [B] peer dep
apps/workers-app/.../src/pages/task_steps/TaskDetailSlidePage.tsx        [B] mount
apps/{managers,workers,sellers}-app/.../package.json                     [B] dependency
apps/{managers,workers,sellers}-app/.../src/index.css                    [B] @source
apps/{managers,workers,sellers}-app/.../src/app/socket-registry.ts       [B] register handlers
packages/realtime/src/lib/socket-types.ts                                [B] add the new event
frontend/package.json                                                    — already wired
```

---

## Track A — visual specification (Claude)

The card is a `rounded-2xl` surface with a hairline border and hairline dividers between rows.
It is **not** `ContentCard` — that primitive has no border and no dividers, and both host pages
already render the widget inside their own `ContentCard`. Nesting a second one would double the
padding. The widget draws its own frame.

### Structure

```
Production time                         ← SectionLabel as="h3" tone="muted", outside the card
┌───────────────────────────────────────────────┐
│ 2h 55m  of 3h 15m              20m left       │  ProductionTimeHeadline
│ ███████ ██████ ▓▓ ████ ░░░░                   │  ProductionTimeBudgetBar
├───────────────────────────────────────────────┤
│ ■ Structural Repair    Completed      1h 10m  │  ProductionTimeRow
├───────────────────────────────────────────────┤
│ ■ Sanding              Completed        50m   │
├───────────────────────────────────────────────┤
│ ■ Finishing            Paused           15m   │
├───────────────────────────────────────────────┤
│▌■ Upholstery           Working          40m   │  ProductionTimeRow isActive
│▌ ──────────────────────────────────┃──        │  ProductionTimeRowDetail
│▌ typical 1h 0m               On track         │
├───────────────────────────────────────────────┤
│ Show all 9 stages                          ⌄  │  ProductionTimeRowsToggle (only when > 4)
├───────────────────────────────────────────────┤
│ 20m left for finishing and QC.                │  ProductionTimeFooterNote
└───────────────────────────────────────────────┘
```

### Headline

- Worked: `text-2xl font-semibold tracking-tight`, foreground.
- `of 3h 15m`: `text-base font-normal text-muted-foreground`, baseline-aligned with the worked
  figure (`flex items-baseline gap-2`).
- Right side: `text-sm text-muted-foreground`; when `isOverBudget`, the danger text tone.
- When `isFinal`, the row carries a `Final` chip (neutral `StatePill`) — the task is closed and
  the numbers are frozen.

### Budget bar

- Track `h-2 rounded-full`, segments laid out with `flex gap-[3px]`, each segment
  `rounded-[3px]` and `flex-basis: {widthPercent}%`.
- Fill colour comes from the row's tone, not from `share_state`.
- The tail (`remainderPercent > 0`) is a hatched block:
  `repeating-linear-gradient(45deg, var(--color-border) 0 3px, transparent 3px 6px)` over a
  `bg-muted` base — the unconsumed budget, visually distinct from any section.
- `remainderPercent === 0` → no tail element at all.
- Guard: when `budgetSeconds <= 0` the bar is not rendered (the `infeasible` case renders the
  over-budget frame instead).

### Section row

- Grid: `[swatch] [label · grows] [state] [time]`, `min-h-14`, `px-4 py-3`, `gap-3`.
- Swatch: `size-2.5 rounded-[3px]` in the row tone.
- Label: `text-[17px] font-medium`, truncating. When `isExcluded`: `text-muted-foreground
  line-through`.
- State: `StatePill style="text"` in the tone's variant — matches the mockup's coloured word
  rather than a filled pill.
- Time: `text-[17px] font-semibold tabular-nums`.
- `stepCount > 1` renders a muted `2 passes` caption **beneath the worked time**, right-aligned
  (`text-xs`), with a `title` spelling it out in full. It sits under the figure it qualifies —
  that `1h 10m` is two stretches of work summed, not one — and costs no horizontal room, so a
  long section name never truncates to make space for a badge. Single-pass rows, which is most
  of them, render no caption at all.
- Active row: `bg-[#f5f9ff]`, a `w-1` full-height left accent in the working tone, and the detail
  block below.

### Active-row detail

- Progress track `h-1.5 rounded-full bg-muted`; fill `rounded-full` in the working tone at
  `progressPercent`; when `verdictTone === "over_share"` the fill switches to the danger tone.
- Typical marker: a `w-px h-3` vertical rule at `typicalMarkerPercent`, `bg-foreground/40`,
  absolutely positioned, hidden when `null`.
- Under the bar: `typical 1h 0m` (muted, left) and the verdict (right) — `On track` in the
  success tone, `Over share` in the danger tone.

### Row truncation

A workshop pipeline can run well past the four stages in the mockup, and this card sits above the
flow timeline on an already-long page.

- `PRODUCTION_TIME_COLLAPSED_ROW_COUNT = 4`.
- Collapsed, the card shows the first four rows **plus every `isActive` row**, re-sorted back into
  payload order. The stage being worked right now is the single most useful row on the card; it
  must never be the one hidden behind a toggle.
- The toggle row renders only when `rows.length > 4`: `Show all 9 stages` / `Show less`, muted
  `text-sm`, full-width, with a chevron that rotates on expand.
- **The top bar and the footer note always describe the whole pipeline**, never the visible
  subset. Truncation is a display concern; the budget arithmetic is not.
- Expansion is local presentational state — a `useState` boolean in `ProductionTimeCard`. This is
  the one hook Track A owns, and it is client state, not server state (`06_client_state.md`).
  The row selection itself is the pure `selectVisibleRows` builder, so it is unit-testable
  without rendering.

### Tone palette — `production-time-tone.ts`

Text tones reuse the existing `StatePill` variants so the widget cannot drift from the rest of
the app. Segment fills are the saturated counterparts, matched to the mockup:

| tone | StatePill variant | segment / swatch fill |
|---|---|---|
| `completed` | `success` | `#4f9d69` |
| `working` | `active` | `#7fa8ef` |
| `paused` | `warning` | `#e0b13c` |
| `blocked` | `danger` | `#d9695c` |
| `pending` | `neutral` | `var(--color-border)` |
| `excluded` | `neutral` | `transparent` with a `border border-border` outline |

`stateToTone(state: string): ProductionTimeTone` maps the step-state vocabulary
(`completed → completed`, `working → working`, `paused | ended_shift → paused`,
`blocked | failed → blocked`, `pending | skipped | cancelled → pending`) and returns `pending`
for anything unrecognised — clarification 1's interim behaviour, in one place.

It lives in `lib/production-time-view-model.ts`, **not** in the tone module, alongside
`humanizeSectionState`. Both are called by Track B's transform, and `lib/` importing from
`components/` would invert the layering. The tone module holds colour classes only.

### No-budget frame

Same outer frame. Headline shows the summed worked time with no `of …`, no bar. Below it a
reason block: title (foreground, medium) + body (muted, `text-sm`), with `title={rawStatus}` on
the block for support. Rows render without bars, using `typicalComparisonLabel`
(`"Sanding · 25m of typically 50m"`). CTA button renders only when `cta !== null` — which, per the resolved decisions, is never in v1.
The branch exists so CTAs can be switched on from Track B alone.

Reason copy — keyed off the status, naming the missing thing:

| status | title | body |
|---|---|---|
| `not_evaluated` | Budget not calculated yet | Nothing is missing — the production budget just has not been worked out for this task. |
| `item_unvalued` | This item has no price | Add an expected sale price to the item and the production budget follows. |
| `item_missing_expected_price` | The price has no expected sale amount | The item's valuation is missing the expected sale price. |
| `item_missing_purchase_cost` | The item has no purchase cost | The cost model needs a purchase cost for this item. |
| `item_missing_major_category` | This item has no category | Set the item's category to wood or seat. |
| `not_configured_no_cost_group` | The workshop is not set up for this category | No production cost group exists for this item's category. |
| `not_configured_ambiguous_cost_group` | More than one cost group matches | Two active cost groups claim this category — economics settings need one. |
| `not_configured_no_basis_version` | The cost group has no cost basis | Add a monthly cost and paid capacity in economics settings. |
| `not_configured_no_cost_model_version` | No cost model is set | Economics settings need an open cost model version. |
| `currency_mismatch` | Prices are in different currencies | The item's price and the workshop configuration do not share a currency. |

### Footer note

`buildFooterNote(remainingSeconds, pendingLabels)`:

- `remainingSeconds > 0` and pending stages exist → `"20m left for finishing and polishing."`
  (labels lowercased, Oxford-free `a, b and c` join; an all-caps acronym such as `QC` keeps its
  case).
- `remainingSeconds > 0`, none pending → `"20m left."`
- `remainingSeconds === 0` → `"The production budget is fully used."`
- `remainingSeconds < 0` → `"25m over the production budget."`
- No budget → `null`.

**Which labels count as pending is the caller's decision, not the builder's.** The transform
passes rows whose **section state** is unfinished, excluding the active row (the expanded row
already speaks for the stage in progress) and excluding excluded rows.

Amended 2026-08-19 after review N4. The original wording said "paused or not yet started", and
the code selected on the row's display *tone* — which is lossy: `stateToTone` collapses nine
states into six, mapping `skipped` and `cancelled` onto `pending`, so terminal work was named as
work still to come while `blocked` never was. Selection now reads the section state directly.

The unfinished set is `pending`, `paused`, `ended_shift`, `blocked` — **resolved 2026-08-19,
review round 2 finding G1**: `failed` was dropped by owner decision. It was reachable, not
redundant. A section completed once and re-run unsuccessfully arrives as `state: "failed"` with
`share_state` *not* `excluded`, because the earlier completed pass keeps the group allocated
(`_governing_step` falls through to the latest step when none are live). Naming it made the
footer read "20m left for sanding" about a stage with no open step, contradicting the backend's
`TERMINAL_STEP_STATES` (which contains `failed` alongside `completed`, `skipped` and `cancelled`),
the Decisions entry above, and this same function's treatment of `cancelled` and `skipped`. A test
now pins it in the chosen direction; before the fix, removing the member left all 131 tests green.

`ended_shift` is retained though the backend's `TaskStepStateEnum` cannot emit it — consistent
with the frontend's deliberately permissive `state` enum, recorded as safe in review round 1.

Selection pairs `sections[index]` with `rows[index]`. That is safe only because `toRows` is a
1:1 `dto.sections.map(...)` and criterion 3 forbids reordering — an invariant the code now
depends on but does not assert.
`production-time-fixtures.ts` carries a reference implementation of that selection.

### Skeleton

`ProductionTimeCardSkeleton` reflects the real card: same frame, a headline block, a full-width
bar block, three row blocks and a footer line, all `skeleton-shimmer` (the global utility from
`@beyo/styles`, per `32_loading_skeletons.md` — no local gradients).

### Test ids

`production-time-card`, `production-time-headline`, `production-time-headline-worked`,
`production-time-headline-budget`, `production-time-headline-remaining`,
`production-time-budget-bar`, `production-time-budget-segment`,
`production-time-budget-remainder`, `production-time-row`, `production-time-row-label`,
`production-time-row-state`, `production-time-row-time`, `production-time-row-detail`,
`production-time-row-progress`, `production-time-row-typical-marker`,
`production-time-row-verdict`, `production-time-rows-toggle`, `production-time-footer-note`,
`production-time-no-budget`,
`production-time-no-budget-reason`, `production-time-no-budget-cta`,
`production-time-skeleton`.

### Track A validation

- `npm run test:item-economics` — unit tests for `formatWorkSeconds`, `buildSegments`
  (including the over-budget normalisation), `buildRowDetail` (including
  `allowance_seconds <= 0` and negative `left_seconds`), `buildFooterNote`, `selectVisibleRows` (including the active-row-beyond-the-cut case), `stateToTone`.
- Component tests rendering `ProductionTimeCard` from `production-time-fixtures.ts`: the budget
  case, the no-budget case, the excluded row, the reassignment row (`×2`), and the over-budget
  headline.
- `tsc -p packages/item-economics/tsconfig.json --noEmit` clean.

---

## Track B — logic specification (Codex)

Build bottom-up, in this order (`16_feature_workflow.md`).

### 1. Types — `src/types.ts`

Add the production-time DTOs. Decimals arrive as **strings** — keep them as strings in the DTO
(`DecimalStringSchema`) and parse at the point of use; never coerce to `number` in the schema.
Seconds are integers. Nullable everywhere the handoff says nullable:

- `budget.*` — every field nullable (including `actual_worker_seconds`).
- `sections[].allowance_seconds`, `left_seconds` — nullable **and** legitimately negative.
- `sections[].section_name`, `order_list`, `typical` — nullable (deleted section).
- `share_state` — `on_track | over_share | excluded | no_budget`.
- `status` — reuse `ItemEconomicsStatusSchema` already in `types.ts`.
- `item_binding` — `bound | detached | mismatched`.
- `final` — nullable object.
- `allocation_method`, `typical.method`, `typical.window_days`, `typical.min_sample_size` — keep
  them in the DTO. They are derivation labels; any explanatory copy keys off them rather than
  hard-coding "90-day median".

Name the response DTO `TaskProductionTime`.

### 2. Query key — `src/api/item-economics-keys.ts`

Add under the existing task branch:

```ts
taskProductionTime: (taskId: TaskId) =>
  [...itemEconomicsKeys.task(taskId), "production-time"] as const,
```

### 3. Fetch — `src/api/fetch-task-production-time.ts`

`apiClient.get(\`/api/v1/item-economics/tasks/${taskId}/production-time\`, Envelope)`, envelope
via `ApiEnvelopeSchema`, returns `response.data`. Parse happens here and nowhere else
(`24_dto.md §Where DTOs are parsed`).

### 4. Query hook — `src/api/use-task-production-time-query.ts`

`useQuery` with `queryKey: itemEconomicsKeys.taskProductionTime(taskId)`,
`enabled: Boolean(taskId)`. Two documented deviations from the global defaults
(`05_server_state.md` permits deviation *with a documented reason* — write the reason in a
comment):

- `refetchInterval: 45_000` — the handoff's 30–60s poll. TanStack does not poll a hidden tab by
  default, which is exactly the "while the component is visible" requirement.
- `retry: (count, error) => !(error instanceof ApiRequestError && error.status === 404) && count < 1` —
  a 404 means the host screen is gone; retrying it is pointless.

### 5. Clock — `src/hooks/use-production-time-clock.ts`

One shared 30s clock for the whole widget, in the shape of
`packages/stats/src/hooks/use-current-minute.ts`. Signature `useProductionTimeClock(enabled:
boolean): number` returning epoch ms. `enabled` is `true` only when at least one section is
`working` — a task with nothing in progress must not schedule a timer. **One clock, never one
per row** (acceptance criterion 9).

### 6. Transform — `src/lib/production-time-dto.ts`

`toProductionTimeViewModel(dto: TaskProductionTime, nowMs: number): ProductionTimeViewModel`.
Pure — `nowMs` is a parameter, never read from `Date.now()` inside, so the tests are
deterministic.

- `item_binding !== "bound"` → `{ kind: "unavailable", reason }`.
- `status` not in `{ ok, infeasible }` → `{ kind: "no_budget", … }`, worked total **summed from
  `sections[].worked_seconds`** because `budget.actual_worker_seconds` is `null`.
- Otherwise `{ kind: "budget", … }`.
- **Live tick:** for each section with `state === "working"`, add
  `floor((nowMs - Date.parse(state_entered_at)) / 1000)`, clamped at `>= 0`, to that row's
  worked seconds and to the headline total, and subtract it from remaining. Anchor is
  `state_entered_at` — **never** the fetch time, or the timer resets on every reload
  (see `reference_worker_stats_ticker_anchor`). Missing/unparseable `state_entered_at` → no tick
  for that row, not `NaN`.
- Naive per-row ticking over-counts against the backend's averaged concurrent credit. Display
  only — never persist it, never drive an alert from it. Add that as a comment.
- Prefer `final` for the headline when it is non-null, and set `isFinal`.
- Row label: `section_name_snapshot ?? section_name ?? "Unnamed section"` — the snapshot is what
  the worker was assigned to. `section_name` is for pickers and settings, which this widget is
  not.
- **Never sort, filter or re-order `sections`.** Map it 1:1.
- **Never aggregate a section state from its steps.** `state` is already the later, active step's
  state; the backend guarantees no two steps of one section run concurrently. Read the field,
  pass it to `stateToTone()`, and set `isActive` from `state === "working"`. Nothing else.
- `share_state` is copied through. No comparison of worked to allowance decides a verdict.

### 7. Controller — `src/controllers/use-production-time.controller.ts`

Calls the query hook, derives `hasWorkingSection` from the raw data, feeds it to the clock, calls
the transform, and returns
`{ viewModel, isPending, isError, isNotFound, refetch }`. `isNotFound` is
`error instanceof ApiRequestError && error.status === 404`. The transform is called here, not in a
component (`24_dto.md`).

### 8. Root — `src/components/production-time/ProductionTimeSection.tsx`

```tsx
type ProductionTimeSectionProps = { taskId: string; className?: string };
```

Branches, in order:

1. `isNotFound` → `null`. The component hides itself; the handoff is explicit.
2. `isPending` → `<ProductionTimeCardSkeleton />`. It renders its own section label, so do not
   wrap it in one.
3. `isError` → a one-line muted "Could not load production time." with a retry button, matching
   `TaskFlowTimeline`'s error affordance. Wrap it in `<ProductionTimeFrame>` so the label and
   card border survive the failure.
4. otherwise → `<ProductionTimeCard viewModel={viewModel} />`.

**There is no `unavailable` branch here and no empty-list branch.** `ProductionTimeCard` already
switches on all three `kind` values and returns `null` for a pipeline with no sections — pass the
view model straight through and let it decide.

This is the only Track B file in the component folder, and the only one that may call hooks.

### 9. Socket — `src/socket-events.ts`

```ts
export const itemEconomicsSocketEvents: SocketEventHandlers = {
  "task:step-state-changed": /* invalidate taskProductionTime for the task */,
  "item_economics:evaluation-committed": /* same */,
};
```

`item_economics:evaluation-committed` (payload `{ client_id, evaluation_id }`, where `client_id`
is the **task** id) must first be declared in
`packages/realtime/src/lib/socket-types.ts` — it is not there yet. That one invalidates
`itemEconomicsKeys.taskProductionTime(client_id)` precisely.

**Registry composition — resolved 2026-08-18.** All three apps compose their registries with
object spread, which is last-write-wins: every app already handles `task:step-state-changed` in
its own task map, so spreading `itemEconomicsSocketEvents` alongside it silently drops one of the
two. Found by Codex at the Track B gate; an audit confirmed these are the only three collisions
in the codebase, one per app, all introduced by this work.

The fix is a composition helper rather than three hand-written merges:

- **New:** `packages/realtime/src/lib/socket-compose.ts` exporting
  `composeSocketHandlers(...maps: SocketEventHandlers[]): SocketEventHandlers`. Same key in more
  than one map → **every** handler runs, in the order the maps were passed. A key claimed by one
  map is returned as-is, with no wrapper. Export it from `packages/realtime/src/index.ts`.
- The heterogeneous mapped type needs narrowing inside the helper; use `unknown`-based casts,
  never `any` (`02_types.md`). The public signature stays strict.
- **Swap all three `src/app/socket-registry.ts` files** from object spread to
  `composeSocketHandlers(...)`, preserving the current map order.
- Behaviour is unchanged for every event except the three collisions, which is the point: no
  handler can be silently dropped again.
- `@beyo/realtime` has no vitest config yet. Add one mirroring
  `packages/item-economics/vitest.config.ts`, plus a `test:realtime` script in the root
  `package.json`, and cover: two maps claiming one key both run in order; a single-handler key
  passes through untouched; `undefined` handlers are skipped.

`task:step-state-changed` cannot be targeted the same way: its payload is
`Array<{ client_id, new_state }>` where `client_id` is the **step** id, not the task id
(verified in `socket-types.ts:88`). There is no task id to key off, so this handler invalidates
`itemEconomicsKeys.tasks()` — broad, but the only mounted production-time query at any moment is
the open task detail, so it costs one refetch. Do **not** invent a task lookup to narrow it.

Invalidate with `refetchType: "active"`, mirroring `packages/pause-reasons/src/socket-events.ts`.
Register the map in each app's `src/app/socket-registry.ts`.

### 10. Public API — `src/index.ts`

Export `ProductionTimeSection`, the DTO/VM types, `itemEconomicsSocketEvents`, and the query key
factory addition. **Static exports** — this is not a surface page, so `35_shared_packages.md §14`
does not apply and no loader function is needed.

### 11. Mounting

Both pages already render `<TaskFlowTimeline …/>` as the last child inside a `ContentCard`.
Insert directly above it:

```tsx
<ProductionTimeSection taskId={controller.taskId} />
```

- `packages/tasks/src/pages/TaskDetailSlidePage.tsx` — immediately before `<TaskFlowTimeline>`.
- `apps/workers-app/.../src/pages/task_steps/TaskDetailSlidePage.tsx` — immediately before the
  `<div className="mt-5">` that wraps `<TaskFlowTimeline>`.

`packages/tasks/package.json` gains `"@beyo/item-economics": "*"` as a peer dependency. Verify
`@beyo/item-economics` does not import `@beyo/tasks` — see §Risks.

### 12. App wiring

`packages/tasks`'s `TaskDetailSlidePage` is registered by **managers, workers and sellers**. All
three therefore render the widget and all three need wiring:

- `"@beyo/item-economics": "*"` in each app's `package.json` dependencies.
- `@source "../../../../packages/item-economics/src";` in each app's `src/index.css`. **Omitting
  this produces an unstyled widget with no error** (`35_shared_packages.md §6 step 4`).
- `npm install` from `frontend/` — then confirm `node_modules/@beyo/item-economics` is a symlink.
  Note: an install in this repo has previously dropped the `rolldown` / `lightningcss`
  darwin-arm64 bindings from the lockfile; if vite/vitest then reports "Cannot find native
  binding", reinstall those two together.

---

## Risks and mitigations

- **Risk:** circular package dependency. `@beyo/tasks` will depend on `@beyo/item-economics`; if
  `@beyo/item-economics` reaches back for `STEP_STATE_VARIANT` / `humanizeStepState`, the two
  packages import each other.
  **Mitigation:** `@beyo/item-economics` declares no dependency on `@beyo/tasks` at any point.
  The tone map and state labels are local (`production-time-tone.ts`). Enforced by an
  acceptance check: no `@beyo/tasks` import may appear under `packages/item-economics/src`.

- **Risk:** the endpoint does not exist yet, so Track B could be "finished" without ever having
  parsed a real response — and a schema mismatch fails at runtime, not at typecheck.
  **Mitigation:** Track B is not complete until a live response has been rendered. Until then it
  is validated against MSW handlers built from the handoff's literal example payload.

- **Risk:** the naive live tick over-counts on concurrent work.
  **Mitigation:** accepted for display; documented in the transform; never persisted, never
  alerted on; reconciled by the 45s poll and the step-transition invalidation.

- **Risk:** a client-side verdict creeps in — someone "helpfully" compares worked to allowance.
  **Mitigation:** acceptance criterion 5 plus a code review check; `share_state` is copied
  through the transform verbatim and the components receive only `verdictTone`.

- **Risk:** silent unstyled render in one app if an `@source` line is missed.
  **Mitigation:** the wiring step lists all three apps explicitly, and runtime validation runs in
  the workers app *and* a manual check in managers.

- **Risk:** rendering `0m of 0m` or hiding the widget on an unevaluated task.
  **Mitigation:** acceptance criterion 7 and the dedicated `no_budget` branch of the union — the
  type system makes the degraded state unskippable.

---

## Validation plan

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` — zero errors.
- `npm run typecheck` (root) — zero errors across all apps and packages.
- `npm run test:item-economics` — all unit + component tests pass, including:
  - one row with `stepCount: 2` for a reassigned section;
  - a non-`ok` status rendering rows with typicals and no bar;
  - `allowance_seconds <= 0` drawing a full bar with no division;
  - the rendered row order matching the payload order exactly;
  - a nine-section payload with the working section at index 7 rendering that row while
    collapsed.
- `npm run test:unit` in the workers app — no regressions on the task-detail page.
- `npm run test:e2e:mobile` then `npm run test:e2e:desktop` in the workers app — the task-detail
  spec passes with the widget mounted, and no console errors.
- Manual: point the widget and (later) a worker card at the same section and confirm both show
  the same `share_state`.

---

## Track A — build record (2026-08-18)

Built and merged into `packages/item-economics`:

- `tsc -p packages/item-economics/tsconfig.json --noEmit` — clean.
- `npm run test:item-economics` — **43 tests pass** (22 builder, 18 component, 3 pre-existing).
- ESLint clean under the workers-app config.
- `lucide-react` added to the package's peer dependencies (the toggle chevron).
- Track A's public surface is exported from `src/index.ts`. Track B appends
  `ProductionTimeSection`, the DTO schemas and `itemEconomicsSocketEvents` to the same file.

Two deviations from the plan as written, both to keep a contract honest:

1. `buildRowDetail` takes `shareState` as a fourth argument. As originally specified it would
   have derived the verdict from `worked` vs `allowance`, which is exactly what acceptance
   criterion 5 forbids. The server's verdict is now passed in and copied out.
2. `stateToTone` / `humanizeSectionState` live in `lib/`, not in the components folder, so that
   Track B's transform can reach them without `lib/` importing from `components/`.

Two components not in the original file map: `ProductionTimeFrame` (the shared shell, so the
card, the degraded state and the skeleton cannot drift apart) and `ProductionTimeUnavailableCard`.

A visual review page was generated for approval by server-rendering every fixture through the
real components and compiling the app's Tailwind output over the resulting markup — so the
review surface is the component itself, not a mockup of it.

## Review log

- `2026-08-19` `Claude Opus 5` (reviewer, round 1): **`CHANGES_REQUESTED`** — no blocking, four
  should-fix, ten notes. Handoff:
  `handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_1.md`.
  Re-derived: `npm run typecheck` exit 0; `npm run test:item-economics` 108/108 (77 attributable
  to this phase, 31 to item-pricing in the same package); `npm run test:realtime` 5/5; ESLint on
  the phase perimeter — one error, `use-production-time-clock.ts:12`. Playwright not re-derived
  (no dev server).
  **F1 should-fix** — `ProductionTimeUnavailableCard` says "no longer linked to an item", but the
  backend sets `item_binding: "detached"` whenever there is no primary item at all
  (`get_task_budget_status.py:111`), so a task that never had one is told it lost one; the frame
  also renders before the empty-sections check.
  **F2 should-fix** — criterion 12 is unqualified but only `ProductionTimeBudgetBody` truncates;
  `ProductionTimeNoBudgetCard` renders every row with no toggle.
  **F3 should-fix** — `stateToTone` is asserted on five of nine states; deleting `case "paused":`
  left all 108 tests green (mutation run, reverted). Charter rule 2.
  **F4 should-fix** — `architecture/21_realtime.md` §App-level assembly still documents the spread
  registry that all three apps have abandoned; route a lettered amendment (owner card 2).
  Notes N1–N10 in the handoff: the clock's lint error and why `useTickingElapsed` is not a
  drop-in; a dead "Show all 5 stages" toggle when the active row is the fifth; the fixtures
  re-implementing the transform; `pendingLabels` selecting on tone so cancelled/skipped stages are
  named and blocked ones are not; no registry-level test of the composition; darwin-arm64 bindings
  in root `dependencies`; `infeasible` untested; stale comments and the
  `compose-socket-handlers.ts` name still in §Track B step 9 and §File map; the empty-`taskId`
  permanent skeleton (pre-existing idiom, shared with `TaskFlowTimeline`).
  Verified correct and settled: the Zod schema against the backend serializer field by field — no
  divergence, no `.nullable()` field the backend omits; `composeSocketHandlers` cannot drop a
  handler (structural read plus a reverted last-write-wins mutation that turned 3 of 5 tests red);
  the only shared registry key in any app is `task:step-state-changed`; `ApiRequestError`-keyed
  404-hide and one-retry policy; the `state_entered_at` tick anchor; no client-side verdict; no
  sort anywhere. Three owner decision cards in the handoff.
- `2026-08-18` `Codex` (Track B verification): owner started the current workers frontend and
  corrected its backend origin. `production-time.spec.ts` passed in both the mobile and desktop
  projects against the running app. The spec intercepts the undeployed production-time endpoint
  with `page.route`, so this verifies package/app wiring, rendering, payload order, snapshot-label
  fallback and placement above `TaskFlowTimeline`; it does **not** verify the backend response
  contract or a live endpoint. Both complete Playwright projects still exit non-zero with the
  same three unrelated failures: the expected settings tab is absent, the live reassigned list
  does not render, and the presentation viewport does not close. These tests were not changed;
  mobile and desktop trace archives were captured under their corresponding `test-results`
  directories. Local reuse is now explicit and opt-in via `PLAYWRIGHT_REUSE_SERVER=true`, while
  the default remains false so clean/CI runs cannot silently test a stale server.
- `2026-08-18` `Codex` (Track B socket composition): implemented the owner-approved
  `composeSocketHandlers` helper in `packages/realtime/src/lib/socket-compose.ts`, converted all
  three app registries without changing map order, and added regression coverage proving the
  item-economics and task-step query families are both invalidated. The plan's step 9 still names
  `compose-socket-handlers.ts`; the owner's later, explicit filename `socket-compose.ts` was used
  to match the existing `socket-*` siblings. `21_realtime.md` still documents only object-spread
  registries and does not define shared-key composition; per owner direction, that contract gap
  is recorded here rather than changing the approved architecture contract in this phase.
- `2026-08-18` `Codex` (Track B browser-validation gate): the required workers Playwright npm
  scripts cannot be run under the explicit no-dev-server instruction while
  `playwright.config.ts` has `webServer.reuseExistingServer: false`; port 5174 is not currently
  running. Credentials are present and the new production-time spec is discovered for the mobile
  project. Owner must start the app and authorize a no-webserver Playwright invocation (or permit
  the scripts to launch Vite) before mobile and desktop can be verified.
- `2026-08-18` `Codex` (Track B app-wiring gate): implementation paused on a second
  plan/code contradiction. All three app task socket maps already own
  `task:step-state-changed`; spreading `itemEconomicsSocketEvents` beside them silently
  overwrites one handler. With the current WIP spread order, the existing task handler wins
  and production time is not invalidated, failing criterion 11. `21_realtime.md` requires a
  shared event to be composed once at the app-level registry. Owner direction is required on
  composing both existing and item-economics handlers in each registry versus amending the
  package map/plan.
- `2026-08-18` `Codex` (Track B opening gate): implementation paused before code changes
  because Track B steps 4 and 7 require `error instanceof ApiError`, while the repository's
  actual API-client public class is `ApiRequestError` (`@beyo/api-client`) and no `ApiError`
  alias exists. Existing callers also use `ApiRequestError`. Owner confirmation is required
  before substituting the repository class in the production-time query/controller.
- `2026-08-18` `Claude Opus 5`: plan authored from the backend handoff and the approved mockup.
  Six clarifications raised, each with a stated interim behaviour so Track A is not blocked.
- `2026-08-18` `David`: decisions resolved — v1 is read-only (no CTAs); the widget ships to all
  three apps including sellers; the footer note names unfinished stages; long pipelines truncate
  to four rows behind a *Show all* toggle. Plan updated: §Decisions, §Row truncation,
  `selectVisibleRows` builder, `ProductionTimeRowsToggle`, acceptance criteria 12–13.
  Two clarifications remain open with backend (section `state` domain, tick semantics); both are
  absorbed by the view model and block neither track's start.
- `2026-08-18` `David`: both clarifications closed. Section `state` is the task-step vocabulary,
  already sent pre-aggregated as the later active step — no client-side derivation. The active
  row's tick marks the typical against the allowance, as read. No code change followed; the
  shipped tone map and transform spec were already correct. Plan is fully resolved and ready for
  the logic track.
- `2026-08-18` `Claude Opus 5`: **confirmed — Codex is correct, the plan was wrong.** The class is
  `ApiRequestError`, exported from `@beyo/api-client` (`packages/api-client/src/index.ts:1`); no
  `ApiError` exists. The plan's name came from misreading `ApiErrorSchema` in `@beyo/lib`, which
  is the Zod schema for the error *response body* — a different thing with a confusingly similar
  name. All three references corrected (§Contracts, §Track B steps 4 and 7) and the two names
  disambiguated in §Contracts so the trap is not re-set. Use `ApiRequestError`, matching
  `packages/stats/src/pages/WorkerTimelineSlidePage.tsx:186`.

- `2026-08-18` `Codex` (Track B): reported that every app already handles
  `task:step-state-changed`, so the registry's object spread silently drops one handler.
- `2026-08-18` `Claude Opus 5` + `David`: **confirmed and resolved.** An audit of all three
  registries found exactly three collisions, all `task:step-state-changed`, all introduced by
  this work — no pre-existing ones. Rather than three hand-written merges, `@beyo/realtime`
  gains `composeSocketHandlers(...maps)`, which chains same-key handlers instead of overwriting,
  and all three registries switch to it. Behaviour-identical today; removes the silent-drop trap
  for every future package. Spec added to §Track B step 9. `21_realtime.md` is not violated —
  it documents the spread pattern but never contemplated two maps claiming one event; that gap
  should be folded back into the contract once this ships.
- `2026-08-19` `Claude Opus 5` (coordinator): checkpointed and normalized. All three intertwined
  workstreams were still untracked — no commit had ever been made — so the charter's two
  perimeter claims ("probes reverted", "nothing changed outside the perimeter") were structurally
  unverifiable. Committed as one `CHECKPOINT (not approved):` baseline on branch
  `pipeline/item-economics-phase-1`; the streams edit the same lines in the same files
  (`packages/items/src/types.ts`, `normalize-task-form-payload.ts`) and do not separate into
  truthful standalone commits. Folder normalized to the charter layout: the plan moved to
  `plans/`, the spent Codex prompts to `prompts/implementer/` (they were orphan rows at the
  project root), row-schema frontmatter added to every prompt and handoff. Archiving was
  requested and declined: it is step 2 of the closeout ritual at `APPROVED`, and no review round
  has been run.
- `2026-08-19` `David` (review round 1, card 1 — **resolved**): a task cannot be created without an
  item, so F1's "never had an item" premise is unreachable and the `detached` copy stays as
  written. Verified against the code rather than assumed: all four creation forms guarantee an
  item. Internal and worker-internal require an article number or SKU plus a category
  (`packages/task-creation/src/types.ts` superRefines); Return and Pre-order waive the identity
  rule only when a SKU template exists, and in exactly that case pass
  `forceItemInclusion` (`ReturnFormContent.tsx:343`, `PreOrderFormContent.tsx:382`), so
  `buildItemFields` still emits the item. The waiver and the force flag are deliberately paired.
  Caveat recorded, not blocking: `CreateTaskRequest.item` is `| None = None` backend-side, so the
  guarantee is a frontend policy — a future non-form client could produce an itemless task, and
  `remove_item_from_task.py` remains the genuine path the copy describes. Cards 2 and 3 remain
  open.
- `2026-08-19` `Claude Opus 5` (coordinator, review round 1 folded): verdict
  `CHANGES_REQUESTED` — 0 blocking, 4 should-fix, 10 notes. Card 1 dismissed (owner: no task can
  be created without an item; verified against all four form schemas). Card 2 approved: amend
  `21_realtime.md` now, as a lettered section. Card 3 answered by measurement rather than by
  accepting the record — see below. Fix cycle scoped to F2, F3, F4 + N2, N4, N5, N7, N8;
  N1 (shared clock hook), N3 (fixtures re-implementing the transform), N6 (platform-pinned native
  bindings → `npm ci` fails `EBADPLATFORM` off darwin-arm64) and N9 (`isPending` vs `isLoading`,
  shared with `TaskFlowTimeline`) deferred to a maintenance phase. Plan amended here: criterion 12
  now binds **both** frames, criterion 5a added for full state enumeration, and §Track B step 9's
  stale `compose-socket-handlers.ts` corrected to `socket-compose.ts` (N8's plan half).
- `2026-08-19` `Claude Opus 5` (live verification, owner's servers + backend up): the workers
  Playwright spec passed in both projects, re-derived rather than trusted (criterion 14's browser
  half). **The endpoint is deployed on the dev backend**, so the response contract was checked
  against real traffic for the first time: 25 real tasks fetched, **25/25 parse clean** against
  `TaskProductionTimeSchema` — envelope, section shape, `+00:00` offsets, `typical`, every
  nullable field. The `.nullable()`-vs-missing-key failure class is confirmed absent. Limits:
  every one of the 25 returned `status: item_unvalued` / `item_binding: bound`, so **`ok` has
  still never been observed** (no item in the workspace carries a price yet — the pricing fields
  are what unblock it), and neither `detached` nor `mismatched` appeared. Live data also
  **confirms F2 is not hypothetical**: 7 of the 25 tasks carry more than four sections (up to
  seven), all `item_unvalued`, hence all routed to the frame that never truncates.
- `2026-08-19` `Codex` (fix round 3): all eight items implemented inside the authorized perimeter
  — F2, N2, F3, N4, F4, N5, N7, N8. Committed as `0f11125e`.
- `2026-08-19` `Claude Opus 5` (reviewer, round 2 — delta-scoped re-review of fix round 3):
  **`CHANGES_REQUESTED`** — one should-fix, four notes. Handoff:
  `handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_2.md`.
  Perimeter verified against `git diff 87069073 0f11125e`: twelve files, all inside the authorized
  list, nothing outside; `production-time-fixtures.ts` is imported by the new tests but unchanged
  since the checkpoint. Re-derived, not accepted: typecheck exit 0; item-economics **131/131**;
  realtime 5/5; managers 81/81, workers 30/30, sellers 3/3; ESLint clean on all ten changed
  TS/TSX files; **Playwright 2/2** in both projects against the owner's running app (servers
  preflighted at 200, none started) — criterion 14's browser half now re-derived.
  **All eight items resolved:** F2 (degraded frame truncates, own expansion state), N2 (both
  frames derive the toggle from `collapsedRows.length < rows.length`; the five-rows-last-active
  case asserted for both), F3 (nine states, one row each, for `stateToTone` and
  `humanizeSectionState`), N4 (selection reads `section.state`), F4 (contract amendment), N5
  (three per-app registry tests), N7 (`infeasible` locked), N8 (barrel comment).
  **G1 should-fix** — probe 1 answered: `failed` in `isUnfinishedSectionState` is *not* redundant.
  A section whose only pass failed is already `excluded`; a failed-plus-pending section reports
  `pending`; but a **completed pass followed by a later failed pass** arrives as `state: "failed"`
  with `share_state: on_track`, so the footer names a stage with no open step. `failed` is in the
  backend's `TERMINAL_STEP_STATES`, §Decisions says the footer names sections "not yet terminal",
  and this same fix dropped `cancelled`/`skipped` on that reasoning. Removing `failed` leaves all
  131 tests green, so it is unpinned either way. One owner card.
  Notes: G2 the `sections[index]`/`rows[index]` pairing is correct today but guarded only
  incidentally — a `toRows` filter fails the 1:1 test, nothing asserts label correspondence;
  build the labels inside `toRows` instead. G3 `ended_shift` cannot arrive (backend enum has eight
  values). G4 the registry tests assert identity, never that both handlers run. G5 the truncation
  case table walked on both frames — two rows lack tests (degraded frame with five rows none
  active; either frame with two concurrent active rows), both correct by construction.
  Mutation probes run and reverted, checksums recorded: deleting `case "blocked":` bites (1/41);
  removing `blocked` from the unfinished set bites (1/24); removing `failed` does **not** (G1);
  a `toRows` filter bites the 1:1 test only; reverting the workers registry to a spread bites, as
  does dropping a map from its argument list. Contract amendment verified additive — +36 lines,
  zero deletions, existing §App-level assembly byte-identical, all three documented semantics
  accurate against `socket-compose.ts`.
  Still unproven and unchanged: no `ok`-status response has ever been rendered, so the entire
  budget frame — bar, headline arithmetic, live tick, footer, and G1 itself — is fixture-proven
  only.
- `2026-08-19` `Claude Opus 5` (coordinator, fix round folded): verified rather than accepted.
  Perimeter is exactly the eleven declared files plus the handoff — nothing outside, no prompt or
  plan edit, clean tree. Suites re-run independently: typecheck clean, item-economics **131/131**
  (up from 108), realtime 5/5, the three new registry tests 1/1 each, and Playwright 2/2 in both
  projects against the owner's running app. The F3 mutation probe now bites (deleting
  `case "paused":` fails exactly one test), which is what round 1 proved it did not.
  Two items carried into re-review round 2 rather than settled here: (a) `failed` in
  `isUnfinishedSectionState` — see the amendment to §Footer note above; (b) the new
  `sections[index]`/`rows[index]` pairing in `pendingLabels`, which is correct today but rests on
  an unasserted 1:1 invariant. §Footer note amended in its home artifact to describe
  state-based selection.
- `2026-08-19` `Claude Opus 5` (review round 2, delta-scoped): verdict `CHANGES_REQUESTED` — all
  eight fixed items (F2, N2, F3, N4, F4, N5, N7, N8) confirmed **resolved**, each re-derived
  rather than accepted, with six mutation probes declared and reverted. Perimeter clean.
  Criterion 14 fully re-derived including the browser half. One should-fix: G1 (`failed`), plus
  four notes — G2 (index pairing acceptable as shipped; recommends building labels inside
  `toRows` to remove the invariant rather than document it), G3 (`ended_shift` unreachable),
  G4 (registry tests assert identity, not invocation), G5 (case table walked on both frames; two
  pre-existing untested rows named).
- `2026-08-19` `David` (G1 — **resolved**): drop `failed`. A stage completed, re-run and failed
  has no open step, so naming it as work the remaining time is "left for" sends the reader looking
  for work nobody is meant to do — the same reasoning that already excludes `cancelled` and
  `skipped`.
- `2026-08-19` `Claude Opus 5` (coordinator, G1 implemented): backend claims verified at source
  before acting — `TERMINAL_STEP_STATES` in `domain/task_steps/constants.py` contains `FAILED`,
  and `_governing_step` (`budget_division.py:183`) prefers live steps and otherwise returns the
  latest by `entered_at`, which is what makes the completed-then-failed case arrive as `failed`
  and not `excluded`. `failed` removed from `isUnfinishedSectionState`; a test now asserts a
  completed-then-failed section is **not** named. Mutation-checked: re-adding the member fails
  exactly that one test (1 failed / 132), then reverted byte-identically. 132/132 pass, typecheck
  and lint clean. §Footer note amended in its home artifact; the "carried under review" marker is
  retired.
- `2026-08-19` `David`: **APPROVED.** Round 3 waived — the G1 correction was one line plus one
  test, specified precisely by the reviewer, implemented exactly as specified and mutation-checked,
  on top of a round-2 pass that re-derived everything else and found the perimeter clean. A third
  round would have cost more than it could discover. Waiver recorded here rather than left
  implicit.
- `2026-08-19` `Claude Opus 5` (coordinator, closeout): the phase's spent prompts (5) and consumed
  handoffs (4) moved to `archive/plan_1/`; `prompts/` and `handoffs/` now hold only live state,
  which for this phase is none. Historical references to `prompts/<file>` in this log resolve under
  `archive/plan_1/` — not rewritten, per the charter. This plan file stays in `plans/` as the phase
  row. The branch `pipeline/item-economics-phase-1` is **not** merged to `main`: it also carries
  the item_pricing_fields phase, which has not been reviewed.

## Lifecycle transition

- Current state: **`APPROVED`** (2026-08-19, `David`). Two review rounds, one fix cycle, one
  owner-waived third round. Every finding resolved, dismissed on evidence, or deferred by owner
  decision. Review handoffs at `archive/plan_1/handoff_..._review_{1,2}.md`.
- Next state: none — the phase is closed. Two things outlive it and belong to other work:
  (a) **no `ok`-status response has ever been rendered**, so the entire budget frame is proven only
  against fixtures — pricing an item is what unblocks it, which is the item_pricing_fields phase;
  (b) six items await a maintenance phase — N1 (`useSyncExternalStore` clock, shared with
  `@beyo/stats`), N3 (fixtures re-implementing the transform), N6 (platform-pinned native bindings
  break `npm ci` off darwin-arm64), N9 (`isPending` vs `isLoading`, shared with
  `TaskFlowTimeline`), G2 (build footer labels inside `toRows` to remove the index invariant) and
  G4 (registry tests assert identity, not invocation).
- Transition owner: `David`
- Archive: **done** 2026-08-19 — 5 spent prompts and 4 consumed handoffs under `archive/plan_1/`,
  moved with the approval-gate commit.
