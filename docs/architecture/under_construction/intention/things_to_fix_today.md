----- 
✅
we will change the current default colors on the css and stablish the color i will be using across the app:



 #F4F4F4 I will use this color as the primary overall app color, this will be the base color.

 #FFFFFF I will use this color for contaniners and cards, so that group fields can pop from the app bg and text when the color #303030 is the bg

 #303030 I will use this color for primary buttons, selection boxes and text

 #D0D3D9 I will use this color for borders and placeholder text


#8E8E8E  I will use this color for icons


#6E7785 I will use this color as a sub text color ( mainly for input label text )



---

---

✅
primitive boxes have a default bg color of the variable with color #FFFFFF with border the variable with color #D0D3D9 .

icons will now have color the variable with color #8E8E8E

input fields use default bg as transparent, the border color and the placeholder text will be the variable with color #D0D3D9 the text will be of color the variable with color #303030

multisetp form renders the current step with color the variable with color #303030, the others with color the variable with color #6E7785 . the arrow icons have color the variable with color #8E8E8E . the filled line will have color the variable with color #303030, the unfilled part will have color the variable with color #D0D3D9

sub text on the test form will now have the variable with color #6E7785

---

✅
we need to build a phone input. this primitive input will be build as prefix selector and input primitive, visually they appear to be the same input separated by a line in between the selector and the input. the selector triggers a bottom sheet ( surface already stablish ), displaying the options for the prefixes, the card displays flag, name of country then prefix . the user can only select one, and on selection it closes. then on the phone input we need to make the phone input to format to the correct phone format after it is written, for instnace in sweden people write 0737262136 but when prefix is present they write +467372621236 . i belive there is a js library that can help us with this formating, so as a prefix library. the primitive input will be used with HRF forms each will build it's own field with this primitive. the value the input takes is a string phone number so it can be passed as +46737262136 and it should extract the prefix mark the selection in the selector, place the phone in the correct format at the input. passing the value up it formats the phone the same way it received it.

---

✅
we will create one more primitive, this will be a number input, which behaves like the primitive input with number, but it renders two buttons on the right side to allow incrementing or decreasing the quantity in the input, this buttons should be thumb friendly, and the primitive allows for configuration like incremental steps, min, max . label that renders besides the number so i can pass cm and that cm becomes not part of the value but visually it looks like. when taping on the input ( not the buttons ) the phone number keyboard should open, the user can write the number or delete and this modifies only the number not the label passed as the lable is not part of the value

---

✅
we will edit the current delivery date range page that is display on TaskDeliveryDateField ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskDeliveryDateField.tsx ).

it currently renders the "from" and "to" selectors in a style that is not align with the current application. can we move this "from" and "two" to use one more primitive that we will create. this primitive will be a box - slide picker, the idea is the the container loads with the passed options for example "from" and "to". the selectoin is display with the selection bg color, for the example the current selection is at "from", then the user taps "to", the box slides smoothly with aceleration and deaceleartion to the "to" side. the selection boxe lives at a container that wraps the presented values on a lighter border bg color ( we use the current ones define in index.css ). the box selection only allows for one selection and the options passed are undefined number.

---

✅
we are missing to add the HRF field component for task additional_details, this field is should use the TextArea primitive /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/textarea/TextArea.tsx .

---

✅
implement image feature

---

✅
the current app blocks zoom in ( greate ), but on the full page image preview we should allow for users to zoom in with the finger gesture of zoom in in ( two fingers ), and allow the gesture to examin the picture zoomed in ( this should not conflict with the current slide image carousel ), i thinkg modern image previews solve this by blocking the slide carousel when the image is zoomed in, the user must zoom out to let allow the slide carousel. zooming out and in have a max limits which bounces the user back to the clamp

---

