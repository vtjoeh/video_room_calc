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

### How do I export a design from the Workspace Designer?
In the Workspace Designer type `ctrl-e` to export your design to a JSON file. Import the file in the Video Room Calculator by clicking **New** --> **Open File**.

### What are the short cut keys?
The following list is also found under the help menu:
`ctrl-c / cmd-c` = copy
`ctrl-v / cmd-v` = paste (at location of arrow click)
`ctrl-d / cmd-d` = duplicate
`ctrl-z / cmd-z` = undo
`ctrl-y / cmd-y` = redo
`shift + [ctrl-z / cmd-z]` = redo
`ctrl-r / cmd-r` = rotate 90 degrees
`ctrl-m` = turn on the Measuring Tool
`esc` = unselect items (or turn off Measuring Tool)
`Delete` / `Backspace` = delete items
`←,↑,→,↓` arrows = move selected items
`[shift / ctrl / cmd] + click` = select/unselect item
`ctrl-s` = Save (download) Video Room Calculator JSON file.
`ctrl-e` = Export to Workspace Designer file format.
`ctrl-i` = Import Video Room Calculator or Workspace Designer file.
`c` = Camera coverage toggle
`m` = Microphone coverage toggle
`d` = Display coverage toggle
__`ctrl-3` = open iFrame window if enabled__

From the Workspace Designer, use `ctrl-e` to export a file to the Video Room Calculator.

### What browsers does the Video Room Calculator work in?
The goal is to support the following:
- Windows/Mac: Chrome, Edge, Firefox and Safari (Mac)
- iOS: Safari, but not mobile
- Android: Not typically tested on updates, but Chrome should work.
- RoomOS: Cisco Board Pro and Desk Pro web app

If you see any issue with any of the above please let me know.

### When I zoom in and click the undo/redo buttons, it zooms out.
Yes, this is how the program works and is based on some limits of how zoom is implemented by increasing the size of the HTML canvas and how HTML canvas + Javascript is not truly synchronous. This could be optimized at a later date.

### What is the maximum Shareable Template Hyplerlink URL size or number of items in a design?
The Shareable Template Hyperlink saves the full x, y, and z coordinates, as well as the sizes of every object in the query string parameter of the hyperlink. The size of the URL can be up to 8190 characters, which accommodates approximately 500 objects. The use of text fields, such as the Name or Label fields, contributes to the URL size. There is no enforced limit for downloading or uploading files.

### What about privacy and security? What information is tracked?
The configuration and data is client side only. The Video Room Calculator does not save the room configuration or personal identifiable information in the cloud. Number of visitors and buttons clicked (sean as 'heartbeat') is stored by the Video Room Calculator cloud.
**Third party javascript**: DomPurify by Mozilla Foundation distributed by Cloudfare CDN is used to help protect against XSS attacks, which means 3rd party.
**Local Storage:** Browser local storage is used for saving settings and features like Undo between browser sessions.  No cookie trakcers are used.
**Cisco Workspace Designer:** Cross-launch to the Workspace Designer has its own terms, conditions and cookies.

### I see a discrepancy between the Video Room Room Calculator and the Workspace Designer, what should I do?
The Workspace Designer is the official tool from Cisco and should take precedence over the Video Room Calculator. If you notice any differences, please inform me. The Video Room Calculator only provides a top-down flat view, whereas the Workspace Designer allows for a 3D side view. For instance, the Video Room Calculator uses 11.5 feet as the reach of the Cisco Ceiling Microphone Pro. The Workspace Designer uses a slightly larger value, but it also allows the height to be seen from the side in 3D. The Video Room Calculator offers a lot of flexibility, but it also means that you can create designs that may not work for the devices or require extensive integration.

### How do I use a custom Path Shape object to make a table or curved wall?
From the Workspace Designer page:
>"It is possible to create custom shapes by defining a shape and then controlling the thickness of it, similar to how you would form a flat gingerbread cake and then grow it in the oven. This can be useful to create custom table shapes or other objects that are not represented by the standard objects... To use custom shapes, you need a basic understanding of SVG path shapes. This is a 2-dimensional shape format that supports lines, curves, circles and ellipsis."

The **Custom Path Shape** objects are powerful but complicated to use at first.
  - See the [Path Shape Example](https://collabexperience.com/?x=A0v0.1.629b500c800~Path+Shape+Example~B10010100AC18a588b90f-900UD177a306f-1350~%7B%22ignore%22%3A1%7D~UD370a302f1350~%7B%22ignore%22%3A1%7D~SX246a686f1475~%7B%22ignore%22%3A1%7D~SX180a724f1611~%7B%22ignore%22%3A1%7D~SX172a443f238~%7B%22ignore%22%3A1%7D~UD153a223f-900~%7B%22ignore%22%3A1%7D~UD180a119f-450~%7B%22ignore%22%3A1%7D~UD275a73~%7B%22ignore%22%3A1%7D~UD386a127f450~%7B%22ignore%22%3A1%7D~UD416a217f900~%7B%22ignore%22%3A1%7D~UD279a349f1800~%7B%22ignore%22%3A1%7D~SX255a477f297SX313a528f393SX313a639f1442WA-11a295c10e512WL205a583b68f900j4~%7B%22path%22%3A%22M+-1.19+0.901+C+-0.927+0.076+-0.495+-0.668+0.002+-1.152+C+0.547+-0.603+0.906+0.123+1.182+0.897+C+0.417+1.122+-0.395+1.031+-1.19+0.897%22%7D~WL288a294f-900j250~%7B%22color%22%3A%22lightblue%22%2C%22opacity%22%3A0.3%2C%22path%22%3A%22M+0+-3+v+0.1+C+1.4883+-2.9082+2.9211+-1.8828+2.9667+-0.0099+h+0.1+C+3.015+-1.991+1.602+-2.979+0+-3%22%7D~WA519a-12c10e235f900WL278a215b100f1350j4~%7B%22path%22%3A%22M+-0.904+-0.3928+L+-0.372+-0.9248+L+0.3608+-0.9304+L+0.904+-0.3928+L+0.904+0.3608+L+0.3976+0.8984+L+-0.3824+0.904+L+-0.92+0.3664+z%22%7D~DD16a590b101f-900g105) of custom tables and a custom wall.
  - The Path Shape field format follows SVG path format.
  - Units are in meters, regardless of whether you are using feet or meters for the design.
  - The path will draw the same shape in both the Video Room Calculator and the Workspace Designer.
  - The Video Room Calculator `height` is translated to the Workspace Designer `thickness` parameter.
  - You can't create objects with holes in them. SVG paths can consist of one or more sub-paths. Complicted objects might require more than one Custom Path Shape.
  - Center the object around 0,0.
  - The path shape needs to be closed, making it challenging to draw walls of a consistent thickness.
  - JSON objects are still permitted in the **Item Label** field, but if you use curly brackets `{ }` and do not have a properly formatted JSON, the **Path Shape field** will be empty, and `{"path":"<path>"}` will be moved to the **Item Label** field.  Fix the JSON and click **Update Item** to have your `{"path":"<path>"}` parsed and placed in the **Path Shape field**.
 - The tool at https://yqnn.github.io/svg-path-editor/ can be used to create your path, which can be copied to the Path Shape field.
  - For more details, see the beta [Workspace Designer: Custom Rooms](https://designer.cisco.com/#/article/CustomRooms) article.

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


