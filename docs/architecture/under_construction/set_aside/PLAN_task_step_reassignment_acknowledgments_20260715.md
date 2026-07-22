# PLAN — Task-step reassignment acknowledgment card (workers app)

## Metadata

- Plan ID: `PLAN_task_step_reassignment_acknowledgments_20260715`
- Status: `implemented` (archive held pending green e2e — see summary)
- Owner agent: `claude`
- Created at (UTC): `2026-07-15T00:00:00Z`
- Last updated at (UTC): `2026-07-15T21:00:00Z`
- Intention plan: `docs/architecture/under_construction/intention/reasign_step.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_task_step_reassignment_acknowledgments_20260715.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_step_acknowledgments_20260715.md`
- App: `apps/workers-app/ManagerBeyo-app-workers`
- Feature: `src/features/task_steps` (extends the existing feature — no new package)

---

## Goal

When a manager adds steps to a task that has already reached `ready`, the task reopens
(`ready → working`) and the already-assigned worker gains new obligations. Each obligation is a
per-worker **read receipt** the worker must first *see* (`/seen`) and then explicitly
*acknowledge* (`/acknowledge`).

Surface these obligations on the workers app as a **shell-level card stack** rendered directly
above `LastActiveStepCard`, styled like the attached mock: item image on the left, a `REASSIGNED`
pill + item identity + truncated reason in the body, and a circular check (acknowledge) button on
the right.

Behaviour requirements from the intention:
1. Renders **above** `LastActiveStepCard`.
2. If no `LastActiveStepCard` is present, it still **reserves the empty slot below** (does not drop
   to the nav edge) — it holds the same vertical position as if the last-active card were there.
3. Uses the **same global scroll-visibility** signal as `LastActiveStepCard`, but adds a **slight
   transition delay to `LastActiveStepCard`** so the two cards fold/unfold in a staggered motion.
4. Fires `/seen` for obligations whose `acknowledgment.first_seen_at` is `null` **once the card is
   actually visible** (app open, not scroll-hidden, not on a hidden route).

---

## Contract selection (required output block)

### Read order

- `architecture/01_architecture.md` (baseline) — layer boundaries
- `architecture/05_server_state.md` (baseline) — query hook shape
- `architecture/08_hooks.md` (baseline) — action hooks + optimistic updates/rollback
- `architecture/13_errors.md` (baseline) — error envelope handling
- `architecture/15_feature_structure.md` (baseline)
- `architecture/07_components.md` — feature component consuming context only
- `architecture/23_providers.md` — controller → provider → context wiring
- `architecture/24_dto.md` — DTO schema + `toXxxViewModel`
- `architecture/36_scroll_visibility.md` — **global** pattern (`useScrollVisibilityContext`), CSS-var animation, z-index stacking, stagger via `transition-delay`
- `architecture/21_realtime.md` — socket-driven invalidation
- `architecture/17_testing.md` + `architecture/34_runtime_validation.md` + `_local` — vitest + Playwright + `data-testid` naming
- `architecture/04_api_client_local.md` — flat error shape, envelope

Applied precedence: local extensions override baseline for this app only.

### Domain schemas consulted

- `src/features/task_steps/types.ts`:
  - `TaskStepSchema` / `TaskStep` — the pending payload item is **byte-for-byte the resume-card step
    shape**, i.e. exactly this schema. Zod strips the few extra top-level keys the handoff shows
    (`ready_by_at`, `total_cost_minor` at step root) with no error; `dependency_working_sections`
    is `.default([])` and simply absent here. **Reuse `TaskStepSchema` verbatim.**
  - `toTaskStepCardViewModel(step)` — already produces `articleLabel` (`#article_number` → `sku` →
    fallback), `firstImageUrl`, annotations, `quantityPillLabel`. **Reuse** for image + identity; the
    card adds only the `reason`.
  - `UserRefSchema` — matches the `worker` / `created_by` compact user shape in the ack block.
- `src/features/task_steps/api/task-step-keys.ts` — extend `taskStepKeys`.

### Excluded contracts

- `28_surfaces.md` / `33_vaul_drawer.md` — no new surface; tapping the card reuses the existing
  `TASK_STEP_DETAIL_SURFACE_ID`.
- `09_forms.md` / `11_routing.md` / `10_pages.md` — no form, no route, no page.
- `30_dynamic_loading.md` — shell-mounted card, always present; nothing to code-split.

