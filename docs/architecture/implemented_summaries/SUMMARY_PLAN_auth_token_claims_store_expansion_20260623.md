# SUMMARY_PLAN_auth_token_claims_store_expansion_20260623

## Metadata

- Summary ID: `SUMMARY_PLAN_auth_token_claims_store_expansion_20260623`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T07:14:24Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_auth_token_claims_store_expansion_20260623.md`
- Related debug plan (optional): `—`

## What was implemented

- Expanded the JWT `TokenClaims` type in `@beyo/api-client` to cover the full access-token payload now emitted by the backend, including workspace-role, scope, timezone, and token metadata fields.
- Extended the shared auth Zustand store to persist the new claims-derived identity fields and added focused selectors for role, workspace role name, app scope, and timezone.
- Updated both auth hydration paths so a fresh sign-in and a restored session populate the same complete user shape from decoded token claims.

## Files changed

- `packages/api-client/src/auth-token.ts`: expanded `TokenClaims` with the full backend JWT field set.
- `packages/auth/src/store/auth.store.ts`: extended `AuthUser` with workspace-role, scope, timezone, and token metadata fields; added convenience selectors.
- `packages/auth/src/api/use-sign-in.ts`: decoded the stored access token after sign-in and forwarded the new claims into `setUser()`.
- `packages/auth/src/components/AuthProvider.tsx`: mapped all persisted token claims into the auth store during session restore.
- `packages/auth/src/index.ts`: re-exported the new auth selectors and auth types from the shared package entrypoint.

## Contract adherence

- `architecture/12_auth.md`: preserved the split between in-memory token storage in the API client and identity storage in the Zustand auth store while updating both sign-in and boot-time restore paths.
- `architecture/06_client_state.md`: kept the auth store limited to session identity data and exposed derived access via selectors instead of storing redundant computed state.
- `architecture/16_feature_workflow.md`: completed the implementation, validation, summary, and archive preparation lifecycle for the plan.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- No manual browser smoke test was run here, so the populated auth-store shape after live sign-in and refresh-cookie restore was not inspected in DevTools in this environment.
- No consuming components were updated in this plan; future work can read the new fields from the shared auth store without further store-shape changes.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_auth_token_claims_store_expansion_20260623_0714.md`
