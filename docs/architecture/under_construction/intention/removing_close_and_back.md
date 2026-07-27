now that i have this new capability of close with slide we will begin removing a bunch of of Close & Back buttons that i implemented to give the capability of closing the slide page with the thumb, which is now possible with the slide to close capablity of the slide surface.

At TaskDetailSlidePage ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx ). we will remove that footer container ( which currently uses the scroll visibility to hide ), That container holding the Close & Back and the edit button will no longer exist but the assign button will continue to render on condition and still react to the scroll visbility utility.
We will also remove this close & back button on the workes TaskDetailSlidePage ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx ), but we keep the button that renders on condition for completing an task step, and keep the create case button ( it now renders full width ).

at the /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/pages/PendingUpholsterySlidePage.tsx we will remove the close and back footer button with it's container, and also remove the current scroll visibility of that page, we will make the current search bar and the quick action filtes bellow the search bar to be part of the body scroll.

at the /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/pages/UpholsteryOrderingSlidePage.tsx we will also remove the footer rendering the close & back button enterely and also the scroll visiblity utility, the header will be part of the scroll container.

We will also do the same with the /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx

and the same with the page /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/pages/WorkerStatsSlidePage.tsx

on the upholstery inventory detail page /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/pages/UpholsteryInventoryDetailSlidePage.tsx we will also remove the footer container holding the close & back and the edit button ( so as the scroll visiblity utilty completely ), the edit action button will live instead at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/pages/InventoryDetailActionsSheetPage.tsx

on the creation for upholstery page we will keep the header but remove the close action the header renders as we already have our own close action with slide and the staged form also provides one /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx

on the customer coordination pages we will remove that close & back button and if alone the container also where it is placed /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-customer-coordination/src/pages
