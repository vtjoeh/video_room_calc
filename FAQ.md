# FAQ for the Video Room Calculator

This site relates to the [Video Room Calculator](https://collabexperience.com).  

Is your question not listed below? Join the [Video Room Calculator discussion (Webex Space)](https://eurl.io/#4d-kKP6l1). 

###  How long does the shareable link last?  
Indefinitely. The shareable link contains the full configuration of your design, except for a background image.  There is no cloud information saved about your room, it is full client side solution. 

###  How to get started? 
There are two ways to start the room: 
1) **Quick Setup** - works well when you are in a room doing measurements. 
2) **Drag and Drop** - Just go to the **Equipment tab** select devices and drag and drop.
Double click on any object on the canvas to get details and to edit. 

### What are the short cut keys? 
- ctrl-c / cmd-c = copy
- ctrl-v / cmd-v = paste (at location of arrow)
- ctrl-d / cmd-d = duplicate
- ctrl-z / cmd-z = undo
- ctrl-y / cmd-y = redo
- Delete / Backspace = delete items
- up, down, left, right arrows = moves a single item (does not move multiple selected items)
- shift+click to select/deselect multiple items 

## What browsers does the Video Room Calculator work in? 
- Windows/Mac: Chrome, Edge, Firefox and Safari (Mac)
- iOS: Safari 
- Android: Not tested (but Chrome should work)
- RoomOS: Cisco Board Pro and Desk Pro web app
If you see any issue with any of the above let me know. 

### When I zoom in and click undo/redo buttons, it zooms out. 
Yes, this is how the program works and is based on a limit of Javascript and canvas.     

### Why does the Quick Setup settings disappear? 
Once you start moving objects and customizing, you have moved beyond the Quick Setup. To get back to the Quick Setup, click on the **Save** tab --> **Reset Room**. 

### What about privacy and security? What information is tracked? 
The configuration and data is client side only. The Video Room Calculator does not save the room configuration or personal identifiable information in the cloud. Number of visitors and buttons clicked (sean as 'heartbeat') is stored by the Video Room Calculator cloud. 
**Google Fonts:** There is currently a dependency on Google Fonts for icons that will be removed in a future date.  
**Third party javascript**: DomPurify by Mozilla Foundation distributed by Cloudfare CDN is used to help protect against XSS attacks, which means 3rd party. 
**Local Storage:** Browser local storage is used for saving settings and features like Undo between browser sessions.  No cookies are used. 
**Cisco Workspace Designer:** Cross-launch to the Workspace Designer has its own terms, conditions and cookies. 

_**Note:** The above could change at a later date based on new features._

## Pro Tips:
- **Hyperlink:** Use the **Save** --> **Shareable Link**, which copies a _hyperlink_ instead of using the URL from the address bar.
- **Undo is your friend** Undo is persistent. If you accidently close the browser, just re-open and click undo. Private/Incognito mode may disrupt this.
- **Snap to Objects:** Use **Snap to Objects** under **Details** --> **Settings** to help align objects better.  
- **Copy between tabs** - Want to reuse part of a design? Copy items between tabs. If an object is not pasting to the new tab, paste it 1 time in the original tab. 
- **Unit Conversion** - Number fields allows you to enter one type of unit and it converts to another. For example: 12 in => 1ft, 12' 3" => 12.25ft, 1 m => 3.28 ft, 100 cm => 0.33 ft.
- **Board Pro / Desk Pro** - Video Room Calc works on a Board Pro or Desk Pro as a web app. Uses a QR code to get the URL. The Workspace Designer Custom Rooms is not supported on the Desk Pro or Board Pro. 
  - The QR code is limited to 2950 characters. 
  - To see the QR code on a PC add 'qr' to the querystring parameter, **Save** tab --> **Load QR Code Script** button. For example: https://collabexperience.com/?qr  
- Checkout other useful (but not easy to find) tools and links on the Video Room Calculator **Resources** tab. 