✅
the current call to Request URL
http://192.168.1.246:8000/api/v1/images?entity_type=item&entity_client_id=testing-item-images
Request Method
GET
Status Code
brings the annotaions for the images:"link_client_id": "iml_01KS7B6Y8RH2JA0RAB6M2DTXVG",
"image": {
"client_id": "img_01KS7B6Y8K888FHNK1QCMQ4T83",
"image_url": "https://s3.eu-north-1.amazonaws.com/test-bootstrap-local/images/ws_workspace_test/item/testing-item-images/3c1295b5-bd2e-4546-aa5f-279348235091.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAUPMYNLNDRW5PUNWB%2F20260522%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20260522T110317Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=dda7357b0774d4e5983013f96f2f3e54fafaa3883eeac526508709242f87191c",
"storage_provider": "s3",
"source_type": "uploaded",
"source_reference": "s3_image_url",
"width_px": null,
"height_px": null,
"file_size_bytes": 40636,
"created_at": "2026-05-22T08:00:45.331129+00:00",
"last_event": {
"client_id": "iev_01KS7B6Y8P1X0P8DAZEAMYRKM7",
"event_type": "upload_item_image",
"state": "requested",
"created_at": "2026-05-22T08:00:45.334872+00:00",
"last_error": null
},
"events": [],
"image_annotation": {
"client_id": "ian_01KS7JQMVRQ92BRAAM7JB8GKR8",
"annotation_type": "draw",
"data": {
"tool": "draw",
"color": "#ff5a36",
"points": [
0.5702924679487179,
0.41991185897435895,
0.555
etc...
the image preview in the small preview contaniner should display the annotations.

the same goes for the full image preview page, the images being display should display their annotations .

---

✅
the image preview page which holds the metadata and the delete or download action will now have a button which let's the user to hide annotation. this hidde annotation works only on the current render page, meaning the preview continues to display the annotations, and if the user hiddes them then closes the full page preview they should show again, the hidde annotation is also private for each image in the image carousel.

---

✅
we will now edit the current image editor, the done button whould be placed down right. the close button should be placed down left. tapping the done button should also close the image editor, and the anotations made should be seen at the full page image preview optimistically. closing the image editor when there is edits with out save should trigger a confirmation page which will be display through the bottom sheet surface, this page will display the message letting know the user that there is changes that have not been saved, the then the user can tap close anyway, or save. tapping save triggers the same action as the done button, tapping the close anyway closes the image editor with out saving the changes.
The current tools box that the user can use to draw the in the image should be display thorugh the bottom sheet drawer, selecting a tool closes the bottom sheet. the field to trigger this tool box lives at the bottom centered ( between the close and done button ). it should render the current tool the user has selected with the name of the tool and a button with icon (go back ), when the go back gets tapped it removes the latest trace the user did.

---

✅
currently the user can make shapes, draw it's own, make a text, but once done it cannot move that shape, nor remove it. on shapes we should add the ability of taping in the annotation displays the bottom sheet surface with the option of deleting that annotiation. on text the bottom sheet gives more options appart from removing the text, the user can tap edit text ( this closes the bottom sheet and allows the text to be edited ), or user can tap change position ( closing the bottom sheet and displaying a dasshed box, the user then can drag the text and move it from position ), for the action move text the user must tap the done button ( which now renders in green bg, on tap it will not close the image editor but it will trigger the call to save the changes to the backend, then the move text action gets disable, the user is back to where it left it ), removing a shape or text makes the call to the backend directly.

---

✅
implement working section selection:

this selector allows to select a working section and a worker with in that working section. we use the primitive box selection, the style of the boxes is full row expansion column arrangement.

tapping on a working section box selects it and opens the bottom sheet surface displaying the workers available in that section, the user can select a worker from that list, selecting closes the bottom sheet, now the working section box is selected and renders the name of the worker selected

the user can select multiple working sections.

there will be a default behaviour, when the working section only has a single worker it auto selects the worker for that working section, skipping the bottom sheet surface.

this working sections and users belonging to a working section will be fetch and stored in a store, but for now we can implement a list of objects for testing the behaviour.

the working sections object for selection :
{ client_id, name, image ( url image ), memebers:[
{client_id, username, profile_picture ( url string ) }
]}

the working section box should render the image ( will be icon url ) on the left side, then on the right is the name of the working section, bellow that name is a compact pill of the memebers selected, small avatar picture on the left, name on the right.

tapping the box opens the worker selection.

the working section box has an "x" to deselect the working section ( like the issue boxes do ).

the field will return and object with { "working_section_id": "wse_01...",
"assigned_worker_id": "usr_01..."
}
when injecting selections it will accept the same object

---

✅
we will make a field for the item identity ( article number and sku ), this field will use the primitive box slide, like the calendar range uses it ( apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskDeliveryDateField.tsx ). the boxes will be article number and sku. the field should have a memory record on the local storage to keep track of the last selection so that on page load it renders open on the last selection.

selecting article number ( default selection ) renders the input primitive, the user can input the article number in that field, the user can tap sku and that should slide the current input field displaying now the input primitive to fill up the item sku ( the user can fill up both or just one ). injecting values to this fields goes thorugh keys articleNumber and itemSku. the slide box should be fairly small ( not as big as the date range calendar renders ), same total dimension as the current label for Article number. when the field is build we will replace the current article number and sku field for this field ( we no longer need those separate fields ). the primitive input for both the article number and sku will have an interactive button at the right side ( visually inside the input container ), this interactive button will have a scanner icon, when press it will log opening scanner ...

the sliding of between article number and sku inputs should be indexed so that order determines from which direction the input slides in and out

---

✅
build stores need it for fields to featch the values they can present as options. this will make a field completely independent and usable by any form.

this fields will have their own flows, with their own api actions. this makes the field a complete independent component, which manages it's own fetching, caching, and render value ( as values will be injected through clien_id, it will have to make an independent call to get the selected value if not in store to display the correct information ).

this independent fields are:

- Item category
- Item issues
- working sections
- Item upholstery

we will start with the Item upholstery field.
beacuse this field will be used also on edit the form can inject an upholstery id which should bring the object to fill up the trigger layout, upholstery name, code, image.

opening the upholstery field currently loads upholstery selection page, which has a searchbar and a list of upholsteries. the list of upholsteries should be obtain from a flow specialize to get the ones on the upholstery selection store ( we will create this store for this field ) if none then it will generate call the endpoint to fetch them.

the searchbar will use the same fetch the flow uses on initial load if missing on store. the user can input text on the searchbar, this is send as param "q" the inputed text as the value. the return objects render in the list of upholsteries.

and empty input in the searchbar defaults to the initial flow load.

for working sections.
it follows the same pattern. it has a flow specialized in getting the working sections from a working section selection store, if empty then it fetches. the form injection will be a bit different in here as we will pass a list of objects with
{ working_section_id: ..., assigned_worker_id: ... } ( same object as it spills ), but it will not make a call to fetch those sections as the initial flow should already have loaded the working sections to match the selection.

for Item category.
it follows the same patter. it has a flow specialized in getting the item categories from a item categories selection store, if empty then it fetches. the store should have a map for the item_major_category, so that the look up is fast. the form injection will be a bit different in here also and here we will pass the the value item_category_id, same key value we extract from the field. on injection it should select the major category and fill the field where the item category renders.

for the Item issues.
it follows the same patter. it has a flow specialized in getting the item issues from a item issues selection store, if empty then it fetches. beacuse issues are different based on the item category, this field should not allow for selecting item issues if item category has not been set, when changing the item category, the issues can map to the item issues for that category ( because they can share same naming, differ in time it takes to fix ).

---

✅
we are missing to add the upholstery quanity ( meters required ), this will be inputed as a number, the primitive input renders a label besides the value "meters" bellow the input we will render two pills one with label x 0.25 the other with label x 0.5 ( the interaction of this buttons will edit the current inputed value, not yet decided how )

---

✅
we will create two more fields, this fields will be a short cut of the selection two working sections ( this is because the company needs it this way ).
one field will be the needs cleaning, when taping that box it will trigger the bottom sheet for letting the user select a user for cleaning ( this is looking at the working section selection store like the working section is doing, but it is looking at the cleaning working sections with the name of the working sectioin, we will need a partial match search as there might be other cleaning working sections, and the user can select any of the users in those cleaning working sections, if only one worker then it auto selects the worker with out having to trigger the bottom sheet, same behavior as the working section field but the search is different, perhaps this map can be build at the loading data to the store as it will be a common selection ). visually this card renders a cleaning icon, the title, bellow the title the user card selection ( like the working section selection ).

the other field is oiling treatment, this field will triger the bottom sheet to display the workers on the sections hardwax oil and ground oil, same as the field above we find them by name with partial match ( we can map them at the injection of data on the store ), if only one worker then it auto selectes it without triggering the bottom sheet. visually this field renders an oil icon, title on the right of the icon, user avatar selection bellow.

both of this selctions will return the same object shape as the working section field does, on injection the component checks for match on working section

create a plan for codex

---

✅
we will now begin the construction of the real forms that we will be using.

there is three types of forms.

a form will be define by the task column task_type: 'return', 'pre_order', 'internal'

for the task_type return form:

three staged form steps: item, customer, task

at the item staged form:

- item identity field
- item quantity field ( defaults to 1 )
- item position field
- item category field
- item issues field
- image preview container with the whole pack ( take picture, image preview )
- if item major category is seat then item upholstery field
- if item major category is seat then item upholstery amoun meters field
- designer field

at the customer staged form:

- customer name field
- customer email field
- customer phone number field
- customer address fields

task staged form:

- return soruce field
- fulfillment method field
- scheduled from / to field ( if delivery the lable reads delivery window, if pickup_at_store it displays pick up window )
- due date
- additional details field

for the task_type pre_order form:

three staged form steps: item, customer, task

for the stages and fields with in the stages: same as the return form staged steps ( we still make an independent page for future improvemnt )

for the task_type internal form:

three staged form steps: item, work assignemnt, task

at the item staged form:

- item identity field
- item category field
- item quantity field ( defaults to 1, and is shown if major cateogry is seat )
- item position field ( if major category is seat)
- item issues ( if major category is wood )
- needs cleaning field ( if major category is wood )
- oil treatment field ( if major category is wood)

- upholstery field (if item major category is seat )
- upholstery amoun meters field ( if item major category is seat )

- designer field

at the assignemnt staged form:

- working section field ( passing the item major category selected from the item staged step )

at the task staged form:

- image preview container with the whole pack ( take picture, image preview ), this images are still for the item.
- due date
- additional details field

the current test form i have holds the fields mentioned above, and how they are wired as an example for this three page forms. ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx )

this forms will render in the slide page surface ( like the current test form ) the header will render the task_type selected. on the staged forms we don't need descriptive paragraphs nor title like the current test form is doing ( the staged form container already let's the user know where it is ).

the access to this forms will happen through a button which will be placed absolutely on the task main page (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TasksPage.tsx). this button will be placed at the bottom right corner ( above the nav menu ). the button is rounded ( thumb size ) with bg (--color-primary), it will have a a plus icon, when this button is tap the plus icon flips to turn into an x , the size of this button decreases by 30%, the animation of this should be smooth with acceleration and deceleration. while the button is scaling down three more rounded buttons will slide out in prefect sync with the same animation speed and curve. this buttons end position is surrounding the current button which is now smaller, they surrond it as if being around a quarter of a circle, this buttons have the same size as the "+" button when the button is normal and not scaled down but when this three buttons are coming out they are 30% scaled down, this three buttons have an icon that makes them differentiate the three types of forms ( return, pre order, internal ). pressing one of this buttons opens the slide page with the correct form ( described above ). pressing the "x" button reverse this whole animation to it's initial state.

I will like you to make a plan for codex using the @docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md . access to the architectural contracts through @task_system/frontend_contract_goal_mapping_guide.md . i will like you to decide the best placement for this page forms and the provider which we will expand later for handling the form state later ( we will define the submit controllers and form normalizers for sending the forms later ). the image container on all three forms will target item entity, on the beginning of the form we should generate a client id using the lib utitlity for this, we will generate a client_id for task, item, customer ( this client ids must be stable as rerenders should not change them, but in the future i will implement fetchers that fetch item and customer from other apps or this app by placing the article number or sku, thus this client_ids can change to the incoming ones on command )

---

✅
we will now build the task page.
this page will allow users to filter task, search for task, display the task found.

at the top there will be a field holding the task_type enums options, we use the primitive slide box in sm style ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-slide-picker ), labels in plural: Returns, Pre-Orders, Internals
This will be used as a query param for the call to tasks

bellow that slide box is the searchbar, (you can create a filter page for the trigger of filters on the search bar ), we use the searchbar primitive ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/search-bar )

