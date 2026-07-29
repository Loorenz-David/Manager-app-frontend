# PLAN_clock_kiosk_phase1_corrections_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase1_corrections_20260729`
- Status: `archived` (2026-07-29, Codex execution complete — see Review log)
- Owner agent: `Codex` (all findings are logic-layer; Phase 1 has no visuals, so no Claude kit session is required)
- Created at (UTC): `2026-07-29T17:40:00Z`
- Last updated at (UTC): `2026-07-29T18:02:20Z`
- Related issue/ticket: none provided
- Reviewed plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase1_worker_shifts_package_20260729.md` (archived — do not modify)
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Reviewed summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_worker_shifts_package_20260729.md`
- Backend contract (sole source of shapes): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Goal and intent

- Goal: close the defects found in the Opus review of Phase 1 (`@beyo/worker-shifts`). Fixes only — no new capability, no scope from Phase 2+.
- Business/user intent: the kiosk identifies workers from a cached roster and renders every screen from parsed server state. Three of the findings are **runtime-fatal at the schema boundary**: a single worker with no profile picture, a single catalog reason with no image, or one omitted analytics key makes `@beyo/api-client` throw `invalid_response` (502) and takes down roster matching, the confirm step, or the clock-out result respectively. The remaining findings restore repo conventions the package currently reimplements or bypasses.
- Non-goals: no schema fields beyond what the handoff and the live-proven sibling packages document; no UI; no kiosk flow; no auth; no `@beyo/pause-reasons` import; no touching the archived Phase 1 plan; no re-litigating master decisions.

## Scope

- In scope: `packages/worker-shifts/src/types.ts`, `src/api/schemas.ts` (removal), `src/api/fetch-*.ts`, `src/actions/*.ts`, `src/api/use-current-shift-query.ts`, `src/index.ts`, `packages/worker-shifts/package.json`, and the affected test files.
- Out of scope: `apps/*`, `@beyo/api-client`, `@beyo/auth`, `@beyo/lib`, `@beyo/stats`, `@beyo/pause-reasons` — all read-only here. Root `package.json` needs no further change (`test:worker-shifts` and the typecheck-chain entry are already correct).
- Assumptions: the backend handoff remains ground truth for **field names, routes, enums and envelope**; where the handoff shows only a populated JSON example and is silent on nullability/optionality, the live-proven sibling schemas in `@beyo/pause-reasons` and `@beyo/stats` (same backend, same payload shapes per handoff §5.1) are the tiebreaker and the schema takes the tolerant side.

## Clarifications required

- (none — every finding is resolvable from the handoff plus schemas already shipped against the live backend)

## Acceptance criteria

