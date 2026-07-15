We will now create a new shopify field that will be used at the ShopifyProductSyncForm
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx

This field will be self sustainable like the ShopifyProductSyncShopField, meaning it will handle it's own query flow and have it's own local storage of previously selected values.

This field will be use in order to select the item inventory value per shop.

This field will make the query call to the endpoint GET /api/v1/integrations/shopify/locations ( documented at HANDOFF_TO_FRONTEND_shopify_inventory_product_sync_20260715 ), given a list of shop ids passed to the component ( when wire on the ShopifyProductSyncForm the form should pass the selected shop ids ).

This component will use the box picker picker primitive ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-picker ) for presenting the options of inventory locations to the user, the user can then tap multiple locations, for now we will default the tap to be marking quantity as quantity 1 for that location ( we don't need to display the quantity as this is a hardcoded rule , a inventory shop selection = 1 , sending the quantity_to_add=1 for the selected inventory locations ).
This component will have local storage tracker which autoselects the stored user selection per shop.

At the ShopidyProductSyncForm we will place this component, one component per each shop selected on the form, the shop name or domain should be display bellow the label "Inventory". if only one shop then there is no need of rendering the name or the domain bellow that label.

The form should send this iventory location objects in the same submit form as stated in the handoff. and the form keep capability should be able to memorize this selection.

We will pace this field or fields at the staged step <StagedFormStep id="target" className="px-0">

HANDOFF_TO_FRONTEND_shopify_inventory_product_sync_20260715:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_inventory_product_sync_20260715.md

---

at the upholstery inventory page ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/components/InventoryListView.tsx ). i have two containers one rendering the upholstery categories and the other the upholstery inventory cards.
I have a header InventoryListHeader with the SearchBar component SearchBar . I will like to add to that header the quick filter row bellow the searchbar which will allow the user to look at the inventories that are in stock, out of stock and that are favorites. like the upholstery selection page does ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx ) .
We will render that row with the same styling and it will also respond to the scrolling using the scroll visiblity with relative mode responding to the live scroll like the task view page does with it's header ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/components/TasksView.tsx ) . this quick selection filters will be sent on the api call or
