# FAQ for the Video Room Calculator

This site relates to the [Video Room Calculator](https://collabexperience.com).

Is your question not listed below? Join the [Video Room Calculator discussion (Webex Space)](https://eurl.io/#4d-kKP6l1).

### How long does the shareable link last?
Indefinitely. The shareable link contains the full configuration of your design, except for a background image. There is no cloud information saved about your room. It is a client-side solution.

### How to get started?
Watch the [Getting Started and Tips & Tricks](https://app.vidcast.io/share/2ab4d21e-72f5-4555-91da-bbd6f9b0e813) video, or jump straight in. There are multiple ways to start the room:
1) Start in the [Workspace Designer](http://designer.webex.com) and export the design by typing `ctrl-e`.
2) **Quick Setup** - works well when you are in a room doing measurements.
3) **Drag and Drop** - just go to the **Equipment tab**, select devices, and drag and drop.

Double-click on any object on the canvas to view its details and edit it. Every tutorial video is listed under **Help**.

### How do I export a design from the Workspace Designer to import into the Video Room Calculator?
In the Workspace Designer type `ctrl-e` to export your design to a JSON file. Import the file in the Video Room Calculator by clicking **New** --> **Open File**.

### How to scan a room with my iPhone?
The Video Room Calculator does not have native scanning. Instead, use the [Video Room Scanner](https://apps.apple.com/us/app/video-room-scanner/id6771168512) app by Richard Hermann, which opens the finished scan in the Video Room Calculator.

- Scanning needs a LiDAR sensor, which means an **iPhone Pro or Pro Max, iPhone 12 Pro or later**. The standard and Plus models have no LiDAR sensor and cannot scan.
- **Android is not supported.**

### What is a Progressive Web App (PWA) and how do I install it?
The Video Room Calculator is a web site and runs in a browser, so nothing needs to be installed to use it. At times you may want it without web access, such as walking a building with no usable signal. For that, install it as a Progressive Web App (PWA), a web application that installs on your computer and runs like a native app. Once installed it works offline. Note that Workspace Designer integration still requires an active internet connection.

**How to install on Desktop (Windows, macOS, Linux, ChromeOS):**
1. Open Chrome and navigate to https://collabexperience.com
2. Click the Install icon on the far right of the address bar
3. Alternatively, click the three dots menu in the top-right corner, select "Cast, save, and share", and click "Install page as app"
4. Click "Install" in the pop-up prompt
5. The web app will now appear in your Start menu, Applications folder, or Chrome App Launcher

### What browsers does the Video Room Calculator work in?
The goal is to support the following:
- Windows/Mac: Chrome, Edge, Firefox and Safari (Mac)
- Android: Not typically tested on updates, but Chrome should work.
- RoomOS: Cisco Board Pro and Desk Pro web app

If you see any issue with any of the above please post in the [Video Room Calculator community](https://eurl.io/#4d-kKP6l1) Webex space.

### What is the maximum Shareable Template Hyperlink URL size or number of items in a design?
The Shareable Template Hyperlink saves the full x, y, and z coordinates, as well as the sizes of every object in the query string parameter of the hyperlink. The size of the URL can be up to 8190 characters, which accommodates approximately 500 simple objects. The use of text fields, such as the Name or Label fields, contributes to the URL size. There is no enforced limit for downloading or uploading files. Use a row of chairs instead of many individual chairs to keep the URL short.

### Why is my background image missing from a shareable link?
Background images are not part of the link. A shareable link carries the design in its address, and a floor plan image is far too large for that. Send the design as a file instead, using **Save** --> **Download File**, which does include the image. Your most recent floor plan images are also kept in this browser under **Room** --> **Background** --> **Recent Floor Plans**, so you can reapply one to a design that arrived by link. The same image is only kept once, however many times it is loaded, so that list does not fill up with copies of one plan.

### What about privacy and security? What information is tracked?
The configuration and data are client-side only. The Video Room Calculator does not save the room configuration or personally identifiable information in the cloud. The number of visitors and buttons clicked (seen as 'heartbeat' in the JavaScript) is stored by the Video Room Calculator cloud.

**Third-party JavaScript:** DOMPurify by Cure53 (recommended by Mozilla) is used to help protect against XSS attacks, including sanitizing uploaded SVG floor plans. It is served from the Video Room Calculator itself rather than a third-party CDN, so no external script is loaded.

**Browser Storage:** Browser `localStorage` and `IndexedDB` are used to save settings, undo/redo history, background images, and your Custom Item library between browser sessions. No cookie trackers are used.

**Cisco Workspace Designer:** Cross-launch to the Workspace Designer has its own terms, conditions, and cookies.

### I see a discrepancy between the Video Room Calculator and the Workspace Designer, what should I do?
The Workspace Designer is the official tool from Cisco and should take precedence over the Video Room Calculator. If you notice any major differences, please let us know in the [Video Room Calculator community](https://eurl.io/#4d-kKP6l1). The Video Room Calculator only provides a top-down flat view, whereas the Workspace Designer allows for a 3D side view. For instance, the Video Room Calculator uses 11.5 feet as the reach of the Cisco Ceiling Microphone Pro. The Workspace Designer uses a slightly larger value, but it also allows the height to be seen from the side in 3D. The Video Room Calculator offers a lot of flexibility, but it also means that you can create designs that may not work for the devices or require extensive integration.

### How do I use the Workspace Designer Blueprint?
Open the Workspace Designer in a new tab. Click the **3D View** button, then use the dropdown beside it and select **Open New Tab** rather than the default split view. The Blueprint view does not render inside the split view frame, so a tab of its own is the way to reach it.

### I see phantom or duplicate walls in my Workspace Designer export, how do I fix it?
Phantom walls seen in the Workspace Designer are usually stale state rather than a problem with the design itself. Work through these in order:

1. **Clear storage and local data.** Go to **Room** --> **Settings** --> **Storage and Local Data** and select **Clear Undo/Redo History**. This drops the undo/redo history, which fixes this problem most of the time. Save your design to a file first, since clearing also removes anything you have not saved. If that does not work, try **Room** --> **Settings** --> **Storage and Local Data** and select **Clear All**. This removes all local storage, including saved preferences.
2. **Restart the browser.** A full quit and reopen, not just a new tab. This clears the in-memory state and forces the app and its service worker to reload from scratch.
3. Reopen your saved design and export again.

If the walls are still there, check whether the extra walls belong to a neighboring **Room Part**. A wall drawn on a shared boundary can legitimately belong to both rooms. Please send me the design file if none of the above helps.

### How do I lay out several rooms with the Multi-Room Floor Plan?
A **Room Part** is one room inside a larger floor plan. Draw the whole floor once, then zoom into each room and design it as if it were a room on its own. See the [Multi-Room Floor Plan](https://app.vidcast.io/share/46328bec-9a79-402e-8a71-5b3fcccaa513) video.

**Getting started**
1. Press the space bar for **Quick Add** and search for "room part", or find it through the sidebar search.
2. Pick **Room Part with Default Walls**, **Room Part w/ No Walls**, or **Room Part Irregular Shape** for an outline that is not a rectangle.
3. The first Room Part you add offers to turn on **Multi-Room Floor Plan Mode**. Accept it. The mode is saved with the design and can be turned off later under **Room** --> **Settings**.
4. Size and position each Room Part on the floor. A background image of the building floor plan makes this much easier. See **Room** --> **Background**.

**Working inside a room**
- **Double-click a Room Part to enter it.** On a touch screen use the right-click menu or the ellipsis (`...`) button and choose **Enter Room**, since a double-tap can be awkward.
- Inside a room the canvas shows that room only, and the **Room** tab shows its name and size. Default walls, software experience and notes are per room.
- Use the back button on the canvas toolbar to return to the whole floor plan.
- An irregular Room Part can be reshaped by selecting it on the floor plan and dragging the white circles on its corners.

**Shared walls**
- A wall, column, door or box drawn on the boundary between two rooms belongs to both of them, which is what makes each room look right on its own.
- Inside a room, structure that belongs to the room next door is drawn dimmed. You can still select and move it, so a shared wall can be adjusted from either side. The dim tells you the other room owns it.
- Each room exports and links only its own contents, so a shared wall is not sent twice.
- How far outside a room an object still counts as that room's is adjustable under **Room** --> **Settings** --> **Room Part wall tolerance**. The defaults suit most designs. Note that this is a test setting and may be removed later.

**Exporting**
- Zoomed into a room, the Workspace Designer export and the shareable link cover that room alone, sized to that room.
- From the whole floor plan, the export covers the entire floor.

**Exporting the inventory to a CSV file**

**Save** --> the arrow beside **Download File** --> **Export Inventory CSV** writes a spreadsheet of the equipment in the design. It counts what is on the canvas at that moment, so it never falls out of step with the drawing. This works with or without Room Parts.

You are asked which items to include:
- **Cisco Devices** counts video devices, cameras, microphones, Navigators, codecs, switches and share cables. Laptops and keyboards are left out.
- **Cisco Devices and Items with a Label** adds any other object that has something typed in its **Item Label** field, which is how a table, a display or a chair gets counted. Objects with no label are still left out, and text annotations are never counted.

The columns are **Device**, **Item Label**, **Color**, **Quantity** and **Notes**, with the design name and the export date on the first line. Identical items are counted together, so ten of the same microphone are one row with a quantity of 10. The same device with a different label or a different color is a row of its own. A codec carries "Requires an external camera" in the Notes column.

With Room Parts in the design a **Room Part Name** column comes first, each device is listed under the room it sits in, and a **Total** section at the bottom adds the rooms together. **Name your Room Parts** using the Item Label field, or they are listed as "Unnamed Rm 1" and so on. A device that falls outside every room is grouped under **Unassigned**, which makes that group a quick way to spot something left in the corridor by accident. Where one Room Part sits inside another, the device is counted in the smaller of the two.

### How do I use a Custom Path Shape to make a table, a curved wall or a logo?
A **Custom Path Shape** is an object you draw yourself, for anything the standard objects do not cover. It is built with the **Path Editor**, a drawing surface with your room walls and floor plan image shown behind your work. See the [Custom Path Shapes](https://app.vidcast.io/share/903091d1-3ec2-4396-9a69-2ec278ca8183) video.

**Drawing one**
1. Go to the **Equipment** tab --> **Walls / Objects** and add a **Custom Path Shape**, or find it through **Quick Add** (space bar).
2. Choose **Open Path Editor Mode**. The other choice, **Draw Simple Path on Room Canvas**, places points directly on the room canvas and is quicker for a plain outline.
3. In **Draw Mode**, click to place each point. The **Line** and **Curve** buttons decide what the next segment is, and the keys `L` and `C` switch between them while you draw. Click the enlarged first point to close the shape, which also switches you to Edit Mode.
4. In **Edit Mode**, drag any point to move it, drag the orange handles to bend a curve, click a segment to add a point there, and use **Line/Curve** and **Delete Point** on whatever is selected.
5. **Close** applies the shape to your room. There is no separate save step and no cancel, so use the editor's own **Undo** while you work.

**Good to know about the Path Editor**
- Undo and redo are built into the editor, with `ctrl-z` and `ctrl-y`. The room's own undo covers everything after you close.
- **Add New Sub-Path** puts a second separate shape in the same object. **Add a Hole** cuts an opening, and the hole has to be drawn fully inside an existing closed shape.
- The path text is shown beside the drawing and can be edited directly. Clicking in that text selects the matching segment on the canvas, and selecting a point highlights its numbers in the text.
- The shape is drawn the same way in the Video Room Calculator and the Workspace Designer. The **Height** field becomes the Workspace Designer thickness.
- Wrap a finished shape in a **Custom Item** to save it to your library and reuse it in other designs.
- The **Path Editor** button in the **Details** panel reopens the editor on an existing shape at any time.
- The underlying format is an SVG path in meters, regardless of whether the design is in feet or meters. You rarely need to know that, but hand-written paths are still accepted.
- For more details on the Workspace Designer side, see the beta [Workspace Designer: Custom Rooms](https://designer.webex.com/#/article/CustomRooms) article.

### How do I create a Custom Window Wall?
A **Custom Window Wall** is a wall carrying its own list of windows and openings, placed exactly where you want them along its length. See the [Creating a Custom Window Wall](https://app.vidcast.io/share/cb7990f1-00e7-453f-9eab-c36a96d803c3) video.

1. Go to the **Equipment** tab --> **Walls / Objects** and add a **Custom Window Wall**, then size and position it like any other wall.
2. With the wall selected, click **Edit Windows...** in the **Details** panel. The **Window Editor** opens showing the wall face on, as you would see it standing in the room.
3. Add one of three things along the wall:
   - **Window**: an opening filled with glass, tinted so it reads as glass in the 3D view.
   - **Open Window**: an opening with nothing in it, wall above and below.
   - **Open Doorway**: an opening with nothing in it, open to the floor, with wall above only.
4. Drag each one along the wall, drag its edges to resize, or type exact numbers for width, height, base elevation and distance from the left.
5. **Snap to Objects** lines each opening up with the wall ends and with the others. A magenta guide appears when it snaps. Turn it off with the checkbox on the toolbar.
6. **Duplicate** repeats an opening at the same spacing it already has, which is the fast way to lay out an evenly spaced row of windows. Copy, paste, undo and redo all work as expected.
7. **Close** applies the wall.

**Good to know**
- Each window carries its own color and transparency. Click the colour swatch to change them.
- The solid parts of the wall are worked out from the openings, so there is nothing to line up by hand and no gaps to close.
- The whole wall, openings included, travels in the shareable link and in the design file, and it is sent to the Workspace Designer as real geometry.
- Wall thickness is set on the wall itself in the **Details** panel, not in the Window Editor.

### What are Custom Items and how do I share them?
**Custom Items** let you bundle two or more objects (for example: a video device with its display, a row of chairs, or a Custom Path Shape) into a single reusable unit that you can save to your local library and drop into other rooms.

- **Create:** Select two or more items (or a single **Custom Path Shape**), then choose **Create Custom Item** from the right-click menu or the ellipse (`...`) button next to **Update Item**. A dialog asks for a **Name** (required) and optional **Author** and **Description**.
- **Move and rotate as a unit:** Once created, a Custom Item behaves like a single object. Drag, rotate, or change the layer of the whole bundle at once.
- **Quick Add library:** Saved Custom Items appear as tiles in the **Quick Add** menu (press the space bar). Click a tile to drop a copy at the center of the room. Click the ellipse (`...`) on a tile to rename, edit Author/Description, export, or remove the entry.
- **Unjoin:** To dissolve a Custom Item back into its individual items, select it and click **Unjoin Custom Item** from the ellipse (`...`) menu. This does not remove the template from your library.
- **Storage:** Custom Items are stored in your browser's `IndexedDB` (up to 1,000 Custom Items). They are NOT uploaded to any cloud, and the library is not included in shareable links or room JSON files.

**Sharing Custom Item files:**
- **Export:** With a Custom Item selected on the canvas, click the ellipse (`...`) next to **Update Item** and choose **Export Custom Item** to download a `.vrcCustomItems.json` file. You can also export an entry directly from a Quick Add library tile.
- **Send the file** to a colleague by email, chat, or any other means. It is a small, self-contained JSON file.
- **Import:** To use a `.vrcCustomItems.json` someone shared, either drag-and-drop the file onto the canvas or click **New** --> **Open File**. The Custom Item is added to your local library. If the file contains a single Custom Item, a copy is also placed at the center of the room. A summary dialog shows which entries were saved, were already in your library, or had errors.
- **Custom Items vs Groups:** Both bundle items together so they move and rotate as a unit. Groups are temporary, room-specific bundles (similar to PowerPoint grouping). Custom Items can be saved to your local library and reused across rooms. A Custom Item can live inside a Group, but a Group cannot live inside a Custom Item.

### How is the display coverage for the closest and farthest participants determined?
The Video Room Calculator display default guidance now aligns with Workspace Designer. For a single 16:9 display, the recommended distance is 1x to 3.2x the diagonal measurement. For dual displays, the range extends to 1x to 3.65x the diagonal, allowing for a farther viewing distance since content and participants can be on separate, full screens.

These calculations assume standard business or education usage and are meant for general guidance. Applications requiring fine detail, such as CAD, Excel, or medical imaging, will need the nearest and farthest participants to be closer. Other industry guidelines may vary. When in doubt, an oversized display is better than an undersized one.

### How do the display coverage values compare to the AVIXA DISCAS standard?
The [AVIXA DISCAS](https://www.avixa.org/standards/discas-calculators/discas) formulas are not used directly by the Workspace Designer and not the default for the Video Room Calculator. The Video Room Calculator can be made to use the DISCAS BDM, as described in the next question. The Workspace Designer formula mentioned above aligns with the AVIXA DISCAS standard when standard assumptions are applied. Using the AVIXA DISCAS BDM calculator with a 16:9 display and 3.25% elemental value (the height of a lowercase letter as a percentage of display height), the recommended maximum distance is approximately **3.2× the diagonal measurement**. For dual displays with a 3.7% elemental value, this becomes **3.65× the diagonal**. Similar distances based on screen height apply for 21:9 displays.

For minimum viewing distance, assuming a seated participant is front and center with the display base at or below eye level, the AVIXA formula for 16:9 displays recommends that the closest participant be no nearer than approximately **0.86× the diagonal** (depending on assumptions). However, in typical conference rooms, the closest participant is usually seated at the side of the table rather than directly centered. In such cases, a **1× diagonal** guideline may yield similar results, depending on table width.

The AVIXA DISCAS standard, when properly applied, provides for a wider range of scenarios and may be more appropriate for different use cases. However, it does not directly account for dual displays, the size of on-screen participants during video calls, content scaling when videoconference layouts change, or determining if a participant is in the camera FOV.

### How do I use a custom display coverage based on the AVIXA DISCAS BDM standard?
Use the **Custom Reach Display** under the Equipment tab, which draws its viewing-coverage area per the AVIXA DISCAS Basic Decision Making formulas (ANSI/AVIXA V201.01) instead of the standard Workspace Designer distance guidance.

1. Go to the **Room** tab --> **Settings** and turn on **Workspace Designer partially or non-supported items**. Devices behind this setting carry an asterisk (*) in the equipment menus.
2. Go to the **Equipment** tab --> **Displays** and add a **Custom Reach Display***. (It also appears in the Quick Add menu, press the space bar.)
3. A settings dialog opens where you can set the display diagonal, aspect ratio, % element height, viewer eye level, and the bottom-of-image height. The closest and farthest viewer distances recompute live as you type, and you can reopen the dialog any time from the display's Details panel.

The DISCAS coverage is only drawn in the Video Room Calculator. When exported, the Workspace Designer shows it as a standard display without the custom coverage.

The Video Room Calculator is an independent platform that references the [AVIXA DBM](https://www.avixa.org/resources/display-image-size-calculators/analytical-and-basic-decision-making-calculations) technical standard for calculation purposes. AVIXA is a registered trademark of the Audiovisual and Integrated Experience Association. The Video Room Calculator operates without any official affiliation, sponsorship, or partnership with AVIXA.

### How do I use Layers?
**Layers** organize the objects in a design so you can hide or lock parts of it while you work. A ceiling grid, a background of walls, or another designer's equipment can be temporarily put out of the way without deleting anything. Unlike most tools you may be used to, Layers do not decide which object is drawn on top. See "Levels" below. Layers are found on the **Layers** tab.

Every design starts with two layers that cannot be renamed or deleted:
- **Default**, where everything goes unless you say otherwise.
- **Ceiling**, intended for ceiling microphones, ceiling grids and anything else overhead.

**Using them**
- **Add Layer** at the bottom of the tab creates one of your own. Click a layer's name to rename it.
- **Hide** takes a layer off the canvas. Hidden layers are also left out of the Workspace Designer export, which makes this a quick way to try a design without a set of objects in it.
- **Lock** leaves a layer visible but keeps it from being selected, moved or deleted. Locked layers are dimmed so it is clear why a click does nothing.
- The **select** button on a layer row selects everything on that layer at once, which is handy for moving a whole set of objects together.
- The two buttons on the header row hide or lock every layer at once.
- **Add Items to** at the bottom of the tab decides which layer new objects land on.

**Moving an object to a layer**
Select the object and use the **Layer** dropdown in the **Details** panel. Several objects can be selected and moved together.

**Good to know**
- A layer name travels with each object in the Workspace Designer export, so the grouping survives the round trip.
- Layers are saved in the design file and in the shareable link.
- When copying between browser tabs, only the Default and Ceiling layers are carried across.

### Levels: what decides which object is drawn on top?
Objects are drawn in a fixed stacking order based on what they are, and this cannot be changed. The intent is that a microphone is never buried under the table it sits on. This is separate from two other things it is easily confused with:

- **Z (base elevation)** is the real height of an object above the floor and is what the Workspace Designer uses in 3D. It has no effect on the flat top-down drawing order.
- **Layers** are yours to create and assign, and control what is shown, hidden or locked. See the Layers question above.

### Levels: the drawing order
From top to bottom, here are the different implicit levels of the objects:
- Microphones Level: Microphones, Navigators, Laptops, or other small objects.
- Video Devices Level: Video Devices & Cameras. _Note: PTZ cameras are always placed on top in this level, so a PTZ will be above a Quad Camera._
- Displays Level: Displays, including single, double, or triple displays.
- Chairs Level: Chairs, People, Plants, Doors. _Note: People are always positioned on top in this level when inserted, so people will be above chairs._
- Boxes Level: Box.
- Table Level: Tables, Walls (excluding default walls), Columns, Rows of Chairs, Couch.
- _[Coverage Level: for cameras, mics, and displays. This level is not affected by touch.]_
- Stage Floor Level: Stage Floor, Carpet.
- _[Grid Level: includes default walls]._

**Pro-tip:** A Box and Stage Floor are the same type of Workspace Designer object, but they appear on different levels in the Video Room Calculator. Therefore, you can swap between these two objects to change the level when these objects overlap.

Zoomed into a **Room Part**, walls, columns and doors are drawn above everything else in the room, so structure is never hidden behind whatever sits against it.

### How to export to Cisco Spaces?
Export the design as a DXF and import that into Cisco Spaces. **Save** --> **Export CAD DXF/Cisco Spaces (meters)**, or `ctrl-shift-d`, writes the file. To try it without touching a production map, use the Cisco Spaces mapping demo at [mapsdemo.ciscospaces.io](https://mapsdemo.ciscospaces.io).

**Give every room a Room Name**, including the ones that are not meeting spaces: bathrooms, storage, corridors, everything with walls around it. Where a room has no name Cisco Spaces guesses one, and it usually guesses Quiet Room, so an unnamed store cupboard arrives as a bookable Quiet Room. Type the name into the **Item Label** of each Room Part; the export writes it as text on the `A-AREA-IDEN` layer with the room outline on `A-AREA`, which is what Cisco Spaces reads as the space name.

Walls, doors, furniture and the AV devices all come across on their own named CAD layers, so the imported map has the architecture Cisco Spaces expects alongside the room names.

### Can I import a CAD DXF or DWG file?
No. There is no import for DXF, DWG or any other CAD format, and none is planned.

What works well instead is a picture of the floor plan. Take a screenshot of the drawing, or export it from your CAD tool as a PNG, JPEG or SVG, then load it under **Room** --> **Background** and scale it to the room. From there you can trace walls over it and it becomes an accurate backdrop for the whole design. The image stays in the design file, and **Recent Floor Plans** keeps it in this browser so it can be reapplied to another design.

Export in the other direction does work. **Save** --> **Export CAD DXF/Cisco Spaces (meters)**, or `ctrl-shift-d`, writes an AutoCAD R12 DXF of the design with objects on named layers. It is a simple drawing meant for handing the layout to someone working in CAD, not a full construction drawing.

### How do I turn Snap to Objects on and off?
**Snap to Objects** is on the **More** menu, the `...` button at the right of the toolbar above the canvas. It is on by default.

With it on, a dragged object lines up with the edges and centers of other objects and of the room itself, and a magenta guide shows what it lined up with. It works when resizing as well as moving, and on Groups and Custom Items, where the bundle as a whole does the snapping. It does not combine with **Snap Center to Increment** in the same menu, which snaps to a fixed spacing instead.

The Window Editor has a Snap to Objects checkbox of its own, on its toolbar.

### What does Auto Z Position do?
**Auto Z Position** is on the **More** menu, the `...` button at the right of the toolbar above the canvas. It is on by default.

Z is the height of an object above the floor. With this on, dragging a camera or video device onto a display sets its Z so it sits on top of that display, and dragging a camera onto another video device does the same. It saves setting the height by hand for the most common mountings. Turn it off when you want to place something at a height of your own choosing, and you can always type the value into the **Z** field in the **Details** panel.

### How do I measure a distance in the room?
Turn on the **Measure tool** from the **More** menu, the `...` button at the right of the toolbar above the canvas, or press `ctrl-m`. Click one point then another to read the distance between them. Press `esc` to leave the tool.

## Pro Tips:
- **Hyperlink:** Use the **Save** --> **Shareable Link**, which copies a _hyperlink_ instead of using the URL from the address bar.
- **Duplicate chairs:** Use ctrl-d to copy a row of chairs evenly and quickly.
- **Undo is your friend:** Undo is persistent. If you accidentally close the browser, just re-open and click undo once or twice. Private/Incognito mode may disrupt this.
- **Snap to Objects:** Use **Snap to Objects** on the **More** menu, the `...` button above the canvas, to help align objects better.
- **Copy between tabs:** Want to reuse part of a design? Copy items between tabs. If an object is not pasting to the new tab, paste it once in the original tab first.
- **Unit Conversion:** Number fields allow you to enter one type of unit and convert it to another. For example: 12 in => 1 ft, 12' 3" => 12.25 ft, 1 m => 3.28 ft, 10 cm => 0.33 ft.
- **Using on a Board Pro or Desk Pro** - The Video Room Calculator works on a Board Pro or Desk Pro as a web app. Uses a QR code to get the URL. The Workspace Designer Custom Rooms is not supported on the Desk Pro or Board Pro.
  - The QR code is limited to 2950 characters.
  - To see the QR code on a PC add 'qr' to the querystring parameter, **Save** tab --> **Load QR Code Script** button. For example: https://collabexperience.com/?qr
- Check out other useful (but not easy to find) tools and links on the Video Room Calculator **Resources** tab.

### The Item Label field
Every object has an **Item Label** field in the **Details** panel. It does two jobs.

**As a name.** Whatever you type is that object's label. Labels are shown on the canvas with the **Toggle Labels** button on the toolbar above the canvas, which is the quick way to annotate a design before sharing it. For most objects the label is also sent to the Workspace Designer as that object's comment, so a note written here is still there in 3D.

**As Workspace Designer settings.** Anything you write inside curly brackets `{ }` is treated as JSON and merged directly into that object's Workspace Designer configuration, which is how the Custom Rooms features are reached. Anything outside the brackets stays a plain label.

- Example: [Item Label with custom JSON](https://collabexperience.com/?x=A1v0.1.510b1000c1000~Video+Room+Calc+Label+JSON+example~B000101AG809a199b623~%7B%22scale%22%3A%5B1%2C-1%2C1%5D%7D~WA125a52c33e864~%7B%22color%22%3A%22red%22%2C+%22opacity%22%3A%220.5%22%7D~WD522a626b70c200e200j200~%7B%22color%22%3A%22blue%22%2C+%22rotation%22%3A%5B0.785%2C0%2C0.785%5D%7D~WA1003a0c33e1001~%7B%22hidden%22%3A%22true%22%7D~DA460a199b433g55~Tilted+display+%7B%22rotation%22%3A%5B0.3%2C0%2C0%5D%7D~)
- Common examples:
  - Walls, glass walls or boxes: `{"color":"#FF0000"}`, `{"opacity":"0.5"}` (Note: this is not needed, use the color picker instead)
  - Have the Workspace Designer ignore a video device or its camera coverage: `{"ignore":true}`
  - Change a person's model: `{"model":"man-standing-pen"}`. The default person is `{"model":"woman-standing"}`.
- Much of what once needed hand-written JSON now has a control of its own. **Color** and **Opacity** are in the **Details** panel for the objects that support them, a Custom Path Shape is drawn in the **Path Editor**, and windows are placed in the **Window Editor**. Reach for JSON only when there is no control for what you want.
- Settings the Workspace Designer sent that the Video Room Calculator does not model are kept here as JSON when you import a design, so they survive a round trip untouched. Leave them alone unless you mean to change them.
- No error is given if the JSON does not parse. If it is malformed it is simply treated as plain text.
- Use Label fields sparingly, since they add to the length of a shareable link. Avoid unnecessary spaces.
- The Video Room Calculator and the Workspace Designer use different coordinate and degree systems. Workspace Designer JSON is always in meters, while the Video Room Calculator can be in feet or meters.
- The JSON values and syntax might change without warning as we work out the details of this beta.
- For more details, see the [Workspace Designer: Custom Rooms](https://designer.webex.com/#/article/CustomRooms) documentation.

- **Caution:** Labels are powerful but can create undesired results in the Workspace Designer.

### What is the purple rectangle or question mark square I see after importing from the Workspace Designer?
When the Video Room Calculator does not recognize an object in a Workspace Designer file, it brings the object in as an Unknown object, drawn as a purple rectangle or a purple square with a question mark. Its attributes are kept in the Item Label field, so nothing is lost when the design is exported back to the Workspace Designer.



