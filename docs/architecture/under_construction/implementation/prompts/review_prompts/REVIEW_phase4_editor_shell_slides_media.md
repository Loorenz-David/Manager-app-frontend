# Review — Phase 4: `@beyo/presentation-runtime` (static renderer) + editor shell, slide rail, media upload

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for Phase 4 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. The implementation was done by a Codex session from an approved plan; component styling was done by a separate Claude session (“kit” components — read-only for Codex). Your job: verify the implementation against its plan and the shared rules, then either bless it or produce a corrections plan. You change no code.

## What was implemented

- Phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase4_editor_shell_slides_media_20260722.md` — if not there, it was archived after validation: look in `docs/architecture/archives/implementation/`.
- Implementation summary (written by the Codex session): `docs/architecture/implemented_summaries/SUMMARY_presentation_phase4_editor_shell_slides_media_20260722.md`.
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

- Runtime package purity: zero network/auth imports; imports nothing from builder/presentations; composition schemas moved here with builder re-exports (no duplicated schema definitions).
- Static renderer reproduces the three `09_slide_composition.md` recipes and scales (rail thumb / canvas / arbitrary size) with fonts via `containerWidth / REFERENCE_CANVAS_WIDTH` (390).
- Slide ops eager + write-through; last-slide delete blocked; reorder reconciles from response.
- Upload: client-side MIME/size caps match `05_admin_slides_media.md` exactly; S3 failure never confirms; progress/cancel present.
- Non-draft → read-only banner, all mutations disabled, no 409 reachable from this screen. No timeline/text-editing built (Phase 5's scope).

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
- If defects: create `docs/architecture/under_construction/implementation/PLAN_presentation_phase4_corrections_<YYYYMMDD>.md` from `docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md`, scoped to the fixes only, status `under_construction`, linked to the phase plan and master — tag each finding **Codex (logic)** or **Claude-builder (visual)** so the operator can route it.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
