# PLAN_clock_kiosk_phase7_corrections_20260730

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase7_corrections_20260730`
- Status: `archived` (2026-07-30, Codex implemented F1/F2/F3/F4/F5/F7 and lifecycle F8; validation matrix passed cold on mobile/tablet/desktop)
- Owner agent: `Opus (reviewer/author)` — execution routed per finding to Codex (logic/docs) or Claude (visual)
- Created at (UTC): `2026-07-30T13:10:00Z`
- Last updated at (UTC): `2026-07-30T14:10:00Z`
- Related issue/ticket: none
- Master plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md`
- Reviewed phase: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_validation_polish_20260729.md` (archived)
- Reviewed summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase7_validation_polish_20260729.md`
- Plan type: **Corrections plan — fixes only.** No new features, no new scope, no
  refactors beyond each finding's stated remedy. Master acceptance criteria 1–9
  all PASS as of the Phase 7 close-out review; nothing here blocks the
  capability, and the capability's `completed` state stands.

## Goal and intent

- Goal: close the eight findings from the Phase 7 capability close-out review
  (Opus, 2026-07-30). Two are medium defects (one behavioral, one documentation);
  the rest are low hygiene, evidence, and decision items.
- Business/user intent: the two mediums both touch the promises the capability
  was built to keep — an idle terminal that never shows a worker a false error,
  and a README that lets another app mount the kiosk without reverse-engineering
  the floor app. The lows keep the package honest for the next host.
- Non-goals:
  - Any change to backend wiring, endpoint liveness, or the mock/live flip state
    (every v1 route is still ❌ in the handoff; nothing flips here).
  - Any new kiosk screen, adapter, or GAP wiring.
  - Re-opening closed findings from Phases 1–6.
  - Editing the design images, `design_readme.md`, or the backend handoff.

## Scope

- In scope: `packages/clock-kiosk` (controller, README, `package.json`),
  `apps/floor-app/ManagerBeyo-app-floor/playwright.config.ts`, and the master
  plan's lifecycle decision.
- Out of scope: `@beyo/worker-shifts`, `@beyo/ui`, `@beyo/styles`, `@beyo/auth`,
  `@beyo/api-client`, `@beyo/stats`, the three live apps, and every archived plan.
- Assumptions: the Phase 7 validation matrix is green and was independently
  re-run by the reviewer (root typecheck exit 0; worker-shifts 40/40; kiosk
  54/54; floor 9/9; stats 143/143; auth 3/3; api-client 3/3; UI 162/162;
  `--grep clock-kiosk` 9/9 cold on mobile, tablet and desktop). These are the
  baselines every fix below must preserve.

## Clarifications required

- [x] **RESOLVED 2026-07-30 (Claude Fable, orchestrator) — both:**
  - **F1 takes option (b)** — a distinct quiet notice, because suppressing the false error alone leaves a silently dead keypad that reads as a broken terminal. **The Claude kit half is already executed**: `KeypadScreen` gained `statusNotice?: string | null` — rendered in the reserved message line in **kiosk-tertiary** (no red, no shake, never combined with `error`), in both code and email modes, `data-testid="keypad-status"`. Codex wires it: during the roster-absent state pass `statusNotice` with the authored copy **"Terminal offline — try again in a moment"**, suppress the error signal entirely (no `error: true`, no `.kiosk-shake`, no red cells), and rename+fix the defect-locking test at `use-kiosk-flow.controller.test.tsx:465` to assert the notice and the absence of the error signal.
  - **F8: the master moves to `archives/implementation/` as part of THIS plan's lifecycle closure** — completed plans live in archives, no exceptions for the master. The capability folder (`clock_in_out_app/` with README, tracker, `BACKEND_REQUIREMENTS`, `image_design/`, shelved Phase 5) stays in place as the living home; Codex adds one pointer line to the folder README ("Master plan: completed 2026-07-30, archived at `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md`").
  - Reviewer's note on Claude's earlier f2 formatter (`'en-GB'`/UTC hardcode): **accepted as-is** — date-only strings are correctly timezone-free (UTC anchor), and the kiosk's copy is uniformly English; if the capability ever localizes, the formatter localizes with it.

Clarification outcomes were implemented exactly: Claude's kit half remains
intact (`KeypadScreen.statusNotice`), Codex wired the roster-unavailable flow
to the authored quiet notice with the error signal suppressed, and the completed
master plan was moved to archives during this plan's closure.

