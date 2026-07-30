# PLAN_clock_kiosk_phase6_corrections_20260730

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase6_corrections_20260730`
- Status: `approved` (2026-07-30, Claude Fable orchestrator — C7 resolved to option (a)+amendment; operator findings O1–O3 merged; Claude items C12 + O2 already executed; see Review log)
- Owner agent: `Opus (reviewer, author)` → Codex (C1–C6, C8–C11, C13) / Claude (C7, C12, C14) / orchestrator decision (C7)
- Created at (UTC): `2026-07-30T10:10:00Z`
- Last updated at (UTC): `2026-07-30T10:10:00Z`
- Related issue/ticket: none provided
- Master plan: `../PLAN_clock_kiosk_master_20260729.md`
- Corrects: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md`
- Implementation summary reviewed: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729.md`
- Review that produced it: master Review log entry `2026-07-30 Opus (Phase 6 review)`
- Backend ground truth: handoff §5.1. GAP spec: `../BACKEND_REQUIREMENTS_clock_kiosk_20260729.md` #1–#5.
- Design ground truth: `../image_design/clock_out_result.png`, `clock_in_result.png`, `clock_in_confirmation_of_user.png`, `design_readme.md`.

## Goal and intent

- Goal: close the defects found in the Phase 6 review. **Fixes only** — no new capability, no new tiles, no backend work, no re-litigation of Phase 6's design.
- Business/user intent: the clock-out hero is the single most important number the kiosk ever shows a worker. It must be right (C2), it must not contradict the header beside it (C3), it must not vanish because a subtitle failed to format (C4), and the phase's own validation commands must actually run (C1).
- Non-goals: implementing any GAP tile against real data; changing the kit's DOM/classes beyond the additive items named for Claude; reopening the reuse-vs-fork decision for the stats insight map without an orchestrator answer to C7.

## Scope

- In scope: `apps/floor-app/ManagerBeyo-app-floor` (`vite.config.ts`, `package.json`, `.env.test`, Playwright specs), `packages/clock-kiosk` (`lib/analytics-view-model.ts`, `lib/kiosk-adapters.ts`, `types.ts`, `controllers/use-kiosk-flow.controller.ts` and their tests), `packages/worker-shifts/src/types.ts` (C8 only), Claude-owned kit files for C12/C14 only.
- Out of scope: `@beyo/stats`'s existing copy map as consumed by the managers app (C7 must not change manager-facing behaviour); the archived Phase 6 plan; the master plan beyond its Review log.
- Assumptions: Phase 7 has not started. C8 touches a Phase 1 schema deliberately, with the master's Phase 1 review (F3 tolerance work) as precedent.

## Clarifications required

- [x] **RESOLVED 2026-07-30 (Claude Fable, orchestrator): C7 takes option (a), with one amendment — the fallback for unmapped codes is the kiosk's own neutral generic factual line (metric + signed delta), NEVER the stats title.** Any `@beyo/stats` title is manager-audience by construction, so falling back to it re-imports the problem for future codes. `@beyo/stats` stays byte-untouched. The worker-facing copy table below is authored by Claude (design copy is a kit concern); Codex wires it into the kiosk copy layer with correct number formatting per each code's metric semantics (counts / ratios / durations — read them from `packages/stats/src/lib/insight-copy.ts` relationally):

  | code | kiosk factual sentence (template) |
  |---|---|
  | `completion_surge` / `completion_dip` | `{target} steps completed vs your recent average of {baseline}` |
  | `on_a_roll` | `{target} days in a row at or above your recent completion bar` |
  | `deep_focus` | `{target}% of the day spent working vs {baseline}% usual` |
  | `faster_pace` / `slower_pace` | `{target} steps per focused hour vs {baseline} usual` |
  | `rising_pauses` | `Average pause {target} vs {baseline} usual` (formatted as minutes) |
  | `leaving_steps_mid_shift` | `{target} steps left unfinished at shift end vs {baseline} usual` |
  | `choppy_work` | `{target} work sessions per finished step vs {baseline} usual` |
  | `quality_watch` | `{target}% of raised issues resolved vs {baseline}% usual` |

  Rules: one template per fact regardless of direction (surge/dip share a sentence — polarity lives in the delta column's sign and color); no evaluative labels anywhere; second person ("your") is acceptable on a personal summary screen; numbers rounded like the design (one decimal for rates, integers for counts).

- **Original C7 clarification (for the record):** **C7 — insight copy audience.** The kiosk now renders `@beyo/stats`'s manager-audience insight labels to the worker themselves on a shared shop-floor terminal ("Choppy work", "Quality watch", "Leaving steps mid-shift", "On a roll", "Deep focus"). The design readme rules copy "deliberately factual, not motivational: a statement plus a signed delta". The Phase 6 plan mandated *importing* the existing map rather than forking it, so the two instructions conflict. Pick one before C7 is implemented: **(a)** keep the import and add a kiosk-facing `code → factual sentence` layer in `@beyo/clock-kiosk` that falls back to the stats title for unmapped codes (recommended — no manager-app behaviour change, design rule honoured); **(b)** add a second `audience: 'worker' | 'manager'` copy table inside `@beyo/stats/insight-copy`; **(c)** accept the manager labels on the kiosk and amend the design readme's copy rule. This blocks only C7.

## Acceptance criteria

1. **C1 (blocking) — the validation plan runs as delivered.** The floor dev port and `playwright.config.ts` agree again on master decision #1's **5175** (`vite.config.ts` currently 5177 vs `playwright.config.ts` `webServer.url`/`baseURL` 5175, so every Playwright command in the Phase 6 validation plan dies with `Error: Timed out waiting 120000ms from config.webServer` on a machine without a stale server on 5175). `reuseExistingServer: true` is why the phase's own run passed — the fix must be proven on a machine with **nothing** listening on 5175 beforehand. The `"dev": "vite --host"` change is either reverted or justified in the summary (it publishes the kiosk dev server, unauthenticated `/sign-in` included, to the LAN). Both files appear in the corrections summary's Files-changed list.
2. **C2 (high) — the worked hero pairs the right markers.** IN is the last `started_shift` at/before the final `ended_shift`, not the first of the day. Today `analytics-view-model.ts:184-199` takes the first `started_shift` and the last `ended_shift`, so a day with two shifts overstates: measured, 05:00–08:00 plus 14:00–17:00 (6h worked) renders **"12h 0m", IN 05:00, OUT 17:00**. The handoff warns this is reachable ("Both this app **and Connecteam** write the same shift machinery … a worker may already be clocked in"), and 409-as-normal-flow exists for exactly that. A unit test covers the two-shift day, and the existing `uses the first start and final end marker and tolerates truncation` test (`analytics-view-model.test.ts:33`) is renamed and re-pointed so it stops locking the defect in.
3. **C3 (high) — the summary date is the client date, in the workspace zone.** Master's mapping table says the clock-out subtitle is "roster user + **client date**"; the code uses `analytics.date`, which handoff §5.1 defines as the clock-out's **UTC** date, formatted with a hardcoded `'en-GB'` locale and `timeZone: 'UTC'` (`analytics-view-model.ts:153-163, 203`). Measured (Asia/Jerusalem, clock-out 00:30 local): the screen reads "Assembly · **Wednesday 29 July**" above "OUT **00:30**" while the header clock beside it reads Thursday 30 July. The design (`clock_out_result.png`) shows header date and subtitle date agreeing. Fixed so both derive from the same client clock in the workspace zone, with a test at a zone offset that crosses midnight.
4. **C4 (high) — a subtitle must not be able to discard the hero.** `toClockOutSummaryViewModel` returns `null` for the whole view model when the date label fails to format (`:203-204`), throwing away a valid hero, valid IN/OUT and valid insights. Measured: `date: '2026-07-29T00:00:00Z'` and `date: ''` both drop a fully-valid analytics payload to the plain Phase 4 screen. Neither shape is excluded by the handoff, and `BACKEND_REQUIREMENTS` #8 already records that §5.1 never states which fields are date-only. After the fix, only a genuinely unusable marker pair degrades the screen; a bad date degrades the subtitle. Tests cover both shapes.
5. **C5 (medium) — the scheduled-shift adapter can receive what the backend promises.** `BACKEND_REQUIREMENTS` #1 delivers `scheduled_shift: {start, end}` **additive on `GET /worker-shifts/current`** — the response the kiosk already holds — but `ScheduledShiftAdapter`'s context is `{user, timeZone}` only (`types.ts:51-54`), so wiring it later means changing a public adapter signature, not "a data change, not a UI change" (decision #11). The context gains the fresh `CurrentShift` (nullable). `AnnouncementsAdapter` (`BACKEND_REQUIREMENTS` #2 promises an *endpoint*) either documents in the barrel how a host feeds it from a query without an async channel, or gains one.
6. **C6 (medium) — the confirm row and the clock-in plate get their own labels.** The design labels them differently — "Today's shift" on the confirm row (`clock_in_confirmation_of_user.png`) and "SCHEDULED" on the plate (`clock_in_result.png`) — but one `ScheduledShiftDisplay {label, value}` is rendered verbatim by both (`use-kiosk-flow.controller.ts:441` → `IdentityConfirmScreen.tsx:77`; `:488` → `DarkTimePlate.tsx:41`), and the shipped showcase adapter returns `label: 'SCHEDULED'`, so the confirm row reads "SCHEDULED 07:00 – 15:30". The adapter returns data (the two times) and the assembly supplies each surface's label; time formatting stays in the mapping module rather than in host adapters (checklist #5). Playwright asserts both labels.
7. **C7 (medium) — insight copy matches the design's factual rule.** Per the C7 clarification above. Whichever option is chosen, the manager-facing strings verified present in the floor production bundle today ("On a roll", "Deep focus", "Choppy work", "Quality watch") no longer reach the worker's screen unchanged, and `@beyo/stats`'s manager consumers are byte-unaffected (their tests prove it).
8. **C8 (medium, carried into `@beyo/worker-shifts`) — partial analytics degrades instead of failing the action.** Measured: omitting one `timeline` counter, or `timeline` itself, makes `ClockOutResultSchema` reject, so a **server-side-successful** clock-out surfaces as "Something went wrong. Please try again" on the keypad — inviting a double clock-out, the exact outcome §5.1's hard rule exists to prevent. `AnalyticsTimelineSchema`'s five counters are required and `ClockOutAnalyticsSchema.timeline` has no default (`worker-shifts/src/types.ts:66-77, 109`). Bring them to the same tolerance Phase 1's F3 correction applied to the sibling keys, so an unusable `analytics` degrades to the plain screen rather than failing the mutation. Phase 6's criterion 2 ("partial data degrades per-tile, never crashes") is then true for payloads that do not parse today.
9. **C9 (low) — a known code keeps its copy at any polarity.** `toStatsInsight` returns `null` for any `polarity` outside `positive|negative` (`analytics-view-model.ts:100-102`), so a known code arriving `neutral` silently drops to the generic humanized line even though `insightPolarity` (`:82-87`) models `neutral` explicitly. Test covers a known code with a neutral polarity.
10. **C10 (low) — nested adapter merge cannot be hollowed out.** `resolveKioskAdapters` merges `summaryExtras` by spread (`kiosk-adapters.ts:29-32`) while the top level uses `??`, so a host passing `summaryExtras: { items: undefined }` — legal under `Partial<SummaryExtrasAdapter>` — replaces the default with `undefined` and `gateSummaryExtras` throws `adapters.items is not a function`. Per-key `??`, with a test.
11. **C11 (low) — production defaults have runtime coverage.** Playwright runs entirely under `VITE_FLOOR_MOCKS=1` (`.env.test:3`), so no spec exercises the adapter-default state that actually ships until backend phase 7. The reviewer verified it by hand (flag off: hero + notice + insight row present; `items-completed`, `week-bar-chart`, `rate-tile` absent). Add one `kiosk-summary` spec that pins it, so an accidentally-enabled GAP tile fails CI instead of passing it.
12. **C12 (low, Claude) — announcements render their date.** `AnnouncementsList` accepts `{title, body, accent}` and drops the adapter's ISO `date`, so the design readme's "short, **dated** list" is unmet — the component's own JSDoc says "dated". Additive, kit-owned; the adapter already carries `date`. Codex's declared deviation, recorded here so it is not lost.
13. **C13 (low) — insight rows do not key on their own copy.** `SummaryScreen.tsx:113-118` keys on `insight.text`; two unknown codes sharing a metric and delta produce identical text and collide. Assembly supplies a stable key (the insight `code`) — additive prop only, no DOM change.
14. **C14 (note, Claude / defer to Phase 7) — default-state whitespace.** At iPad portrait with production defaults there is roughly 550px of dead space between the single insight row and the bottom-pinned Done button. The bottom-pinned action is per design and Phase 4's plain screen behaves identically, so this is a Phase 7 design-fidelity item, not a Phase 6 defect. Recorded, not required here.

## Contracts and skills

### Contracts loaded

- Core set per `task_system/frontend_contract_goal_mapping_guide.md`, plus `24_dto.md` (the mapping module is the view-model layer — C2/C3/C4), `34_runtime_validation.md` (+`_local`) (C1/C6/C11), `35_shared_packages.md` §13 (adapter/opener injection seam — C5), `17_testing.md`, `07_components.md` (C12/C13), `03_environment.md` (C1).

### Local extensions loaded

- `34_runtime_validation_local.md`: the mobile-then-desktop order and the iPad-portrait `tablet` project the corrections must re-run.

### File read intent — pattern vs. relational

Permitted relational reads: `packages/worker-shifts/src/types.ts` (C8's exact schema), `packages/stats/src/lib/insight-copy.ts` + its manager consumers (C7's blast radius), kit prop types for C12/C13, `apps/floor-app/.../playwright.config.ts` and `vite.config.ts` (C1). Prohibited: pattern reads.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`. No charting library is introduced (unchanged from Phase 6).

