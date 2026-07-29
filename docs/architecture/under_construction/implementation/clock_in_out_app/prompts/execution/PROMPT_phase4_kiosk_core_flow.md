# Codex — Phase 4: `@beyo/clock-kiosk` core flow (keypad → confirm → action → result)

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phases 1–3 are archived: `@beyo/worker-shifts` (logic), floor auth, and the `floor-app` shell all exist. A Claude session has already committed the **core-flow component kit** in `packages/clock-kiosk/src/components/` (KeypadScreen, CodeCells, Keypad, IdentityConfirmScreen, ResultScreen, AutoReturnFooter, DarkTimePlate, CheckHero, links) — **read-only** for you.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend flow ground truth: handoff §3, §5, §8, §9 of `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully — especially the "Component kit contract" table and acceptance criteria 2–9.
2. The master plan — "Design → data mapping" table and the kiosk UX rules block beneath it.
3. Handoff §9 (suggested kiosk flows) and §8 (409 = normal flow).
4. `task_system/frontend_contract_goal_mapping_guide.md`.
5. Contracts from the child plan — `28_surfaces.md` (+`_local`, incl. the `rise` type added in Phase 3), `35_shared_packages.md` §13–14 (page loader + surface registrations), `30_dynamic_loading_local.md`.
6. Permitted relational reads only: `packages/worker-shifts/src/{index.ts, types.ts}`, the kit prop types, `packages/ui` `RiseSurface` + SurfaceProvider registration exports, Phase 3's device-config store + `useKioskClock`, floor app `router.tsx` + `surface-registry.ts`.

## Hard rules

- The five flow invariants, non-negotiable:
  1. The roster cache decides *who*; a **fresh** `GET /current?user_id=` decides *what state* — fetched after every match and re-fetched after every await. Never render an action from cached state.
  2. Any 409 → refetch `/current` → re-render confirm with the corrected single action. No error screen, no toast.
  3. Every path — done, back, timeout, error — returns to a **cleared** keypad. Auto-return runs on result (device-config seconds, default 12) and confirm (30s inactivity).
  4. One generic no-match message for code and email alike; the typed code/email never leaves the device.
  5. Every kiosk interaction carries a session id; async results against a stale session id are dropped.
- Exactly one primary action renders on confirm (`clocked_in` decides). `analytics` from clock-out is parsed but NOT rendered in this phase (Phase 6); `transitioned_steps > 0` renders the stopped-tasks notice.
- Kit components are read-only: no restyling, no markup edits, no class-list edits; additive optional props only, recorded in the plan Review log. Timers/matching/fetching live in the store/controller — never in components.
- Screen composition (master decision #2): the keypad is the always-mounted page; identity confirm and result open as **`rise` surfaces** registered via the kiosk package's `surfaces.ts` and merged into the floor app's central `surface-registry.ts`. No SlideStack, no swipe gestures. Auto-return closes all kiosk surfaces + resets the store atomically.
- The email fallback affordance is labeled **"Clock with email"** (master decision #4) — not "Forgot your code?" as the design image shows.
- Physical keyboard (0–9, Backspace, Enter) must drive the keypad on desktop.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:clock-kiosk` — green, including the session-id race and auto-return reset assertions; `test:worker-shifts` still green.
- `npx playwright test --grep clock-kiosk --project=mobile` then `--project=desktop` — clock-in journey, clock-out journey, wrong-code shake, email fallback, auto-return timeout — all mocked, all green.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md` → archive record → plan archived + moved → dated master Review log entry. On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, confirmation of each of the five flow invariants with the test that proves it, files created/modified, validation output, deviations with justification.