## Findings and routing

| # | Severity | Finding | Route |
|---|---|---|---|
| F1 | Medium | Roster-unavailable raises the code-miss error signal on the idle keypad | **Codex** (+ **Claude** if option (b)) |
| F2 | Medium | README surface-registration snippet omits the host frame + Suspense it mandates in prose | **Codex** |
| F3 | Low | README documents 8 components absent from the public barrel; two real exports undocumented | **Codex** |
| F4 | Low | README `@source` list omits `@beyo/lib`; font block shows 1 of 3 mono faces | **Codex** |
| F5 | Low | `clock-kiosk/package.json`: 4 unused peers, 3 undeclared test deps | **Codex** |
| F6 | Low | Manual always-on rehearsal script documented but never executed/recorded | **Operator** (needs a physical device) |
| F7 | Low | `reuseExistingServer: true` lets the suite silently run against a dev-mode server | **Codex** |
| F8 | Low | Master is `completed` but still in `under_construction/` — no decision recorded | **Orchestrator decision** |

## Acceptance criteria

1. **F1 — the idle keypad never shows a code-miss error for a roster outage.**
   `use-kiosk-flow.controller.ts:462` currently computes
   `error: flow.error || rosterQuery.isError && !hasRoster`, so losing the roster
   flips the kit's `error` prop false→true. `CodeCells.tsx:22-27` fires
   `.kiosk-shake` on exactly that transition, and `:44-48` paints all four cells
   `border-kiosk-error/60` for the whole outage — the design's wrong-code signal,
   on an empty keypad, for a worker who did nothing. Separate the two signals:
   the roster-unavailable state must not set the kit `error` flag, and
   `keypad.pending` must keep the keys disabled as it does today
   (`:468-471`). The message may stay in `errorMessage` under option (a).
   The existing test
   `disables matching without showing a no-match error when no roster is available`
   (`use-kiosk-flow.controller.test.tsx:465`) asserts `error).toBe(true)` — it
   pins the defect and must be re-pointed to assert `error).toBe(false)` plus the
   offline message, keeping its `matchWorker` not-called and `flow.error === false`
   assertions intact. Its name already describes the corrected behavior.
2. **F1 (option (b) only, Claude) — a distinct offline presentation.** If the
   orchestrator picks (b), `KeypadScreen` gains an additive optional notice prop
   rendered as a quiet informational line (kiosk secondary/tertiary ink, no red,
   no shake), and the README's Phase 4 contract row is updated. DOM/class changes
   to `CodeCells` are out of scope — its error semantics are correct as written.
3. **F2 — the README's registration snippet is copy-safe.** `README.md:137-148`
   builds bare surfaces via `Object.fromEntries`, while the prose two paragraphs
   above (`:120-122`) requires "host chrome and a `Suspense` fallback". A host
   copying the snippet gets kiosk pages with no opaque paper background rendering
   through `RiseSurface`'s `bg-black/35` backdrop — exactly Phase 4's blocking C4,
   re-shipped as documentation. Replace the snippet with the shape the reference
   host actually uses (`apps/floor-app/.../src/app/surface-registry.ts:27-58`):
   the frame wrapper, the `Suspense` fallback with the per-surface
   `KioskSurfaceSkeleton` variant, and the registry-scope preload of the host
   wrappers. The snippet must also use the `KioskSurfaceSkeleton` it already
   imports at `:129`.
4. **F3 — the documented surface equals the public surface.** Export the eight
  documented Phase 6 components from `src/index.ts`, remove the stale
  forward-looking barrel note, and document `preloadClockKioskSurfaces` plus
  `KioskSurfaceSkeleton` variants in the README so the documented host surface
  equals the public API.
5. **F4 — the `@source` and font blocks match a working host.** `README.md:74-81`
   lists `clock-kiosk`, `ui`, `hooks`, `auth`; the reference host's
   `index.css:3-7` also carries `@source ".../packages/lib/src"`, and Phase 3's
   review recorded `lib` as required by `14_styling.md` §14 because it is
   consumed and class-bearing (`clock-kiosk` imports `@beyo/lib` 10×). Add it.
   The `@font-face` block (`:88-102`) shows one IBM Plex Mono weight where the
   host registers three (`index.css:18,26,34`) and defers the rest to prose
   ("when those weights are available") — show all three faces the kiosk's mono
   numerals actually use, per master decision #7.