---

## Data model

The `/pending` response is `{ data: { acknowledgments: TaskStepWithAck[], acknowledgments_pagination }, ok, warnings }`.

Add to `src/features/task_steps/types.ts`:

```ts
export const AcknowledgmentSchema = z.object({
  client_id: z.string(),                    // tsa_…
  step_id: TaskStepIdSchema,
  task_id: TaskIdSchema,
  reason: z.string().nullable(),
  worker: UserRefSchema.nullable(),
  created_by: UserRefSchema.nullable(),
  first_seen_at: z.string().nullable(),
  acknowledged_at: z.string().nullable(),   // always null in /pending
  created_at: z.string(),
});
export type Acknowledgment = z.infer<typeof AcknowledgmentSchema>;

export const ReassignmentStepSchema = TaskStepSchema.extend({
  acknowledgment: AcknowledgmentSchema,
});
export type ReassignmentStep = z.infer<typeof ReassignmentStepSchema>;

export type ReassignmentAckViewModel = {
  stepId: TaskStepId;
  taskId: TaskId;
  articleLabel: string;          // from toTaskStepCardViewModel
  reason: string | null;         // acknowledgment.reason, rendered truncated in the card
  firstImageUrl: string | null;
  firstImageAnnotations: ImageAnnotationViewModel[];
  firstImageWidthPx: number | null;
  firstImageHeightPx: number | null;
  quantityPillLabel: string | null;
  firstSeenAt: string | null;    // drives /seen gating
  createdByName: string | null;
  step: ReassignmentStep;        // kept for opening detail / image viewer
};

export function toReassignmentAckViewModel(item: ReassignmentStep): ReassignmentAckViewModel {
  const card = toTaskStepCardViewModel(item); // reuse existing label/image logic
  return {
    stepId: card.stepId,
    taskId: card.taskId,
    articleLabel: card.articleLabel,
    reason: item.acknowledgment.reason,
    firstImageUrl: card.firstImageUrl,
    firstImageAnnotations: card.firstImageAnnotations,
    firstImageWidthPx: card.firstImageWidthPx,
    firstImageHeightPx: card.firstImageHeightPx,
    quantityPillLabel: card.quantityPillLabel,
    firstSeenAt: item.acknowledgment.first_seen_at,
    createdByName: item.acknowledgment.created_by?.username ?? null,
    step: item,
  };
}
```

Query keys — extend `taskStepKeys`:

```ts
reassignmentAcks: () => [...taskStepKeys.all, "reassignment-acks"] as const,
```

---

## Layer build (bottom-up)

### 1. API functions

- `api/fetch-pending-acknowledgments.ts`
  - `GET /api/v1/task-step-acknowledgments/pending` (limit 50, offset 0).
  - Envelope: `ApiEnvelopeSchema(z.object({ acknowledgments: z.array(ReassignmentStepSchema), acknowledgments_pagination: PaginationSchema }))`.
  - Returns `ReassignmentStep[]` (first page is sufficient for a shell card; pagination not surfaced).
- `api/mark-acknowledgments-seen.ts`
  - `POST /api/v1/task-step-acknowledgments/seen` with `{ step_ids }` → returns `seen_step_ids`.
- `api/acknowledge-reassignments.ts`
  - `POST /api/v1/task-step-acknowledgments/acknowledge` with `{ step_ids }` → returns `acknowledged_step_ids`.

### 2. Query hook

- `api/use-pending-acknowledgments.ts` — `useQuery<ReassignmentStep[]>({ queryKey: taskStepKeys.reassignmentAcks(), queryFn: fetchPendingAcknowledgments })`.

### 3. Action hooks (`08_hooks.md` optimistic pattern)

- `actions/use-mark-acknowledgments-seen.ts`
  - `mutationFn` → `markAcknowledgmentsSeen`.
  - On success, patch the cached list in place: set `first_seen_at = now` for the returned
    `seen_step_ids` (prevents re-firing `/seen` after refetch). No rollback needed — `/seen` is a
    passive, idempotent receipt; on error just log/ignore (do **not** notify the user).
- `actions/use-acknowledge-reassignments.ts`
  - `onMutate`: cancel `reassignmentAcks` query, snapshot, **optimistically remove** the acknowledged
    `step_ids` from the cached array (card animates out via `AnimatePresence`).
  - `onError`: restore snapshot + `notify.error(...)` (mirror `use-transition-step-state.ts`).
  - `onSettled`: invalidate `taskStepKeys.reassignmentAcks()`.

