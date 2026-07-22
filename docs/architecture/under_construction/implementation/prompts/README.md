# Codex prompts — presentation capability

**Start with [`ORCHESTRATION_MAP.md`](ORCHESTRATION_MAP.md)** — the operator runbook: who to talk to (Claude / Codex / backend) at every step, with per-phase checklists and the open-decisions queue.

One prompt file per phase. Paste a single file into a **fresh Codex session**; each is standalone.

Run strictly in order (each phase builds on the previous one's shipped shape). Never run two phases in parallel.

| Order | Prompt | Plan | Gate before launching |
|---|---|---|---|
| 1 | `PROMPT_phase1_builder_foundation.md` | `PLAN_presentation_phase1_builder_foundation_20260722` | none |
| 2 | `PROMPT_phase2_studio_bootstrap.md` | `PLAN_presentation_phase2_studio_bootstrap_20260722` | none (V1 resolved: `appScope="manager"`) |
| 3 | `PROMPT_phase3_dashboard.md` | `PLAN_presentation_phase3_studio_dashboard_20260722` | none (default: no card context menu) |
| 4 | `PROMPT_phase4_editor_shell.md` | `PLAN_presentation_phase4_editor_shell_slides_media_20260722` | none (default: poster-only video thumbs) |
| 5 | `PROMPT_phase5_timeline.md` | `PLAN_presentation_phase5_editor_timeline_composition_20260722` | confirm the two stated defaults (duration-shrink clamp; slide-in/fade-out) |
| 6 | `PROMPT_phase6_preview_publish.md` | `PLAN_presentation_phase6_editor_preview_publish_20260722` | user-picker source decided (V2 resolved: no mitigation) |
| 7 | `PROMPT_phase7_polish_validation.md` | `PLAN_presentation_phase7_studio_validation_polish_20260722` | Phases 1–6 archived |
| 8 | `PROMPT_phase8_player_package.md` | `PLAN_presentation_phase8_player_package_20260722` | re-validated vs. shipped runtime; dismiss-chrome decision |
| 9 | `PROMPT_phase9_phone_wiring.md` | `PLAN_presentation_phase9_phone_apps_wiring_20260722` | auto-show timing policy decided (V3 resolved: socket contract known) |

Workflow per phase: resolve the gate → mark the child plan `approved` → **UI phases (3, 4, 5, 6, 8): Claude kit session first** — Claude builds the phase's presentational component kit (props-first, mock data), user approves the design → paste the prompt into Codex → Codex implements logic/assembly (kit components are read-only for it), validates, then processes the plan through `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` (summary → archive record → move plan → master review-log entry) → ask Claude to review the implementation → corrections plan if needed.

Division of labor (master plan "Division of labor" section): Claude owns component files (DOM/classes/tokens/motion); Codex owns types/api/hooks/stores/controllers/geometry/mapping/tests and assembly. Phase 7 splits: Codex runs tests/coverage/bundle/API audit; Claude runs the design-fidelity + a11y half.

V1/V2/V3 are **all resolved** (backend team, 2026-07-22) — see the master plan's "Open verification items — ALL RESOLVED" section and its Review log. Summary: studio signs in with `appScope="manager"` (role gates authoring, not app_scope; never hardcode `app_key`); text-element-only slides publish fine (never mirror text into `slide.title`); socket events are `:published` + `:archived` on room `workspace:{workspace_id}` with payload `{client_id, logical_client_id, version}`.

The **master plan is never archived by a phase session** — it stays in `under_construction/implementation/` until Phase 9 completes.
