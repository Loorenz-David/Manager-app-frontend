# SUMMARY_shopify_dimension_metafield_20260714

## Metadata

- Summary ID: `SUMMARY_shopify_dimension_metafield_20260714`
- Status: `summarized`
- Owner agent: `Codex`
- Implemented at (UTC): `2026-07-14T11:28:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_dimension_metafield_20260714.md`
- Intention plan: `docs/architecture/under_construction/intention/modification_to_dimensions.md`
- Backend handoff: `none`

## What was implemented

- Added `dimension` to the Shopify metafield input resolver and rendered it with the shared `NumberInput` primitive using 50 cm steps, non-negative whole-number input, and a `(cm)` label suffix.
- Added dimension-aware form-value validation so only finite numeric drafts are treated as filled and submitted.
- Changed product-sync metafield wire payloads from flat values to `{ type, value }` wrappers for text, URL, and dimension entries.
- Serialized dimensions as `{ type: "dimension", value: { value, unit: "CENTIMETERS" } }` and updated the runtime Zod request schema to accept the new shapes.
- Centralized metafield submit eligibility and added unit/regression coverage for resolver selection, dimension validation, wrapped payloads, runtime schema parsing, and invalid-draft exclusion.

## Validation evidence

- `npm run typecheck`: passed with exit code 0.
- `npx vitest run --config packages/shopify/vitest.config.ts`: passed, 31 files / 82 tests.
- Manual authenticated Shopify UI and Playwright verification: not run; the workspace requires live Shopify/category data for that flow.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive record: `docs/architecture/archives/ARCHIVE_shopify_dimension_metafield_20260714_1128.md`
