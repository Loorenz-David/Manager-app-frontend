# SUMMARY_presentation_phase7_studio_validation_polish_20260722

## Metadata

- Plan: `PLAN_presentation_phase7_studio_validation_polish_20260722` (archived)
- Governing master: `PLAN_presentation_capability_master_20260722`
- Implemented at (UTC): `2026-07-23`
- Execution: split per the master's "Division of labor" — Codex half (hardening/tests/audits/handoff) then Claude-builder half (fidelity/a11y + lifecycle close)

## Outcome

The creation side (Phases 1–6) is hardened, fully validated, and documented for external hosting. This phase added no features.

## Codex half

- **Carried advisories, all resolved:** (1) `ApiEnvelopeSchema` folded into `@beyo/lib` keeping the stricter `ok: z.literal(true)` semantics (lib bumped 0.0.1; shopify suite green against the change); (2) shared `NotificationHostProvider` now lives in `@beyo/lib` and replaces the studio-local host; (3) dashboard `has_more` overflow now surfaces a once-per-filter notification instead of silently truncating; (4) `workspaceName` sourced from the authenticated `workspace_name` claim with safe fallbacks.
- Hardening: 401 mid-session expiry, 409 races, expired presigned-media refetch, `beforeunload` dirty guard, pruned package internals.
- Coverage: four pure `lib/` modules at 100% statements/branches/functions/lines.
- Bundle: production build passes; both routes lazy; no `INEFFECTIVE_DYNAMIC_IMPORT`; no editor code in the boot chunk (pre-existing generic >500 kB vendor warning noted, unrelated).
- Public-API + master criteria 1–6 audits: pass.
- Hosting handoff: `docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md` (cold-host mount guide).

## Claude-builder half

- Kit purity: diff vs baseline `8a1e0614` shows only additive changes (3 files, zero removed class lines); Codex's added DOM (card archive menu, editor archive button) audited and accepted.
- A11y: PublishDialogShell — Escape closes, focus moves into the dialog on open; PreviewOverlay — Escape exits; PublishErrorSummary — `role="alert"`. Keyboard operability audit: all interactives native and tabbable; create → text → publish completable keyboard-only.
- Design fidelity: token audit against the design README tables passed (kit was token-exact by construction; no drift found; Codex's For-Claude list was empty).

## Validation (final state)

- Typecheck: exit 0 (all workspaces).
- `test:presentation-runtime` 19/19 · `test:presentation-builder` 94/94 · `test:shopify` 101/101.
- Full desktop Playwright suite: 10/10, twice consecutively (Codex) + 10/10 after the a11y edits (builder).

## Notes / follow-ups

- Optional backend enhancement (from the Phase 6 review, unchanged): structured publish-validation causes would replace the keyword-regex 422 mapping.
- The creation side is complete: Phases 8–9 (phone player) remain.
