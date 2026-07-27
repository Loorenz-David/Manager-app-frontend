# SUMMARY_feature_domain_architecture_20260520

## Metadata

- Summary ID: `SUMMARY_feature_domain_architecture_20260520`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T13:04:43Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_feature_domain_architecture_20260520.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended the shared type layer with branded entity IDs, shared value schemas, and a backend-aligned API envelope/error schema.
- Added the planned domain `types.ts` and query-key factories for the 9 operational features plus the `task_steps` and `item_images` subfeatures.
- Scaffolded the remaining feature directories and created configuration-feature type stubs.
- Updated feature public APIs to export the new domain types and patched the downstream customer/item field-composition plan note to reflect the confirmed backend customer shape.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/types/{common.ts,api.ts}`: extended shared branded IDs and API envelope/error typing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/` and `src/features/tasks/subfeatures/task_steps/`: replaced stub task types, added task/task-step key factories, and removed the controller’s dependency on the old empty stub type.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/{items,customers,cases,users,account,working_sections,upholstery,upholstery_requirements}/`: added the planned feature-domain types, query-key factories, and public type exports.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/{items_configuration,working_sections_configuration,static_costs_configuration}/`: created configuration feature type stubs and public exports.
- `docs/architecture/under_construction/implementation/PLAN_customer_item_features_field_composition_20260520.md`: added the cross-plan note removing unsupported customer secondary-contact fields.

## Contract adherence

- `architecture/24_dto.md`: every operational `types.ts` follows the fixed DTO order: response DTOs, request DTOs, query params, then view models.
- `architecture/15_feature_structure.md`: new feature folders and `index.ts` boundaries were added without deep cross-feature imports.
- `architecture/16_feature_workflow.md`: implementation stopped at the planned foundation layers only: types and query key factories.
- `architecture/05_server_state.md`: every operational domain key factory uses the five-key shape, with scoped variants where the plan required them.
- `architecture/04_api_client.md`: the shared API types now match the backend `{ ok, data, warnings }` envelope and typed error shape.
- `architecture/01_architecture_local.md`: existing `route-entry.tsx`, provider, controller, and component route scaffolds were preserved.

## Validation evidence

- `npm run typecheck`: pass
- `npm run build`: pass
- `npx playwright test --project=mobile`: not run; there are no Playwright specs in `apps/managers-app/ManagerBeyo-app-managers/tests/playwright`.
- `npx playwright test --project=desktop`: not run; there are no Playwright specs in this package.

## Known gaps or deferred items

- Endpoint-specific `data` payload schemas are still deferred to the next API-function plan; only the shared envelope and inner entity schemas were added here.
- Some configuration-domain schemas remain intentional placeholders until those feature verticals are implemented.
- `home/types.ts`, `settings/types.ts`, and `stats/types.ts` remain unchanged stubs because this plan’s concrete implementation steps did not define replacement DTOs for those primary-tab scaffolds.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_feature_domain_architecture_20260520_1304.md`
