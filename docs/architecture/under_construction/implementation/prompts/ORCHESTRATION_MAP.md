# Orchestration map — presentation capability

Your runbook as the operator. It tells you, for every step: **who to talk to** (Claude / Codex / backend team), **what to say**, and **what must be true before you move on**. Update the checkboxes as you go — this file doubles as the progress tracker.

## The actors

| Actor | Owns | You talk to them for |
|---|---|---|
| **You** | decisions, approvals, gates | resolving product decisions, approving designs/plans, launching sessions |
| **Claude — builder (Fable 5 session)** | plans + lifecycle bookkeeping, **component kits** (all DOM/styling), corrections/kit fixes, design-fidelity/a11y half of Phase 7 | "build the kit for phase N", "flip plan N to approved", "resolve/record decision X", "fix the styling of X" |
| **Claude — reviewer (Opus, fresh session per review)** | phase reviews, corrections plans from findings | paste the phase's pre-filled `review_prompts/REVIEW_phase<N>_*.md` |
| **Codex** (fresh session per phase) | architecture, logic, assembly, tests; plan lifecycle processing after green validation | one thing only: paste the phase's `PROMPT_*.md` file |
| **Backend team** | backend behavior questions | already resolved V1/V2/V3; only return if a new backend question surfaces mid-phase |

Key documents: master plan `../PLAN_presentation_capability_master_20260722.md` (all shared decisions; "Division of labor" section; Review log = the ledger where every resolution gets recorded), child plans `../PLAN_presentation_phase<N>_*.md`, prompts here.

## The universal loop (per phase)

```
1. GATE      you (+ Claude to record it in the master Review log)
2. APPROVE   you → Claude: "flip the phase N plan to approved"
3. KIT       (UI phases only) you → Claude: "build the phase N kit" → you review the
             rendered components → iterate with Claude until the design is right
4. BUILD     you → Codex: paste PROMPT_phaseN_*.md (fresh session)
5. REVIEW    you → Claude reviewer (Opus, fresh session): paste review_prompts/REVIEW_phaseN_*.md
             → pass: move to next phase
             → defects: reviewer writes a corrections plan, tagging each fix Codex (logic)
               or Claude-builder (visual) → route accordingly → re-review
```

Codex archives the child plan itself after green validation (lifecycle skill). If a Codex session stops at a gate or with `Status: debugging`, bring its report to Claude.

---

## Phase-by-phase

### Phase 1 — builder package foundation (logic only)
- [x] Ask Claude: flip `PLAN_presentation_phase1_builder_foundation` to `approved` *(2026-07-22)*
- [x] Codex: paste `PROMPT_phase1_builder_foundation.md` *(2026-07-22 — implemented + archived; typecheck clean, 16 tests green)*
- [x] Opus reviewer: paste `review_prompts/REVIEW_phase1_builder_foundation.md` *(2026-07-22 — PASS-WITH-NOTES; 2 low-severity advisories logged in master Review log, no corrections plan)*
- Gate: none. Kit: none.

### Phase 2 — studio app bootstrap
- [x] Ask Claude: flip plan to `approved` *(2026-07-22)*
- [x] Codex: paste `PROMPT_phase2_studio_bootstrap.md` *(2026-07-22 — implemented + archived; typecheck clean, Playwright auth 4/4)*
- [x] Opus reviewer: paste `review_prompts/REVIEW_phase2_studio_bootstrap.md` *(2026-07-22 — PASS-WITH-NOTES; .env gitignore-exception advisory fixed by Claude-builder same day; notification-host note routed to Phase 7)*
- [x] Optional sign-in styling pass *(2026-07-22 — done in the Opus session, user-endorsed; mirrors managers-app card layout; auth suite still 4/4)*
- Gate: none (V1 resolved — `appScope="manager"`). Kit: none.

