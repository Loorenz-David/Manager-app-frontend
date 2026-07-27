The current SearchableSelectInput (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/input/SearchableSelectInput.tsx) is working perfectly with the phone option list capability, We will be adding one more input following that option list mode, for this input which is a multi tag selector, It will work like todays modern tag inputs, which allow the user to write a value on the input, the current list of options narrows the user taps the value from the list which adds that value as a tag ( tag pill style ) on the input, moving visually the current input cursor after the recent added tag. The user can backspace which can delete the tag is backspacing if the backspace reached to the tag or it can tap the x icon besides the tag to remove it.

At the ShopifyMetafieldInputResolver:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx

we will add that component for all the metafields with "list.\*" in their type .
