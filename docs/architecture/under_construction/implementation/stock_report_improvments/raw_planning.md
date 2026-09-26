I have made some crucial changes to the stock report capabiltiy on the backend. this backend changes affect the frontend in some aspects.

The schema changes for the already build api schemas is documented at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/stock_report_improvments/HANDOFF_TO_FRONTEND_stock_report_snapshots_20260926.md
The new created endpoints is also documented on the same file ( we will use this new endpoints also ).

First we should correct the schema shape of the alredy existing endpoints.
The new snapshot object with in the stock report rows now carries the priority and priority order that is used to categorize and organize the stock report rows on the calls of the api "/api/v1/stock-report/items" .

Now this api endpoint ( "/api/v1/stock-report/items" ), brings only the latest active snapshot of stock reports ( as a default behaviour, because we can send a flag stock_live=true and it will return the live report, but we will ignore the implementation of this filter flag at the moment ).
At the manager applicatioin stock report page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/stock-report/StockReportPage.tsx ), we will introduce a button besides the current stock button that allows the manager to access to the stock report items ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/stock-report/components/StockReportHubView.tsx ), this button will allow the manager to create a new version ( new endpoint for creating a snapshot version ). on request creatinon we should display a the dark overlay with loading spinner with the message comunicating the user the version is getting created ( we can create loading page for that, and use the lucide-react with animate-spin for the spinner like we do on the task creation form /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-creation/src/components/TaskCreationSubmitOverlay.tsx ) , upon creation confirmation we should open the stock report page with the items.

We will have a component card above this two buttons which display the current version progress ( new endpoint for getting stock version progress ) .
Tapping that component opens the stock report items page (the one that calls the endpoint "/api/v1/stock-report/items" ). so we are replacing the current "Stock needs" button with this component card. One more note, we should display the active version date for this stock as a date count forward, meaing "2 days running" .
This card displays the progress base on priority.

We will replace the current "Stock needs" button with a "History" buttton instead . If the user taps this button a slide page surface renders with the version history page, which displays all the version history cards ( this history cards display the total progress of the goal not divided by priority ) .

bellow the component card displaying the stock version progress we will add one row button which displays the missing quantity ( new get missing quantity endpoint ) .
this button has a modern amber style as it is a warning for the managers .
if the manager taps that button a slide page opens ( slide page surface ), with the StockReportBoardView component but in a new mode, which is the missing mode, this mode continues to display the top header priority slide box, but instead of unset it shows "all" , and the endpoint query should send the query param so that the backend query only returns the instances that have missing quantity registered ( new endpoint query param ). The user should be able to see all or filter by priority. the stock report cards should display the missing quantity with in the count progress bar ( noticable color, yellow amber, we will change the queue color for a teal color that goes in line with a step before the in_progress state count ).
This page allows the user to do the same as the normal mode .

Now that we have an endpoint which allows the managers and users to register a missing quantity for a stock report ( snapshot ), we will give the user this interaction.
At the stock report detail page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stock-report/src/components/detail/StockReportDetailView.tsx ), we will palce the three dot menu button at the header ( top right ), when the user taps on it a bottom sheet surface will appear with the action page for stock report, the only two action that we will render at the moment is the ( lucid icon ) mark missing and ( lucid icon ) unmark missing
If the user taps on this mark missing quantity button, we send the request for marking missing quantity for all the non registered quantity, meaning current stock instance quantity_requested - quantity_in_queue, in_progress, awating .
and if the user marks unmark missing then the oposite happens.
This means this two buttons for now behave like a switch, either all that is not registered mark as missing or not. ( we can place conditions for rendering the buttons as it is unecessary to render a mark quantity when there is no quantity to mark ).

I will like you to create a well crafted plan ( which you will later implement ), align to the architectural principles we use for creating this frontend application ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md )  
You can ask me as many questions is need it in order to align this implementation with my goal.