### Phase 3 — dashboard
- [x] Ask Claude: flip plan to `approved` *(2026-07-22)*
- [x] Ask Claude: **"build the Phase 3 dashboard component kit"** → review rendered components → iterate until approved by you *(kit built + design-approved 2026-07-22; showcase at `/kit/dashboard`, dev builds only)*
- [x] Codex: paste `PROMPT_phase3_dashboard.md` *(2026-07-22 — session stopped WITHOUT implementing; nothing was produced)*
- [x] Opus reviewer: paste `review_prompts/REVIEW_phase3_studio_dashboard.md` *(2026-07-22 — DEFECTS FOUND: phase not implemented; wrote `PLAN_presentation_phase3_corrections_20260722`, all findings Codex-logic; kit itself defect-free)*
- [x] Claude-builder: corrections plan reviewed + `approved`; detail-enrichment approach endorsed *(2026-07-22)*
- [x] Backend agent: card-preview fields (`slide_count`/`media_kinds`/`cover_url`) added to the admin list *(2026-07-22 — implemented per handoff, verified against backend source; doc re-synced; corrections plan amended by builder: enrichment dropped, F2b schema extension added)*
- [x] Codex: paste `PROMPT_phase3_corrections.md` *(2026-07-22 — implemented + lifecycle complete; typecheck clean, 29 tests, Playwright 1/1)*
- [x] Re-review *(2026-07-22 — PASS-WITH-NOTES; run by Claude-builder as one-time substitute, Opus reviewer occupied; corrections plan archived; 2 low advisories routed to Phase 7: list has_more/load-more, hardcoded workspaceName)*
- **Phase 3 COMPLETE** ✅
- Gate: none (default stands: no card context menu until Phase 6).

### Phase 4 — runtime package + editor shell, slides, media
- [ ] **Carried from Phase 1 review** (Codex's job in its session): confirm the embedded-media element serialization (does the backend's element-embedded `media` include `sequence_order` + `mime_type`?) or add a round-trip fixture for it — before real data flows through the renderer.
- [x] Ask Claude: flip plan to `approved` *(2026-07-22)*
- [ ] Ask Claude: **"build the Phase 4 editor chrome kit"** → review → iterate *(kit built 2026-07-22 — view at `/kit/editor` in the dev studio; awaiting your design approval)*
- [x] Codex: paste `PROMPT_phase4_editor_shell.md` *(2026-07-22 — session stalled WITHOUT implementing, same pattern as Phase 3)*
- [x] Opus reviewer: `REVIEW_phase4_editor_shell_slides_media.md` *(2026-07-22 — DEFECTS FOUND: not implemented; wrote `PLAN_presentation_phase4_corrections_20260722`, all Codex-logic; kit clean)*
- [x] Claude-builder: corrections plan approved + split into two lean sessions *(2026-07-22 — stall pattern traced to heavyweight prompts; see "Lesson" below)*
- [x] Codex session 1: `PROMPT_phase4a_corrections_runtime.md` *(2026-07-22 — runtime delivered, 9/9 tests; env repair by builder: missing `@rolldown/binding-darwin-arm64` pinned as root optionalDependency)*
- [x] Codex session 2: `PROMPT_phase4b_corrections_editor.md` *(2026-07-22 — editor delivered; gate correctly stopped once on the broken toolchain before the fix)*
- [x] Opus re-review *(2026-07-22 — PASS-WITH-NOTES; all 12 criteria; 38/38 builder + 9/9 runtime tests, Playwright 1/1; embedded-media carried item resolved; corrections plan archived by builder; 3 advisories: thumb memoization + title-timer reset → Phase 5 session, commit baseline → operator)*
- **Phase 4 COMPLETE** ✅
- [x] **Operator: commit the Phases 1–4 baseline** *(done by user — `66f6d2c7`; Phase 5 kit committed by Claude-builder as `7761b909`. Kit no-restyle rules are now diff-verifiable.)*
- Gate: none (default stands: poster-only video thumbnails).

> **Lesson (Phases 3–4):** the original per-phase implementation prompts mandate reading ~20 contract files before writing code — both sessions that got them stalled without implementing; the one lean prompt (Phase 3 corrections) succeeded. From Phase 5 on, Claude-builder rewrites each implementation prompt as a lean session brief (scoped read list, "start coding early", clean-boundary stop rule) before it is handed to Codex — ask for it as part of the kit step.

