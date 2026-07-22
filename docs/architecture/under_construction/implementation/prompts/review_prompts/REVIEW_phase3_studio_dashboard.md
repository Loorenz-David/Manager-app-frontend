# Review — Phase 3: Announcements dashboard — list, filters, search, create flow

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for Phase 3 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. The implementation was done by a Codex session from an approved plan; component styling was done by a separate Claude session (“kit” components — read-only for Codex). Your job: verify the implementation against its plan and the shared rules, then either bless it or produce a corrections plan. You change no code.

## What was implemented

- Phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_studio_dashboard_20260722.md` — if not there, it was archived after validation: look in `docs/architecture/archives/implementation/`.
- Implementation summary (written by the Codex session): `docs/architecture/implemented_summaries/SUMMARY_presentation_phase3_studio_dashboard_20260722.md`.
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

- Status derivation (Scheduled = published + future `starts_at`) and latest-version grouping are pure, unit-tested helpers — not inlined in components.
- Design fidelity vs. `design/README.md` §1a + `presentation_menu.png`: card anatomy, mini-phone cover, pill variants, meta lines ("sends <date>" for scheduled).
- Navigation is injected (`navigateToEditor`) — the package must not import the router.
- Per the phase default: no context menu on cards; no lifecycle actions yet.
- Create flow: default title, failure toast, navigation on success.

## General checklist (applies every phase)

1. **Acceptance criteria** — every numbered criterion in the phase plan: met, with evidence (file/test).
2. **Master shared rules** — package boundaries (runtime: no network/auth, imports nothing from builder/presentations; packages: no app-specific imports; studio: thin shell); API calls match the backend docs exactly; `GET /history` never wrapped; the design↔backend mapping lives only in the designated mapping module.
3. **Phase boundaries** — nothing from a later phase built early; nothing in scope silently dropped.
4. **Division of labor compliance** — diff the kit components: Codex must not have changed their DOM/classes/styling; only additive optional props are acceptable. Any restyle is a finding.
5. **Contract discipline** — layer rules hold (components consume props/context only; controllers don't import components; hooks per `05`/`08`).
6. **Validation evidence** — re-run the phase plan's validation commands yourself. Do not trust the summary's claims.
7. **Lifecycle bookkeeping** — plan archived correctly, summary exists, master Review log has the phase entry, master otherwise untouched (and never archived before Phase 9).

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity, each with file:line and the criterion/rule it violates.
- If defects: create `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_corrections_<YYYYMMDD>.md` from `docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md`, scoped to the fixes only, status `under_construction`, linked to the phase plan and master — tag each finding **Codex (logic)** or **Claude-builder (visual)** so the operator can route it.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
