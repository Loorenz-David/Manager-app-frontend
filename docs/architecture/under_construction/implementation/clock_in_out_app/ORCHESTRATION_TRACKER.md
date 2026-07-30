# Orchestration tracker — clock kiosk floor app

**This is YOUR document.** Keep it open while operating. Tick the boxes as steps
complete and update the "Where am I" line — you are the only writer; Codex and
Opus never touch this file. (Fable updates it for you when you report progress
in the planning session.)

Sequence: **1 → 2 → 3 → 4 → 6 → 7** (Phase 5 shelved). Master: approved 2026-07-29.

---

## Where am I (update this line as you go)

> **Status (2026-07-30): 🏁 CAPABILITY CLOSED.** All phases + all correction
> loops done; master criteria 1–9 PASS; master archived; final commits
> `e8a35e19` (closure) + docs. **Agent documentation system created at
> `packages/clock-kiosk/clock-kiosk-documentation/frontend/` — INDEX.md is
> the entry point for ALL future kiosk work, and every modification must
> update the docs + CHANGELOG per its protocol.**
> **The one open item is YOURS: F6** — run the always-on rehearsal script
> (`packages/clock-kiosk/README.md`) on the physical device; record the
> result as a CHANGELOG entry (tell Fable and it'll be written for you).
> This tracker is now historical; future work routes through the docs INDEX,
> not this file.

## Operator findings from the 2026-07-30 walk-through (route with next corrections)

- **O1 (wiring → Codex):** kiosk surface chunks lazy-load at first open —
  preload confirm/result (and any Phase 6 chunk) after authentication during
  keypad idle via the existing `lazyWithPreload` preloaders. An always-on
  kiosk must never chunk-load mid-interaction.
- **O2 (design → Fable):** the generic `@beyo/ui` `SurfaceSkeleton` shapes
  don't match kiosk containers — build `KioskSurfaceSkeleton` in the kit
  (paper bg, avatar/plate/button-bar blocks, shimmer tokens); reusable for
  data-loading states.
- **O3 (structural → Codex):** the Suspense fallback replaces the
  `withFloorKioskFrame` wrapper, so the skeleton renders on the bare
  translucent backdrop with no page bg — move a Suspense boundary INSIDE the
  frame so cold loads always show paper + header, fallback within the column.

---

## The three actors — who gets what

| Actor | Session rule | What you paste / say |
|---|---|---|
| **Codex** | fresh session per phase | the full contents of one `prompts/execution/PROMPT_phase*.md` |
| **Opus 5** | fresh session per review | the full contents of one `prompts/review/PROMPT_review_phase*.md` |
| **Fable (this session)** | same session throughout | plain requests: "build the Phase N kit", "phase N is implemented", "Opus found defects in phase N — here's the report" |

Golden rules:
- Never start a phase's Codex session before its row's **gates** are all ticked.
- Never skip the Opus review, even when Codex reports all-green.
- Corrections loop: Opus writes a corrections plan → you route each finding
  (logic → fresh Codex session pointed at the corrections plan; visual → tell
  Fable) → Opus re-reviews → only then is the phase DONE.

---

## Phase pipeline

### Phase 1 — `@beyo/worker-shifts` domain package · **READY NOW**

Gates: ~~master approved~~ ✅ (none other — no kit needed)

- [x] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase1_worker_shifts_package.md`
- [x] Codex reports green validation + plan archived
- [x] **Opus** (fresh session): paste `prompts/review/PROMPT_review_phase1.md`
- [x] Verdict: **defects found** (F1–F8) → corrections loop:
  - [x] Corrections plan written by Opus + approved by Fable (`plans/PLAN_clock_kiosk_phase1_corrections_20260729.md`)
  - [x] **Codex** (fresh session): corrections implemented (36/36 tests, plan archived)
  - [x] Codex reports green + corrections plan archived
  - [x] **Opus** re-review: **pass-with-notes** — F1–F8 all verified closed, no
        regressions; one non-blocking note: `msw` should become a package-level
        `devDependencies` entry in `packages/worker-shifts` (⚠ deferred to
        Phase 7's audit — needs an `npm install`, don't do it mid-parallel-runs)
- [x] Verdict pass (double-confirmed by Fable spot-verification 2026-07-29)
- [x] **PHASE 1 DONE**

☑ Can run **in parallel with Phase 2** — different files, no overlap.

### Phase 2 — floor device auth · **READY NOW**

Gates: ~~master approved~~ ✅ (independent of Phase 1; no kit)

- [x] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase2_floor_auth.md`
- [x] Codex reports green (incl. zero-refresh assertion + untouched live-app suites)
- [x] **Opus** (fresh session): paste `prompts/review/PROMPT_review_phase2.md`
- [x] Verdict: **pass-with-notes** — checklist #1 (three live apps unchanged)
      explicitly PASS; M1 medium routed to Phase 3 (orchestrator decision:
      floor-gated `finally` on sign-out); L1–L3 low (L1 optionally closable in
      Phase 3; L2 covered by the new M1 test; L3 cosmetic, skipped)
- [x] Tell **Fable**: "phase 2 done" — plans + master log updated 2026-07-29 · **PHASE 2 DONE**

### Phase 3 — floor-app bootstrap + `rise` surface

Gates: - [ ] Phase 2 DONE   - [ ] Fable kit built & you approved its look

- [x] **Fable** (this session): Phase 3 kit BUILT (2026-07-29) — `packages/clock-kiosk/`
      (KioskFrame, KioskHeader, DeviceSignInCard, DeviceSettingsPanel+Row,
      KioskButton, KioskKitShowcase + README with prop contracts), `RiseSurface`
      in `@beyo/ui` (+ index export), `--color-kiosk-*`/`--font-kiosk-*` tokens
      in `@beyo/styles`. Both packages typecheck clean. Visual preview:
      https://claude.ai/code/artifact/ba83095f-908a-4bf1-ac14-d90c28b5f7a5
- [x] You approve the kit visually — **approved 2026-07-29** (4 judgment calls
      accepted as presented)
- [x] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase3_floor_app_bootstrap.md`
  - [x] M1 amendment relayed to the running session (operator, 2026-07-29)
- [x] Codex reports green (M1 floor-gated finally implemented + tested)
- [x] **Opus**: verdict **pass-with-notes** — rise additivity (#2b) PASS (3
      additive lines, live-app SurfaceRouteFrame change proven runtime-inert);
      11 findings → corrections plan `plans/PLAN_clock_kiosk_phase3_corrections_20260729.md`
- [x] Corrections plan approved by Fable; **C9/C10/C11 (Claude) executed
      2026-07-29** (aria-label via setTitle; shake kept — consumed by approved
      Phase 4 kit; showcase → `./showcase` subpath); C2 bounds 4–120 accepted
  - [x] **Codex** (fresh session): corrections C1–C8 implemented + archived
        (full validation matrix green incl. tablet revoked-device spec)
  - [x] Fable spot-verified C1/C2/C6/C7/C8 — C7's auth change is an additive
        optional `onSessionExpired` callback, inert for the three live apps
- [x] **PHASE 3 DONE** (2026-07-29)

☑ The Fable kit step can start **any time** (even before Phases 1–2 finish);
only the Codex step waits for Phase 2.

### Phase 4 — kiosk core flow (the app becomes demo-able)

Gates: - [ ] Phase 1 DONE   - [ ] Phase 3 DONE   - [ ] Fable kit approved

- [x] **Fable**: Phase 4 kit BUILT (2026-07-29) — KeypadScreen (code + email
      modes, "Clock with email"), CodeCells (privacy dots + shake), Keypad,
      IdentityConfirmScreen (Avatar-based), ResultScreen, CheckHero,
      DarkTimePlate, AutoReturnFooter; showcase now walks the whole mock flow
      (demo codes 4271/8306); README kit table extended; typecheck clean.
      Interactive preview: https://claude.ai/code/artifact/b585a8cc-d70a-43b6-8738-69b1bd87efa5
- [x] You approve the kit visually — **approved 2026-07-29** with one
      amendment applied: code cells display the typed digits (privacy dots
      rejected); auto-submit-on-4th and result screens approved as presented
- [x] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase4_kiosk_core_flow.md`
- [x] Codex reports green (five flow invariants named with proving tests)
- [x] **Opus**: verdict **defects found** — but all five invariants PASS and
      kit integrity is byte-clean; 2 blocking (C1 global keydown breaks
      sign-in/settings typing; C2 roster query fires unauthenticated on
      /sign-in → false revocation), 2 high (C3 "morning, Marco" greeting;
      C4 transparent surfaces + unmounted keypad → grey double-dim), 2 medium,
      7 low, 2 notes → `plans/PLAN_clock_kiosk_phase4_corrections_20260730.md`
- [x] Corrections plan approved by Fable 2026-07-30; **C4 resolved: option (a)
      host-composed frame** — ALL findings Codex-owned
  - [x] **Codex** (fresh session): corrections C1–C15 — completed 2026-07-30;
        root/shared/floor matrix green and plan archived
        — snippet in Fable's
        2026-07-30 message. ⚠ Phase 6 Codex HELD until this lands (Opus rec +
        same-package rule)
  - [x] Fable spot-verified C1–C4 at mechanism level 2026-07-30 (editable-target
        guard; controller/roster mounted only under FloorProtectedRoute;
        "Good {daypart}"; keypad always mounted + withFloorKioskFrame); kit
        diff empty; 18/18. Opus re-review left optional (operator's call).
- [x] Committed `b518764d`
- [ ] **Manual iPad walk-through — the demo milestone** (operator)
- [x] **PHASE 4 DONE** (2026-07-30)
- [ ] Verdict pass → **manual iPad walk-through — the demo milestone**
- [ ] Tell **Fable**: "phase 4 done"

### ~~Phase 5 — declared states~~ · **SHELVED — skip**

Do not run its prompts (they carry do-not-execute banners). Revisit only when
you start the future declare-pages capability.

### Phase 6 — clock-out summary

Gates: - [ ] Phase 4 DONE   - [ ] Fable kit approved

- [x] **Fable**: Phase 6 kit BUILT + committed `c2c2ebc8` (2026-07-29) —
      SummaryScreen (adapter-gated, responsive ordering), SummaryHeader,
      WorkedTodayPlate, ItemsCompletedCarousel, WeekBarChart, RateTile,
      InsightRow, AnnouncementsList; AutoReturnFooter variant prop; showcase +
      README updated. ⚠ Barrel exports deferred until Phase 4 Codex finishes
      (concurrent index.ts edits) — Phase 6 Codex adds them.
      Preview (with launch-day empty-adapters toggle):
      https://claude.ai/code/artifact/d1a0e74f-0547-49ec-9c70-18953741f299
- [x] You approve the kit visually — **approved 2026-07-30** (4 judgment calls
      accepted; week bars = per-day worked hours vs weekly target, clarified)
- [x] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase6_clock_out_summary.md`
- [x] Codex reports green
- [x] **Opus**: round 1 verdict **defects found** (1 blocking C1 port-split, C2–C4
      behavioral, C7 copy-audience) → corrections plan approved by Fable (C7 =
      kiosk-owned factual copy, table authored; O1–O3 merged; C12+O2 Claude, done)
      → Codex corrections C1–C13+O1/O3 → **Opus re-review: pass-with-notes**
      (every finding closed vs measured baseline; N1/N2 → Phase 7 as CF3/CF4)
      ⚠ its checklists #1 (analytics:null → plain screen) and #2 (no fabricated data) are the critical items
- [x] Verdict pass (re-review 2026-07-30)
- [x] Tell **Fable**: "phase 6 done" — loop committed `d8b5f72a` · **PHASE 6 DONE**

### Phase 7 — validation, resilience, close-out

Gates: - [ ] Phases 1–4 and 6 all DONE

- [ ] **Codex** (fresh session): paste `prompts/execution/PROMPT_phase7_validation_polish.md`
- [ ] Codex reports green (master criteria 1–9 checklist with evidence)
- [ ] **Fable**: say **"run the Phase 7 design-fidelity pass"** → side-by-side
      against the 5 design images + a11y, results recorded in the master Review log
- [ ] **Opus** (fresh session): paste `prompts/review/PROMPT_review_phase7.md`
- [ ] Verdict: capability complete
- [ ] Tell **Fable**: "capability complete" (master closes, memory archives)

---

## Parallelism cheat-sheet

What you can run at the same time:

| Now | Simultaneously possible |
|---|---|
| Start of project | Codex-Phase-1 ∥ Codex-Phase-2 ∥ Fable-Phase-3-kit |
| Phase 2 done, kit approved | Codex-Phase-3 ∥ (Phase 1 still running is fine) ∥ Fable-Phase-4-kit |
| Phase 4 running (Codex) | Fable-Phase-6-kit |
| Never | two Codex sessions in the same package/app at once; Codex during an unresolved corrections loop on the same phase |

Kits are always safe to build ahead — they're isolated component files.

## When something goes wrong

- **Codex validation fails** → Codex leaves the plan `Status: debugging` with a
  report. Read it; if the fix is obvious scope-respecting work, tell the same
  Codex session to continue; if it smells like a plan defect, bring the report
  to **Fable**.
- **Opus finds defects** → it writes `plans/PLAN_clock_kiosk_phase<N>_corrections_<date>.md`
  routing each finding. Logic findings: fresh Codex session, paste the phase's
  execution prompt but tell it to implement **the corrections plan** instead.
  Visual findings: tell **Fable**.
- **Backend flips an endpoint to ✅** (handoff status table) → no action until
  Phase 7, which documents the flip checklist; mocks stay on until then.
- **Contract drift** (backend changes shapes) → the handoff doc is edited first
  by the backend side; bring it to **Fable** to ripple through plans before any
  affected Codex session runs.