### Phase 5 — timeline & composition editing (biggest phase)
- [x] **Decision (you)**: both defaults confirmed *(2026-07-22 — clamp on shrink; Slide-in/Fade-out)*
- [x] Ask Claude: flip plan to `approved` *(2026-07-22)*
- [x] Ask Claude: **"build the Phase 5 timeline + panels kit"** → review → iterate *(built + 1 iteration (panel close button, lane clipping, clamp-on-shrink in preview) + design-approved 2026-07-22)*
- [x] Codex: paste `PROMPT_phase5_timeline.md` *(2026-07-22 — implemented in ONE session, first heavyweight phase to succeed single-shot: lean-brief approach validated)*
- [x] Opus reviewer *(2026-07-22 — PASS-WITH-NOTES: 8/8 criteria, 18/18 runtime + 54/54 builder tests, Playwright timeline 1/1 + shell regression 1/1, round-trip deep-equal holds, both Phase 4 advisories fixed with tests. Live advisory routed to Phase 6 prompt: consolidate inline mapping in EditorView/panels into composition-mapping.ts. Its "housekeeping open" claims were stale — see master log correction.)*
- **Phase 5 COMPLETE** ✅
- [ ] **Operator (you): commit the Phase 5 implementation** (Codex's work is uncommitted in the working tree — same practice as the kit baselines)
- Note: if Codex reports overrun, the pre-approved fallback is a `5b` correction plan for timed-media bars — ask Claude to draft it.

### Phase 6 — preview + publish + versioning
- [x] **Decision**: user-picker source resolved *(2026-07-22 — builder-owned wrapper of the compact `/users` endpoint, mirroring `@beyo/cases`' shape; no cases dependency, no injected fetch)*
- [ ] Ask Claude: flip plan to `approved`
- [ ] Ask Claude: **"build the Phase 6 preview + publish dialog kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase6_preview_publish.md`
- [ ] Opus reviewer: paste `review_prompts/REVIEW_phase6_editor_preview_publish.md`
- Gate note: V2 resolved — no title-mirror anywhere; review checks it stayed absent.

### Phase 7 — hardening (split phase)
- [ ] Ask Claude: flip plan to `approved`
- [ ] Codex: paste `PROMPT_phase7_polish_validation.md` — Codex does tests/coverage/bundle/API-audit/handoff and **records** visual findings in a "For Claude" list, then stops without archiving
- [ ] Ask Claude: **"run your Phase 7 half"** — design-fidelity + a11y fixes from the checklist + Codex's "For Claude" list
- [ ] Codex (same prompt, new session — or ask Claude): finalize summary + archive once both halves are done
- [ ] Opus reviewer: paste `review_prompts/REVIEW_phase7_studio_validation_polish.md` (confirms creation side complete)

### Phase 8 — phone player package
- [ ] **Decision (you), before kit**: dismiss-affordance chrome per `presentation_type` (X on modal? swipe on slide_page? etc.) — decide with Claude ("propose dismiss chrome options for the player"), Claude records it. Also confirm all three playback modes in scope (recommended yes).
- [ ] Ask Claude: **re-validate the Phase 8 plan** against the shipped runtime package, then flip to `approved`
- [ ] Ask Claude: **"build the Phase 8 player chrome kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase8_player_package.md`
- [ ] Opus reviewer: paste `review_prompts/REVIEW_phase8_player_package.md`

### Phase 9 — phone apps wiring (final)
- [ ] **Decision (you), before launch**: auto-show timing policy (recommendation: auto-open only on home/root route; workers most conservative). Tell Claude to record it.
- [ ] Ask Claude: re-validate the Phase 9 plan, flip to `approved`
- [ ] Codex: paste `PROMPT_phase9_phone_wiring.md` (no kit — no new styled UI)
- [ ] Opus reviewer: paste `review_prompts/REVIEW_phase9_phone_apps_wiring.md`; then ask Claude-builder for the final chrome check on real devices
- [ ] End state: Codex archives the child plan **and the master** — capability complete.

---

## Open decisions queue (all yours; none blocks Phases 1–4)

| Needed before | Decision | Talk to |
|---|---|---|
| Phase 5 kit | confirm duration-shrink clamp + default text animations | Claude (record) |
| Phase 6 launch | user-picker source | Claude proposes → you decide |
| Phase 8 kit | dismiss chrome per presentation_type; playback-modes scope | Claude proposes → you decide |
| Phase 9 launch | auto-show timing policy | Claude (record) |

## If something goes wrong

| Situation | Talk to | Say |
|---|---|---|
| Codex stopped at a gate | Claude | "Codex stopped on phase N: <its report>" — Claude resolves/records, you relaunch |
| Codex left `Status: debugging` | Claude | "review the phase N failure" → corrections/debug plan → Codex session for it |
| A kit component doesn't fit Codex's logic (Review-log request) | Claude | "Codex requested a component change in phase N" — Claude updates the kit |
| Design looks wrong after wiring | Claude | "fix the styling of X" — never ask Codex to restyle |
| New backend question surfaces | Backend team | record the answer with Claude in the master Review log |
