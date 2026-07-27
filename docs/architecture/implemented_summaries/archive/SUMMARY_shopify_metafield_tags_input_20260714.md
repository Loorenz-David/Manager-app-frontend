# SUMMARY_shopify_metafield_tags_input_20260714

## Metadata

- Summary ID: `SUMMARY_shopify_metafield_tags_input_20260714`
- Status: `summarized`
- Owner agent: `Codex`
- Implemented at (UTC): `2026-07-14T13:01:36Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_metafield_tags_input_20260714.md`
- Intention plan: none
- Backend handoff: `none`

## What was implemented

- Added the shared `@beyo/ui` `TagSelectInput` primitive with searchable option-list mode, removable tag pills, freeform tags, keyboard navigation, Backspace removal, duplicate prevention, and mobile panel/desktop anchored option-list presentation.
- Added Shopify `list.*` resolver support and `ShopifyMetafieldTagsInput`, preserving the existing JSON-array string form value contract.
- Added JSON tag encode/decode helpers and list-aware filled/submittable validation; empty arrays are rejected. The form retains its internal JSON-string value, while the request payload sends `list.*` values as `string[]`.
- Broadened the product-sync metafield type schema to accept Shopify's list subtypes.
- Added focused UI and Shopify regression coverage for selection, filtering, removal, freeform behavior, resolution, serialization, and validation.

## Validation evidence

- `npm run typecheck`: passed with exit code 0.
- `npm run test:ui`: passed, 6 files / 30 tests.
- `npm run test:shopify`: passed, 32 files / 88 tests.
- Playwright runtime validation: not run; no authenticated Shopify runtime fixture was available for this change.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive record: `docs/architecture/archives/ARCHIVE_shopify_metafield_tags_input_20260714.md`
