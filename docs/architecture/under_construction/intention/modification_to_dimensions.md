at the ShopifyMetafieldInputResolver:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx

We will add the new input type for shopify metafield type of dimension:
"type": {
"name": "dimension",
"category": "MEASUREMENT"
},

The field will use the number input primitive:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/number-input

with incremental steps of 50 . the label of this field should render on the side "( cm )".
And when sending the metafield to the form on submit the dimensions metafield should send the value as : {...,key:{"value":120,"unit":"CENTIMETERS"}} . so the input value gets parsed to the value and the unit will always default to "CENTIMETERS"

When sending the metafields for creation on the ShopifyProductSyncForm ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx ).
We will now include the shopify metafield type on the metafields that are getting sent. I belive this is responsability for the ShopifyMetafieldForm ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/metafields/ShopifyMetafieldPickerForm.tsx ). so now each metafield added on the form must container the type of the metafield example:
{
"metafields": {
"widthcm": {
"type": "dimension",
"value": {
"value": 120,
"unit": "CENTIMETERS"
}
},
"material": {
"type": "single_line_text_field",
"value": "Oak"
}
}
} .

## Linked implementation plans

| Implementation plan | Status | Summary |
| --- | --- | --- |
| `docs/architecture/archives/implementation/PLAN_shopify_dimension_metafield_20260714.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_shopify_dimension_metafield_20260714.md` |

## Progress notes

- `2026-07-14`: Added the `dimension` NumberInput path with 50 cm steps and `(cm)` label suffix.
- `2026-07-14`: Product-sync metafields now submit as `{ type, value }`; dimension values serialize as centimeter measurement objects and invalid drafts are excluded.
- `2026-07-14`: Typecheck and the complete Shopify Vitest suite passed. Authenticated runtime/Playwright verification remains unrun.
