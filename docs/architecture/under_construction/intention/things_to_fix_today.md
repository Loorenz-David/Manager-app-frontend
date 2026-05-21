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

we need to build a phone input. this primitive input will be build as prefix selector and input primitive, visually they appear to be the same input separated by a line in between the selector and the input. the selector triggers a bottom sheet ( surface already stablish ), displaying the options for the prefixes, the card displays flag, name of country then prefix . the user can only select one, and on selection it closes. then on the phone input we need to make the phone input to format to the correct phone format after it is written, for instnace in sweden people write 0737262136 but when prefix is present they write +467372621236 . i belive there is a js library that can help us with this formating, so as a prefix library. the primitive input will be used with HRF forms each will build it's own field with this primitive. the value the input takes is a string phone number so it can be passed as +46737262136 and it should extract the prefix mark the selection in the selector, place the phone in the correct format at the input. passing the value up it formats the phone the same way it received it.
