✅
image preview container

---

creating a case so far will only be possible through a task.

creating a case through a task has two modes:

1: case can be created when the user pauses a task and the reason for pausing is not personal

2: case ca be created through the task detail page

cases for a task should be able to be accessed through the task detail page.

this page will make a query call to list cases with the entity_type = task and the entity_client_id = task client_id.
Thus receiving the cases only for that task

this task case page uses the same ui as the main case page.

creationg of a case page:

we will now create the page and the logic behind creating a case. this will be part of the cases package at ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/cases/src )

this page will render a header with
a back arrow for closing the page and besides it a label "Needs help {title, this title will be passed by the parent using the page as i will use this page on task details, and task details needs to pass the task.item.article_number or sku } "

then we have a field that renders the case type selection, it renders the image_url and the type name.
at first as no selection has been made it renders a select case type. when the user taps the field it opens the bottom sheet surface ( surface already stablished, look at how the current case uses surface as the app where this will be used holds the controller and registration ). in that bottom sheet surface we render the page that renders the case types in box selections
( we use the box selection primitive /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-picker),
a user can only select one case type, selection closes the bottom sheet and now the field displays that selection.
this field is a stand alone field, meaning it handles it's own fetch flow. for getting the case_types we use the endpoint :

response:

when this field is mounted it should load the case_type page ( thus the fetch ). we hot reload the lazy load. there is a contract in architectural contracts that outlines how to do this in the current architecture.

i will use that flow for loading the cases types independently on other components in the futrue

bellow the field for selecting a case type is the description input, beacuse this "description" the user adds in this page will be as the creation of the first chat message on the case conversation i want to use the composer architecture that the case conversation page uses, as the user should be able to edit the text with the styling stablish on the composer. so visually it is a input that has the hight of two paragraphs and is just that no image button, no send button. when the user taps that area the mobile keyboard this input should be placed on top of the mobile keyboard ( like the composer does ), and the tools for editing text appear on top ( like the composer does ).  
current case conversation composer: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/cases/src/components/composer

this input case description has to be mobile friendly, extremaly reliable and smooth. when the user enters into that composer description on the right bottom side we should render a checkmark button ( like the send button ), this is because the user can tap "enter" on the keyboard, thus that checkmark is the way out of typing more text in the description composer.

bellow that description composer we render the ablity to add images we wil use the already stablish image component that allows to trigger the camera and preview the taken pictures. example at ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx with the EntityImagesProvider / ImagePreviewGrid )

bellow that image field we will have the field for displaying the selected participants of the case, this field is renders a social icon on the left, besides it is the lable " participans ( # )" where "#" is the number of participats selected. bellow that title is the simplify users card (we will have to make it a shared primitive ui ), it renders a max of two three participants if more than three it reders a pill with plus icon and the number of extra participants . Taping that field opens a bottom sheet, the page for selecting the participants reders a search bar ( primitive ), bellow the users cards ( we will have to build a primitive card for that also ), the user can selected multiple participants, when the user closes the bottom sheet the selected users are shown in the field. this field will also handle it's own fetch cycle using the query for searching users. when no input in search bar, bellow the searchbar we render a button for "select all" and "deselect all" ( if more than one is selected ). selecting all should mark all the users in as selected ( even when quering the results are display as selected ), deselecting a user when select all will store that deselection individually. this is because when calling for creation, if manual selection it sends the participants list selection, when select all, it will not place participants on the list but send the key selected_all:true , if deselecting a user comming from select all will stil send the selected_all:true and a list for skip_participants with that key name. tapping deselect all removes the selected participants and if select all was tapped it should revert the effects as now selected_all and skip_participants is not send, we send only the manual selection list.

i should be able to pass a parameter to the field compoennt to auto select users with a role on render, as the component will hot load the page and the fetch call. this happens only the first time it renders.

then at the bottom of the page, is the footer, which renders absolutely, inside the footer is the button for create case ( bg --color-primary and text --color-card ), when tap it creates the case ( sends request ), and closes the current create case page. we invalidate query for get list cases ( as it should refresh ).

when the implementation of the page is build it will be moundet on /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx . the header /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailHeader.tsx . will render a button with case icon ( message rouded ). when tap it will open this create case page on slide page surface.
