We will now develop the feature called stock_report as a package that will be consume by multiple applications of this manager set of frontend applications.

This feature will be part of the packages at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages . and will follow the architectural principles of packages found at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/architecture/35_shared_packages.md

The goal of this feature is to allow managers, workers, sellers to understand stock requests so that they can act accordingly on the production line ( restoration work ).

To clear some of the semantics i will use in this text:

Stock report instance: it makes reference to what a single stock report instance is, which is a request to restore some quantity of a type of item with certain properties.

item assigments: the items that has been registered to be part of a stock report instance, counting as this is the items we will fix in order to fulfill this stock report instance.

Usage Goal:
For managers and workers :
This feature will allow workers to see the stock reports instances, see their progress and their assignments, they can also edit the assignments ( create, remove ) .

For managers and sellers:
They can organize stock report instance base on priority and with-in a priority sort and assign a priority order.

the three applications: manager, seller and worker will use the same interface for seeing and interacting with the stock reports

The Api endpoints that this feature will be using are currently under construction, some already made and stablished others still under construction but their endpoint naming and response shape is verify and if any changes to them is very small, this is documented at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/stock_report/backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_20260922.md (the 2026-09-22 re-verified contract; the 2026-09-21 file this line originally named is in `backend_handoff/archived/`).
What this means for the frontend is that the frontend can develop the entire feature using this backend handoff as if the backend implementation was already build, so that by the time the backend is finished the frontend is also finished, thus being able to test both directly and ship them both together.

For the ui design i have already made the mockups with the help of claude/design, and this mockup design is described at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/stock_report/ui_design_documentation it contains the documentation for how the ui looks like in the mockup and also at the /snapshots folder is the snapshots of the ui design. our goal is to match that mockup ui design as it is the ui design that is confirmed by the customer.

The main stock report page:

This page will display the stock report instances using the stock report cards. This card is described at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/stock_report/ui_design_documentation/03-component-specification.md as StockNeedCard

This page has a header ( which is part of the scrollabel body ), the header is compose of a slide box ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-slide-picker ) which allows the user to pick between four types of priorites ( `Unset` · `High` · `Medium` · `Low` ), this should change the current query to reflect the correct list of StockNeedCard, only one priority is allowed to be selected, thus the slide box primitive is used.
Bellow that row is the searchbard, we will use the primitive searchbar ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/search-bar ), with only the filter button ( we will hide the sorting button as is unecessary for this page ), The searchbar will not be working at the moment as none of the current query endpoints provide a search with string parameter, but visually it will be there ready to be wired when the query list of stock is ready to accept that parameter.

Bellow that is the body where we render the Stock report cards.

This page restricts some user roles from interacting. for instance the workers can only see the : `High` · `Medium` · `Low` priority filters, and they can not re-organize the priority cards .

The priority assignment and the re-organizing priority order. We will use the dnd kit package for handling the drag and drop functionaly of the re-organization of the cards with in a priority order.
The way this will work is that the page needs to enter into that re-organize priority mode, so that the user can assign priorities and also drag and drop cards.
When the user is in that mode the the cards will have the drag handle on the right top side which has to be thumb comfortable with enough drag paddign for the user to drag and drop comfortable ( we need to be able to also measure when the user is actually scrolling and not dragging, that behaviour has to be reliable ). In this mode the cards gain a bottom button which allows the user to tap it and then through a slide page sheet select the priority that it wants to move that stock report instance. outside the mode the user can't re-organize nor it can assign priority to the report instances, As mentioned previously this capability is only possible with the manager and seller roles.
The way the user enters into this mode, is through a button which we will place in a fab button like the task main page uses the creation fab button to present the interactive buttons ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskCreationFab.tsx ) . the reson for this is because i will place more interactivity in later on, for now there is only one interaction in the fab button which is enter into re-organization of priority.
Workers don't see that fab button at the moment as there is not interactions they can perform.

When the stock report card is tab we open the stock report details page, which is the next page to build.

The stock report details page:

This page displays a single stock report details and assignment isntances. the assignment instances are render on the task card list which we already have ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/TaskListCard.tsx ) . this page is fully scrollabel so even the header is part of that scroll, this is so that the user has more room to scroll and see the task cards ( assignments ). tapping a task card should have the same interactions as the task card on the task card main page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/TasksView.tsx ), which is to open the task detail page when tap on the body, to open the full picture page when tapping the image container, or to open the option page meny when tapping the three dot menu.

This page has the button for allowing the user to add a task assignment to this stock report. This button will open different forms depending on the current user role. For worker who is wood worker it will open the form /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-creation/src/components/WorkerInternalFormContent.tsx , for manager it opens the internal creation form /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-creation/src/components/InternalFormContent.tsx . this forms should be capable of opening of stock assignment mode, what this means is that the form is first created, and on it's returned sucesses, then the creation for assignment is sent. so at the moment the user is only capable of creating an item with a new internal task and after that creation suceedes the creation of the assignment is sent so that the stock report reads that assignment.
On sucess the form asks the user if it wishes to create another assignment or to close the form.

On the creation of the stock assignment there is a check, if the categories of the item match to the stock report, and also if the stored properties also match, category is a hard fail, and properties is a soft warning which requires a flag to override the property missmatch, currently there is only one endpoint that makes this check, and that is the creation of the assignmet, but for practical purposes i will create a endpoint that will be used only to understand if the item is match to the stock report that will be added, that way when the user first enters the article number of the item and gets the item category and properties we can generate a check to that endpoint, if not match we warn directly, if match then we allow to continue, that way the user doesn't create a task with item and then only afterwards it is warn that is not a match for the stock report. that endpoint that i will create will be created afterwards and it will be created as the frontend wishes, meaning you will build the endpoint naming, and the shape so that you can make up the machinery the api and the schema, then by the time this is build i will hand the frontend handoff request to build that endpoint.

NOTE: as you can see this whole frontend and backend build is a parallel build and you and the backend agent must trust my gudgment on how i hand the task to each other as there is only one human in the loop, which is me.

The main page where the stock report list renders will be part of the main pages which the user can access through the bottom nav menu, for all roles managers, workers, sellers . the page will be part of the "more" bottom menu tab.

This makes up the central logic for managing the stock report.

I will like you to explore the current frontend repositiory, so as the architectural contracts for aligning the intention implementation correctly ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md ) .

And generate a polish intention document that i will use for the implementation planning. the intention will make up the source of truth, so any clarifications or questions we can resolve together. the implementation will run in two code sessions, one codex ( implementing all machinery, api, and frontend logic ), and one claude session ( implementing the ui design ), so the claude ui will run first to create the ui that codex can then use to wire the logic.
