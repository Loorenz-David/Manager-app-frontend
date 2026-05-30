on manager app, when opening a task detail page: if state of task is pending it should hot reload the stages page with fetch on working sections, if upholstery quantity is not set it should load the upholstery page with fetch. if no issues on item it should load the add issue page .

on cases: if unread notification for a case it should already load that case conversation page ( for this we will change the current message count so that it brings them with case id, thus on first page load we can already fetch that info ) .

on workers app. on home page load it should load the detail section task steps for all sections, task detail page should load also if the state is paused, working or ended_shift.
cases for the main page and for the cases of a task will follow the same strategy of conditional loading and fetching if there is unread messages.

Perfect i like that!

so when opening the app the following should load base on conditions:

if unread messages > 0 then:
specific case detail data for all the messages
case main page, case conversation page

manager app:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationPage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CasesPage.tsx

worker app:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationPage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationSlidePage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx

for the worker application, on home page load it should load the
WorkingSectionStepsView surface. and prefetch the the data of each section step view on the condition:

working section has > 0 on states paused, working, ended_shift

it should load the task detail page surface and prefetch the data for those tasks step detail setps need it by the page

home entry:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx

task detail page:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx

working section step view:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx

for manager app, when entering any of the three task forms

it should load the surfaces that will be used and prefetch the data that the fields that load data require.

page forms:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/task-creation/InternalTaskSlidePage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/task-creation/PreOrderTaskSlidePage.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/task-creation/ReturnTaskSlidePage.tsx
