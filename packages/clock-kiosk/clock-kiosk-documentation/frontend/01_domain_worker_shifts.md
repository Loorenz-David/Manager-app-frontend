# 01 — Domain: `@beyo/worker-shifts`

Last verified: 2026-07-31

The shift domain's ONLY home: zod schemas, API functions, query/action hooks,
the pure roster matcher, time helpers, and the MSW build-ahead mocks. Zero UI,
zero JSX. Reused by the kiosk today; built to be reused by workers/managers
apps (and the future declare pages) tomorrow.

## File map (`packages/worker-shifts/src/`)

| File | What it is |
|---|---|
| `types.ts` | Every schema, byte-matched to the handoff: `FloorRosterUser`, `CurrentShift`, `ClockIn/OutResult`, `ClockOutAnalytics` (+Timeline/CompletedItem/Week/Rate — **rewritten 2026-07-31**, `segments[]`/`insights[]` retired per handoff §5.1), `DeclaredState`, declare inputs/results, `ScheduledShift`. **Tolerant by rule**: nullable `profile_picture`/`image_url`/`reason_text`/`reference`/`pause_type` (the `"unspecified"` pause bucket ships `pause_type: null`), analytics maps/arrays optional/defaulted, `.passthrough()` everywhere additive keys may appear. `analytics.rate` is required (not defaulted) — the handoff's populated example always includes it. |
| `api/worker-shift-keys.ts` | Query-key factory (`all` → lists → params-last; disabled current-shift entries use `current({user_id:''})`, never the list namespace). |
| `api/fetch-floor-roster.ts` | `GET /api/v1/users?role=worker&compact=true&limit=200` (+ `console.warn` at exactly 200 rows). Floor tokens get `clock_in_code`/`email` fields. |
| `api/use-floor-roster-query.ts` | 2-min `refetchInterval`, focus refetch. The KIOSK'S ONLY polling. |
| `api/fetch-current-shift.ts` + `api/use-current-shift-query.ts` | `GET /worker-shifts/current?user_id=`. The exported imperative `fetchFreshCurrentShift` is THE mandated fresh-read for the confirm step (invariant 1); the hook is passive/observational only. |
| `actions/use-clock-in.ts` / `use-clock-out.ts` | POST wrappers; invalidate current-shift on settle; **no optimistic updates** (contract: render only fresh server state). |
| `actions/use-declare-state.ts` / `use-close-declared-state.ts` | Wrapped for the FUTURE declare pages; nothing in v1 consumes them. Don't delete; don't build UI on them without a new plan. |
| `lib/match-worker.ts` | Pure: trim; code exact; email case-insensitive; returns user or null; never throws. |
| `lib/shift-time.ts` | Pure, injectable `now`: HH:mm localization (IANA zone), elapsed, first-name extraction, `dayPartGreeting` (cutoffs 05/12/18). |
| `mocks/` (subpath `@beyo/worker-shifts/mocks`) | Stateful MSW handlers + fixtures for every handoff shape incl. all 409/404/422 branches and both `analytics` variants. **The runtime until backend phases flip.** Never re-export from the root barrel (chunking). |

`msw` is a package-level devDependency (root-hoist reliance was fixed);
`package.json` exports: `"."` and `"./mocks"` only.

## Load-bearing rules

- **Handoff byte-fidelity** for names/routes/enums; **tolerance tiebreaker**:
  where the handoff shows an example but is silent on nullability/optionality,
  match the live-proven sibling schemas (`@beyo/stats`, `@beyo/pause-reasons`).
  History: 3 blocking Phase 1 review findings came from violating this.
- The legacy `POST /worker-shifts/clock` toggle is NEVER wrapped.
- Pause-reason catalog shapes belong to `@beyo/pause-reasons` — import, never
  redefine (mock fixtures infer their own literal types instead).
- `analytics.rate.baseline_units_per_hour` is nullable — null exactly when
  `baseline_days` is 0 (not enough recent history). Don't default it to `0`;
  that reads as a real, terrible rate instead of "no data yet".

## Up/down the line (details in IMPACT_MAP.md)

- `types.ts` is the **parse boundary**: an overly-strict field here 502s the
  whole roster/current/clock-out response → keypad can't identify anyone /
  successful clock-outs render as errors. Loosen with the tiebreaker rule;
  never tighten without live payload proof.
- Schema/type renames ripple into: kiosk controller + view models
  (`clock-kiosk/src/lib/*`), adapters context types (`clock-kiosk/src/types.ts`),
  mock fixtures, and both packages' tests.
- Mock behavior changes ripple into floor-app Playwright specs (they stub the
  same routes independently) — keep semantics aligned with `handlers.ts`.

## Verification pointers

- `packages/worker-shifts/src/index.ts` — the exact public API (+ the
  fetch-fresh doc comment above `fetchFreshCurrentShift`).
- `src/types.test.ts` — handoff JSON round-trips + tolerance cases.
- Handoff §3–§8 for every route/shape claim.
