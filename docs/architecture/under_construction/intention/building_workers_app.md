at home page, workers will render:

- header ( under construction )
- body ( working sections )

on home page load we will fetch:

user working sections, with counts of the steps the working section has ( counts of states : all states states, terminal states will be only current day state counts ).

taping a working section slides the current home page ( the internal home page, not the entire home page, so the internal page being header, and body ), the working section page slides in ( this slide behaviour is coherent with the index, thus index defines where the page enters and exits ).

the working section page is compose also of a header and a body:

- header: back arrow to slide back to the previous page, besides is the working section image_url and the working section name. bellow that row is some counts of the none terminal states . bellow that row is the search bar ( we use the primitive searchbar ).

- body list of task step cards

the task step card will have same styling as the already build taskListCard . allowing for full page picture preview, three dot menu trigger, and card tap to open the task detail page ( task detail page is not yet build for workers app but it will render with in the already stablish surface slide page )
this task step card wil have one visual and interactive difference, which is bellow the card ( visually part of the overl all container ), we place a button ( full width ), this button will be an interactive button to start, pause or switch to start that task. three possible visual layouts for that button 1: ( play icon ) Start Task , 2: ( pause icon ) Pause Task , 3: ( Switch Task ) . the 1 and 2 use bg color primary ( it is dark color ), the 2 uses bg --color-soft-container ( light container ). so the end layout of that card looks like this :

| already stablish task card design |
| interactive button with ticking time |

inside the button at the right most is a ticking timmer hh:mm:ss .
this timer is display only when on working so when the button displays pause .
that time is initially taken from the last state record ( when paused ), so that even if the user reloads the page the timer is always accurate. i want to centralize that ticking timer ( it should be a primitive on packages ), as i will use it in other apps and components, this ticking timmer has to be efficient and optimize, it should not leak performance to the app ( global rerenders on each tick ).

the three dot menu will trigger the bottom sheet surface, presenting the action menu page for that task. for now we will have only the button to create a case. ( this action i not yet define, for now we just display the button the lable and the icon for cases )

the endpoints that this page will use are define at the document: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_transition_step_state_contract_20260528.md

so far we will build the page home page container ( which holds both pages the user working sections and the working sections steps ).

the task step cards. and the interactions for changing the state of a task step through the quick action button.

the updates of this actions should reflect optimistically.

keep in mind that later we will introduce realtime layer, thus users having this page open will receive updates on state changes for task steps, and all should update with out flickers.

i will like you to create implementation plan
