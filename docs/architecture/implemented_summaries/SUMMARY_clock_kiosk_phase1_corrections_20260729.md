# SUMMARY_clock_kiosk_phase1_corrections_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase1_corrections_20260729`
- Completed at (UTC): `2026-07-29T18:02:20Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase1_corrections_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Package: `@beyo/worker-shifts`
- Lifecycle state: `archived`

## Outcome

All eight Phase 1 review findings were corrected without adding capability or changing routes, methods, enums, query-key factory shape, mutation invalidation, the roster-limit warning, or the package's no-optimistic-update boundary. The three schema-boundary blockers now tolerate the nullable and omitted values already demonstrated by the live sibling packages.

## Finding dispositions

| Finding | Disposition |
|---|---|
| F1 — roster nullability | Fixed. `profile_picture` is nullable; the roster fixture contains a null photo and both schema/API tests cover it. |
| F2 — embedded pause-reason nullability | Fixed. Embedded and analytics `image_url` fields are nullable; `reason_text` is nullable/optional; the mock declaration path returns and parses a null reason image. |
| F3 — analytics tolerance | Fixed. Live-omitted dates are optional and documented collection/flag fields default safely. A minimal payload parses with defaults; the fully populated handoff example still round-trips unchanged. |
| F4 — no reimplemented envelope | Fixed. The local envelope helper was deleted and all six HTTP call sites use `ApiEnvelopeSchema` from `@beyo/lib`. |
| F5 — mocks off the production path | Fixed. Mocks are exported only from `@beyo/worker-shifts/mocks`; the root barrel no longer re-exports them and `msw` is no longer a peer dependency. |
| F6 — disabled current-shift query key | Fixed. The skipped query uses `workerShiftKeys.current({ user_id: "" })`, distinct from the list namespace key. |
| F7 — documented fetch-fresh pattern | Fixed. The public barrel documents `fetchFreshCurrentShift` as the confirm-step path and `useCurrentShiftQuery` as passive/observational. |
| F8 — no catalog shape in mock code | Fixed. The standalone `MockReason` catalog type was removed; handler lookup is inferred from the literal fixture. |

## Files changed

- `packages/worker-shifts/package.json`
- `packages/worker-shifts/src/types.ts`
- `packages/worker-shifts/src/index.ts`
- `packages/worker-shifts/src/api/fetch-current-shift.ts`
- `packages/worker-shifts/src/api/fetch-floor-roster.ts`
- `packages/worker-shifts/src/api/use-current-shift-query.ts`
- `packages/worker-shifts/src/api/schemas.ts` (deleted)
- `packages/worker-shifts/src/actions/use-clock-in.ts`
- `packages/worker-shifts/src/actions/use-clock-out.ts`
- `packages/worker-shifts/src/actions/use-declare-state.ts`
- `packages/worker-shifts/src/actions/use-close-declared-state.ts`
- `packages/worker-shifts/src/mocks/fixtures.ts`
- `packages/worker-shifts/src/mocks/handlers.ts`
- `packages/worker-shifts/src/types.test.ts`
- `packages/worker-shifts/src/api/worker-shifts-api.test.ts`
- `packages/worker-shifts/src/actions/worker-shift-actions.test.ts`

Lifecycle documentation:

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_corrections_20260729.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase1_corrections_20260729.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`

## Validation

- `npm run typecheck` — passed with zero TypeScript errors immediately after the correction code was complete. A later rerun, after concurrent out-of-scope Phase 2 auth edits landed in the shared workspace, failed at `packages/auth/src/components/SignInForm.tsx:85` (`string` is not assignable to `AuthAppScope`) across the four apps; no worker-shifts error was reported.
- `npx tsc -p packages/worker-shifts/tsconfig.json --noEmit` — passed against the final shared-workspace state.
- `npm run test:worker-shifts` — passed: 5 files, 36 tests. The previous 32 tests remain and four tests were added for F1/F2/F3 coverage.
- `grep -rn "@beyo/worker-shifts" --include="*.ts" --include="*.tsx" apps/ packages/` — passed with no output; no consumer imports mocks from the root barrel.
- Playwright — not applicable; Phase 1 has no UI or runtime surface.

## Trace

The corrections plan is archived at the path in Metadata. The governing master remains `approved` and records this completion in its Review log; no later phase scope was implemented.
