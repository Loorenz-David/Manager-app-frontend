# 06 — Adapters, backend gaps, and the mock↔live boundary

Last verified: 2026-07-30 · commit `e8a35e19`

The design was built ahead of the backend. Every design element the API can't
feed yet flows through a **synchronous adapter seam** that defaults to
empty — so when the backend closes a gap, wiring it is a data change in the
HOST, never a UI change.

## The adapter seam (`packages/clock-kiosk/src/types.ts`)

```ts
KioskAdapters = {
  scheduledShift: ({user, timeZone, currentShift}) => {start, end} | null
  announcements:  ({user, timeZone}) => KioskAnnouncement[]        // id,title,body,accent,date(ISO)
  summaryExtras:  { items, week, rate }  // each: ({analytics,user,timeZone}) => data | null
}
```

- Adapters are **synchronous presentation seams**: a host with endpoint-backed
  data owns the TanStack query and passes `query.data` through the adapter.
- Gating (`lib/kiosk-adapters.ts`): `DEFAULT_ADAPTERS` return null/[]/null;
  `gateAnnouncements` slices to 3 and formats ISO→"29 Jul";
  `gateSummaryExtras` applies per-key `??` fallbacks (a partial
  `summaryExtras` object can't throw).
- UI gating: every GAP section renders ONLY when its adapter yields data;
  with all defaults the summary = hero + insights (+ stopped-tasks notice),
  the clock-in result has no scheduled column and no announcements — layouts
  stay balanced (kit guarantee).

## Gap ↔ adapter ↔ spec mapping

Spec: `docs/architecture/under_construction/implementation/clock_in_out_app/BACKEND_REQUIREMENTS_clock_kiosk_20260729.md`

| Gap (spec §) | Adapter | UI that appears when fed |
|---|---|---|
| §1 scheduled shift (suggested: additive on `GET /current` — `ScheduledShiftSchema` already parses it) | `scheduledShift` | Confirm context row "Today's shift …" + result plate "SCHEDULED" column (labels are supplied per-surface by the controller, not the adapter) |
| §2 floor announcements endpoint | `announcements` | "TODAY ON THE FLOOR" list on the clock-in result |
| §3 per-product completed items | `summaryExtras.items` | Items carousel |
| §4 week context | `summaryExtras.week` | This-week bar chart |
| §5 production rate | `summaryExtras.rate` | Rate tile |
| §6 badge/station roster fields | (view model, not adapter) | Confirm role line gains badge/station |
| §7 roster >200 | (domain) | today: `console.warn` at exactly 200 |

Insights are NOT a gap — they come from the real `analytics.insights` payload.

## Wiring a gap when the backend closes it (the recipe)

1. Confirm the shape landed in the HANDOFF first (it is edit-first authority);
   extend `@beyo/worker-shifts` schemas tolerantly (zone 01 tiebreaker rule).
2. In the HOST (`FloorKioskProvider.tsx`): own the query, map response → the
   adapter's existing output type, pass through `adapters`. Do NOT change the
   adapter signatures — that's the seam the whole design hangs on (a Phase 6
   review finding C5 already re-shaped `scheduledShift` to take `currentShift`
   precisely so §1 needs no signature change).
3. Showcase fixtures (`adapters/showcase-kiosk-adapters.ts`) stay as-is —
   dev-only, statically unreachable in builds.
4. Update: this doc's mapping row, the spec doc's status, `CHANGELOG.md`.

## Mock↔live boundary (endpoints, not adapters)

- Status of every endpoint: the handoff's liveness table. As of the stamp,
  **every v1 route is still ❌** (mocks are the runtime).
- The flip checklist (env flag off, per-endpoint mock removal, affected
  Playwright specs re-run) lives in `packages/clock-kiosk/README.md`.
- `VITE_FLOOR_MOCKS=1` controls BOTH the MSW worker (floor `main.tsx`) and
  showcase-adapter enablement (`FloorKioskProvider`) — and is dev-only either
  way (`import.meta.env.DEV` guard; verified absent from production bundles).

## Verification pointers

- `packages/clock-kiosk/src/types.ts` (+ `lib/kiosk-adapters.ts` gates)
- `floor-app/src/app/FloorKioskProvider.tsx` (the host side of the seam)
- Handoff liveness table; BACKEND_REQUIREMENTS doc for shapes the backend owes
