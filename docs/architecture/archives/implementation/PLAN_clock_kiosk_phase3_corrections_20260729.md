# PLAN_clock_kiosk_phase3_corrections_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase3_corrections_20260729`
- Status: `archived` (2026-07-29, C1–C11 dispositions complete — see Review log)
- Owner agent: `Opus (reviewer, author)` — execution split Codex / Claude per finding
- Created at (UTC): `2026-07-29T19:05:00Z`
- Last updated at (UTC): `2026-07-29T19:30:00Z`
- Related issue/ticket: none provided
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Source phase plan (archived): `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Plan type: **corrections plan** — fixes only. It adds no capability and moves no phase boundary.

## Goal and intent

- Goal: close the findings from the Phase 3 Opus review (verdict **pass-with-notes**). Phase 3 is blessed and Phase 4 may proceed in parallel with these fixes; nothing here blocks it.
- Business/user intent: keep the floor kiosk's device-safety guarantees (auto-return, terminal never rests on a personal screen) and its primary-viewport fidelity honest before Phase 4 builds the flow on top of this shell.
- Non-goals:
  - Any Phase 4 work (`@beyo/clock-kiosk` flow, keypad, confirm/result screens).
  - Re-opening the `rise` surface registration — it was reviewed and is correct.
  - Changing the three live apps' surface behavior in any way.
  - Changing the M1 floor-gated sign-out `finally` — it was reviewed and is correct.

## Scope

- In scope: `apps/floor-app/ManagerBeyo-app-floor` (playwright config, tsconfig, package.json, device settings page, device-config store, sign-in page), root `package.json` typecheck chain, `architecture/14_styling.md` §14 table, `packages/styles/src/index.css` (removal only), `packages/ui/src/components/surfaces/RiseSurface.tsx` (a11y attribute only), `packages/clock-kiosk/src/index.ts` (barrel only).
- Out of scope: every other package and app; all kiosk flow logic.
- Assumptions: the Phase 3 validation baseline is green and reproducible (independently re-run by the reviewer — see the master Review log).

## Clarifications required

- (none — every finding has a determined fix; C2's clamp bounds are stated below as the plan's decision, adjustable by the user at review time)

## Findings and routing

Severity ordering is the review's. **Owner** is binding per the master's "Division of labor" (Codex = logic/wiring/config; Claude = visual/chrome/DOM).

| # | Severity | Finding | File | Owner |
|---|---|---|---|---|
| C1 | Medium | Playwright config defines only a `desktop` project | `apps/floor-app/ManagerBeyo-app-floor/playwright.config.ts:14-21` | **Codex** |
| C2 | Medium | `autoReturnSeconds` accepts any integer — 0 and negatives persist | `apps/floor-app/ManagerBeyo-app-floor/src/pages/DeviceSettingsPage.tsx:48-52`, `src/store/device-config.store.ts:9` | **Codex** |
| C3 | Low | `@beyo/clock-kiosk` absent from the root typecheck chain | `package.json:18` | **Codex** |
| C4 | Low | `14_styling.md` §14 authoritative table not updated for `@beyo/clock-kiosk` | `architecture/14_styling.md:204-221` | **Codex** |
| C5 | Low | Floor `tsconfig.app.json` excludes test files from the typechecked program | `apps/floor-app/ManagerBeyo-app-floor/tsconfig.app.json:41` | **Codex** |
| C6 | Low | Unused declared dependencies `@beyo/notifications`, `@beyo/api-client` | `apps/floor-app/ManagerBeyo-app-floor/package.json:18,23` | **Codex** |
| C7 | Low | Revoked-device note inferred from stored label, not from the expiry event; no test | `apps/floor-app/ManagerBeyo-app-floor/src/pages/SignInPage.tsx:62-70` | **Codex** |
| C8 | Low | PWA `registerType: "prompt"` on an unattended kiosk | `apps/floor-app/ManagerBeyo-app-floor/vite.config.ts:20` | **Codex** |
| C9 | Low | `RiseSurface` is `role="dialog" aria-modal="true"` with no accessible name | `packages/ui/src/components/surfaces/RiseSurface.tsx:92-96` | **Claude** |
| C10 | Low | `.kiosk-shake` (Phase 4 keypad-error styling) landed in Phase 3 | `packages/styles/src/index.css:84-110` | **Claude** |
| C11 | Note | `KioskKitShowcase` exported from the package's public barrel | `packages/clock-kiosk/src/index.ts:34` | **Claude** |

## Acceptance criteria

1. **C1 (Codex)** — `playwright.config.ts` declares both projects required by `34_runtime_validation_local.md`: `mobile` (iPhone 14 Pro preset) and `desktop` (1440×900), plus — because master decision #12 makes **iPad portrait (834×1194) the primary design target** for this capability — a `tablet` project. `package.json` gains `test:e2e:mobile` and `test:e2e:tablet` alongside the existing `test:e2e:desktop`. The `floor-bootstrap` spec passes on all three projects unchanged (it asserts chrome + clock, both viewport-independent).
2. **C2 (Codex)** — `autoReturnSeconds` is range-validated, not merely integer-parsed. A single shared bound (suggested: **min 4, max 120**) is enforced in three places: the settings input (`min`/`max` attributes + rejected-value feedback), the save handler before `setAutoReturnSeconds`, and `PersistedDeviceConfigSchema` so a hand-edited/corrupt `localStorage` value falls back to the default 12 rather than rehydrating. Unit tests cover: out-of-range save rejected, out-of-range persisted value → default on rehydrate.
3. **C3 (Codex)** — root `typecheck` runs `tsc -p packages/clock-kiosk/tsconfig.json --noEmit` in the chain, positioned alongside `worker-shifts`. Exit 0.
4. **C4 (Codex)** — `architecture/14_styling.md` §14's "Current authoritative list" table gains a `@beyo/clock-kiosk` row (`className` usages: yes) with its `@source` directive, per that section's own step 2. `@beyo/worker-shifts` is added as a `no — omit` row (zero className, no UI by master's package boundaries). No other app's `index.css` is changed: the other three apps do not consume `@beyo/clock-kiosk`.
5. **C5 (Codex)** — floor `tsconfig.app.json` no longer excludes `src/**/*.test.ts(x)`, matching the three sibling apps, so test files are typechecked by `npm run typecheck`. If that surfaces errors in the existing four test files, they are fixed here.
6. **C6 (Codex)** — `@beyo/notifications` and `@beyo/api-client` are removed from the floor app's `dependencies` (neither is imported by app source; `@beyo/auth` carries them transitively), or a one-line comment records why a direct declaration is required. `npm install` clean, build and typecheck still green.
7. **C7 (Codex)** — the sign-in recovery note is driven by an explicit revocation signal rather than by the presence of a persisted terminal label: the `auth:session-expired` path records a device-revoked flag (session-scoped is sufficient) that `SignInPage` reads and clears on render. A Playwright case covers criterion 6 end-to-end: authenticated device → mocked `401` → lands on `/sign-in` with `floor-session-expired-note` visible and the floor token key absent from `localStorage`.
8. **C8 (Codex)** — the PWA registration strategy is reconsidered for an unattended device: either `registerType: "autoUpdate"`, or `prompt` retained with a recorded justification in this plan's Review log. A kiosk with no operator cannot answer an update prompt.
9. **C9 (Claude)** — `RiseSurface`'s dialog element carries an accessible name (an `aria-label` prop defaulting to a sensible value, or `aria-labelledby` wired the way `ModalSurface` does it). DOM/class changes stay minimal and the existing rise tests still pass; the two rise specs gain an accessible-name assertion.
10. **C10 (Claude)** — `.kiosk-shake` and its `@keyframes` are removed from `packages/styles/src/index.css` and re-land with the Phase 4 keypad kit. No `--color-kiosk-*` or `--font-kiosk-*` token is touched. Confirm by grep that nothing currently references the class.
11. **C11 (Claude)** — `KioskKitShowcase` is dropped from `packages/clock-kiosk/src/index.ts` (kept in the tree, imported directly by whatever renders it for design review), so the package's public API contains only shipped components. Root typecheck stays green.
12. No behavior change reaches `managers-app`, `workers-app`, `selleres-app`, or `presentation-studio`; `npm run test:ui`, `test:auth`, and `test:api-client` stay green.

## Contracts and skills

### Contracts loaded

- `34_runtime_validation.md` (+ `_local`) — C1, C7: the mandated project set and the mobile-first run order.
- `14_styling.md` §14 — C4: the authoritative `@source` table and its maintenance step.
- `26_persistence.md` — C2: persisted-store validation and rehydrate fallback.
- `28_surfaces.md` (+ `_local`) — C9: surface shell contract for the `rise` type.
- `12_auth.md` (+ `_local`) — C7: the `auth:session-expired` path.
- `17_testing.md` — C2, C7: unit and e2e expectations.
- `03_environment.md` — C8: PWA/env wiring.
- `35_shared_packages.md` — C3, C11: package registration and public-API surface.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: project names `mobile` / `desktop`, mobile run-first rule.
- `architecture/28_surfaces_local.md`: the `rise` entry added in Phase 3.

### File read intent — pattern vs. relational

Permitted relational reads: the three sibling apps' `playwright.config.ts` (project preset shapes — C1), `packages/ui/src/components/surfaces/ModalSurface.tsx` (existing accessible-name wiring — C9), `packages/auth/src/components/AuthProvider.tsx` (the expiry listener — C7), root `package.json`.
Prohibited: any kiosk flow file, any Phase 4 component, any feature folder in the three live apps.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Claude session first (C9, C10, C11) — kit/chrome/token surface, so Codex's read-only constraint holds afterwards.
2. Codex session (C1–C8), in order: config/registration fixes (C3, C4, C5, C6, C8), then the validated store (C2), then the revocation signal (C7), then the Playwright project matrix and the new spec (C1).
3. Re-run the full validation matrix below.

## Risks and mitigations

- Risk: C5 (typechecking test files) surfaces latent errors and expands the diff.
  Mitigation: fix in place; the four test files are small and were all written this phase.
- Risk: C2's clamp bounds are guessed and conflict with Phase 4's auto-return design.
  Mitigation: bounds live in one exported constant in the device-config store so Phase 4 can adjust in one place; the value is recorded in this plan's Review log.
- Risk: C1's new projects surface pre-existing responsive gaps in the kit chrome at 390px / 834px.
  Mitigation: the `floor-bootstrap` spec asserts only chrome text and the clock, which are viewport-independent; any genuine layout defect found is a **Claude** finding and gets logged here rather than fixed by Codex.
- Risk: C7 changes the auth expiry path and touches shared `@beyo/auth`.
  Mitigation: the flag is written by the floor app's own listener where possible; if `@beyo/auth` must change, the change is `app_scope === "floor"`-gated with the same discipline as Phase 2, and `npm run test:auth` proves non-floor invariance.

## Validation plan

- `npm run typecheck`: zero errors (now including `packages/clock-kiosk` and the floor test files).
- `npm run test:unit --workspace managerbeyo-app-floor`: green, with the new C2 store cases.
- `npm run test:ui`, `npm run test:auth`, `npm run test:api-client`: green — proves C9 and C7 regressed nothing shared.
- `npx playwright test --grep floor-bootstrap --project=mobile`: green (run first, per `34_runtime_validation_local.md`).
- `npx playwright test --grep floor-bootstrap --project=tablet`: green (primary design target, decision #12).
- `npx playwright test --grep floor-bootstrap --project=desktop`: green.
- `npx playwright test --grep floor-revoked --project=tablet`: green (C7).
- `npm run lint --workspace managerbeyo-app-floor` and `npm run build --workspace managerbeyo-app-floor`: green.

## Review log

- 2026-07-29 Codex: C1–C8 completed and validated. C1 adds mobile/tablet/desktop projects and scripts; C2 enforces the accepted 4–120 range through one exported constant at input, save, and rehydrate boundaries; C3–C6 close typecheck, styling-table, test-inclusion, and direct-dependency bookkeeping; C7 records the existing explicit expiry event through an optional `AuthProvider` callback used only by the floor host and proves the full revoked-device landing; C8 uses PWA `autoUpdate`. Validation passed: root typecheck; floor unit 5 files / 8 tests; UI 29 / 162; auth 2 / 3; api-client 1 / 3; mobile/tablet/desktop bootstrap 1/1 each; tablet revoked 1/1; floor lint and build. C9/C11 remain as Claude executed them; C10 retains Claude's no-removal disposition because `CodeCells` now consumes `.kiosk-shake`. Summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_corrections_20260729.md`; archive record: `docs/architecture/archives/ARCHIVE_clock_kiosk_phase3_corrections_20260729_1930.md`.
- 2026-07-29 Claude (Fable, orchestrator): plan **approved**; C2's proposed clamp bounds **min 4 / max 120 accepted** as written (single exported constant so Phase 4 adjusts in one place). **Claude findings executed same day:**
  - **C9 done (amended mechanism):** `RiseSurface` now holds `setTitle` state and feeds it to the dialog's `aria-label` (fallback `"Screen"`) — pages announcing via `SurfaceHeaderContext.setTitle` get a real accessible name, mirroring `ModalSurface`'s labelling seam rather than adding a shell prop the renderer can't pass. Accessible-name assertion added to `SurfaceProvider.rise.test.tsx`; `test:ui` 162/162 green.
  - **C10 closed as resolved-by-events, no removal:** the criterion's own grep condition now fails — `.kiosk-shake` is referenced by the built and user-approved Phase 4 kit (`packages/clock-kiosk/src/components/keypad/CodeCells.tsx`), which the reviewer could not see because the kit was untracked at review time. The styling is no longer "landed early"; removing it would break the approved kit. No token touched.
  - **C11 done (amended mechanism):** `KioskKitShowcase` dropped from the public barrel and moved behind a **`./showcase` subpath export** (deep imports are banned repo-wide, so "imported directly" is realized the same way `@beyo/worker-shifts/mocks` is). README updated.
  - Codex validation for its half must additionally keep `test:ui` green (the C9 change lives in shared `@beyo/ui`).
- 2026-07-29 Opus (Phase 3 review): plan created from the review's 11 findings. Verdict was **pass-with-notes** — no blocking defect, so Phase 4 is **not** gated on this plan. C1 and C2 are the two that matter; the rest are hygiene and contract bookkeeping. Routing per finding is in the table above and is binding: C9/C10/C11 are Claude's (DOM, tokens, public kit surface), everything else is Codex's.

## Lifecycle transition

- Current state: `archived`
- Next state: none — corrections complete
- Transition owner: Codex
