The backend has added some new query params for the endpoints:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/fetch-working-section-steps.ts

and

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/api/list-tasks.ts

This new query param and new shape returned when including that query param is described at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_grouping_20260718.md

when including the grouping by upholstery the frontend will be able to group the list of render objects by upholstery and render a card between the groups displaying the upholstery image an the upholstery name.

When no upholstery the card simply renders upholstery not selected.

We will make this change on the pages where we render this the object of this calls so that the user can visualize the list group by upholstery when passing the filter.

The filter will be able to be turned on and off thorugh the filter page they used, for the task list is the :/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskFilterSheetPage.tsx

For the task steps is the: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/StepStateFilterSheetPage.tsx

simple on off box picker. this filter should be kept in memory when the user activates it ( local storage memory ), or when it disables it. as default is not activated.

for the upholstery image we should use the primitive avatar component /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/avatar

the card used to render the upholstery between the list has no bg renders the image on the left the name on the right.

the return shape of the upholstery when including the upholstery grouping brings more values which i will use later after this first implementation.