1. **F1 — roster nullability.** `FloorRosterUserSchema.profile_picture` is `z.string().nullable()` (`src/types.ts:30`). A roster row with `profile_picture: null` parses; a fixture and a test cover it. Rationale: the same `GET /api/v1/users` payload is modelled as nullable in `packages/stats/src/types.ts:39`, `packages/tasks/src/types.ts:38`, `packages/cases/src/types.ts:60`, `packages/working-sections/src/types.ts:6`, `packages/shopify/src/types.ts:6`, `packages/task-notes/src/types.ts:27`, `packages/notifications/src/pins/pin-types.ts:75` and `packages/presentation-builder/src/api/list-users.ts:14`.
2. **F2 — embedded pause-reason nullability.** `image_url` is `z.string().nullable()` in both `EmbeddedPauseReasonSchema` (`src/types.ts:6`) and `AnalyticsPauseReasonSchema` (`src/types.ts:11`), matching the catalog owner `packages/pause-reasons/src/types.ts:14` and the identical analytics lookup `PauseReasonLookupSchema` in `packages/stats/src/types.ts:13-17`. `CurrentShiftSchema.reason_text` accepts `null` as well as absent (`.nullable().optional()`), since handoff §4 describes it only as an additive legacy key.
3. **F3 — analytics tolerance.** `ClockOutAnalyticsSchema` and its children no longer reject a response that omits a key the live backend already omits on the equivalent manager endpoints: `timeline.date_from`/`date_to` optional, `timeline.pause_by_reason` defaulting to `{}`, `segments` defaulting to `[]`, `segments_truncated` defaulting to `false`, `segment.manually_recorded` defaulting to `false`, `segment.steps` defaulting to `[]`, `insights` defaulting to `[]` (mirrors `packages/stats/src/types.ts:224-237, 322-348`). `.passthrough()` stays on every analytics object. A test asserts that a minimal analytics payload (`{ date, timeline: { the four buckets + completed_count } }`) parses, and that the fully-populated handoff §5.1 example still round-trips byte-for-byte.
4. **F4 — no reimplemented envelope.** `src/api/schemas.ts` is deleted and every call site imports `ApiEnvelopeSchema` from `@beyo/lib` (`packages/lib/src/types/api.ts:3`), as `@beyo/stats` does (`packages/stats/src/types.ts:3`). The `@beyo/lib` peer dependency is then genuinely used. Master line 144 — "No new parsing logic anywhere" — holds.
5. **F5 — mocks off the production path.** `packages/worker-shifts/package.json` gains `"./mocks": "./src/mocks/index.ts"` in `exports`, `msw` moves out of `peerDependencies`, and `src/index.ts:80` drops `export * from "./mocks"`. Consumers import mocks from `@beyo/worker-shifts/mocks` (and the floor app will do so behind `VITE_FLOOR_MOCKS=1` via a dynamic import in Phase 3). Per `35_shared_packages.md` §"static re-export", a barrel re-export puts the mock module and `msw` in the same chunk as the package's real API, which makes decision #11's env flag impossible to code-split. Package-internal test files may import `../mocks` by relative path unchanged.
6. **F6 — disabled current-shift query key.** `useCurrentShiftQuery()` with no `user_id` no longer parks its disabled entry on `workerShiftKeys.currentLists()` (`src/api/use-current-shift-query.ts:12-15`) — the list-level namespace key that a future `invalidateQueries({ queryKey: currentLists() })` would match. Use a distinct disabled key (e.g. `workerShiftKeys.current({ user_id: "" })` or a dedicated `currentDisabled()` factory entry) and keep `skipToken`. The existing "stays idle until user_id is present" test still passes.
7. **F7 — documented fetch-fresh pattern.** `src/index.ts` carries a short comment above the `fetchFreshCurrentShift` export stating that it is the mandated fresh-read path for the confirm step (handoff §3: "the cache decides *who*, never *what state*") and that `useCurrentShiftQuery` is the passive/observational hook. Phase 1 criterion 4 required this pattern be "documented in `index.ts`".
8. **F8 — no catalog shape in mock code.** The `MockReason` type in `src/mocks/handlers.ts:20-26` restates the pause-reason catalog (`name`, `image_url`, `pause_type`, `requires_description`). Keep the fixture *data* but stop declaring a catalog *type*: infer the record's type from the literal (`typeof mockReasons`) or narrow it to the two fields the handler actually branches on. The Phase 1 non-goal "no pause-reason types (owned by `@beyo/pause-reasons`)" then holds without exception.
9. No behavioral change outside these eight items: routes, methods, enums, key-factory shape, the 200-row `console.warn`, invalidate-on-settle, the absence of optimistic updates and the absence of the legacy `POST /worker-shifts/clock` wrapper all stay exactly as they are.
10. `npm run typecheck` green at root; `npm run test:worker-shifts` green with the added cases (≥ 32 tests, none removed).

## Contracts and skills

### Contracts loaded

- `architecture/02_types.md`: zod-first schemas, inferred types, nullability discipline.
- `architecture/04_api_client.md` (§"Response envelope", lines 350-367): the envelope is validated at the HTTP boundary by the shared schema — F4.
- `architecture/04_api_client_local.md`: flat `{ ok: false, error }` errors stay owned by `@beyo/api-client`.
- `architecture/05_server_state.md`, `architecture/08_hooks.md`: query-key factories, disabled queries, invalidate-on-settle — F6.
- `architecture/24_dto.md`: schema + view-model discipline.
- `architecture/34_runtime_validation.md`: what a boundary parse failure costs at runtime — the motivation for F1–F3.
- `architecture/35_shared_packages.md`: `exports` map, peer-deps, and the static-re-export/chunking rule — F5.
- `architecture/17_testing.md`: vitest + MSW conventions for the added cases.

### Local extensions loaded

- `architecture/04_api_client_local.md`: this backend's flat error envelope — unchanged by these fixes, re-read to confirm F4 introduces no error-path drift.

### File read intent — pattern vs. relational

