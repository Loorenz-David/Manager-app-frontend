# SUMMARY_task_issues_section_package_20260601

## Metadata

- Summary ID: `SUMMARY_task_issues_section_package_20260601`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-01T08:08:25Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_issues_section_package_20260601.md`
- Related debug plan (optional): `—`

## What was implemented

- Moved `TaskIssuesSection` into `packages/tasks` as a prop-driven shared component and added the supporting issue category config types, query key factory, fetcher, and TanStack Query hook.
- Migrated the managers task detail page to consume `TaskIssuesSection` from `@beyo/tasks`, removing the local component and the controller-owned issue config query/name map.
- Restructured the workers task-step item details area into `DashedInfoGroup` plus `DashedInfoSection`, and wired the shared issues section in a dormant state so the second row is ready when worker `item_issues` data is added.
- Added the workers app package dependency and Tailwind `@source` directive needed for the shared task package.

## Files changed

- `packages/tasks/src/*`: added shared issue types, issue category config API/query modules, `TaskIssuesSection`, and new public exports.
- `packages/tasks/package.json`: added `lucide-react` as a peer dependency for the shared issue action button.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/*`: removed the local `TaskIssuesSection` implementation/export and simplified the task detail controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: switched task issues rendering to the package component.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`: split item details into sectioned layout and attached the shared issues section placeholder.
- `apps/workers-app/ManagerBeyo-app-workers/package.json` and `src/index.css`: added `@beyo/tasks` and the package source scan directive.

## Contract adherence

- `architecture/05_server_state.md`: the shared package uses a dedicated query key factory and TanStack Query hook for issue category config reads.
- `architecture/07_components.md`: `TaskIssuesSection` is now a props-only shared component that owns its own read query instead of reaching through app context.
- `architecture/08_hooks.md`: managers task detail controller was reduced back to controller concerns by removing display-only derived issue name state.
- `architecture/35_shared_packages.md`: the shared task UI/API moved into `packages/tasks`, with peer dependency declaration and consuming app package/source updates.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run typecheck`: pass, executed in `apps/workers-app/ManagerBeyo-app-workers`
- `npm run build`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- Workers app task-step data still does not include `item_issues`, so the shared issues section remains hidden there until that follow-up schema wiring is completed.
- The workers app still has no issue fast-edit surface wiring; that remains deferred exactly as scoped in the plan.

## Handoff notes (if needed)

- None

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_task_issues_section_package_20260601.md`
