# PLAN_clock_kiosk_phase4_corrections_20260730

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase4_corrections_20260730`
- Status: `archived` (2026-07-30, C1–C15 implemented and validated)
- Owner agent: `Opus (reviewer, author)` / `Codex (implementer)`
- Created at (UTC): `2026-07-30T07:20:00Z`
- Last updated at (UTC): `2026-07-30T07:30:00Z`
- Related issue/ticket: none provided
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Source phase plan (archived): `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Plan type: **corrections plan** — fixes only. It adds no capability and moves no phase boundary.

## Goal and intent

- Goal: close the findings from the Phase 4 Opus review (verdict **defects found**). Two findings (C1, C2) are blocking: they break the floor app **outside** the kiosk loop — device sign-in and device settings cannot be typed into, and the kiosk calls an authenticated roster endpoint from the unauthenticated sign-in screen. Two more (C3, C4) break the design contract on the capability's two most-seen screens.
- Business/user intent: a terminal a manager can actually set up (C1, C2), a kiosk that looks like the approved design on the confirm/result screens (C4), and result copy that reads as English (C3).
- Non-goals:
  - Any Phase 6 work (analytics summary, adapters, announcements) — `analytics` stays parsed-and-unrendered.
  - Any declared-states UI (master decision #10).
  - Rebuilding the flow machine: the store, session-id race handling, 409 reconciliation and auto-return boundaries were reviewed and are correct — do not restructure them.
  - Editing the design images, the backend handoff, or the archived Phase 4 plan.

## Scope

- In scope: `packages/clock-kiosk/src/{controllers,pages,providers,surfaces.ts,index.ts}`, `apps/floor-app/ManagerBeyo-app-floor/src/app/{RootRoute.tsx,FloorKioskProvider.tsx,surface-registry.ts}`, `apps/floor-app/ManagerBeyo-app-floor/src/vite-env.d.ts`, the floor app's Playwright + vitest suites, and — **only if C4's chosen fix requires it** — an additive optional prop on `packages/ui/src/components/surfaces/RiseSurface.tsx` / a background-bearing wrapper in the kit (Claude).
- Out of scope: `@beyo/worker-shifts` (untouched by Phase 4 and correct), `@beyo/api-client`, `@beyo/auth`, `@beyo/styles`, every other app.
- Assumptions: the Phase 4 validation baseline is green and reproducible — the reviewer independently re-ran root typecheck, `test:clock-kiosk` (9/9), `test:worker-shifts` (36/36) and the clock-kiosk Playwright suite on **all three** projects (mobile 5/5, tablet 5/5, desktop 5/5).

## Clarifications required

- **RESOLVED 2026-07-30 (Claude Fable, orchestrator): C4 takes option (a) — host-composed frame.** No `@beyo/ui` change, matches the Phase 3 device-settings precedent, package stays app-agnostic, reveal-the-keypad motion intact. With (a) chosen, **every finding in this plan is Codex-owned**; no Claude session is required. Original options preserved below for the record.
- **C4 (surface background)** — two viable shapes, and the choice is the orchestrator's because one touches `@beyo/ui`:
  - (a) **Host-composed frame** (no `@beyo/ui` change): the floor app registers the two kiosk surfaces through thin app components that wrap the package's surface pages in `FloorKioskFrame`, exactly as the Phase 3 device-settings surface already does. The surfaces become opaque, the header renders inside them, and the backdrop is never seen. Package stays app-agnostic (it still exports `clockKioskSurfaces` for hosts that want the raw pages).
  - (b) **Backdrop-less rise + kit background**: `SurfaceRegistration` gains an optional `showBackdrop` passthrough (additive, `@beyo/ui`) and the kit's confirm/result screens gain an opaque `bg-kiosk-surface` root (Claude).
  - Plan's recommendation: **(a)** — it needs no shared-engine change, matches the established Phase 3 precedent, and keeps the reveal-the-keypad motion intact.

## Findings and routing

Severity ordering is the review's. **Owner** is binding per the master's "Division of labor" (Codex = logic/wiring/config; Claude = visual/chrome/DOM).

| # | Severity | Finding | File | Owner |
|---|---|---|---|---|
| C1 | **Blocking** | The kiosk's global `keydown` handler is mounted app-wide and `preventDefault()`s every 0–9 / Backspace / Enter with no event-target check, so digits never reach any text field in the floor app | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:296-318`, `apps/floor-app/ManagerBeyo-app-floor/src/app/RootRoute.tsx:17-21` | **Codex** |
| C2 | **Blocking** | The floor roster query runs on the unauthenticated `/sign-in` page → `401` → `auth:session-expired` → a false "This terminal was signed out." on a device that was never signed in, repeating every 2 min | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:69`, `apps/floor-app/ManagerBeyo-app-floor/src/app/RootRoute.tsx:17-21` | **Codex** |
| C3 | High | Clock-in greeting renders `"morning, Marco"` — `dayPartGreeting()` returns the bare token `morning \| afternoon \| evening`, not `"Good morning"`; the unit test's mock returns `'Good afternoon'` and hides it | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:383`, `src/controllers/use-kiosk-flow.controller.test.tsx:26` | **Codex** |
| C4 | High | Confirm + result render transparently over the rise `bg-black/35` backdrop while the keypad page renders `null` beneath — both core screens appear grey-dimmed (result doubly, two stacked backdrops) instead of warm paper | `packages/clock-kiosk/src/pages/ClockKioskPage.tsx:6`, `src/pages/IdentityConfirmSurfacePage.tsx:6`, `src/pages/ResultSurfacePage.tsx:6`, `src/surfaces.ts:28-37` | **Codex** (+ **Claude** only under option (b)) |
| C5 | Medium | `returnToKeypad` resets the store before the surfaces close, so the rise panels animate out **empty** — decision #2's "fade-out while sliding down" never plays for the screen content | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:79-82` | **Codex** |
| C6 | Medium | Every non-409 action failure (5xx, network, 404, and a failed post-action `/current` refetch) silently lands on a cleared keypad with no feedback — a server-side-successful clock-in whose refetch fails is indistinguishable from a no-op, inviting a double clock | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:193-205,250-258` | **Codex** |
| C7 | Low | `roleLine`'s fallback returns the first string value of the untyped `role` record — a workspace whose role object has no `name`-ish key prints an id/uuid under the worker's name on the confirm screen | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:43-54` | **Codex** |
| C8 | Low | Roster-fetch failure degrades to "No worker matches this code or email" for every worker — an offline terminal reads as "your code is wrong" | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:106` | **Codex** |
| C9 | Low | The clock-in/clock-out mutation state keeps the last worker's `user_id` (and result) after return-to-keypad; nothing calls `reset()` — against invariant 3's "wipes user/session data" | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts:70-71,79-82` | **Codex** |
| C10 | Low | `vite-env.d.ts` gained a duplicate `ImportMetaEnv`/`ImportMeta` block that pushes `/// <reference types="vite-plugin-pwa/client" />` below a declaration, where TypeScript ignores the directive | `apps/floor-app/ManagerBeyo-app-floor/src/vite-env.d.ts:3-10` | **Codex** |
| C11 | Low | `public/mockServiceWorker.js` is a public asset, so `dist/mockServiceWorker.js` ships to the kiosk's production origin even though the mock chunk is correctly tree-shaken | `apps/floor-app/ManagerBeyo-app-floor/public/mockServiceWorker.js` | **Codex** |
| C12 | Low | `KioskProvider` accepts `terminalLabel` / `workspaceName` and ignores both (`_`-prefixed) — dead public API against master decision "Config via KioskProvider props" | `packages/clock-kiosk/src/providers/KioskProvider.tsx:32-33` | **Codex** |
| C13 | Low | Public-API + memo hygiene: `loadIdentityConfirmSurfacePage`/`loadResultSurfacePage` are exported although hosts consume `clockKioskSurfaces`; `adapters={{}}` is a fresh literal each render, busting the provider's `useMemo` and both view-model memos | `packages/clock-kiosk/src/index.ts:43-48`, `apps/floor-app/ManagerBeyo-app-floor/src/app/FloorKioskProvider.tsx:41` | **Codex** |
| C14 | Note | The 409 unit test rejects with a bare `{ status: 409 }`; production throws `ApiRequestError`. The reviewer verified the real path end-to-end, so this is test fidelity only | `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx:180` | **Codex** |
| C15 | Note | Phase 4's validation never ran the `tablet` project — the iPad-portrait primary target that Phase 3 correction C1 added. The reviewer ran it: 5/5 green. Evidence gap, not a defect | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md:81-82` | **Codex** |

## Acceptance criteria

1. **C1 (Codex)** — physical digits drive the keypad **only when the keypad is the active screen**. Both halves are required:
   - the handler ignores events whose target is an editable element (`input`, `textarea`, `[contenteditable]`) — and does not `preventDefault()` them;
   - the handler is inert whenever a non-kiosk surface is open or the kiosk page is not mounted (e.g. gate the listener on the kiosk page's own mount, or on the surface stack being free of foreign surfaces).
   Proven by three Playwright cases: on `/sign-in`, `pressSequentially("TERMINAL 04")` yields exactly `TERMINAL 04` and a password containing digits round-trips intact; on the open device-settings surface, the auto-return field accepts `30`; and typing four digits while device settings is open does **not** open the identity-confirm surface. (Reviewer's measured baseline today: `"TERMINAL "`, `"Passwrd"`, auto-return unchanged at `12`, and confirm surface opened over settings.)
2. **C2 (Codex)** — no worker-shift request is issued before the floor session is authenticated. `useFloorRosterQuery` runs only under the protected kiosk route (mount the provider/controller inside the protected branch, or gate the query on `enabled: isAuthenticated`). Proven by a Playwright case asserting **zero** `/api/v1/users?role=worker` requests while on `/sign-in`, and by removing the roster route stub added to `floor-bootstrap.spec.ts:84-95` — that spec must stay green **without** it. No `auth:session-expired` fires and the revoked-device note stays hidden on a never-signed-in device.
3. **C3 (Codex)** — the clock-in result reads `"Good morning, {first}"` / `"Good afternoon, …"` / `"Good evening, …"` per the master's Design→data mapping row and `clock_in_result.png`. The day-part→copy mapping is one exported pure helper, unit-tested across all three parts; the controller test stops mocking `dayPartGreeting` with a fabricated return (or asserts against the real Phase 1 helper), and one Playwright assertion pins the full greeting string, not a substring.
4. **C4 (Codex; Claude under option (b))** — the confirm and result screens render on the kiosk's warm paper at full opacity, with the header chrome legible, matching `clock_in_confirmation_of_user.png` / `clock_in_result.png`; no dim is visible on either, and the result screen is not darker than the confirm screen. Independently of that, the keypad page **stays rendered** beneath open kiosk surfaces (`ClockKioskPage` must not return `null` when `flow.step !== 'keypad'`), so decision #2's "always-mounted keypad" is structural. Proven by a Playwright assertion that `keypad-screen` and four `code-cell`s are present in the DOM while `identity-confirm-screen` is visible (measured baseline today: 0 and 0).
5. **C5 (Codex)** — closing any kiosk surface plays the rise exit with its content still rendered: close the surfaces first and reset the store when the exit completes (or keep the last view model until the surface unmounts). The keypad still shows cleared cells the instant it is revealed, and the existing "cleared keypad on every path" tests stay green.
6. **C6 (Codex)** — a failed action is distinguishable from a no-op. Minimum: the confirm step stays open with one generic, non-enumerating retry message for non-409 failures (the 409 path is unchanged and must stay silent); a post-action `/current` refetch failure does not discard a server-side-successful clock action silently. Unit tests cover both branches. Anything richer (skeletons, offline banner) belongs to Phase 7 — do not build it here.
7. **C7 (Codex)** — the role line is derived from an explicitly named key set only; no "first string value" fallback. When no known key is present the line is omitted (the kit already hides it on `null`).
8. **C8 (Codex)** — when the roster query has no data because it failed, a miss is not reported as "no worker matches". Minimum: the keypad's pending/disabled state covers `isError` and the generic no-match copy is not shown for that case.
9. **C9 (Codex)** — `returnToKeypad` also clears the action mutations (`clockIn.reset()` / `clockOut.reset()`); a store/controller test asserts no `user_id` survives in controller-visible state after return.
10. **C10 (Codex)** — `vite-env.d.ts` declares `VITE_FLOOR_MOCKS` on the single existing `ImportMetaEnv` interface, with both `/// <reference …/>` directives at the top of the file, above every declaration.
11. **C11 (Codex)** — the production build no longer emits `dist/mockServiceWorker.js` (move the worker script out of `public/` and generate/copy it only for the mock mode, per MSW's documented setups), or the deviation is recorded explicitly in the summary as accepted with its reasoning. Verified by `ls dist/`.
12. **C12 (Codex)** — `KioskProvider` either consumes `terminalLabel`/`workspaceName` (feeding them to kiosk-owned chrome) or stops accepting them; the master's decision-#9 config surface and the code agree either way.
13. **C13 (Codex)** — the package barrel exports only what a host needs (`clockKioskSurfaces`, `loadClockKioskPage`, `KioskProvider`, ids, types); the floor host passes a stable `adapters` reference (module-level constant or `useMemo`).
14. **C14/C15 (Codex)** — the 409 test rejects with a real `ApiRequestError(409, …)`; the summary's Validation section lists mobile, **tablet**, and desktop Playwright runs.
15. No regression: root `typecheck` exit 0; `test:clock-kiosk`, `test:worker-shifts`, `test:ui`, `test:auth`, `test:api-client` and the floor unit suite green; `clock-kiosk` + `floor-bootstrap` Playwright green on **mobile, tablet and desktop**; floor `lint` and `build` green. No Claude-owned component file is edited unless option (b) is chosen and the change is recorded here.

## Contracts and skills

### Contracts loaded

- Core set per `task_system/frontend_contract_goal_mapping_guide.md`: `01_architecture.md` (+`_local`), `02_types.md`, `04_api_client.md` (+`_local`), `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`.
- Triggered: `07_components.md`, `10_pages.md`, `23_providers.md`, `28_surfaces.md` (+`_local` — the `rise` entry) for C4/C5; `12_auth.md` (+`_local`) for C2; `27_responsive.md` + `31_animations.md` for C4/C5; `17_testing.md` and `34_runtime_validation.md` (+`_local`) for every criterion's proof; `35_shared_packages.md` §13–14 for C4(a)/C13; `03_environment.md` for C10/C11.

### File read intent — pattern vs. relational

- Permitted relational reads: `apps/floor-app/.../src/pages/DeviceSettingsPage.tsx` + `src/components/FloorKioskFrame.tsx` (the established rise-page framing precedent for C4(a)); `packages/ui/src/providers/SurfaceProvider.tsx` (registration shape only); `packages/worker-shifts/src/lib/shift-time.ts` (the real `dayPartGreeting` contract for C3).
- Prohibited: reading other packages' controllers/stores for structure — `06`/`08`/`23` define it.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. C2 then C1 — restore the floor app outside the kiosk loop (provider placement + listener scoping); delete the `floor-bootstrap` roster stub and prove both with Playwright.
2. C4 (chosen option) + C5 + the keypad-stays-mounted fix — one surface-composition pass, one screenshot-backed Playwright assertion set.
3. C3 + C7 + C8 + C6 — view-model and failure-path pass with unit tests.
4. C9 + C12 + C13 + C14 — hygiene pass.
5. C10 + C11 + C15 — build/config/evidence pass.
6. Full validation matrix (criterion 15), summary, archive, master Review log entry.

## Risks and mitigations

- Risk: scoping the keydown listener (C1) breaks desktop keypad input, the phase's criterion 9. Mitigation: the existing `physical keypad completes the clock-in journey` spec runs on all three projects and must stay green.
- Risk: moving the provider (C2) changes where the flow store lives and silently resets sessions on navigation. Mitigation: the store is created in a ref inside `KioskProvider`; keep the provider mounted for the whole protected subtree, not per-route-render, and keep every auto-return/race test green.
- Risk: C4(b) touches the shared surface engine used by three live apps. Mitigation: prefer C4(a); if (b) is chosen, the prop is additive with a default that leaves every existing surface type byte-identical, and `test:ui` must stay green.
- Risk: C6 grows into Phase 7's error-state work. Mitigation: criterion 6 caps it at one generic retry message; no skeletons, no offline UI.

## Validation plan

- `npm run typecheck` — exit 0.
- `npm run test:clock-kiosk`, `npm run test:worker-shifts`, `npm run test:ui`, `npm run test:auth`, `npm run test:api-client`, floor `npm run test:unit` — green.
- `npx playwright test --grep clock-kiosk` and `--grep floor-bootstrap` on `--project=mobile`, `--project=tablet`, `--project=desktop` — green.
- `npm run lint --workspace managerbeyo-app-floor` and `npm run build --workspace managerbeyo-app-floor` — green; `ls apps/floor-app/ManagerBeyo-app-floor/dist` inspected for C11.

## Review log

- 2026-07-30 Opus (Phase 4 review): plan created from the review's findings. C1 and C2 are blocking; C3 and C4 break the design contract on the two most-seen screens. Every finding was reproduced against the running app before it was written down.
- 2026-07-30 Codex: C1–C15 implemented with C4 option (a). Root typecheck; kiosk 18/18; worker-shifts 36/36; UI 162/162; auth 3/3; API client 3/3; floor 8/8; lint/build; and combined kiosk/bootstrap Playwright 7/7 each on mobile, tablet, and desktop passed. Production `dist/` contains no `mockServiceWorker.js`. Summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_corrections_20260730.md`; archive record: `docs/architecture/archives/ARCHIVE_clock_kiosk_phase4_corrections_20260730_0730.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: optional Opus re-review / Phase 6
- Transition owner: user / reviewer