### 4. Controller — `controllers/use-reassignment-acknowledgments.controller.ts`

Responsibilities:
- Run `usePendingAcknowledgmentsQuery`; map to `ReassignmentAckViewModel[]` via `useMemo`.
- Stable image-url ref per step to prevent thumbnail flicker on refetch (same technique as
  `use-last-active-step-card.controller.ts`).
- Expose `acknowledge(stepId)` (single row) — calls the acknowledge action with `[stepId]`.
- Expose `acknowledgeAll()` — calls the acknowledge action with **all** current `stepId`s (drives the
  header "Acknowledge all" action). One request; optimistically empties the panel.
- Expose `markVisibleSeen()` — collects `stepId`s whose `firstSeenAt === null` that have **not**
  already been submitted (tracked in a `useRef<Set>`), and if any, calls `markSeen({ step_ids })`
  once. De-dupe ref avoids resending while the request is in flight / after success.
- Expose `handleOpenDetail(step)` — opens `TASK_STEP_DETAIL_SURFACE_ID` with `initialStep`
  (reuses existing surface; decision 2 = confirmed).
- Return `{ vms, count, hasCards, isPending, acknowledge, acknowledgeAll, isAcknowledging, pendingAckStepId, markVisibleSeen, handleOpenDetail }`.

### 5. Provider — `providers/ReassignmentAcknowledgmentsProvider.tsx`

Standard controller → context shell (mirror `LastActiveStepCardProvider.tsx`):
`ReassignmentAcknowledgmentsContext` + `useReassignmentAcknowledgmentsContext()`.

### 6. Component — `components/ReassignmentAcknowledgmentPanel.tsx`

**One unified panel that grows in height** (per the mock), not a stack of separate floating cards.
The whole panel is a single rounded `bg-primary` container with a header and a list of rows.

Two internal parts + the exported shell wrapper:

- **Panel header** (single row inside the container):
  - Left: circular count badge (`count`) + `REASSIGNMENTS` label (uppercase, muted/`opacity-70`).
  - Right: `Acknowledge all` text button → `acknowledgeAll()`; disabled while `isAcknowledging`.
    **Hidden when `count === 1`** (a single row's own check button already covers it).
  - A hairline divider below the header (`border-b border-card/15`).
  - `data-testid`: `reassignment-ack-panel-header`, `-count`, `-acknowledge-all`.

- `ReassignmentAckRow` (memo) — one obligation row inside the panel:
  - Fixed `ROW_HEIGHT` (define a constant, e.g. `4.5rem` / 72px — matches the square thumbnail). The
    three-row cap and the scroll math both depend on rows being a known, uniform height.
  - Left: item image (reuse `ImagePlaceholder` + `ImageAnnotationSvgLayer` markup like
    `CardThumbnail`), a full-`ROW_HEIGHT` square column flush to the left edge. No per-row corner
    radius — the panel's `overflow-hidden rounded-2xl` clips the corner rows automatically. Rows are
    separated by `border-t border-card/15`.
  - Body: `articleLabel` heading (bold, `truncate`), then reason `truncate` subline (fallback to
    `Reassigned to you` when `reason` is null — decision 4 = confirmed default).
  - Tapping the row body opens step detail via `handleOpenDetail(step)` (decision 2 = confirmed).
  - Right: circular white check button (`Check` from lucide) → `acknowledge(stepId)`; disabled while
    `pendingAckStepId === stepId`.
  - `data-testid`: `reassignment-ack-row-${stepId}`, `-image`, `-label`, `-reason`, `-acknowledge`.

- `ReassignmentAcknowledgmentPanel` (memo, default export used by shell):
  - Consumes `useReassignmentAcknowledgmentsContext()` + `useScrollVisibilityContext()` (global).
  - Renders nothing when `!hasCards`.
  - Fixed overlay anchored **above the reserved last-active slot** (see layout §7); width-constrained
    (`left/right` gutter). It grows upward as rows are added, **capped at three rows** (decision 1).
  - Single `bg-primary text-[var(--color-card)] rounded-2xl border shadow-md overflow-hidden`
    container (fully rounded — it floats above the last-active card, unlike the last-active card's
    top-only radius). Layout is **header (fixed) + a scrollable row-list below it**:
    - The **row-list** is its own div: `max-h-[calc(3*var(--ack-row-height))] overflow-y-auto
      overscroll-y-contain` holding the `AnimatePresence` list of `ReassignmentAckRow` (newest first).
      Below 3 rows the list is shorter than the cap and the panel shrinks; at ≥3 it caps and the list
      scrolls internally. This inner scroll is a plain overflow container — it is **not** registered
      as the app scroll element and does **not** drive the global scroll-visibility signal.
    - Row exit animation (`opacity` + height collapse) shrinks the list as rows are acknowledged;
      when the last row leaves, `hasCards` flips and the whole panel unmounts.
  - Reads scroll CSS vars via inline `style` on the outer wrapper (identical to `LastActiveStepCard`):
    `transform: translateY(calc(var(--scroll-hide-progress,0)*100%))`,
    `opacity: calc(1 - var(--scroll-hide-progress,0))`,
    `transition: transform/opacity var(--scroll-snap-duration,0ms) ease-out`.
  - `forceHidden` prop (route/selection hidden) mirrors last-active.
  - **Seen firing:** `useEffect` gated on `hasCards && !forceHidden && !isHidden` calls
    `markVisibleSeen()`. Re-runs when the vm list or visibility changes; the controller's de-dupe ref
    prevents spam. (Chosen over IntersectionObserver: the element is `position: fixed`; `isHidden` +
    `forceHidden` already model true visibility, and an IO on a transl-hidden fixed node still reports
    intersecting.)

### 7. Layout — reserving the last-active slot + z-index

The reassignment panel and the last-active card are independent `position: fixed` shell overlays (do
**not** merge into one flex stack — keeps `LastActiveStepCard`'s existing
`AnimatePresence`/positioning untouched).

- `LastActiveStepCard` bottom (unchanged): `calc(var(--safe-bottom,0) + 3.75rem)`.
- Define `LAST_ACTIVE_SLOT = 5rem` (last-active card ≈ 72px thumbnail-driven height + gap).
- `ReassignmentAcknowledgmentPanel` bottom: `calc(var(--safe-bottom,0) + 3.75rem + 5rem)` — a
  **constant** offset. Because it does not depend on whether the last-active card is mounted, the
  empty slot is always reserved (requirement 2). The panel grows **upward** from that bottom anchor
  as rows are added.
- z-index: both sit at `z-49` (below nav `z-50`, below surfaces `z-100+`), per `36 §Z-index`. The
  panel and last-active never overlap because of the reserved offset.

### 8. Scroll stagger

Requirement: "slight delay at the LastActiveStepCard." Add an optional prop to `LastActiveStepCard`:

```tsx
scrollHideDelayMs?: number; // default 0 → existing behaviour unchanged
```

Applied only to its inline `transition` (`transform ... var(--scroll-snap-duration) ease-out {delay}ms`).
`AppShell` passes e.g. `scrollHideDelayMs={70}`. The reassignment panel keeps `0ms` delay, so on the
release snap / reveal the reassignment panel leads and the last-active card follows — the staggered
fold/unfold. (During active finger tracking `--scroll-snap-duration` is `0ms`, so the delay is inert
mid-drag and only shapes the snap/reveal, which is the desired "nice interaction".)

### 9. AppShell wiring

`app/AppShell.tsx`:
- Wrap `AppShellInner` content in `<ReassignmentAcknowledgmentsProvider>` (inside
  `LastActiveStepCardProvider`).
- Render `<ReassignmentAcknowledgmentPanel forceHidden={shouldHideLastActiveStepCard} />` just above
  `<LastActiveStepCard forceHidden=... scrollHideDelayMs={70} />`.
- Reuse the existing `shouldHideLastActiveStepCard` (route + batch-selection) for both.

### 10. Realtime

There are now **two dedicated, per-worker targeted** acknowledgment events (verified in backend
source). Both are the primary refetch signal for the pending-acknowledgments query — precise and
scoped to the affected worker, so no reliance on the broad `task:step-created` broadcast for this
query.

> ⚠️ **Name correction (verify-claims):** the request said `task:step-acknowledgment-deleted`, but
> the backend actually emits **`task:step-acknowledgment-removed`** (`remove_task_step.py:290`). The
> plan uses the real name. The `-created` name matches.

| Event | Emitted by | Payload |
|---|---|---|
| `task:step-acknowledgment-created` | `add_task_steps.py:271` (reopen/reassignment) | `{ client_id: string /* task_id */, task_id: string, step_ids: string[] }` |
| `task:step-acknowledgment-removed` | `remove_task_step.py:290` (a pending obligation's step removed) | `{ client_id: string /* task_id */, task_id: string, step_ids: string[] }` |

Both use `build_user_event` → delivered only to the involved worker's room (not a workspace
broadcast), so the worker only ever receives events for its own obligations.

**a) Register the event names** in the realtime package type union —
`packages/realtime/src/lib/socket-types.ts`, `ServerToClientEvents`:

