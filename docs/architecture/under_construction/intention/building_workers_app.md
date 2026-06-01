we will now make the page that will be display every time a worker makes a state transition to paused.

this page will be display through the bottom sheet surface. and it will be a pre selection before sending the request to paused.

the page will render the a box selection in 2 columns displaying boxes for selection, we use the box picket primitive for this ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-picker ) .

the options display should be enumarated and this are:
WAITING_FOR_UPHOLSTERY = "waiting_for_upholstery"
PAUSE_LUNCH_BREAK = "pause_lunch_break"
PAUSE_COFFEE_BREAK = "pause_coffee_break"
PAUSE_ENDED_SHIFT = "pause_ended_shift"
PAUSE_MEETING = "pause_meeting"
PAUSE_OTHER_TASK_PRIORITY = "pause_other_task_priority"

we should map them to short display labels :

wating upholstery
lunch break
coffe break
ended shift
meeting
other task

the selection of any of :
WAITING_FOR_UPHOLSTERY = "waiting_for_upholstery"
PAUSE_LUNCH_BREAK = "pause_lunch_break"
PAUSE_COFFEE_BREAK = "pause_coffee_break"
PAUSE_MEETING = "pause_meeting"

sends the state to be transition as paused with the reason of the according selection box enum.

the selection of PAUSE_ENDED_SHIFT = "pause_ended_shift" sends the state transition of ended_shift not the state paused with reason of te enum PAUSE_ENDED_SHIFT = "pause_ended_shift".

the selection of PAUSE_OTHER_TASK_PRIORITY = "pause_other_task_priority" slides the current selection boxes to display a text area ( after the slide animation is finished it can auto focus ), at the bottom that container page is the pause task button ( bg --color-primary , text --color-card ). tapping that button sends the transition to state paused with the description written from the text area as description and reason of PAUSE_OTHER_TASK_PRIORITY = "pause_other_task_priority"

sending the state transiton closes the bottom sheet surface ( optimistic behavior for state transition )

the boxes will have an image ( as icon ), which i will provide later.

this transition to paused can be trigger from:

task step card:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepCard.tsx

task detail page:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx

user_last_active_step_record component:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/LastActiveStepCard.tsx

the slide page will use an index approach meaning that the slide animation enter an exit is base on the order the container organizes the sub pages. we have already achive this previously at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx

I will like you to create an implementation plan using the template @
this plan will be implemented by copilot.
use the architectural contracts to follow the best principles, you can access to them through the guide @

---

we will implement the filtration for the searchbar at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx .

this searchbar renders a button for filters. when tap it should open the bottom sheet surface with the filters page for that page.

this filters will be the task step states, we will use the box icker primitive ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-picker ). the states for filtration are: pending, working, paused, ended_shift, completed . we use the already stablish enums.

as default on page load the query will always send the state filters for: pending, working, paused, ended_shift.

when selecting completed it should deselect all the other filters (pending, working, paused, ended_shift), when selecting any other filter ( pending, working, paused, ended_shift ), if completed is selected it should deselected.

this page will be render on the bottom sheet surface.

---