## How to use Workspace Designer Custom Rooms (beta)
1) Be on the Cisco network or VPN.
2) Draw your room or use a template to get started.
3) Click on the cube icon in the upper right corner. 
![image](https://github.com/user-attachments/assets/dd2250c3-7711-42c3-91d8-15c05491da14)
- An items _Role_ and _Color_ are settings that change the object in the Workspace Designer. 
- _Color_ does not change the color of the Video Room Calc device, only in the Workspace Designer. 
**Caution:** It is possible to create unsupported video device Role combinations of displays and cameras.

### Item Label field, JSON and the Workspace Designer. 
- Example: [Video Room Calc Labels with custom JSON](https://collabexperience.com/?x=A1v0.1.510b1000c1000~Video+Room+Calc+Label+JSON+example~B000101AG809a199b623~%7B%22scale%22%3A%5B1%2C-1%2C1%5D%7D~WA125a52c33e864~%7B%22color%22%3A%22red%22%2C+%22opacity%22%3A%220.5%22%7D~WD522a626b70c200e200j200~%7B%22color%22%3A%22blue%22%2C+%22rotation%22%3A%5B0.785%2C0%2C0.785%5D%7D~DA460a199b433g55~Tilted+display+%7B%22rotation%22%3A%5B0.3%2C0%2C0%5D%7D~) with JSON in the **Details** --> **Item:** **Label** field
- In support of the **Custom Rooms**, when the Label field has JSON it is inserted direct into the Workspace Designer's JSON configuration: 
  - Anything not in curly brackets {} is ignored when this merge happens. 
  - Examples: 
    - For walls, glass walls or boxes: {"color":"#FF0000"}, {"opacity":"0.5"}
    - To flip a PTZ 4K camera: {"scale":[1,-1,1]}
    - To change a person's model use {"model":"man-standing-pen"}.  The default person is {"model":"woman-standing"}. 
    - To changed the x, y, z rotation of any object: {"rotation":[0, 3.14, 0]}
      - Rotation is in radians.
      - Overrides the Degree field.
      - Example: [Campfire with tilted displays](https://collabexperience.com/?x=A1v0.1.510b3999c3999~Example%3A+Campfire+tilted+displays~B100100AI1804a1913b269f900AE2165a1923b269f-900AE1988a2100b269AE1982a1742b269f1800SF446a377SA1880a2927f1800SA2995a1788f900SA984a1522f-900SA2116a922SA1594a912SA2995a2329f900SA2402a2940f1800SA984a1798f-900SA1854a922SA2995a2051f900SA1601a2927f1800SA2142a2927f1800SA2395a922SA984a2064f-900SA971a2323f-900SA3009a1529f900TE1427a2674c1152TE2743a2503c1152f-900TE2569a1175c1152f1800TE1237a1348c1152f900TA2372a1545c755e761f900j259WD1795a1732b312c384e374j3DB1575a1930b33f900g50~%7B%22rotation%22%3A%5B-0.3%2C-1.57%2C0%5D%7D~DB1991a2326b33g50~%7B%22rotation%22%3A%5B-0.3%2C0%2C0%5D%7D~DB2401a1923b33f-900g50~%7B%22rotation%22%3A%5B-0.3%2C1.57%2C0%5D%7D~DB1991a1512b33f1800g50~%7B%22rotation%22%3A%5B-0.3%2C3.14%2C0%5D%7D~ME2818a1450b233f-784MC2795a1683b233f-900MC2247a2726b233MC2799a2142b233f-900MC1181a1706b233f900MC2208a1122b233f1800MC1788a2730b233MC1749a1122b233f1800MC1184a2169b233f900)
- No error is given if the JSON does not parse properly. 
- Use Label fields sparingly as they increase the length of the URL. Avoid unnecessary spaces. 
- The Workspace Designer's full JSON schema will be published at a later date. 
- **Caution**  Labels are powerful but can create undesired results in the Workspace Designer. 


