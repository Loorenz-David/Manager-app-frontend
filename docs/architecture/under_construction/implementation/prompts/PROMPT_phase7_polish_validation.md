# Codex — Phase 7 (your half): hardening, tests, audits, handoff (lean brief)

You are implementing the **Codex half** of Phase 7, the split hardening phase of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–6 are complete and committed — the creation side works end to end. **This phase adds no features.** Start early — read only what is listed below, then work.

## Division (who does what)

- **Your half (this session):** behavior/edge hardening, the four carried advisories below, Vitest gap-fill, Playwright consolidation + flake check, bundle verification, public-API audit, hosting handoff doc.
- **Claude-builder's half (separate session, after yours):** design-token fidelity and a11y fixes. For anything visual you find (drift, missing state styling, contrast, focus order), **record it** in the plan's Review log under a `## For Claude` list (file, location, what's wrong) — change no component DOM/classes yourself.
- **Lifecycle:** your session does NOT archive the plan or write the summary — stop after your half with a report. The archive happens only after both halves are done.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase7_studio_validation_polish_20260722.md` (status `approved`).

## Carried advisories (accumulated Phases 1–3; all yours, do them first)

1. **`ApiEnvelopeSchema` fold**: `packages/presentation-builder/src/types.ts` re-implements it locally; fold into `@beyo/lib`'s (keep the stricter `ok: z.literal(true)` semantics when folding — upgrade the lib version, then import it). Run the shopify suite too (`npm run test:shopify`) since it consumes the lib schema.
2. **Notification host**: the studio carries a bespoke Sonner `NotificationHostProvider` because no shared package exports the canonical host. Assess exporting it from the shared package and switching the studio; if that exceeds behavior-preserving cleanup, record a proposal in the master Review log instead of implementing.
3. **Dashboard `has_more`**: the list query uses `limit: 200` and ignores `has_more` — add load-more or an explicit overflow signal so >200 announcements never silently truncate.
4. **Hardcoded `workspaceName`**: `DashboardPage` passes `"ManagerBeyo"` — source it from the auth/workspace claim where a display name exists.

## Read (only this)

1. The phase plan, fully (its scope list is your checklist).
2. Master plan — "Acceptance criteria (master-level)" (your audits verify criteria 1–6 for the creation side).
3. Relational only: whatever your specific task touches — the plan's File-read-intent section governs.

## Your half's checklist (from the plan)

- Error/edge behavior pass: 401 mid-session, 409 race, presigned-URL expiry re-render, `beforeunload` dirty guard re-verified.
- Vitest gap-fill: pure `lib/` modules (geometry, mapping, publish-form, dashboard helpers, grouping/derivation) to 100% branch coverage.
- Playwright consolidation: stable suite, trace-on-retry, then the full desktop suite green **twice consecutively** (flake check).
- Bundle/dynamic-loading verification: both studio routes lazy, no INEFFECTIVE_DYNAMIC_IMPORT, no player/editor code in the boot chunk.
- Public-API audit: apps import only from package roots; `presentation-runtime` imports nothing from builder; no default exports; no internal-helper leaks; dev-only showcases clearly segregated.
- Hosting handoff doc `docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md`: everything a cold host app needs to mount the builder (providers, `@source` entries, navigation injection, env expectations) — no repo-tribal knowledge assumed.

## Validation (all must be green before you stop)

- `npm run typecheck`
- `npm run test:presentation-runtime` && `npm run test:presentation-builder` && `npm run test:shopify`
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --project=desktop` — full studio suite, green ×2
- `git diff -- packages/presentation-builder/src/components` → no non-additive kit change

## Finish (your half)

Append to the plan's Review log: a dated entry with your half's results + the `## For Claude` findings list (empty list is a valid result — say so explicitly). Do NOT archive the plan or write the summary. Report: files changed, validation outputs, advisory outcomes (1–4), the For-Claude list. If you run low on context, finish the current checklist item cleanly and report exactly what remains.
