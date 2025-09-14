# FAQ for the Video Room Calculator

This site relates to the [Video Room Calculator](https://collabexperience.com).

Is your question not listed below? Join the [Video Room Calculator discussion (Webex Space)](https://eurl.io/#4d-kKP6l1).

###  How long does the shareable link last?
Indefinitely. The shareable link contains the full configuration of your design, except for a background image.  There is no cloud information saved about your room, it is a client side solution.

###  How to get started?
There are two ways to start the room:
1) **Quick Setup** - works well when you are in a room doing measurements.
2) **Drag and Drop** - Just go to the **Equipment tab** select devices and drag and drop.
Double click on any object on the canvas to get details and to edit.

### What are the short cut keys?
The following list is also found under the help menu:
ctrl-c / cmd-c = copy
ctrl-v / cmd-v = paste (at location of arrow click)
ctrl-d / cmd-d = duplicate
ctrl-z / cmd-z = undo
ctrl-y / cmd-y = redo
shift + [ctrl-z / cmd-z] = redo
ctrl-r / cmd-r = rotate 90 degrees
esc = unselect items
Delete / Backspace = delete items
←,↑,→,↓ arrows = move selected items
[shift / ctrl / cmd] + click = select/unselect item
ctrl-s = Save (download) Video Room Calculator JSON file.
ctrl-e = Export to Workspace Designer file format.
ctrl-i = Import Video Room Calculator or Workspace Designer file.

From the Workspace Designer, use ctrl-e to export a file to the Video Room Calculator.

### What browsers does the Video Room Calculator work in?
The goal is to support the following:
- Windows/Mac: Chrome, Edge, Firefox and Safari (Mac)
- iOS: Safari
- Android: Not tested (but Chrome should work)
- RoomOS: Cisco Board Pro and Desk Pro web app

If you see any issue with any of the above please let me know.

### When I zoom in and click the undo/redo buttons, it zooms out.
Yes, this is how the program works and is based on some limits of how zoom is implemented by increasing the size of the HTML canvas and how HTML canvas + Javascript is not truly synchronous. This could be optimized at a later date.

### What is the maximum URL size or number of items in a design?
The size of the URL can be up to 8190 characters, which is about 500 objects. The use of text fields like the Name or Label fields contributes to the URL size. There is no enforced limit for downloading or uploading files.

### What about privacy and security? What information is tracked?
The configuration and data is client side only. The Video Room Calculator does not save the room configuration or personal identifiable information in the cloud. Number of visitors and buttons clicked (sean as 'heartbeat') is stored by the Video Room Calculator cloud.
**Third party javascript**: DomPurify by Mozilla Foundation distributed by Cloudfare CDN is used to help protect against XSS attacks, which means 3rd party.
**Local Storage:** Browser local storage is used for saving settings and features like Undo between browser sessions.  No cookies are used.
**Cisco Workspace Designer:** Cross-launch to the Workspace Designer has its own terms, conditions and cookies.

### I see a discrepancy between the Video Room Room Calculator and the Workspace Designer, what should I do?
The Workspace Designer is the official tool from Cisco and should take precedence over the Video Room Calculator. If you notice any differences, please inform me. The Video Room Calculator only provides a top-down flat view, whereas the Workspace Designer allows for a 3D side view. For instance, the Video Room Calculator uses 11.5 feet as the reach of the Cisco Ceiling Microphone Pro. The Workspace Designer uses a slightly larger value, but it also allows the height to be seen from the side in 3D. The Video Room Calculator offers a lot of flexibility, but it also means that you can create designs that may not work for the devices or require extensive integration.