bellow that search bar we have a pill row, we will place quick access filters in there ( we will add the task states, later i will place other one tap filters ), we use the box selection primitive (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker) .

bellow that we will have the list of tasks, the task cards will be build later, for now you can place a decoy card, and fill up the list so that i can test the scrolling.

scrolling down and up will have the same effect as the staged form container (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form ) . which is it compacts the header to allow more visual on the card list when scrolling, but slightly different, the compact version should end up with only the search bar, the slide box and the quick filters slide up smoothly like the staged form does. we have the same blur fade style on the compact header so that task dissapear slightly smoothly.

the search bar should have bg --color-card. the boxes are small and should be rectangles with rounded edges, user can tap multiple ones, tapping it again deselects the box.

for the actual search logic, of search the searchbar will inject the param "q" into the query params, the filters are added to the params ( lists of multiple values for the same key are coma separated ). we need this to be a well build system this will be a flow, the store we will create should accept life filtering as optimistic updates and the real time layer will update the tasks values, the render list should be responsive.

we will have pagination and limit the amount received to 25 tasks, above that we render a more at the end ( if more ), whe the user taps more it renders the next page below, when no more the pill button should let the user know that is the end of that query.

the task card is yet to be styled but it will for sure hold the image first image of the item , a three dot button on the top right ( dots in y axis ), the interactions of the task card will be, taping the image opens the image with the full image page, we need to make a call when this happens to load the images of that item so that it the user can see the annotations and the other images. taping the three dot button opens a bottom sheet surface ( we will add actions here later ). taping the card opens the task details page on the slide page surface ( we will build this page later, for now it can display "comming soon" ). that page will make a seprate call to get the task fully serialized.

