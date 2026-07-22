# Orchestration map — presentation capability

Your runbook as the operator. It tells you, for every step: **who to talk to** (Claude / Codex / backend team), **what to say**, and **what must be true before you move on**. Update the checkboxes as you go — this file doubles as the progress tracker.

## The actors

| Actor | Owns | You talk to them for |
|---|---|---|
| **You** | decisions, approvals, gates | resolving product decisions, approving designs/plans, launching sessions |
| **Claude** | plans + lifecycle bookkeeping, **component kits** (all DOM/styling), phase reviews, corrections plans, design-fidelity/a11y half of Phase 7 | "build the kit for phase N", "review phase N", "flip plan N to approved", "resolve/record decision X" |
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
5. REVIEW    you → Claude: "review the phase N implementation"
             → OK: move to next phase
             → defects: Claude writes a corrections plan → Codex session for it → re-review
```

Codex archives the child plan itself after green validation (lifecycle skill). If a Codex session stops at a gate or with `Status: debugging`, bring its report to Claude.

---

## Phase-by-phase

### Phase 1 — builder package foundation (logic only)
- [x] Ask Claude: flip `PLAN_presentation_phase1_builder_foundation` to `approved` *(2026-07-22)*
- [ ] Codex: paste `PROMPT_phase1_builder_foundation.md`
- [ ] Ask Claude: review Phase 1
- Gate: none. Kit: none.

### Phase 2 — studio app bootstrap
- [ ] Ask Claude: flip plan to `approved`
- [ ] Codex: paste `PROMPT_phase2_studio_bootstrap.md`
- [ ] Ask Claude: review Phase 2 (optionally: "do a styling pass on the sign-in/shell chrome")
- Gate: none (V1 resolved — `appScope="manager"`). Kit: none.

### Phase 3 — dashboard
- [ ] Ask Claude: flip plan to `approved`
- [ ] Ask Claude: **"build the Phase 3 dashboard component kit"** → review rendered components → iterate until approved by you
- [ ] Codex: paste `PROMPT_phase3_dashboard.md`
- [ ] Ask Claude: review Phase 3
- Gate: none (default stands: no card context menu until Phase 6).

### Phase 4 — runtime package + editor shell, slides, media
- [ ] Ask Claude: flip plan to `approved`
- [ ] Ask Claude: **"build the Phase 4 editor chrome kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase4_editor_shell.md`
- [ ] Ask Claude: review Phase 4
- Gate: none (default stands: poster-only video thumbnails).

### Phase 5 — timeline & composition editing (biggest phase)
- [ ] **Decision (you), before kit**: confirm the two defaults — (a) shrinking slide duration clamps elements, (b) new text defaults to appear=Slide / disappear=Fade. Tell Claude to record your confirmation in the master Review log.
- [ ] Ask Claude: flip plan to `approved`
- [ ] Ask Claude: **"build the Phase 5 timeline + panels kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase5_timeline.md`
- [ ] Ask Claude: review Phase 5
- Note: if Codex reports overrun, the pre-approved fallback is a `5b` correction plan for timed-media bars — ask Claude to draft it.

### Phase 6 — preview + publish + versioning
- [ ] **Decision (you + Claude), before launch**: user-picker source for audience `user_ids` — ask Claude: "resolve the Phase 6 user-picker clarification" (Claude checks what exists in the repo and proposes; you decide; Claude records it).
- [ ] Ask Claude: flip plan to `approved`
- [ ] Ask Claude: **"build the Phase 6 preview + publish dialog kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase6_preview_publish.md`
- [ ] Ask Claude: review Phase 6
- Gate note: V2 resolved — no title-mirror anywhere; review checks it stayed absent.

### Phase 7 — hardening (split phase)
- [ ] Ask Claude: flip plan to `approved`
- [ ] Codex: paste `PROMPT_phase7_polish_validation.md` — Codex does tests/coverage/bundle/API-audit/handoff and **records** visual findings in a "For Claude" list, then stops without archiving
- [ ] Ask Claude: **"run your Phase 7 half"** — design-fidelity + a11y fixes from the checklist + Codex's "For Claude" list
- [ ] Codex (same prompt, new session — or ask Claude): finalize summary + archive once both halves are done
- [ ] Ask Claude: review Phase 7 / confirm creation side complete

### Phase 8 — phone player package
- [ ] **Decision (you), before kit**: dismiss-affordance chrome per `presentation_type` (X on modal? swipe on slide_page? etc.) — decide with Claude ("propose dismiss chrome options for the player"), Claude records it. Also confirm all three playback modes in scope (recommended yes).
- [ ] Ask Claude: **re-validate the Phase 8 plan** against the shipped runtime package, then flip to `approved`
- [ ] Ask Claude: **"build the Phase 8 player chrome kit"** → review → iterate
- [ ] Codex: paste `PROMPT_phase8_player_package.md`
- [ ] Ask Claude: review Phase 8

### Phase 9 — phone apps wiring (final)
- [ ] **Decision (you), before launch**: auto-show timing policy (recommendation: auto-open only on home/root route; workers most conservative). Tell Claude to record it.
- [ ] Ask Claude: re-validate the Phase 9 plan, flip to `approved`
- [ ] Codex: paste `PROMPT_phase9_phone_wiring.md` (no kit — no new styled UI)
- [ ] Ask Claude: review Phase 9 + final chrome check on real devices
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