Permitted relational reads (verifying **what exists**, all read-only):
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md` — ground truth for names, routes, enums, envelope.
- `packages/lib/src/types/api.ts` — the exact `ApiEnvelopeSchema` signature to adopt (F4).
- `packages/stats/src/types.ts` — the live-proven analytics/user/pause-reason-lookup shapes cited in F1/F2/F3, and its `ApiEnvelopeSchema` usage.
- `packages/pause-reasons/src/types.ts` — catalog ownership and `image_url` nullability (F2/F8).
- `packages/worker-shifts/**` — the code under correction.

Prohibited (pattern reads — the contracts already define these): reading other packages' hooks, actions, controllers or DTO files to learn structure.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` — summary, archive, master review-log entry on completion.
- Trigger terms: corrections plan, lifecycle transition.
- Excluded alternatives: none — no repo skill covers zod/schema corrections.

## Implementation plan

1. `src/types.ts`: apply F1, F2, F3 (nullability + optional/default tolerance; keep every `.passthrough()`; change no field name and add no field).
2. Delete `src/api/schemas.ts`; repoint `fetch-floor-roster.ts`, `fetch-current-shift.ts` and the four `actions/*.ts` files at `ApiEnvelopeSchema` from `@beyo/lib` (F4).
3. `package.json`: add the `./mocks` subpath export, drop `msw` from `peerDependencies` (F5).
4. `src/index.ts`: remove the mocks re-export, add the `fetchFreshCurrentShift` documentation comment (F5, F7).
5. `src/api/use-current-shift-query.ts`: distinct disabled key (F6).
6. `src/mocks/handlers.ts`: drop the `MockReason` catalog type (F8). Add a roster fixture row with `profile_picture: null` and a catalog reason with `image_url: null` so the tolerant schemas are exercised through the handlers, not only in unit parses.
7. Tests: extend `types.test.ts` (null profile picture, null `image_url`, `reason_text: null`, minimal-analytics parse, full handoff §5.1 round-trip preserved); adjust any import of `@beyo/worker-shifts` mocks; re-run both commands.

## Risks and mitigations

- Risk: loosening analytics schemas hides genuine backend drift when phase 7 lands.
  Mitigation: tolerance is applied **only** where a live-proven sibling schema in `@beyo/stats` already tolerates it; every field the handoff documents stays present and typed, and the full §5.1 example must still round-trip byte-for-byte.
- Risk: removing the mocks re-export breaks an import that already exists.
  Mitigation: `packages/worker-shifts` is the only consumer today (nothing outside it imports `@beyo/worker-shifts` yet — verify with a repo-wide grep before and after); package-internal relative imports are untouched.
- Risk: swapping the envelope helper silently changes parse behavior.
  Mitigation: `ApiEnvelopeSchema` is field-identical to the deleted local helper (`ok: literal(true)`, `data`, `warnings: string[]`); the existing API/action suites are the regression gate.
- Risk: changing the disabled query key strands a cache entry.
  Mitigation: the entry is `skipToken`-disabled and never populated; the existing idle-state test proves it.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across the whole root chain.
- `npm run test:worker-shifts`: all suites green, no test removed, new cases for F1/F2/F3 present.
- `grep -rn "@beyo/worker-shifts" --include="*.ts" --include="*.tsx" apps/ packages/`: no consumer imports mocks from the root barrel (F5).
- Playwright: not applicable — Phase 1 has no UI or runtime surface.

## Review log

- 2026-07-29 Codex: corrections completed and archived. F1–F8 fixed; `npm run typecheck` passed; `npm run test:worker-shifts` passed (5 files / 36 tests); the consumer grep returned no matches. Summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_corrections_20260729.md`.
- 2026-07-29 Claude (Fable, orchestrator): plan reviewed and **approved** unchanged. All eight findings concur — the sibling-schema tiebreaker rule in "Assumptions" is adopted as standing guidance for later phases (tolerant side wherever the handoff shows an example but is silent on nullability/optionality). The nullability ambiguity is also flagged back to the backend via `BACKEND_REQUIREMENTS_clock_kiosk_20260729.md` §8 so the handoff gets explicit about it. Ready for a fresh Codex session.
- 2026-07-29 Opus (Phase 1 review): verdict **defects found**. `npm run typecheck` re-run green; `npm run test:worker-shifts` re-run green (5 files / 32 tests) — the summary's validation claims are accurate, and lifecycle bookkeeping (summary, archived+moved plan, master review-log entry, master otherwise untouched, root registration, no `apps/` changes) is correct. Findings F1–F8 above; all routed to Codex (no visual work in this phase). Master-level acceptance criteria 1 (contract fidelity) and 2 (boundaries) are the ones at issue; the legacy `/clock` route, the no-optimistic-updates rule, the no-JSX rule and pause-reason non-duplication all verified clean.

## Lifecycle transition

- Current state: `archived`
- Next state: none — corrections complete
- Transition owner: Codex
