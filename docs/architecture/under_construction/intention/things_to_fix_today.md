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

implement image feature

---

implement working section selection:

this selector allows to select a working section and a worker with in that working section. we use the primitive box selection, the style of the boxes is full row expansion column arrangement.

tapping on a working section box selects it and opens the bottom sheet surface displaying the workers available in that section, the user can select a worker from that list, selecting closes the bottom sheet, now the working section box is selected and renders the name of the worker selected

the user can select multiple working sections.

there will be a default behaviour, when the working section only has a single worker it auto selects the worker for that working section, skipping the bottom sheet surface.

this working sections and users belonging to a working section will be fetch and stored in a store, but for now we can implement a list of objects for testing the behaviour.

the working sections object for selection :
{ client_id, name, image, dependencies:[{client_id, name}], item_categories:[{client_id, name}], supported_issue_types:[{client_id, name}], memebers:[
{client_id, username, user_id, assigned_at, working_section_id, profile_picture ( url string ) }
]}

the working section box should render the image ( will be icon url ) on the left side, then on the right is the name of the working section, bellow that name is a compact pill of the memebers selected, small avatar picture on the left, name on the right.

tapping the box opens the worker selection.

the working section box has an "x" to deselect the working section ( like the issue boxes do ).

the field will return and object with { "working_section_id": "wse_01...",
"assigned_worker_id": "usr_01..."
}
when injecting selections it will accept the same object

---

make item identity field to be a select box where the user can choose to place article number and sku. this will use the slide select box, it defaults to article number, the input shown bellow records the input to article number, the user can change to sku which slides the input to the right, the sku input slides in from the right, that input records the input value to the sku. if the user taps article number the sku input slides right, the article number input slides from the left. this component should have memory ( local storage ), of the selection. edit forms will inject the incoming sku and article number. this two inputs will share a primitive input which has the primitive input and on the right a interactive button ( this will later trigger a scanner allowing the user to scan barcodes or qr codes ), for now it is just a scanner icon, when tap it logs "scann will open"

---

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

this are the fields i must research and develop:

Item category:

Item issues:

Working sections:

item Upholstery :

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

the image preview page which holds the metadata and the delete or download action will now have a button which let's the user to hide annotation. this hidde annotation works only on the current render page, meaning the preview continues to display the annotations, and if the user hiddes them then closes the full page preview they should show again, the hidde annotation is also private for each image in the image carousel.

---

✅
we will now edit the current image editor, the done button whould be placed down right. the close button should be placed down left. tapping the done button should also close the image editor, and the anotations made should be seen at the full page image preview optimistically. closing the image editor when there is edits with out save should trigger a confirmation page which will be display through the bottom sheet surface, this page will display the message letting know the user that there is changes that have not been saved, the then the user can tap close anyway, or save. tapping save triggers the same action as the done button, tapping the close anyway closes the image editor with out saving the changes.
The current tools box that the user can use to draw the in the image should be display thorugh the bottom sheet drawer, selecting a tool closes the bottom sheet. the field to trigger this tool box lives at the bottom centered ( between the close and done button ). it should render the current tool the user has selected with the name of the tool and a button with icon (go back ), when the go back gets tapped it removes the latest trace the user did.

---

✅
currently the user can make shapes, draw it's own, make a text, but once done it cannot move that shape, nor remove it. on shapes we should add the ability of taping in the annotation displays the bottom sheet surface with the option of deleting that annotiation. on text the bottom sheet gives more options appart from removing the text, the user can tap edit text ( this closes the bottom sheet and allows the text to be edited ), or user can tap change position ( closing the bottom sheet and displaying a dasshed box, the user then can drag the text and move it from position ), for the action move text the user must tap the done button ( which now renders in green bg, on tap it will not close the image editor but it will trigger the call to save the changes to the backend, then the move text action gets disable, the user is back to where it left it ), removing a shape or text makes the call to the backend directly.

---
