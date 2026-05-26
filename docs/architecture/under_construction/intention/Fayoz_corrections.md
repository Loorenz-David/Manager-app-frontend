0.25 = seat down
0.50 = seat and backrest.
this buttons interact with the value comming from item.quanity . so tapping 0.25 does: quantity \* 0.25 . same for 0.50. this button tapping is idepondent.

---

page for selection item upholtery ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx ) will now have quick filter pills bellow the searchbar, just like the task page does (/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx ). in the UpholsteryPickerSlidePage we will make the header and quick filter selection a component. we will have ( so far ) three filter pills: "In/Stock", "Out/Stock" , "(hearth icon) Favorites".

tapping this filters makes the current body ( rendering the list of upholsteries ), to slide (animation is dependent on the index of the pill and decides the direction of the page entrance and exit of the body being left behind ). this body slide interaction should be loaded with the page from the beginning, the whole point of this interaction is to quicly look at the upholsteries between this fast filters, thus on this UpholsteryPickerSlidePage we will trigger three api calls one for each fast pill, ( first being the in/stock), that way the swap between them later is fast and is already loaded unless query params has changed ( i say three query request because that way tanstack can cache, correct me if im worng and if we should use a store approach ).

the upholstery instance will now have the columns: list_order ( int ), favorite ( bool ), we should update the schemas accordingly. the user can mark an upholstery as favorite, and it can also change the list_order ( this will affect the priority ordering on first fetch ), the interactions to set this are:

at the upholstery card we will have a heart shape button, that renders at the right side, if the user taps that we make the call to mark that upholstery as favorite (the heart turns red ), the favorite fetch call should be refetch ( or store instance update, depending on the strategy we choose to go for ).

then for changing the the list_order value of an upholstery we will use dnd library ( already install and currently being used by the camera preview container ). we will have a button somewhere comfortable in the card or around the card so that the user can tap that button, tapping that button makes the upholstery card draggable, the button sheet surface appears, it is in here that the user will be able to sort the card from the upholsteries that already have a order_list value, the bottom sheet renders the upholstery cards which move around as the user drags the current upholstery card around, then when the user drop the upholstery card, we make the request to add or change the order_list value of that upholstery ( the backend will update the currnet upholstery card and downwards to the other instance that must be updated beacuse their order_list value has changed ). afte that interaction is done if after couple of ms the user hasn't tap the bottom sheet ( to check the current order of that bottom sheet and perhaps continue swaping ) the bottom sheet is closed, the current upholstery list being render now reflects the changes beacuse the upholstery that was dragged has gain or changed it's order_list. the upholstery card used as drag overlay, and card on the bottom sheet surface ( where user drags and alterates the order ) has the same dimensions as the uphosltery card in the body list, and has almost the same layout, it has the image, the upholstery name, the code and it also renders the the number ( order_list ) , this number should be updated live when organizing the list in the bottom sheet page.

---

designer field is removed enterily.

working section attachement of user is removed.

working sections has short cuts for selction at the bottom. max two names and convinations.

camera takes picture, edit enter directly. done is complete

x image in preview is wrong

calendar in due date has short cuts for date selection.

oiling and cleaning is prechosen at the moement of creation

item properties should be included

wood category removes the needs cleaning and wood oiling selection. working section has short cuts also

preorder form use the same item form stage as internal item form

preorder is the same as the internal.

pre orders include the working section as step if manager as role ( but excluded as as sellet )
