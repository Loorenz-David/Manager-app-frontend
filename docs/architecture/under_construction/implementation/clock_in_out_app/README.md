# Clock-in/out floor kiosk — implementation set

The complete orchestration package for building the fourth app of the monorepo:
a shop-floor kiosk where workers clock in/out with a 4-digit code (or their
email, via the "Clock with email" affordance). Created 2026-07-29 by Claude
Fable; **master approved 2026-07-29** with three amendments (see the master's
Review log): "Clock with email" label, declared states shelved out of v1, and
the new `rise` surface type used everywhere in the kiosk.

## Folder map

```
clock_in_out_app/
  README.md                                  ← you are here
  ORCHESTRATION_TRACKER.md                   ← THE OPERATOR'S CHECKLIST — where you
                                               are, what runs next, which prompt
                                               goes to which model; keep it open
  PLAN_clock_kiosk_master_20260729.md        ← the master contract: goals, decisions,
                                               package boundaries, design→data mapping,
                                               phase table, division of labor, criteria
  BACKEND_REQUIREMENTS_clock_kiosk_20260729.md ← what the backend must eventually provide
                                               for the design-ahead tiles (adapter-gated)
  image_design/                              ← design ground truth (5 images + readme)
  plans/                                     ← 7 executable child plans (one per phase)
  prompts/execution/                         ← 7 prompts: paste into a fresh Codex session
  prompts/review/                            ← 7 prompts: paste into a fresh Opus session
```

Backend API ground truth lives outside this folder:
`docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`
(build-ahead contract — most endpoints not live; the mocks are the runtime until
backend phases flip ✅ in its status table).

## What gets built

| Piece | Where | Owner |
|---|---|---|
| `@beyo/worker-shifts` — shift domain logic (types/api/hooks/matcher/mocks) | `packages/worker-shifts` | Phase 1 |
| Floor device auth (non-expiring persisted token, scope `floor`) | `@beyo/api-client` + `@beyo/auth` | Phase 2 |
| `apps/floor-app/ManagerBeyo-app-floor` — thin shell (port 5175) + the `rise` surface type in `@beyo/ui` | `apps/floor-app` + `@beyo/ui` | Phase 3 |
| `@beyo/clock-kiosk` — the whole kiosk experience, host-mountable | `packages/clock-kiosk` | Phases 4 & 6 |
| Resilience, tests, audits, host-app integration README | everywhere | Phase 7 |
| ~~Declared states~~ — SHELVED (future separate pages) | — | Phase 5 (not in sequence) |

## Operating loop (per phase)

1. **Gate**: previous phase archived; master decisions still stand.
2. **Claude kit session** (UI phases 3, 4, 6): Claude builds the phase's
   presentational component kit props-first; the user reviews/approves the design.
3. **Codex session** (fresh): paste `prompts/execution/PROMPT_phase<N>_*.md`.
   Codex implements the child plan, runs validation, processes lifecycle
   (summary → archive → master Review log).
4. **Opus session** (fresh): paste `prompts/review/PROMPT_review_phase<N>.md`.
   Opus verifies, re-runs validation itself, and either blesses or writes a
   corrections plan in `plans/` with each finding routed (Codex = logic,
   Claude = visual).
5. Corrections (if any) loop through steps 3–4 before the next phase starts.

Phase order: **1 → 2 → 3 → 4 → 6 → 7** (1 and 2 are mutually independent).
Phase 5 (declared states) is SHELVED — its plan/prompts carry do-not-execute
banners and wait for the future declare-pages capability.

## Standing rules (short form — the master is authoritative)

- The backend handoff is the only source of API shapes; the design images +
  readme are the only source of look/interaction; where the design outruns the
  API, data flows through adapters that default to empty (see
  `BACKEND_REQUIREMENTS_clock_kiosk_20260729.md`).
- Kiosk UX invariants: fresh `GET /current` before any action; 409 = state
  refresh, never an error; every path returns to a cleared keypad;
  `analytics: null` = plain success screen; one generic no-match message.
- Surface model: the keypad is the always-mounted page; every other kiosk
  screen (confirm, result, settings) is a `rise` surface (fade-in slide-up /
  fade-out slide-down) registered through the central surface registry.
  No SlideStack, no swipe gestures in the kiosk.
- Claude's kit components are read-only for Codex (additive optional props only).
- Packages: raw TS, peer deps only, no build step, no app imports; the floor app
  stays a deletable thin shell.
