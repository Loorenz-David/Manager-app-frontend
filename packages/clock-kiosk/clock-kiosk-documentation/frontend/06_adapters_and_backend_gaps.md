# 06 — Adapters, backend gaps, and the mock↔live boundary

Last verified: 2026-07-31

The design was built ahead of the backend. Every design element the API can't
feed yet flows through a **synchronous adapter seam**. Most default to
empty and close via a data change in the HOST; three (`summaryExtras.items/
week/rate`) close via a real default the PACKAGE ships, because the data
arrives embedded in a response the kiosk already fetches rather than needing
a host-owned query — see the gap table below for which is which.

## The adapter seam (`packages/clock-kiosk/src/types.ts`)

```ts
KioskAdapters = {
  scheduledShift: ({user, timeZone, currentShift}) => {start, end} | null
  announcements:  ({user, timeZone}) => KioskAnnouncement[]        // id,title,body,accent,date(ISO)
  summaryExtras:  { items, week, rate }  // each: ({analytics,user,timeZone}) => data | null
}
```

- Adapters are **synchronous presentation seams**: `scheduledShift`/
  `announcements` are host-endpoint-backed (the host owns the TanStack query
  and passes `query.data` through); `summaryExtras` defaults to a real mapping
  off `analytics` itself — see below.
- Gating (`lib/kiosk-adapters.ts`): `DEFAULT_ADAPTERS.scheduledShift`/
  `announcements` return null/[]; `DEFAULT_ADAPTERS.summaryExtras` is
  `defaultSummaryExtrasAdapters` (`lib/summary-extras-adapters.ts`), not a
  null-returning stub. `gateAnnouncements` slices to 3 and formats
  ISO→"29 Jul"; `gateSummaryExtras` applies per-key `??` fallbacks (a partial
  `summaryExtras` object can't throw) and hides items/week only when their
  underlying array/days is empty.
- UI gating: every GAP section renders ONLY when its adapter yields data;
  with `scheduledShift`/`announcements` at their null/[] defaults and a
  clock-out that has no analytics, the summary path never renders at all
  (plain result screen instead) — the clock-in result has no scheduled
  column and no announcements — layouts stay balanced either way (kit
  guarantee).

## Gap ↔ adapter ↔ spec mapping

Spec: `docs/architecture/under_construction/implementation/clock_in_out_app/BACKEND_REQUIREMENTS_clock_kiosk_20260729.md`

| Gap (spec §) | Adapter | UI that appears when fed | Status |
|---|---|---|---|
| §1 scheduled shift (suggested: additive on `GET /current` — `ScheduledShiftSchema` already parses it) | `scheduledShift` | Confirm context row "Today's shift …" + result plate "SCHEDULED" column (labels are supplied per-surface by the controller, not the adapter) | open — still host-supplied, defaults null |
| §2 floor announcements endpoint | `announcements` | "TODAY ON THE FLOOR" list on the clock-in result | open — still host-supplied, defaults `[]` |
| §3 per-product completed items | `summaryExtras.items` | Items carousel | **closed 2026-07-31** — backend sends `analytics.completed_items` directly; `defaultSummaryExtrasAdapters` (`lib/summary-extras-adapters.ts`) maps it with no host wiring needed |
| §4 week context | `summaryExtras.week` | This-week bar chart | **closed 2026-07-31** — same file, off `analytics.week`; weekly target is client hard-coded (no `scheduled_seconds` in this system, ever — handoff §5.1) |
| §5 production rate | `summaryExtras.rate` | Rate tile | **closed 2026-07-31** — same file, off `analytics.rate`; nullable baseline handled (`RateTile` "Not enough history yet") |
| §6 badge/station roster fields | (view model, not adapter) | Confirm role line gains badge/station | open |
| §7 roster >200 | (domain) | today: `console.warn` at exactly 200 | open |

§3/§4/§5 differ from §1/§2/§6/§7 in kind: the data arrives embedded in the
clock-out response itself, so there is no host-owned query to write — closing
them was a schema + kit change, not a host integration. A host can still
override any `summaryExtras` key via `KioskAdaptersInput` if it ever needs to.

Insights were a gap-adjacent feature (`analytics.insights`), not a spec gap —
handoff §5.1 retired them outright ("not provided for this screen anymore");
`SummaryScreen`'s `insights` prop is now always `[]`. `InsightRow` stays wired
as dormant UI rather than deleted.

## Wiring a gap when the backend closes it (the recipe)

1. Confirm the shape landed in the HANDOFF first (it is edit-first authority);
   extend `@beyo/worker-shifts` schemas tolerantly (zone 01 tiebreaker rule).
2. If the data needs a host-owned query (§1, §2, §6 — a data source the
   backend doesn't embed in an existing response): in the HOST
   (`FloorKioskProvider.tsx`), own the query, map response → the adapter's
   existing output type, pass through `adapters`. Do NOT change the adapter
   signatures — that's the seam the whole design hangs on (a Phase 6 review
   finding C5 already re-shaped `scheduledShift` to take `currentShift`
   precisely so §1 needs no signature change). If the data instead arrives
   embedded in a response the kiosk already fetches (as §3/§4/§5 did), the
   mapping belongs in the package's own `DEFAULT_ADAPTERS`
   (`lib/summary-extras-adapters.ts` is the template) — every host gets it
   for free, no per-host wiring step.
3. Showcase fixtures (`adapters/showcase-kiosk-adapters.ts`) stay as-is —
   dev-only, statically unreachable in builds.
4. Update: this doc's mapping row, the spec doc's status, `CHANGELOG.md`.

## Mock↔live boundary (endpoints, not adapters)

- Status of every endpoint: the handoff's liveness table. **As of 2026-07-31
  every v1 route is ✅ live**, including populated `analytics`. The frontend's
  schemas/mocks/view-model/adapters were updated to the NEW contract shape in
  the same pass — `completed_items`/`week`/`rate` replace the old
  `segments[]`/`insights[]`.
- **The app itself has not been flipped onto the live backend yet** —
  `VITE_API_URL` is unset and `VITE_FLOOR_MOCKS=1` in every floor-app env
  file. Endpoints-live and app-flipped are two different facts; don't conflate
  them. The flip checklist lives in `packages/clock-kiosk/README.md`
  ("Mock And Live-Flip Runbook") — now a single all-at-once flip rather than
  per-endpoint, since every v1 route went live together.
- `VITE_FLOOR_MOCKS=1` controls BOTH the MSW worker (floor `main.tsx`) and
  showcase-adapter enablement (`FloorKioskProvider`) — and is dev-only either
  way (`import.meta.env.DEV` guard; verified absent from production bundles).

## Verification pointers

- `packages/clock-kiosk/src/types.ts` (+ `lib/kiosk-adapters.ts` gates,
  `lib/summary-extras-adapters.ts` default mapping)
- `floor-app/src/app/FloorKioskProvider.tsx` (the host side of the seam)
- Handoff liveness table; BACKEND_REQUIREMENTS doc for shapes the backend owes
