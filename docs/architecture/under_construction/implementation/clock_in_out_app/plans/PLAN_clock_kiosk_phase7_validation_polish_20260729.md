# PLAN_clock_kiosk_phase7_validation_polish_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase7_validation_polish_20260729`
- Status: `under_construction`
- Owner agent: Codex (implementer) / Claude Fable (design-fidelity half + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T13:30:00Z`
- Master plan: `../PLAN_clock_kiosk_master_20260729.md`
- Depends on: Phases 1–4 and 6 archived (Phase 5 is shelved — master decision #10).

## Goal and intent

- Goal: close the capability — resilience of an always-on device, complete loading/empty/error/skeleton coverage, full test matrix, public-API audit, host-app integration documentation, and the final design-fidelity pass.
- Non-goals: no new features; no backend-gap wiring; no live-backend switchover (that happens per backend phase flip, tracked in the handoff's status table — this phase only verifies the flip procedure against any endpoint already ✅, i.e. pause-reasons today).

## Scope

- In scope: both packages + the floor app; root scripts; a kiosk integration README.
- Out of scope: other apps' wiring (future capability when kiosk pages are mounted there).

## Clarifications required

- (none)

## Acceptance criteria

1. Always-on resilience, tested where automatable and manually scripted where not: device sleep/wake and tab re-focus resync the header clock and refetch the roster (focus refetch verified); a mid-flow visibility loss ≥ the confirm inactivity window returns to keypad; QueryClient errors on the roster surface a quiet retry state on the keypad screen (kiosk stays usable via email if roster is stale but present, and shows a clear "terminal offline" state when there is no roster at all); clock drift is bounded by the per-second tick reading the real clock (no accumulating interval).
2. Loading/empty/error states audited on every screen against `32_loading_skeletons.md`: roster loading (first boot), confirm pending, action pending, summary partials (Phase 6), sign-in errors, revoked-device landing. No unstyled flash, no dead-end state without a path back to the keypad.
3. Test matrix complete and green: `test:worker-shifts`, `test:clock-kiosk`, floor app `test:unit`; Playwright kiosk journeys on mobile + desktop projects (tablet-portrait viewport included in the kiosk spec set per master decision #12); all specs run fully mocked; root `package.json` carries the scripts; root `typecheck` covers both packages + app.
4. Public-API audit: `@beyo/worker-shifts` and `@beyo/clock-kiosk` `index.ts` export exactly the documented surface; no deep imports anywhere in the floor app (grep-verified); dependency arrows re-verified (worker-shifts imports no UI; clock-kiosk imports no app code).
5. Live-flip procedure verified: no endpoint the v1 kiosk uses is live yet (pause-reasons dropped with declares), so the flip checklist (env flag, per-endpoint mock removal, re-run of the affected Playwright specs) is documented in the integration README and rehearsed in a mocks-off dev run against whatever the backend liveness table then shows; each future ✅ flip follows that checklist.
6. Integration README (`packages/clock-kiosk/README.md`): how a host app mounts the kiosk page (surface/page registration per `35` §14, provider + adapters, `@source` lines, kiosk tokens, the two font faces, device-config expectations, floor-scope auth requirement) — written for the stated goal of bringing these features to the other applications as pages.
7. Design-fidelity checklist (Claude's half, recorded in this plan's Review log): all five images side-by-side against the running app on iPad portrait, phone, desktop; type faces/weights, palette tokens, radii, key sizes, touch targets ≥44px, mono numerals everywhere times/counts/deltas appear; a11y pass — focus order, `aria-label`s on keypad keys/actions, contrast of secondary text on paper, reduced-motion behavior of shake/slide/countdown.
8. Master plan Review log updated with the capability-complete entry; master moves to its lifecycle end state after this phase archives.

## Contracts and skills

### Contracts loaded

- Core set (guide) + `17_testing.md`, `34_runtime_validation.md` (+`_local`), `32_loading_skeletons.md`, `27_responsive.md`, `18_performance.md`, `30_dynamic_loading.md` (+`_local`), `35_shared_packages.md`.

### File read intent — pattern vs. relational

Permitted relational reads: everything shipped by Phases 1–6 (this phase audits it); root `package.json`; playwright configs.
Prohibited: pattern reads.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Resilience work + tests (criterion 1).
2. State audit sweep, fixing gaps (criterion 2).
3. Test matrix completion + scripts (criterion 3).
4. Public-API + deep-import + dependency audit (criterion 4).
5. Live-flip verification + README (criteria 5–6).
6. Claude design-fidelity + a11y pass (criterion 7); master log closure (criterion 8).

## Risks and mitigations

- Risk: resilience behaviors are hard to automate. Mitigation: automate what Playwright can (focus/visibility events); the rest becomes a written manual script executed and recorded in the Review log.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:worker-shifts && npm run test:clock-kiosk` + floor `test:unit`: green.
- `npx playwright test --grep clock-kiosk --project=mobile` then `--project=desktop`: green.

## Review log

- (append here)

## Lifecycle transition

- Current state: `under_construction` → implement → validate → summary + archive; then master closes
- Transition owner: Codex session (Claude for criterion 7)
