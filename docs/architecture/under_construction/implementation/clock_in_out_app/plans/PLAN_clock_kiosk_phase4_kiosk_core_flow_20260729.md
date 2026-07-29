# PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729`
- Status: `under_construction`
- Owner agent: Codex (implementer) / Claude Fable (kit + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T13:30:00Z`
- Master plan: `../PLAN_clock_kiosk_master_20260729.md`
- Depends on: Phases 1 (worker-shifts) and 3 (floor app) archived.
- Design ground truth: `../image_design/` — `clock_in_out_interface.png`, `clock_in_confirmation_of_user.png`, `clock_out_confirmation_of_user.png`, `clock_in_result.png` + `design_readme.md`.
- Claude kit (built and committed BEFORE the Codex session; read-only for Codex): the full core-flow component kit inside `packages/clock-kiosk/src/components/` — see "Component kit contract" below.

## Goal and intent

- Goal: create `@beyo/clock-kiosk` and implement the complete core loop against the Phase 1 package: keypad entry (code + "Clock with email" fallback) → local match → identity confirm with fresh `/current` → single action (clock in **or** clock out) → result screen → auto-return. The keypad is the always-mounted home page; confirm and result screens open as **`rise` surfaces** over it (master decision #2, Phase 3 primitive). Mount it as the floor app's home page.
- Intent: after this phase a worker can clock in and out end-to-end on the mocked backend; the app is demo-able on an iPad.
- Non-goals: declared states (**out of v1** — master decision #10; the Phase 1 wrappers exist for future pages, nothing here consumes them); rich clock-out analytics summary (Phase 6 — this phase ships the **plain** clock-out success screen: check hero + "N active tasks were stopped" when `transitioned_steps > 0`); announcements/scheduled-shift data (adapters land in Phase 6; this phase renders those slots empty-hidden).

## Scope

- In scope: `packages/clock-kiosk/` (scaffolding per convention + flow store/controller/provider + keypad page + confirm/result rise surfaces + surfaces export), floor app mounting (`@source` line, route, surface registrations merged, adapters-empty KioskProvider wiring), desktop physical-keyboard input.
- Out of scope: any backend-gap data; any Phase 5/6 screen.
- Assumptions: kit components exist, committed, prop-typed, `data-testid`ed; Codex composes them without edits (master division of labor).

## Component kit contract (Claude-owned; Codex read-only)

Props are data-in/callbacks-out; no component fetches, times, or matches anything.

| Component | Key props |
|---|---|
| `KeypadScreen` | `code: string`, `error: boolean`, `mode: "code" \| "email"`, `emailValue`, `onDigit(d)`, `onDelete()`, `onSubmit()`, `onModeChange(mode)`, `onEmailChange(v)`, `onEmailSubmit()` |
| `CodeCells` | `length: 4`, `value: string` (cells display the typed digits — user decision 2026-07-29), `error: boolean` (drives shake+clear animation via CSS, fired on prop transition) |
| `KeypadKey` / `Keypad` | pure presentational; `onDigit`, `onDelete`, `onSubmit`; 128px→~72–84px responsive circles; submit key accent-filled |
| `IdentityConfirmScreen` | `user: {name, roleLine, avatarUrl}`, `context: {label, value} \| null`, `action: "clock_in" \| "clock_out"`, `pending: boolean`, `onAction()`, `onBack()` |
| `ResultScreen` (clock-in + plain clock-out) | `variant: "in" \| "out"`, `greeting`, `subtitle`, `plate: {label, time, right?} \| null`, `notice?: string` (transitioned-steps), `announcementsSlot?: ReactNode`, `countdownSeconds`, `onDone()` |
| `AutoReturnFooter` | `secondsLeft`, `onDone()` — "Returning to the keypad in Ns" |
| shared bits | `DarkTimePlate`, `CheckHero`, `HelpLink` (labeled **"Clock with email"** — master decision #4), `NotYouLink` |

The keypad screen sits in `KioskFrame`'s middle slot; confirm and result screens render inside `RiseSurface` shells above it (Phase 3 chrome stays mounted; header never unmounts; the keypad stays mounted beneath open surfaces).

## Clarifications required

- (none — master decisions #4, #5, #11, #12 + handoff §9 fix the flow; the kit fixes the look)

## Acceptance criteria

1. Package scaffolding per convention (raw TS, peers only, vitest config, root `test:clock-kiosk` + typecheck registration); `surface-ids.ts` + `surfaces.ts` export `loadClockKioskPage()` **and** the kiosk's `rise`-surface registrations (identity confirm, result) per `35_shared_packages.md` §13–14; the floor app mounts the page as `/` via the loader and merges the kiosk registrations into its `surface-registry.ts` — surfaces stay centralized.
2. Flow state machine (`store/kiosk-flow.store.ts` + `controllers/use-kiosk-flow.controller.ts` + `providers/KioskProvider.tsx`): states `keypad → confirming(user) → acting → result(kind) → keypad`; each interaction carries a **session id**; async results resolving against a stale session id are dropped (master risk — unit-tested race).
3. Keypad behavior per design: 4 cells; validate on 4th digit or submit; unknown code/email → single generic inline error + shake + clear, code never leaves the device (matcher from `@beyo/worker-shifts` over the cached roster query); the **"Clock with email"** affordance (master decision #4 — NOT labeled "Forgot your code?") toggles the email entry mode (same matcher, case-insensitive). Roster query mounted app-open (2 min interval + focus refetch, per Phase 1 hook defaults).
4. Confirm step per handoff §3/§9: after a match, fetch `GET /current?user_id=` **fresh** (never cache); until it resolves, action area shows a pending state; `clocked_in:false` → context row hidden (scheduled GAP) + green "Clock in now"; `clocked_in:true` → "Clocked in at HH:mm" context row + accent "Clock out now". Exactly one primary action ever renders. "Not you? Go back" → keypad. Confirm step also auto-returns (30s inactivity).
5. Actions: clock-in → refetch `/current` → `ResultScreen` variant "in" with greeting (day-part + first name via Phase 1 helpers) and dark plate "CLOCKED IN AT HH:mm" (right column absent — scheduled GAP). Clock-out → `ResultScreen` variant "out", plain success ("Shift complete, {first}") + notice "N active task(s) were stopped" when `transitioned_steps > 0`; `analytics` is **ignored in this phase** (consumed in Phase 6) but already parsed by Phase 1 types.
6. 409 handling per handoff §8: any 409 on clock-in/out → silently refetch `/current` and re-render the confirm step with the corrected single action (no error screen, no toast). 401 → existing revoked-device path (Phase 2/3).
7. Auto-return: result screens count down from `autoReturnSeconds` (device config, default 12) with visible countdown + manual Done; every path (back, done, timeout, error) lands on a **cleared** keypad; the terminal can never rest on a personal screen (assert in tests: store resets user/session data on return).
8. Screen-to-screen motion via **`rise` surfaces** (master decision #2): confirm opens as a rise surface over the always-mounted keypad; result replaces/stacks per the surface engine's semantics; closing anything (done, "Not you", timeout, error) fades down and reveals the keypad. Auto-return = close all kiosk surfaces + store reset, atomically. No SlideStack, no swipe gestures — buttons and timers only (gloves-on operation).
9. Desktop/physical input: number keys 0–9, Backspace, Enter drive the keypad; input works with no on-screen tap. Phone/iPad/desktop layouts per master decision #12 (kit handles visuals; Codex wires the key events).
10. Floor app: `@source` lines added for `clock-kiosk`, `worker-shifts`, `pause-reasons` (ahead of Phase 5 consumption only if imported — otherwise defer); `VITE_FLOOR_MOCKS=1` boots the app fully on MSW mocks (Phase 1 handlers + floor sign-in mock).
11. Tests: vitest — store machine transitions incl. session-id race, 409 → confirm re-render, matcher wiring, auto-return resets, greeting/plate view models; Playwright (mocked, `--project=mobile` first then desktop): full clock-in journey, full clock-out journey, wrong-code shake, email fallback journey, auto-return timeout.
12. Root typecheck green; `index.ts` public API audited (page loader, provider, types — internals unexported).

## Contracts and skills

### Contracts loaded

- Core set (guide) + `07_components.md`, `10_pages.md`, `16_feature_workflow.md`, `23_providers.md`, `24_dto.md` (view models for confirm/result), `27_responsive.md`, `28_surfaces.md` (+`_local` — includes the `rise` type entry added in Phase 3), `30_dynamic_loading.md` (+`_local`), `31_animations.md`, `32_loading_skeletons.md`, `35_shared_packages.md` §13–14, `17_testing.md`, `34_runtime_validation.md` (+`_local`).

### File read intent — pattern vs. relational

Permitted relational reads: `packages/worker-shifts/src/index.ts` + `types.ts` (what Phase 1 actually exports); the kit components' prop types (`packages/clock-kiosk/src/components/**` — read, never edit); `packages/ui` `RiseSurface` + SurfaceProvider registration exports (as extended in Phase 3); Phase 3's device-config store + `useKioskClock` exports; floor app `src/app/{router.tsx, surface-registry.ts}`.
Prohibited: reading other packages' controllers/stores for structure — `06`/`08`/`23` define it.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Scaffold `packages/clock-kiosk/` + root registration + surfaces/page loader.
2. Flow store + controller + provider (criteria 2, 7 timers, session ids).
3. Keypad wiring (criterion 3) incl. physical keys (criterion 9).
4. Confirm step (criterion 4) + actions/results (criterion 5) + 409 path (criterion 6).
5. Rise-surface composition (criterion 8); mount in floor app + merge surface registrations (criteria 1, 10).
6. Vitest + Playwright suites (criterion 11); typecheck + public-API audit (criterion 12).

## Risks and mitigations

- Risk: timers leak across sessions / results linger. Mitigation: session-id design + reset assertions (criteria 2, 7).
- Risk: kit prop contracts don't fit controller output. Mitigation: additive-optional-prop rule (master division of labor); anything structural → Review log + Claude.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:clock-kiosk` (+ `test:worker-shifts` still green).
- `npx playwright test --grep clock-kiosk --project=mobile` then `--project=desktop`: green (mocked).

## Review log

- (append here)

## Lifecycle transition

- Current state: `under_construction` → kit approved → implement → validate → summary + archive
- Transition owner: Codex session
