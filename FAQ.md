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

### When I zoom in and click undo/redo buttons, it zooms out. 
Yes, this is how the program works and is based on a limit of Javascript and canvas.     

### Why does the Quick Setup settings disappear? 
Once you start moving objects and customizing, you have moved beyond the Quick Setup. To get back to the Quick Setup, click on the **Save** tab --> **Reset Room**. 

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
- No error is given if the JSON does not parse properly. 
- Use Label fields sparingly as they increase the length of the URL. Avoid unnecessary spaces. 
- The Workspace Designer's full JSON schema will be published at a later date. 
- **Caution**  Labels are powerful but can create undesired results in the Workspace Designer. 