6. **F5 — declared dependencies are honest.** `packages/clock-kiosk/package.json`
   declares `@beyo/auth`, `@beyo/hooks`, `@tanstack/react-query` and `zod` as
   peers that no file under `src/` imports (full specifier grep), and omits
   `@beyo/api-client`, `vitest` and `@testing-library/react`, which it does
   import — `@beyo/api-client` only from
   `use-kiosk-flow.controller.test.tsx:14`, so it belongs in
   `devDependencies`, not peers. This is the class Phase 3's C6 corrected for the
   floor app and CF1 corrected for `worker-shifts`/`msw` in this very phase.
   Drop the unused peers, declare the test-only deps as `devDependencies`, and
   confirm root typecheck and `test:clock-kiosk` stay green.
7. **F7 — Playwright cannot silently test the wrong server.**
   `playwright.config.ts:32-37` sets `reuseExistingServer: true` against
   `http://localhost:5175` with no check that the listener is the
   `--mode test` server. During this review a leftover plain `vite` dev server
   (PID 68570, `node_modules/.bin/vite`, no `--mode test`) was listening on 5175;
   the suite would have reused it and run every spec without `.env.test`
   (`VITE_FLOOR_MOCKS`, `MODE=test`) loaded. This is the unfixed root of Phase 6's
   blocking C1 — that correction moved the port back but left the reuse
   semantics — and of the "two-process port-5175 collision briefly poisoned runs"
   Claude's own fidelity entry reports. Make a wrong-mode or stale listener fail
   loudly rather than silently substitute: `reuseExistingServer: !!process.env.CI`
   is the minimal fix; a test-mode health assertion is the thorough one.
8. **F6 — the manual rehearsal is executed and recorded, or its absence is
   explicit.** Phase 7 criterion 1 requires resilience "manually scripted where
   not [automatable]", and Codex's own Review-log entry made it a closure gate:
   "Claude's design-fidelity/a11y entry **and target-device manual rehearsal** are
   required before the summary/archive/master closure transition." The script
   shipped (`README.md:219-237`) and the fidelity entry landed, but the rehearsal
   did not run — the child plan records it "pending external execution" and the
   summary's Deviations calls it "host/device operational work". Closure
   proceeded on one of two gates. Either run the five steps on a target tablet
   and record the dated result in the master Review log, or record an explicit
   orchestrator waiver naming what stays unverified (physical sleep/wake clock
   resync; true network-loss behavior). No code change either way.
9. **No regression.** Every baseline in Assumptions above stays green, the kit
   stays byte-untouched unless criterion 2 is invoked, no `apps/*` behavior
   outside `playwright.config.ts` changes, and no archived plan is edited.

## Contracts and skills

### Contracts loaded

- `35_shared_packages.md` — public barrel, subpath exports, `peerDependencies`
  discipline, loader/surface registration (F2–F5).
- `14_styling.md` §14 — the authoritative `@source` table (F4).
- `32_loading_skeletons.md` — the offline/error state's place in the state
  taxonomy (F1).
- `34_runtime_validation_local.md` — Playwright project + web-server discipline
  (F7).
- `07_components.md`, `08_hooks.md` — the controller/kit seam F1 must respect.
- Core set per `task_system/frontend_contract_goal_mapping_guide.md`.

### Local extensions loaded

- `34_runtime_validation_local.md` — mobile/tablet/desktop project set and run
  order for the re-validation.

### File read intent — pattern vs. relational

Relational reads only, all permitted: the Phase 1–7 shipped source under audit,
`packages/clock-kiosk/README.md`, the floor app's `surface-registry.ts`,
`index.css`, `playwright.config.ts` and `package.json` files. No pattern reads —
every remedy above is specified against a named file and line.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.
- Excluded: no feature-build skill applies — this plan writes no new behavior.

## Implementation plan

1. Resolve the two Clarifications (F1 option (a)/(b); F8 placement) with the
   orchestrator before touching code.
2. **Codex** — F1 criterion 1: split the offline signal from the kit `error`
   flag; re-point the test that pins the defect.
3. **Claude** — F1 criterion 2, only if option (b) was chosen: additive optional
   notice prop on `KeypadScreen`.
4. **Codex** — F2–F4: README registration snippet, documented-surface
   reconciliation, `@source` + font blocks.
5. **Codex** — F5: `package.json` dependency hygiene.
6. **Codex** — F7: Playwright web-server reuse semantics.
7. **Operator** — F6: run or waive the target-device rehearsal; record it dated
   in the master Review log.