the first image of an item will be fully serialized, when opening the full preview image page, and if the user scrolls to the next picture we should load get image for serializing that image fully ( so that it can render the annotations ), we might need to tweak this on the full page image preview so that that capability can be turn off or turn on ( default is off ).

as you will see on the handoff document the shape return separates by entity, thus the frontend will store this in the correct stores, the flow stiches the necessary task info to be render in the card from the different stores, this is beacuse realtime will target stores on updates. we will have a task, item, item images store, with maps to access in O1 to the instances the task needs ( i might build more maps in the future ).

check the document at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_tasks_list_query_and_response_shape_20260523.md for understanding the endpoints, params, payloads, and responses.

build a plan for codex using the @ . access the architectural contracts through @

features already build are /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/items, /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks

---

we will now build the task detail page.
this page on entering will call the get task page to load the full shape of a task, or to refresh ( tan stack handles refreshements, realtime layer keeps instances up to date with out full refreshemnts ).

this page will render with in the slide page surface.
at the top it will have the title ( item article number, if missing the sku ), besides this identity title is the task state ( state pill ), then all the way to the right is a three dot menu button ( vertical align ). bellow that row is the task_type as subheader . bellow that is another subheader rendering the ready_by_at task ( calendar icon besides that date ), on the right of that ready_by_at we will place a pill that tells the user how many days are left relative to the current user date, above 99 days it doesn't render it. the component will have an interactive animation ( starts pulsating with color changing ), if the days are bellow 3.

