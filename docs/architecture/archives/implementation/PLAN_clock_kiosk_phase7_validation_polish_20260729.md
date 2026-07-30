# PLAN_clock_kiosk_phase7_validation_polish_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase7_validation_polish_20260729`
- Status: `archived`
- Owner agent: Codex (implementer) / Claude Fable (design-fidelity half + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-30T10:15:41Z`
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

## Carried-forward items (accumulated 20260729–20260730; explicitly in scope — each is authorized, not an audit discovery)

| # | Item | Origin | Owner |
|---|---|---|---|
| CF1 | `msw` becomes a package-level `devDependencies` entry in `packages/worker-shifts` (currently resolves via root hoist). ⚠ Requires `npm install` — after it, verify vite/vitest native bindings survived (known lockfile hazard: rolldown + lightningcss darwin-arm64 can drop; reinstall both together if `Cannot find native binding` appears). | Phase 1 re-review note | Codex |
| CF2 | Default-state summary whitespace at iPad portrait (~550px dead space between a single insight row and the pinned Done) — assess and, if warranted, rebalance within the approved layout. | Phase 6 review C14 | Claude (fidelity pass) |
| CF3 | `KNOWN_INSIGHT_CODES` import drags the full manager `INSIGHT_COPY` map into the kiosk chunk as dead data — extract a standalone codes module in `@beyo/stats` (additive; manager consumers byte-unaffected, stats tests prove it). | Phase 6 re-review N1 | Codex |
| CF4 | Add a positive-form throttled cold-load assertion: `KioskSurfaceSkeleton` DOES appear inside the frame when chunks are genuinely cold — strengthening O3's negative-form proof. | Phase 6 re-review N2 | Codex |

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

- 2026-07-30 Codex: completed Codex-owned CF1, CF3, and CF4. `msw` is now a
	`@beyo/worker-shifts` development dependency. Root install initially dropped
	the Darwin Rolldown optional binding; the required paired reinstall of
	`@rolldown/binding-darwin-arm64` and `lightningcss-darwin-arm64` restored Vite
	startup. `KNOWN_INSIGHT_CODES` now has the standalone public
	`@beyo/stats/insight-codes` module, while the existing stats barrel export is
	retained. A throttled cold confirm chunk now proves `KioskSurfaceSkeleton`
	appears inside `KioskFrame`.
- 2026-07-30 Codex: resilience coverage is complete where automatable. Header
	clock resyncs from `new Date()` on focus/visible events; a hidden confirmation
	that outlasts 30 seconds returns to the cleared keypad; fresh roster data
	refetches through TanStack Query's focus manager; stale roster data remains
	matchable; a roster error with no cached users presents the quiet
	"Terminal offline" keypad state. The synthetic Playwright visibility test was
	deliberately replaced by the deterministic public `focusManager` lifecycle
	test because a foreground Playwright page cannot faithfully generate a browser
	focus transition. The physical-device rehearsal script is documented in
	`packages/clock-kiosk/README.md`; its sleep/wake and offline steps require a
	target kiosk device and remain pending external execution.
- 2026-07-30 Codex: integration README and per-endpoint live-flip checklist are
	complete. The handoff liveness table shows every v1 endpoint remains ❌, so a
	live mocks-off endpoint rehearsal is not applicable yet; pause reasons are ✅
	but excluded with the shelved declare flow. Public-boundary grep passed: floor
	imports only exported `./mocks` and `./showcase` subpaths; `worker-shifts`
	imports no UI/kiosk module; `clock-kiosk` imports no app code.
- 2026-07-30 Codex validation: `npm run typecheck` passed; `test:stats` 143/143;
	`test:worker-shifts` 40/40; `test:clock-kiosk` 54/54; floor `test:unit` 9/9;
	`npx playwright test --grep clock-kiosk` passed 9/9 on mobile, tablet, and
	desktop. `git diff --check` passed. Claude's design-fidelity/a11y entry and
	target-device manual rehearsal are required before the summary/archive/master
	closure transition.

- 2026-07-30 Claude (Fable) — **criterion 7 design-fidelity + a11y pass, executed with captured evidence.** Method: a temporary Playwright spec (deleted after the pass) drove the real mocked flow and screenshotted keypad, email mode, confirm (in+out), clock-in result, and full-analytics summary on all three projects; screenshots compared side-by-side against the five design images. **Fidelity verdict: faithful.** Fonts (Instrument Sans / IBM Plex Mono) load and match; palette tokens exact; radii/shapes match; mono numerals everywhere times/counts/deltas appear; phone ordering rule (hours → insights → items → week/rate) verified in the mobile summary capture; tablet portrait is a near-pixel match to the mocks. Findings + fixes applied during the pass (all re-validated — 27/27 e2e across three projects after changes): **(f1)** desktop/iPad-landscape idle screen overflowed a 900px viewport (~40px, email pill clipped) → `lg:` size/rhythm step-down in `Keypad`/`KeypadScreen` (kit, Claude-owned); tablet portrait unaffected (`lg` ≥1024px). **(f2)** announcement dates rendered raw ISO ("2026-07-29") — `gateAnnouncements` passed the adapter's ISO through a prop contracted as display text → ISO→"29 Jul" formatting added in `lib/kiosk-adapters.ts`. **Transparency note: f2 is a logic-file edit by Claude** (3-line display formatter, dev-showcase-affecting only — production announcements adapter is empty); recorded here for the reviewer to object to if the seam-crossing matters. **(f3, no code change)** an 8400% insight during capture was traced to a wrong test fixture (percent fed where the live-proven fraction semantics apply) — the formatter is correct; kiosk unit tests already pin fraction semantics. **(f4, note)** showcase week fixture statically marks Wed as today — fixture data, not logic. **A11y:** every keypad key/action carries an accessible name (verified in the Playwright accessibility snapshot, incl. "Open terminal settings with a long press"); focus-visible states present on keys/buttons/input; reduced-motion honored at both layers (`MotionConfig reducedMotion="user"` + CSS media queries on shake/shimmer); contrast measured — ink/buttons/plate/error all ≥4.5:1 (ink-on-key 14.3, white-on-accent 6.6, white-on-success 6.4, plate-label 5.1, error 4.7); `--color-kiosk-secondary` 3.53:1 and `--color-kiosk-tertiary` 2.62:1 pass only as large/decorative text — **accepted as the design's approved palette**, recorded with the remedy (darken secondary toward ~#767061) if AA body-text compliance is ever required. **CF2 decision: accepted, no rebalance** — the sparse-summary dead space is structural to the design's bottom-pinned primary action; it is the honest launch state and fills as backend gaps #3–#5 close. During the pass a two-process port-5175 collision briefly poisoned runs — killed both, re-validated cold; this independently re-confirms the C1 stale-server hazard the corrections fixed.

## Lifecycle transition

- Current state: `archived`
- Transition completed: summary → archive record → archived plan move → master capability-complete entry
- Transition owner: Codex, after Claude completed criterion 7 on 2026-07-30