```ts
"task:step-acknowledgment-created": (payload: {
  client_id: string; task_id: string; step_ids: string[];
}) => void;
"task:step-acknowledgment-removed": (payload: {
  client_id: string; task_id: string; step_ids: string[];
}) => void;
```

**b) Handle them** in `features/task_steps/socket-events.ts` — both simply refetch the query:

```ts
"task:step-acknowledgment-created": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: taskStepKeys.reassignmentAcks(), refetchType: "active" });
},
"task:step-acknowledgment-removed": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: taskStepKeys.reassignmentAcks(), refetchType: "active" });
},
```

No new socket registration needed — `taskStepSocketEvents` is already spread into
`app/socket-registry.ts`. The earlier fallback of piggybacking on `task:step-created` /
`task:step-deleted` for this query is **dropped** — the dedicated events cover it precisely.

### 11. Public API — `features/task_steps/index.ts`

Export `ReassignmentAcknowledgmentsProvider`, `useReassignmentAcknowledgmentsContext`,
`ReassignmentAcknowledgmentPanel`, and the new view-model types.

---

## Implementation notes / gotchas

These are the non-obvious details that will otherwise surface as bugs:

1. **CSS-var inheritance is already satisfied.** The global `ScrollVisibilityProvider` writes
   `--scroll-hide-progress` / `--scroll-snap-duration` onto a `display:contents` div wrapping the
   whole AppShell (`ScrollVisibilityProvider.tsx:133`). The panel just needs to be rendered inside
   AppShell and read the vars via inline `style` — no ref, no registration. Do **not** call
   `useScrollHide()` (that is the local/surface pattern); use `useScrollVisibilityContext()` only for
   `isHidden` / `pointer-events`.
2. **`stopPropagation` on the row's check button.** The row body is a click target that opens the
   detail surface; the check button is nested inside it. The button's `onClick` must
   `event.stopPropagation()` before calling `acknowledge(stepId)`, or acknowledging also opens the
   detail slide (same pattern as `CardThumbnail` / `CardActionButton` in `LastActiveStepCard.tsx`).
   Same for the header `Acknowledge all` button if it sits within any clickable area.
3. **`/seen` optimistic patch targets the nested field.** The cache holds `ReassignmentStep[]`;
   patch `item.acknowledgment.first_seen_at`, not a top-level field. The de-dupe ref keys on
   `stepId`.
4. **Row `role="button"` + keyboard.** Mirror `LastActiveStepCard`'s `onKeyDown` (Enter/Space) and
   `aria-label`s; the check button gets `aria-label="Acknowledge"`, the count badge an accessible
   label (e.g. `aria-label="{count} reassignments"`).
5. **Panel root `data-testid="reassignment-ack-panel"`** on the outer container (Playwright anchor),
   in addition to the header/row testids.
6. **Horizontal gutter.** Unlike `LastActiveStepCard` (`left-0 right-0`, top-only radius), the panel
   floats with a side gutter (e.g. `left-2 right-2` / `mx-2`) and full `rounded-2xl`, per the mock.
7. **Three-row cap + internal scroll.** The `max-h` / `overflow-y-auto` goes on the **row-list div
   only** — never on the CSS-var wrapper or the panel root (that would clip the shadow and fight the
   scroll-hide transform). Height is `3 * ROW_HEIGHT`; expose `ROW_HEIGHT` as a CSS var
   (`--ack-row-height`) so the cap and the row height can't drift. Add `overscroll-y-contain` so
   scrolling the list doesn't chain to the page. `AnimatePresence` height-collapse on exit shrinks the
   list naturally as rows are acknowledged.
8. **Query is ungated** (no `enabled`), matching `useUserLastActiveStepQuery` — the shell only mounts
   when authenticated. Roles allowed by the endpoint include `WORKER`.
