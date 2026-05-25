✅
upholstery field on the details task page should allow for changing the item upholstery ( we need to create an endpoint for this ).

✅
we need to create a field for looking at the current task steps ( working sections assigned to the task ). this field trigger will be a box like the item upholstery trigger, it assigned working sections, bellow that name we have two pills, one pill displays the number of working sections assigned (# assigned), then the number of working sections that have completed their step (# completed) . taping this field opens the working section page for a task ( we will create this page later, for now it only displays comming soon ). we can create this preview trigger at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail . use the slide page surface for the workinng section task page.
place this trigger at the task detail page above the TaskFlowTimeline component ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx ).
this page will leave at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks and will handle it's own logic like the upholstery item page. make a implementation plan for codex, using the correct architectural principles. acces the contracts through @frontend

✅
for the working section task page, this page will use the stage form primitive ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form ) as a way of navigating in the page. the page will be divided on selected working sections, live flow, stats. we will leave the live flow and stats empty for now, we will focus only on the selected working sections, as this is the place wher the user can add a working section or deselect a working section. we will need to edit the form staged component so that it doesn't render the bottom action menu ( beacuse we won't need it ), as default the staged form component has it active ( so that current pages that are using it continue to work ). for the select working section we will render the same foundation as the working section field (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/WorkingSectionPickerField.tsx), all the working sections ( that have the major item category ) are display, the current selected working sections are shown as selected, the working section card will display the working section icon, the name of the working section and bellow the name the current state of the task step for that working section ( we use the state pill primitive /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/state-pill ). taping on a selected working section deselects ( this action is imidate, it doesn't require a save changes ). taping a unselected working section selects it. if the state is completed ( meaning the working section has completed that step ), it should render the styling of unselected working section, this is because the user can tap the working section again, creating one more step to that working section. all of this updates are optimistic, the fronent should react before obtaining the response, thus giving a live and fast interaction. the working section trigger should reflect the the count correctly ( but this is already correct if we have been using correctly the stores ). the user can reasign a worker from the workin section step, same behaviour already stablish on the working section field ( user taps card, if more than one worker, then it opens the bottom sheet, if only one worker, it should still open it, but on selection of the working section it auto selectes a worker if only one worker ).
the endpoints we use for this selection, deselection, and user reasignment can be found at: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_steps_add_assign_remove_contracts_20260525.md

build this logic for the page cleanly, following the architectural contracts @frontend.... . use the @template_plan for creating the implementation plan. i will pass this plan to codex

---

✅
on task detail page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx ), when the task is in pending state, it should render the button for entering the assignment section ( slide page of working section selection ).

✅
when a task has working task steps, we should display a card allowing the user to enter into the task step details page.

at the task detail page, the item category value should also display the image ( we need to add this column to the table at the backend and bring it up through the serialize, also allow it's injection through the update and create services, don't forget to include it on the bootstrap also )

at the task detail page, we will display the task notes in a list that allows to add more or remove the current note easily.

the three dot button at the task card and on the task detail page has the action to pin the task ( notification pin ).

✅
the current task card should display the ready_by_at value in the third row ( it currently doesn't ).

at the live camera page we should add grid lines on the video stream. and the ability to change the camera lenses.

after an update comes in the service worker effectively loads the bottom sheet for letting the user to tap update. when i tap update, there is some reload and after that the app layout is messed up, is like it zoom in, the bottom sheet cannot be reached. i have to close the app and open it again.

after this, we will develop the table system for item position and item properties. ( maybe not yet )

build cases page.

build settings page.

map and extract the core principles of this app to make the workers application.
