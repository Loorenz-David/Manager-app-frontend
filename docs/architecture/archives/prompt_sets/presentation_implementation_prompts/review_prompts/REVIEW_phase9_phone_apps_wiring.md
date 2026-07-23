# Review — Phase 9: Player mounted in managers/sellers/workers apps + realtime refresh (final phase; archives the master)

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for Phase 9 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. The implementation was done by a Codex session from an approved plan. Your job: verify the implementation against its plan and the shared rules, then either bless it or produce a corrections plan. You change no code.

## What was implemented

- Phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase9_phone_apps_wiring_20260722.md` — if not there, it was archived after validation: look in `docs/architecture/archives/implementation/`.
- Implementation summary (written by the Codex session): `docs/architecture/implemented_summaries/SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md`.
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`.

## Read in this order

1. The master plan — "Decisions resolved with the user", "Package boundaries", "Design → backend mapping", "Division of labor", "Acceptance criteria (master-level)", Review log (latest entries).
2. The phase plan — its Acceptance criteria, Scope/Non-goals, and "File read intent" whitelist.
3. The implementation summary.
4. `task_system/frontend_contract_goal_mapping_guide.md` — the contract discipline the code must follow.
5. The implementation itself (git diff of the phase's commits if available, else the files the summary lists).
6. Backend ground truth when checking API usage: `docs/presentation_capability/backend/`.
7. Design ground truth: `docs/presentation_capability/design/README.md` + screenshots.

## Phase-specific review focus

- Per app: correct `app_key` (`manager`/`seller`/`worker`), `@source` entries, loader-function surface registration, provider at authenticated-shell level, CTA route mapped through each app's router.
- Realtime: subscribes to BOTH `app_update_presentation:published` and `:archived`; handler only invalidates `activePresentationKeys`, never opens surfaces; no double-show under boot-fetch + socket race.
- The recorded auto-show timing policy is actually enforced by each app's trigger predicate (workers most conservative if so decided).
- Player chunks lazy — no player code in any app's boot chunk.
- Cross-app targeting matrix verified (an announcement targeted at one app_key appears only there); frontend performs zero eligibility logic.
- Master close-out done correctly: all-phases entry in its Review log, status `archived`, moved to archives — the ONLY phase allowed to do this.


> **Known-closed items — do not re-report:** `PLAN_presentation_phase4_corrections_20260722.md` is archived in `archives/implementation/` (verified repeatedly; this phantom appeared in three prior reviews). The `ApiEnvelopeSchema` fold, shared notification host, dashboard `has_more`, and `workspaceName` advisories were all resolved in Phase 7.

## General checklist (applies every phase)

1. **Acceptance criteria** — every numbered criterion in the phase plan: met, with evidence (file/test).
2. **Master shared rules** — package boundaries (runtime: no network/auth, imports nothing from builder/presentations; packages: no app-specific imports; studio: thin shell); API calls match the backend docs exactly; `GET /history` never wrapped; the design↔backend mapping lives only in the designated mapping module.
3. **Phase boundaries** — nothing from a later phase built early; nothing in scope silently dropped.
4. **Contract discipline** — layer rules hold (components consume props/context only; controllers don't import components; hooks per `05`/`08`).
5. **Validation evidence** — re-run the phase plan's validation commands yourself. Do not trust the summary's claims.
6. **Lifecycle bookkeeping** — plan archived correctly, summary exists, master Review log has the phase entry, master otherwise untouched until this phase's close-out.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity, each with file:line and the criterion/rule it violates.
- If defects: create `docs/architecture/under_construction/implementation/PLAN_presentation_phase9_corrections_<YYYYMMDD>.md` from `docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md`, scoped to the fixes only, status `under_construction`, linked to the phase plan and master — tag each finding **Codex (logic)** or **Claude-builder (visual)** so the operator can route it.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
