# SUMMARY_PLAN_issue_mode_and_client_id_20260603

## Metadata

- Summary ID: `SUMMARY_PLAN_issue_mode_and_client_id_20260603`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T13:12:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_issue_mode_and_client_id_20260603.md`
- Related debug plan (optional): `—`

## What was implemented

- Fixed the canonical `ItemIssue` client-id prefix in `@beyo/lib` from `iis_` to `iti_` and removed the duplicate managers-app `client-id.ts` copy.
- Repointed the managers-app client-id import sites to `@beyo/lib`, so ID generation and validation now come from a single shared package.
- Extended `@beyo/item-issues` to parse and export `issue_mode`, `issue_mode_snapshot`, and optional create-time `client_id` fields from the new backend contract.
- Refactored `useSaveItemIssues` so new item issues receive a generated `iti_...` ID once before mutation, and that same ID is reused in the optimistic cache record and the `POST /api/v1/items/{id}/issues` payload.
- Updated `ItemIssueSelectionSheet` to branch on `issue_mode`: `graded` keeps the existing stepped fill UI, while `switch` now behaves as a binary 0/1 toggle with full-fill or empty-fill rendering.

## Files changed

- `packages/lib/src/client-id.ts`: corrected the shared `ItemIssue` prefix.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/**` and `src/lib/client-id.ts`: migrated 11 import sites to `@beyo/lib` and deleted the duplicate local helper.
- `packages/item-issues/src/types.ts` and `packages/item-issues/src/index.ts`: added the new issue-mode/client-id schema fields and exported `IssueMode`.
- `packages/item-issues/src/actions/use-save-item-issues.ts`: moved create/delete diff resolution ahead of `mutateAsync` and reused resolved IDs for optimistic + network writes.
- `packages/item-issues/src/pages/ItemIssueSelectionSheet.tsx`: added `switch`-mode tap/render behavior.

## Contract adherence

- `architecture/02_types.md`: schema changes were added at the package type layer first, with Zod fallbacks for forward-compatible enum parsing.
- `architecture/08_hooks.md`: the item-issue save flow still keeps optimistic mutation behavior inside the action hook, with rollback and invalidation unchanged in shape.
- `architecture/16_feature_workflow.md`: the change sequence stayed aligned with the existing feature stack by updating types, then action behavior, then the selection-sheet UI.
- `architecture/35_shared_packages.md`: canonical client-id generation now lives only in `@beyo/lib`, avoiding app-local duplication.

## Validation evidence

- `npm run typecheck --workspace=apps/managers-app/ManagerBeyo-app-managers`: pass
- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: pass
- `npm run build`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- `ItemIssuePreviewSection` still does not render `issue_mode_snapshot`; that remains deferred exactly as scoped in the plan.
- No managers-app issue UI was added in this plan beyond the shared client-id migration.

## Handoff notes (if needed)

- Backend contract source: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_issue_mode_response_shapes_20260603.md`
- Related backend delete contract already in use: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_issues_batch_delete_contract_20260601.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_issue_mode_and_client_id_20260603.md`