9. **`initialStep` type.** `ReassignmentStep` = `TaskStep` + `acknowledgment`; passing it as the
   detail surface's `initialStep` (typed `TaskStep`) is structurally compatible — the extra field is
   ignored.

---

## Testing (build order gate — Playwright is not optional)

- **Vitest unit**: `toReassignmentAckViewModel` (article fallback, null reason, image mapping);
  seen de-dupe ref logic; acknowledge optimistic-remove + rollback.
- **Vitest component** (MSW): panel renders header count + one row per pending item; `/seen` fires
  once when visible with unseen ids and does **not** fire when `forceHidden`; a row's check button
  triggers `/acknowledge [stepId]` and removes that row; `Acknowledge all` triggers `/acknowledge`
  with every stepId and unmounts the panel.
- **Playwright** `tests/playwright/features/task_steps/reassignment-acknowledgments.spec.ts`
  (import `fixtures/app-fixture`, `auth.signIn()`): reassigned worker sees the panel above the
  last-active card, `/seen` recorded, per-row + `Acknowledge all` clear it. Run `test:e2e:mobile`
  then `:e2e:desktop`.
- **MSW**: add handlers for `GET /pending`, `POST /seen`, `POST /acknowledge` to the shared test
  server; a realtime test can also dispatch `task:step-acknowledgment-created` / `-removed` through
  the existing socket test harness to assert the query refetches.

---

## Decisions — resolved

1. **Multiple pending obligations** → **single panel that expands in height** (per second mock): a
   header row (`{count}` badge + `REASSIGNMENTS` + `Acknowledge all`) over a list of rows, growing
   upward from the reserved bottom anchor. No `gap` between rows; hairline dividers instead. The
   row-list is **capped at three rows tall and scrolls internally** beyond that; as the user
   acknowledges rows the list gets shorter and the panel shrinks, dropping the internal scroll once
   ≤3 remain. Header stays fixed above the scroll area; the count badge still reflects the true total.
2. **Row tap** → opens `TASK_STEP_DETAIL_SURFACE_ID` (`initialStep` = the ack step); check button
   acknowledges. **Confirmed.**
3. **Image side** → **left** (top-left row carries `rounded-tl-2xl`). **Confirmed.**
4. **Copy** → header label `REASSIGNMENTS` + count badge + `Acknowledge all`; null-reason row
   subline falls back to `Reassigned to you`. **Confirmed.**
5. **`Acknowledge all` visibility** → hidden when `count === 1` (the row's own check button suffices);
   shown for `count ≥ 2`. **Confirmed.**

---

## Files

**New**
- `features/task_steps/api/fetch-pending-acknowledgments.ts`
- `features/task_steps/api/mark-acknowledgments-seen.ts`
- `features/task_steps/api/acknowledge-reassignments.ts`
- `features/task_steps/api/use-pending-acknowledgments.ts`
- `features/task_steps/actions/use-mark-acknowledgments-seen.ts`
- `features/task_steps/actions/use-acknowledge-reassignments.ts`
- `features/task_steps/controllers/use-reassignment-acknowledgments.controller.ts`
- `features/task_steps/providers/ReassignmentAcknowledgmentsProvider.tsx`
- `features/task_steps/components/ReassignmentAcknowledgmentPanel.tsx`
- vitest specs + `tests/playwright/features/task_steps/reassignment-acknowledgments.spec.ts`

**Edited**
- `features/task_steps/types.ts` (schemas + view model)
- `features/task_steps/api/task-step-keys.ts` (`reassignmentAcks`)
- `packages/realtime/src/lib/socket-types.ts` (add `task:step-acknowledgment-created` / `-removed` to `ServerToClientEvents`)
- `features/task_steps/socket-events.ts` (handle the two acknowledgment events → refetch `reassignmentAcks()`)
- `features/task_steps/index.ts` (exports)
- `features/task_steps/components/LastActiveStepCard.tsx` (optional `scrollHideDelayMs` prop)
- `app/AppShell.tsx` (provider + panel + stagger delay)

**No change**: no new surface, route, page, or package. Backend endpoints already live.

---

## Build order

Types → keys → api fns + query hook → actions (incl. acknowledge-all path) → controller → provider →
`ReassignmentAcknowledgmentPanel` (+ testids) → `LastActiveStepCard` delay prop → AppShell wiring →
socket-events → index.ts → vitest → Playwright (mobile then desktop) → COMPLETE.