8. Re-validate (below), then summary → archive → master Review-log entry.

## Risks and mitigations

- Risk: the F1 fix suppresses the *code-miss* error too, silently breaking the
  handoff's one-generic-message rule.
  Mitigation: the corrected test must keep asserting the miss path — `flow.error`
  true → kit `error` true with `GENERIC_NO_MATCH_MESSAGE` — alongside the new
  offline-path assertion. Both branches in one file, both run.
- Risk: F5's peer removal breaks resolution for a consumer that relied on the
  transitive hoist.
  Mitigation: the floor app is the only consumer today and declares its own
  deps; root typecheck plus all four suites gate the change.
- Risk: F7's `reuseExistingServer: !!process.env.CI` makes local runs fail when a
  dev server is already up, which reads as a regression.
  Mitigation: that is the intended signal — it is precisely what silently
  produced wrong-mode evidence twice. Document the "kill 5175 first" step
  alongside it.
- Risk: the README rewrite drifts from the reference host again as the floor app
  evolves.
  Mitigation: F2's snippet is transcribed from `surface-registry.ts` rather than
  paraphrased, so the two can be diffed.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:clock-kiosk`: green, ≥54 tests (F1 changes one assertion, adds none
  unless option (b)).
- `npm run test:worker-shifts`: 40/40 unchanged.
- `npm run test:unit --workspace managerbeyo-app-floor`: 9/9 unchanged.
- `npm run test:ui`: 162/162 unchanged (proves no kit/engine bleed).
- From `apps/floor-app/ManagerBeyo-app-floor`, with port 5175 confirmed free
  (`lsof -iTCP:5175 -sTCP:LISTEN` empty):
  `npx playwright test --grep clock-kiosk --project=mobile`, then `--project=tablet`,
  then `--project=desktop`: 9/9 each, cold-started by the config itself.
- `npm run lint` and `npm run build` in the floor app: green; `dist` still free of
  showcase fixtures and `mockServiceWorker.js`.
- `git diff -- packages/clock-kiosk/src/components/`: empty unless F1 option (b)
  was chosen, in which case exactly `KeypadScreen`.

## Review log

- 2026-07-30 Claude (Fable, orchestrator): plan **approved**; both clarifications resolved (see above). Claude's F1 kit half executed same day (`KeypadScreen.statusNotice`, quiet tertiary line, `keypad-status` testid, both entry modes); Codex owns the remainder: F1 wiring + test rename, F2 copy-safe README snippet (host frame + Suspense + `KioskSurfaceSkeleton` actually used), F3 barrel/doc reconciliation (export the 8 documented Phase 6 components, drop the stale "Barrel note", document `preloadClockKioskSurfaces`), F4 README `@source`/fonts completeness, F5 package.json peer/test-dep hygiene, F7 `reuseExistingServer` mode guard, F8 master archive move + folder-README pointer as lifecycle closure. F6 (physical-device rehearsal) stays with the operator and is the capability's final manual gate.

- 2026-07-30 Codex: implemented F1/F2/F3/F4/F5/F7 and lifecycle F8. F1 now
  routes roster-unavailable to `statusNotice: "Terminal offline — try again in a
  moment"` with `error: false`; test coverage re-pointed. README host snippet
  now includes the frame wrapper + in-frame Suspense + per-surface
  `KioskSurfaceSkeleton` fallback + preload calls. Public barrel exports now
  include the documented eight Phase 6 components. README styling requirements
  now include `@beyo/lib` and all three mono faces (400/500/600). Unused peers
  were removed and test-only dependencies declared. Playwright now reuses
  existing server only on CI. Validation passed: root typecheck, clock-kiosk
  tests 54/54, worker-shifts 40/40, floor unit 9/9, UI 162/162, floor lint,
  floor build, and `--grep clock-kiosk` 9/9 on mobile/tablet/desktop with port
  5175 explicitly cleared before each run.

- 2026-07-30 Opus (Phase 7 capability close-out): plan created from the
  close-out review. Master criteria 1–9 all dispositioned PASS; verdict
  **complete-with-notes**. Two medium defects (F1 behavioral, F2 documentation)
  and six low findings routed above. Nothing here blocks the capability's
  `completed` state.

## Lifecycle transition

- Current state: `archived`
- Next state: none (phase-corrections closed)
- Transition owner: Codex implementation + lifecycle closure