## Implementation plan

1. C1 — reconcile the port with decision #1; prove Playwright from a cold machine.
2. C2 → C3 → C4 in `lib/analytics-view-model.ts` with their tests (one module, one pass).
3. C8 in `@beyo/worker-shifts` schemas, then re-run `test:worker-shifts`.
4. C5 + C6 — adapter context and label seam; update the showcase adapter and the barrel exports.
5. C7 once the clarification is answered.
6. C9, C10, C13 — small guarded fixes with tests.
7. C11 — production-default Playwright spec.
8. C12 — Claude, additive kit change, after the Codex items land.
9. Re-run the full validation plan; write the corrections summary; archive this plan; append the master Review-log entry.

## Risks and mitigations

- Risk: C8 loosens a schema that the manager surfaces also rely on. Mitigation: `@beyo/stats` already treats these keys tolerantly (the precedent Phase 1's F3 correction was tie-broken against); re-run `test:worker-shifts` and the managers-app typecheck.
- Risk: C5's adapter-context change is a public API break for `@beyo/clock-kiosk`. Mitigation: the floor app passes no adapters in v1 and the showcase set is the only consumer, so the break is contained to this repo; the barrel's exported types are updated in the same change.
- Risk: C7 option (b) changes manager-facing copy by accident. Mitigation: option (a) is recommended precisely because it cannot; if (b) is chosen, the managers-app insight tests gate it.
- Risk: C1's port change masks a second stale-server dependency elsewhere. Mitigation: the acceptance criterion requires a cold-start run, not a re-run.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:clock-kiosk`: green, with the new C2/C3/C4/C9/C10 cases.
- `npm run test:worker-shifts`: green, with the C8 tolerance cases.
- `npx playwright test --grep kiosk-summary --project=mobile` then `--project=tablet` then `--project=desktop`: green, **started with nothing listening on 5175**.
- `npx playwright test --grep clock-kiosk`: green on all three projects.
- `npm run lint --workspace managerbeyo-app-floor` and `npm run build --workspace managerbeyo-app-floor`: green; showcase fixtures still absent from `dist`.

## Additional criteria — operator findings O1–O3 (2026-07-30 walk-through, merged by orchestrator)

The operator's manual run (mocks, first load) found the surface-loading experience broken. Same session closes these:

15. **O1 (Codex) — preload kiosk surface chunks.** After authentication, during keypad idle, the floor app warms the confirm/result surface chunks (and any Phase 6 chunk) via the existing `lazyWithPreload` preloaders exported from `packages/clock-kiosk/src/surfaces.ts` (add `preloadClockKioskSurfaces` if absent), per `30_dynamic_loading.md` (+`_local`). An always-on kiosk must never chunk-load mid-interaction. Proof: a Playwright case opens the confirm surface on a cold session with network throttling irrelevant — no `kiosk-surface-skeleton` and no generic `SurfaceSkeleton` appears after an idle beat post-sign-in.
16. **O2 (Claude — DONE 2026-07-30) — kiosk-shaped skeleton.** `KioskSurfaceSkeleton` (`components/shared/KioskSurfaceSkeleton.tsx`, variants confirm/result/summary) exists in the kit: kiosk-paper ground, container shapes matching the real screens, shimmer via the shared utility retargeted to kiosk tokens. Codex exports it from the barrel and uses it in O3's fallback (and may adopt it for future data-wait states).
17. **O3 (Codex) — Suspense inside the frame.** The host's `withFloorKioskFrame` wrapper carries its own Suspense boundary INSIDE `FloorKioskFrame`, with `KioskSurfaceSkeleton` as fallback (variant per surface), so a cold load renders paper + header instantly and the fallback sits within the column — never the bare translucent backdrop. The engine-level `SurfaceSkeleton` becomes unreachable for kiosk surfaces (assert: it never renders for the two kiosk surface ids).

## Review log

- 2026-07-30 Claude (Fable, orchestrator): plan **approved** with amendments. C7 → option (a) + neutral-fallback amendment, worker copy table authored above (Codex wires it). Operator findings **O1–O3 merged as criteria 15–17** (one Codex session closes everything). **Claude items executed same day:** C12 — `AnnouncementsList` gains optional pre-formatted `date` rendered right-aligned mono tertiary (host formats the adapter's ISO); O2 — `KioskSurfaceSkeleton` built (confirm/result/summary variants, kiosk-token shimmer). C14 accepted as deferred to Phase 7's design-fidelity pass. Codex additionally exports `KioskSurfaceSkeleton` from the barrel (criterion 16) — the only barrel change Claude did not make itself, to avoid concurrent-edit churn.

- 2026-07-30 Opus (Phase 6 review): plan created from the review's findings. C1 blocks the phase's own validation plan as delivered; C2/C3/C4 are wrong-or-discarded data on the one screen this phase exists to build. Checklist #1 (null degradation) and #2 (no fabricated data) both PASS and are not reopened here.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` once C7 is answered
- Transition owner: orchestrator (C7 decision) → Codex
