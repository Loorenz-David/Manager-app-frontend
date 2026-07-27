# SUMMARY_metafield_picker_edit_mode_20260714

## Metadata

- Summary ID: `SUMMARY_metafield_picker_edit_mode_20260714`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-14T06:46:12Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_metafield_picker_edit_mode_20260714.md`
- Intention plan: `not created; implementation plan was the source of truth`
- Backend handoff: `none`

## What was implemented

- Added the `ShopifyMetafieldPreference` client-ID prefix (`shpmfp`) and optional client IDs on create selections.
- Added typed delete and sequence-order PATCH API functions and exported the new schemas, types, APIs, and action hooks.
- Replaced deferred submit-time batch creation with per-field optimistic create, delete, and reorder actions. All mutations snapshot and roll back category preference caches and invalidate Shopify preference queries on settle.
- Added edit mode beside the metafield search bar, client-side filtering of loaded saved preferences, remove pills, and per-shop touch/pointer drag-and-drop reorder contexts.
- Added the right-edge Add, Remove, and drag-handle actions while preserving stable field identities and draft values.
- Removed the obsolete pending-preference Zustand store and the product-sync submit-time batch-create orchestration.

## Validation evidence

- `npm run typecheck`: pass, exit code 0.
- `npm run test:shopify`: pass, 30 files / 78 tests.
- Playwright runtime validation was not run because this workspace requires live authenticated Shopify/category data for the end-to-end flow.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive record: `docs/architecture/archives/ARCHIVE_metafield_picker_edit_mode_20260714.md`
