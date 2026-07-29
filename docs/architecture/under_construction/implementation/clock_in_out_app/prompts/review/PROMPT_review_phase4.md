# Opus review — Phase 4: `@beyo/clock-kiosk` core flow

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session implemented the core kiosk loop from an approved plan on top of a read-only Claude component kit. This phase carries the capability's behavioral heart. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` — the "Design → data mapping" table + the kiosk UX rules block are your rubric.
- Backend ground truth: handoff §3, §5, §8, §9.
- Design ground truth: the four core-flow images in `image_design/`.

## Read in order

Master (mapping + UX rules) → phase plan (kit contract + criteria) → summary → contract guide → the `packages/clock-kiosk` implementation + floor-app mounting diff → handoff.

## Phase-specific checklist (beyond the plan's criteria)

Verify each of the five flow invariants **in code and in a test**, naming both:

1. Fresh `GET /current` after every match and after every await; no action ever rendered from cached state (trace the confirm render path).
2. 409 → silent `/current` refetch → confirm re-render. No error surface anywhere on that path.
3. Every path returns to a **cleared** keypad; auto-return on result (device config) and confirm (30s); store provably wipes user/session data on return.
4. One generic no-match message; the typed code/email never appears in a request, log, or URL (grep the network layer).
5. Session-id staleness: a late-resolving action against a returned-to-keypad store is dropped (find the race test; run it).

Then:

6. **Kit integrity** — diff kit components since the kit commit: no DOM/class/styling changes; additive optional props only; timers/matching/fetching absent from components.
7. **Package boundaries + surface centralization** — `clock-kiosk` imports no app code; floor app imports only via `index.ts`/page loader; `worker-shifts` untouched except consumption. Confirm/result open as **`rise` surfaces** registered through the kiosk package's `surfaces.ts` and merged into the floor app's central `surface-registry.ts` — no SlideStack, no ad-hoc overlay rendering, keypad provably stays mounted beneath open surfaces. The email fallback affordance is labeled **"Clock with email"** (master decision #4).
8. **Phase boundaries** — plain clock-out only (`analytics` parsed, unrendered); no declare UI; no adapter data wired (slots hidden-empty).
9. **Desktop input** — physical 0–9/Backspace/Enter drive the keypad.
10. **Validation evidence** — re-run typecheck, `test:clock-kiosk`, `test:worker-shifts`, and both Playwright projects yourself.
11. **Lifecycle bookkeeping** — summary, archive move, master Review log entry, master otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found — with the five invariants each explicitly dispositioned.
- Findings ranked by severity with file:line + violated rule.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase4_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, each finding routed **Codex (logic) or Claude (visual) — say which per finding**.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