### How is the display coverage for the closest and farthest participants determined?
The Video Room Calculator assumes the optimum viewing distance of the display is 1x-3x the diagonal measurement of the display, but also shows the farthest participant should be no farther than 4x. According to [Cisco's Best Practices: Creating Effective Video-enabled Workspaces](https://www.cisco.com/c/dam/en/us/td/docs/telepresence/endpoint/technical-papers/workspace-best-practices.pdf) "the optimal viewing distance for video and normal content is one to four times the diagonal of the screen." Other industry guidelines ranges will be slightly different. To better represent smaller font options and better align with the AVIXA standard (assuming 3% elemental height), a 3x line is also shown. See more details below.

### How does the display coverage values compare to the AVIXA DISCAS standard?
The [AVIXA DISCAS](https://www.avixa.org/standards/discas-calculators/discas) formulas are not used directly. However, Cisco's Best Practices and the Video Room Calculator formula referenced above align with the AVIXA DISCAS standard when standard assumptions are applied. By utilizing the AVIXA DISCAS BDM calculator and assuming a 16:9 display ratio with a 3% elemental value (the height of a lower-case letter as a percentage of the display height), the recommended distance from the center of the display is approximately 3x the diagonal measurement of the display. Should the elemental value percentage be adjusted to 4%, the maximum viewing distance will be 4x the diagonal measurement. The Cisco Best Practices formula is not applicable for 21:9 displays; therefore, the DISCAS calculation may be employed in such instances. The 21:9 in the Video Room Calculator takes that into consideration.

For the nearest participant to the display, assuming they are seated front and center without the base of the display exceeding eye level, the AVIXA formula for a 16:9 display indicates that the individual should be seated no closer than approximately 0.86x the diagonal measurement of the display. However, it is often overlooked that in a typical conference room, the closest participant is usually seated at the side of the conference table rather than directly in front of the display; thus, the 1x diagonal measurement of the display formula may yield similar results in such settings depending on the width of the table.

The AVIXA DISCAS standard does not directly account for dual displays, the size of individuals on the displays during a meeting, or the frequent scaling and resizing of content in a videoconference setting when layouts are altered.

### Levels: How can I change the level or layer that an object is on?
The Video Room Calculator has implicit levels (layers) and does not permit you to change the level of an object. The Video Room Calculator aims to simplify the objects so they are positioned on the correct level. Level rendering is unrelated to the Z (base elevation).

### Levels
From top to bottom, here are the different implicit levels of the objects:
- Microphones Level: Microphones, Navigators, Laptops, or other small objects.
- Video Devices Level: Video Devices & Cameras. _Note: PTZ cameras are always placed on top in this level; therefore, a PTZ will be above a Quad Camera._
- Displays Level: Displays, including single, double, or triple displays.
- Chairs Level: Chairs, People, Plants, Doors. _Note: People are always positioned on top in this level when inserted; therefore, people will be above chairs._
- Boxes Level: Box.
- Table Level: Tables, Walls (excluding default walls), Columns, Rows of Chairs, Couch.
- _[Coverage Level: for cameras, mics, and displays. This level is not affected by touch.]_
- Stage Floor Level: Stage Floor, Carpet.
- _[Grid Level: includes default walls]._

**Pro-tip:** A Box and Stage Floor are the same type of Workspace Designer object, but they appear on different levels in the Video Room Calculator. Therefore, you can swap between these two objects to change the level when these objects overlap.

### Why does the Room Bar Pro and Board Pro G2 with an external mic pickup range look different in the Workspace Designer than the Video Room Calculator?
This is a configurable setting and works differntly depending on products and configurations, so it is hard to say what the correct default pickup range should be in the Video Room Calculator. There is an important setting:
Configuration--> Audio--> BeamMix--> Inputs: **Auto** or **BeamsAndExtMics**

According to page 141 of the [RoomOS Administrative](https://www.cisco.com/c/dam/en/us/td/docs/telepresence/endpoint/roomos-1124/desk-room-board-administration-guide-roomos-1124.pdf#page=141) guide, dated Feb 2025:
>When connecting an analog or digital (Ethernet) microphone to the device, the internal microphone array's three beams are automatically disabled. Whether the near talker zone is enabled depends on the product:
>- Board Pro, Board Pro G2: The near talker zone is activated when someone is inside this zone; hence, it picks up audio from people standing by the device.
>- Room Bar Pro: The near talker zone is disabled.
>
>If you want to enable the three beams when using external microphones, you must set the following:
>Audio > Microphones > BeamMix > Inputs: BeamsAndExtMics
>_NOTE: When using Ceiling Microphone Pro, we recommend using the Auto setting as it provides a smarter audio mixer, taking into account the placement of the Ceiling Microphone Pro_
![image](https://github.com/user-attachments/assets/663bda79-f2bc-40bb-8619-cacce4cf2c50)

According to the [December 2024](https://help.webex.com/en-us/article/6ger7db/Release-notes-for-RoomOS-software#sx10_r_whats_new_2024)(Release notes for RoomOS software):
>**Room Bar Pro, Board Pro, and Board Pro G2 external and internal microphones**
>We've made changes to the Audio Microphones BeamMix Inputs setting for Room Bar Pro, Board Pro, and Board Pro G2. For these devices, the new options for this setting are:
>  - **Auto (new behaviour):**  If a Ceiling Microphone Pro is connected and the Ceiling Microphone Pro voice tracking wizard has been run, the new smart audio mixer uses both internal beams and > the Ceiling Mic Pro.
  For other external microphones, the internal beams are disabled.
>  -  **BeamsAndExtMics:** The audio mixer uses internal beams and external microphones for voice pickup at all times. When using Ceiling Microphone Pro, we recommend using the Auto setting as it provides a smarter audio mixer, taking into account the placement of the Ceiling Microphone Pro.
>  - **OnlyExtMixs (New):** Uses only external microphones for voice pickup and falls back to internal beams if no external microphones are connected.

The Workspace Designer gives the following view when a Cisco Table Microphone Pro is used with a Room Bar Pro:
![image](https://github.com/user-attachments/assets/06f47f0e-3e2b-4d44-b8da-9311c040d002)

_**Note:** The above information could change at a later date based on new features._

## Pro Tips:
- **Hyperlink:** Use the **Save** --> **Shareable Link**, which copies a _hyperlink_ instead of using the URL from the address bar.
- **Duplicate chairs** Use ctrl-d to copy a row of chairs evenly and quickly.
- **Undo is your friend:** Undo is persistent. If you accidently close the browser, just re-open and click undo 1x or 2x. Private/Incognito mode may disrupt this.
- **Snap to Objects:** Use **Snap to Objects** under **Details** --> **Settings** to help align objects better.
- **Copy between tabs:** - Want to reuse part of a design? Copy items between tabs. If an object is not pasting to the new tab, paste it 1 time in the original tab.
- **Unit Conversion:** - Number fields allows you to enter one type of unit and it converts to another. For example: 12 in => 1ft, 12' 3" => 12.25ft, 1 m => 3.28 ft, 100 cm => 0.33 ft.
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

### Item Label field, JSON and the Workspace Designer

- Example: [Video Room Calc Labels with custom JSON](https://collabexperience.com/?x=A1v0.1.510b1000c1000~Video+Room+Calc+Label+JSON+example~B000101AG809a199b623~%7B%22scale%22%3A%5B1%2C-1%2C1%5D%7D~WA125a52c33e864~%7B%22color%22%3A%22red%22%2C+%22opacity%22%3A%220.5%22%7D~WD522a626b70c200e200j200~%7B%22color%22%3A%22blue%22%2C+%22rotation%22%3A%5B0.785%2C0%2C0.785%5D%7D~WA1003a0c33e1001~%7B%22hidden%22%3A%22true%22%7D~DA460a199b433g55~Tilted+display+%7B%22rotation%22%3A%5B0.3%2C0%2C0%5D%7D~) with JSON in the **Details** --> **Item:** **Label** field
- In support of the **Custom Rooms**, when the Label field has JSON it is inserted direct into the Workspace Designer's JSON configuration:
  - Anything not in curly brackets {} in the Label field is ignored when this merge happens.
  - Examples:
    - For walls, glass walls or boxes: {"color":"#FF0000"}, {"opacity":"0.5"}
    - Hide an object when exported to the Workspace Designer, great for a wall: {"hidden":"true"}
    - To change a person's model use {"model":"man-standing-pen"}.  The default person is {"model":"woman-standing"}.
- No error is given if the JSON does not parse properly.
- Use Label fields sparingly as they increase the length of the URL. Avoid unnecessary spaces.
- The Video Room Calculator and the Workspace Designer use different coordinate and degree systems.
- The Workspace Designer JSON objects are always in meters.  The Video Room Calculator can be in feet or meters.
- The JSON values and syntax might change without warning as we work out the details of this beta.
- For more details see [Workspace Designer: Custom Rooms](https://designer.cisco.com//#/article/CustomRooms) documentation.

- **Caution**  Labels are powerful but can create undesired results in the Workspace Designer.


