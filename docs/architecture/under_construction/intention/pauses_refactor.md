The backend now allows the user to create it's own pause reasons.

We will no longer support the enum type of pause reasons.

The current pause reason enum lives at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts

We will now make the pause reason package feature which the worker application will consume for handling the flow of pauses.

package folder: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages

I will like you to create a full feature for this new capability using the contract 35 ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/architecture/35_shared_packages.md )

The endpoints for this new capabilty is at ###

This means that now the page that hanldes the pause selection will make a query call to obtain the pause reasons from the backend endpoint

pause reason page: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/PauseReasonSheetPage.tsx

This page should be self sufficient, making it's own query call for obtaining the pause reasons from the backend.

I will like to to research the current architecture of concern for this new capability and give me an understanding of what we need to implement to align the frontend with the backend.

This implementation was made for giving the user the possibility of creating it's own pause reasons, with their own properties.
There is some pause reasons that are part of the system, this will always be present. This system pauses have the column is_system_managed set to true.

for the images on each pause object image_url we will use the component ImagePlaceholder specialize for rendering images coming from the backend as url.

ImagePlaceholder:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/image-placeholder/ImagePlaceholder.tsx

We continue to use the BoxPicker primitive for rendering the pause reasons.

When requires_description is true we will display the secondary container with the text input for the user to send the description of the pause that was selected. the sytem pause reason "other_task_priority" comes as needs description as default. but other pauses created by the user could bring this flag requires_description as true.

pause_reasons_crud

This handoff explains how the frontend manages the pause-reason catalog itself.

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_crud_20260722.md

We already have a page system for handling this pause reason syste, we are now making modification to accept pause reasons objects coming from the backend.

pause_reasons_analytics_breakdown

This handoff explains how pause reasons appear inside the worker timeline analytics response.

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722.md


I will like 