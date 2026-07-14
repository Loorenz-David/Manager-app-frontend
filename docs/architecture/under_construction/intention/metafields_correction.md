at the ShopidyMetafieldPickerForm we will make some drastic changes to how the component is currently working.

At the moment the user can use the ShopifyMetafieldSearch to search for metafields.

When there is metafields from the request they render on the body ShopifyMetafieldFields.

If the user has inputed something on the metafield, deleting the input text from the ShopifyMetafieldSearch doesn't remove the metafield when not belonging to the search.

If the user did not inputed something in the metafield it will be remove when the search from the ShopifyMetafieldSearch is backspacke and no longer matches the search.

This component currently can't decide by it's own how and when to call the create preference.

We will change a lot from this system design.

First, this component will now be capable of calling the creation of preferences. This will happen when the user interacts with the input of a metafield that is not saved as a preference. We will also add a floating button to the metafield fields which are not saved preferences, this button will be placed absolutely on the right side of the input field centered on that col ( py-2 px-1.5 bg-primary text-card text-sm rounded-full ), the button has a plus icon ( lucid icon ), with the lable of add on the right, when the user taps that button the request for saving the preference is sent, and optimistically that input field will not render the add button any more as it is already added, for this the frontend will now create the client_id when saving preferences ( we will have to update the client id generator to support the new index at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/lib/src/client-id.ts and use it for sending the client_id on the request, the new prefix is: shpmfp ), this way the frontend can perform optimistic updates.
saving a metafield as preference invalidates the first query the component does, which is the query made to obtain the preferences with out the "q" param and with the given item_category_id .

The input fields will no longer render the remove button on the top right of the field. Instead we will have this fields to support edit mode. When on edit mode at the same place where we now render the add button we display the remove button this button has a bg-destructive text-card and has the x lucid icon besides the label, tapping the button requests for removing the saved preference, we should update the list optimistically but also invalidate the query rendering the saved ones .
The input field on edit mode will also render a grid icon ( lucid icon ), which will allow the user to grab a field and change it's sequence_order, for this i have the dnd library which should be used for this behaviour of dragging and dropping with in an organized list. I have created the endpoint for changing allowing the frontend to change this value, the endpoint being :

PATCH /api/v1/integrations/shopify/metafield-preferences/{preference_client_id}
request:
{
"sequence_order": 3
}
preference_client_id: The client_id of the saved preference.
sequence_order: The new zero-based position. Must be 0 or greater.
Success response:
{
"ok": true,
"data": {
"client_id": "shpmfp_01J...",
"sequence_order": 3
},
"warnings": []
}
The backend automatically reorders other active preferences in the same Shopify shop and item-category group:
Moving down shifts affected preferences up by one.
Moving up shifts affected preferences down by one.
Other shops and categories are unaffected.
Possible errors:
401/403: Authentication or role not permitted.
404: Preference does not exist, is deleted, or belongs to another workspace.
422: sequence_order is missing, negative, or not an integer.

---

This dnd implementation at the frontend should be reliable and optimal, so as user friendly.

For the user to enter on edit mode we will now render a button besides the SearchBar in the ShopifyMetafieldSearch . This button will have a edit icon ( lucid icon ), when the user taps it the list turns into edit mode, to exit it the user must tap the button again ( which now renders a check mark and a different bg to simbolize done ).

the SearchBar only works with saved preferences when on edit mode, meaning it must provide the item_category_id when on edit mode.

REFERNCE FILES:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/metafields/ShopifyMetafieldPickerForm.tsx

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/metafields/ShopifyMetafieldSearch.tsx