bellow that header is the body of the page, the body of the page will be wrap with in the component ( FormFieldContainer ) .

the body renders:

same row: item category, at the right item position ( if position )

bellow that we will render some containers which might be missing based on conditions, this containers are all together ( no y gap )

this container has a bg color of --color-border 30% opacity, it has a dashed border with the same color and has rounded corners.

we will place the costumer info in one of this containers ( top first ), this container might be missing if the task type is internal. we render only the costumer name, phone, email, fullfillment method ( icons on the left side for all ) icons color of --color-border, values with color --color-primary.

bellow that container another container ( same styled container ). this will render the item issues. each issue in a pill, at the end of this list of issue pills a button that allows to add new issue. holding the issue pill triggers the delete mode for issues, which render a x icon on the top right, the issues should shake like the image preview container does on order / delete mode. same interaction as that component, the user can tap anywhere ouside the issue container to turn off the remove issue mode.

bellow that container is another container ( same style container ), it renders the scheduled delivery ( in week, so we will need a parser that takes the date range amd gives the week the range is in, if above a single week then week range ). this week number renders in a pill ( same pill style as the issues ) with label # week ( range week = # week - # week). besides that week pill is the item quantity in the same pill as the item issues with label # quantity . tapping the week pill opens the field for changing the schedulet from / to date, taping the quantity open the bottom sheet with quantity field to be changed.

