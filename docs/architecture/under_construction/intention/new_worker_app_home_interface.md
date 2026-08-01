At the worker application on the home page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/home/HomePage.tsx ), I render two differnet set of variants for rendering the working section cards.

We will keep the loading of the working section cards but we will add more to the shared home page ( regardless of the role the user is ).

At the top we will add one button card which will render the user current state, and the running time since that state started, for states that are not code enums we will render a lucid icon ( your choice ), for other states we will render the icon for that state reason.

bellow the button we will add a button card with label "Re-Assigned" ( with lucid icon "refresh-ccw-dot" ), this button will render a pill with a count of the reasiggned tasks to the user, Im sending you a picture of an example of the button styling.

Then bellow that we will add the label "My Sections", bellow that label we can render the current working sections component list, which allows the user to enter into the working section list.

### The reasigned page:

When the user taps the re-assigned button we will open a page ( through the slide surface ), this page will render the reassigned task steps. the reassigned task steps are grouped by working section ( as a user can be assigned to many ), we render a label with the working section icon as the initiator of the container that renders the task step cards. the interaction of the task steps in that page is exaclty the same as when a user enters into a working section task step list, which is, the user can use the quick action button for pause and start. the user can enter into the task detail page, the user can see the item image with the annotations and it can also tap on it to access the full page mode.

The reasigned page will have a search bar like the working section page list which will allow to search with in the intial query the page makes to obtain the reasigned task steps. the query param sent is "q" for the user input. and we use the primitive searchbar ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/search-bar ) with out filter button nor sorting.

This page and endpoints will be part of the packages at the package feature: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-working-sections

### The user change state interaction

When the user taps on the user current state button card we will display a page which will load through the bottom sheet surface. This is the pause reason selection page ( already build and used for task steps pause, when the user pauses a task step. At: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/pause-reasons/src/components/PauseReasonPicker.tsx ).

the handoff might display some ways of obtaining some types of pauses ( like personal ), for now this is out of scope, we are not filtering pauses by their type, we are presenting all the pauses for the pause picker ( this will later come in to play, way later ).

currently on the pause reason picker we have a condition to evaluate if a given pause is ended shift so that the state transition sent carries the ended shift argument also, so that the task step can transition as state ended_shift. this has changed! we now don't have a task step state ended_shift. thus we can remove that conditioin and update the task step states schema to reflect that. the endpoint no longer will accept that ended shift flag to make the transition as the state no longer exists in the backend.

### endpoints

all the endpoints that this implementation will use are documented at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_reassigned_steps_endpoints_20260731.md

### note

when getting the task steps reasigned the object shape will be the same as the returned shape from the endpoint "/{working_section_id}/steps". the flow should obtain the working section object for using the working section name and image from the query fetch "/working-sections/me", which is already called in the begining of entering the home page.

### goal

I will like you to create an implementation plan for another claude session, for implementing this new capability, use the template /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md for creating the plan, and use the contract guide /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md for aligning the implementation to the architectural principles.

---
