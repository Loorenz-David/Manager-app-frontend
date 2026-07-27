# SUMMARY_seller_customer_coordination_email_inbox_20260705

## Metadata

- Summary ID: `SUMMARY_seller_customer_coordination_email_inbox_20260705`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-05T10:35:17Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_seller_customer_coordination_email_inbox_20260705.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a reusable email inbox/thread UI layer in `@beyo/emails`, including inbox cards, a two-pane thread carousel, a message-details sheet page, avatar styling, and the controlled VM/action contracts the concrete integration consumes.
- Added a generic `SwipeableRow` primitive in `@beyo/ui` and a new `formatInboxDate()` utility in `@beyo/lib` to support the inbox interactions and Gmail-style timestamps.
- Implemented the customer-coordination-owned inbox integration in `@beyo/task-customer-coordination`: raw schemas, mapping, inbox/message/unread APIs, mark-read and coordination transition mutations, the inbox controller/page, and the gated app-level `sync-targeted` background flow.
- Wired the sellers app to register the new inbox slide and message-details sheet surfaces, expose a `Customer Follow-up Email` home button with the unread badge, and mount the background sync flow at the app root.

## Files changed

- `packages/lib/`: added the inbox date formatter export.
- `packages/ui/`: added the reusable swipeable row primitive export.
- `packages/emails/`: added the presentational inbox/thread components, surface props, and message-details sheet page.
- `packages/task-customer-coordination/`: added the inbox backend integration, controller, page, sync store, and exports.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`: registered the inbox slide and message-details sheet surfaces.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/`: added the unread count query wiring and the new inbox home entry.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/app/`: mounted the email sync flow in the seller app root.

## Contract adherence

- `architecture/16_feature_workflow.md`: implemented the feature in the package order the plan required, from shared types/utilities through the concrete coordination controller/page and app wiring.
- `architecture/28_surfaces_local.md`: kept seller surface registration in the app and exposed page loaders from the packages.
- `architecture/35_shared_packages.md`: kept `@beyo/emails` presentational and surface-prop-driven, while the seller app remained the only layer calling `openSurface`.
- `task_system/frontend_contract_goal_mapping_guide.md`: used local implementation files for concrete existing shapes and kept new query/mutation/controller structure aligned with the contracts rather than cloning sibling code.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The inbox currently follows the phase-1 posture from the plan: first-page loading only, local search over loaded threads only, and the reply button remains disabled.
- No browser or Playwright runtime validation was run in this pass.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_customer_coordination_email_and_counts_20260704.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_seller_customer_coordination_email_inbox_20260705_1035.md`
