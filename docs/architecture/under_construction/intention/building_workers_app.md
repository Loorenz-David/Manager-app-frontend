we will now implement a query functionality on the item identity field @apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemIdentityField.tsx .

when the input value changes on that input we will trigger a query to the backend to get some of the item details or customer details that could be prefill on the form this field is mounted on.
This endpoint that we will use, calls the current app backend and also other external sources to obtain the item info.
The objective is when an item or items are found through that endpoint, depending on the creation form that the user is at, it will chose the appropiate object to fill-up part of the form.
this endpoint is documented at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_lookup_by_article_number_20260603.md .

the parent form will make the choice for which item object to chose. thus the identity field will continue to return the inputed value in it's input plus it can return a list of objects ( found item objects from the query it made ).

the query will fire different based on which field the user is at ( article_number or sku ).
on article number it will start to fire only when the charaters in it's input.strip(") are > 7 characters long . on sku it will start to fire after > 3 charaters long.

at the task creation form for internals ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/pages/task-creation/InternalTaskSlidePage.tsx ). when an item is found in the list of objects returned by the ItemIdentityField and there is an object with of external_source = 'purchase_api', it will chose that one as the object to prefill the internal form, it will only fill up the item form part:

- item_category_id ( the picker should make the selection base on the injected value at the form )
- quantity

and if url images it will create the image instance ( on progress ).

The preorder form will use the same flow for selecting and filling up its' form as the internal form from the incoming item object of the ItemIdentityField.

The return form will use the object with external_form=null . later i will change this for other external_form values, but for now it will use the item with external_form= null as that represents an internal db item.

at the moment we are lookin for obtaining only one object, and using that selection for filling up the form.

if more than one object has the same article number and same external_source then it will pass the top ( lowest index ).

in the near future i will make a selection overlay where the options can be presented, for now we can be certain that the objects return on the list have unique external source but same article number.

Internal form:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx

Preorder form:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx

Return form:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx

at the moment the image api only has the behaviour of requesting an upload url, uploading and then creating the instance in the db of that upload. I have created an endpoint for creating an image instance in the db without having to upload the image ( accepts batch). this endpoint will be used for the objects coming from this api call ( ItemIdentityField ), so that when the item arrives and the selected object fills up the form it can also create db images with the incoming urls of that object. we should be able to continue to use the image preview, the full image preview and the edit image page with this images as the db instance was created in the same way as uploading an image.

this new create image endpoint is documented at: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_external_image_link_contract_20260605.md

if the selected object is from the db then it won't have the need for creating the images as the images returned are already serialized image db objects. And can be used directly by the image feature components.
the shape of that incoming list of images is:
{
"client_id": "img_123",
"image_url": "https://example.com/image.webp",
"storage_provider": "s3",
"source_type": "uploaded",
"source_reference": "s3_image_url",
"width_px": 1600,
"height_px": 900,
"file_size_bytes": 204800,
"created_at": "2026-06-05T10:00:00+00:00",
"last_event": {
"client_id": "iev_123",
"event_type": "upload_item_image",
"state": "completed",
"created_at": "2026-06-05T10:00:01+00:00",
"last_error": null
},
"events": [],
"image_annotation": null
}
If include_annotations=True, it may also include:
"image_annotations": [
{
"client_id": "ian_123",
"annotation_type": "rectangle",
"data": {"x": 10, "y": 20, "w": 30, "h": 40},
"accuracy": 95,
"created_at": "2026-06-05T10:01:00+00:00"
}
]

I will like you to create an implementation plan