bellow that container is the image preview container, this image preview container is the same as the one used in the forms.

bellow that container is the item upholstery preview, this renders the upholstery field. tapping that allows to change the upholstery. the field will now accept to pass a state ( the item upholstery requirement state ), this state renders besides the name of the upholstery in a pill ( we will should stablish the colors for each state ). not passing this state it doesn't render the pill at all.

bellow that is the upholstery amount in meters in a pill, tapping that pill open the bottom sheet surface with the field for changing the upholstery amount.

bellow that is the task flow history timeline. i want a modern styled timeline ( vertically organized ), single line on the left, each event a dot on top of the line, the dot will have different colors based on the record ( i will define the color rules later ), the dot will have a fade radius around it. besides the dot is the title of the event ( i will highlight test base on rules later ). bellow that is the time it happen, if same date as current user then only time hh:mm, if different date then short date formated with time ( js provides a way to render the date with style = Thu 12 ). tapping record opens the bottom sheet surface we will render details of that record in the bottom sheet. the record timeline loads the last three records, if the user wants to see more it can tap a more button to load the records. we load per 10 records. this should make the page higher as it expands so the user can scroll the page down to see more records. the container holding the item flow becomes sticky header when it reaches the top of the page.

at the bottom of the page ( fixed or absolutely ) is the quich actions, it will render two buttons, left button reads edit , on the right button is the close button, this closed the current slide page.
the edit button will open the task creation form ( base on the task_type ), but in edit mode, meaning the form should be fully filled with the task, and item values. the difference in this edit move is that at the bottom in the action footer define by the staged form, in the center we will have the button save chagnes, instead of the next back buttons.

the three dot menu at the header will trigger a bottom sheet surface, we will place actions in here. for now we will place the delete task button. this delete button will be a primitive. deleting the task closes the current task detail page.

the delete button is more of a confirmation button primitive. when tap it changes text to confirm _ the action, it has a timmer to change back to the tap to confirm _ action . while the timer runs the button gets filled with a color from right to left smoothly, this changes the color of the text as the fill color passed behind the text. we will use this confirm primitve button for mutliple porpouses, so the first label, the confirm label, the colors need to be customizable by the parent.

for looking at the target endpoints, the payloads, params and return shapes you can check the document: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_tasks_items_upholstery_images_contracts_20260523.md

the pills that / fields that have direct interaction with an edit field, like: scheduled date ( from / to ), item quantity will use the correct update enpoints sending only those values which have been edited ( we have edit item, and edit task endpoints ). this bottom sheets holding the fields for direct update will render a bottom action row with two buttons, save and cancel. closing the bottom sheet reverts the modified value. saving and cancel closes the bottom sheet. cancel also reverts the modified values.

at the edit page for the task the user can technically edit any aspect of the task and item, but the save calls should target the correct endpoints, as saving task takes different values and updates only the task, updating an item only updates the item, but visually the save button is one ( this is resolved internally when sending the saved modifications ). when closing the edit page and having done changes with out saving the will be a bottom sheet that appears givin the user the warning of unsaved changes, the user can close with out saving , or close with saving.

at the three dot menu page actions we will have one more action which is the posibility of changing the state of a task to resolved.

I want you to create a plan using the template: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md.
I want and extremely clean implementation, with strong SRP and strong separation of responsibility. access to the architectural contracts through /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md .
