# video_room_calc 
Video Room Calculator for Cisco video devices by Joe Hughes (beta)
https://collabexperience.com 

### Release Notes:

**v0.1.503**
- Added [Cisco Ceiling Microphone Pro](https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/collaboration-peripherals/ceiling-microphone-pro-ds.html)
- Updated licenes to MIT Non-AI. 
- Added extra links to resources. 

**v0.1.502**
- Full URL query string in address bar now updated dynamically with changes. Copying address bar is similar to clicking on Shareable Link.
- Shareable Link now copies a hyperlink that is name of the room.  If the room does not have a name, then "Video Room Calculator" is used.
- RoomOS QR code now automatically updates with changes. Updates are delayed 2-5 second for performance reasons.  QR code blurs during updates.  The QR code is designed for RoomOS web apps on the Board Pro or Desk Pro. QR Code is also accessible in any browser by adding '&qr' to query string parameter.  
- Improvements to Quick Setup menu to keep confusing things from happening.

**v0.1.501**
- Added template examples. 
- Added QR Code for Shareable Link. Only visible on RoomOS.
- Slightly more complex video devices supported where camera and microphone are not located in x/y center of device. Added Room Kit EQX Floor Stand. 

**v0.1.5**- 
Huge update: 
- Switched from HTML SVG to HTML canvas. Using Konva.js to select and transform images. 
- Drag and drop.
- Multiple Microphones.
- Multiple Cameras.
- Multiple video devices. 
- Multiple Tables. Resizable.
- Chairs. 
- Undo / Redo. Zoom. Pan. Delete. 
- Toggle "guidances" on/off.
- Replaced SVG file download with ability to download a transparent PNG.
- Backwards compatible with v0.1, except for custom cameras.  Shareable Link URLs created in v0.1 with a custom camera or v0.0 redirect to an archive of the previous version. 

**v0.1** 
(circa 10/2023) Updated table / camera FOV based on more accurate data. Picture  SVG based. 

**v0.0** 
(circa 9/2023) First release.  Table / camera FOV and distances only. Picture SVG based. 

### License/Attribution 
- Google Fonts: https://fonts.google.com/ license can be found at https://fonts.google.com/attribution
- Konva.js: MIT license can be found at https://github.com/konvajs/konva/blob/master/LICENSE
- DOMPurify: https://github.com/cure53/DOMPurify license can be found at https://github.com/cure53/DOMPurify/blob/main/LICENSE
- kazuhikoarase QR Code Generator: https://github.com/kazuhikoarase/qrcode-generator 

### Roadmap / ideas
First 12 items listed are what I would like to do next. There is no warranty or guarantee the below features will ever be added. 
- Major code cleanup and documentation. 
- Create an intro video.
- Add Navigator/Touch Panel and corresponding layers. 
- Add ability to make shading invisible per a device.
- Add height (z value) for room.
- Add height (z value) per a device.
- Export configuration to JSON file / Import JSON file. 
- Upload background floorplan to draw over. JSON file to include background image.
- Other tables. Rectangle U-Table. Tapered table that is resizable on both heads of the table.
- Add labels.
- Add draggable/resizable walls.
- Add windows & doors.
- Work on major UI update. Right click options on canvas. Use more of the canvas real-estate.
- Add warnings and info for possible design flaws, recommendations or general info.
- Add tooltip with help next to items.
- Add keyboard commands. Arrow keys to move objects. CTRL+C. CTRL+V.
- Further shorten URL when an item repeats itself. Decode of this already works, so only the encoding needs to be one. 
- Ability to add custom generic devices.  Camera, microphones and displays. 
- Add other room objects. Add a ceiling layer that can be toggled off/on. Requires additional group/layer. 
- MTR only devices to be labeled or selectable. 
- Print out parts list, summary and picture. Format TBD. Options include: HTML to print/PDF. Direct to PowerPoint. Direct to PDF. 
- Snap to grid. Snap to other objects.
- Remove dependency on Google Icon/Fonts to shorten download time. 
- Remove dependency on DOMPurify and maintain security.
- Ability to change colors for accessibility purposes. 
- Add Cross-view cross sectional view to determine camera height. 
- Add view of the front of room. Important when the camera is above and below displays.  Sometimes next to display is better than below or above. 
- Simulated view from camera (simple 2d view of single person zoom and 2 person zoom).
- Add a PoE calculator for the mics, Navigator and PoE cameras. Include different Cisco switches. 
- Add lobes to the microphones. 
- Create a landing page that points to all things Cisco video device related that is scattered across internet. I own the domain "videoroomcalculator.com" and "collabexperience.com".  For example: Github macros, CE Deploy, roomos.cisco.com, hep.webex.com. 
- See number of video inputs/outputs per a device (HDMI, 3.5 mm audio, Audio Over IP, HDCP support). 
- Links per a device to relevant information. E.g. datasheets.
- Explore options and cost for backend database to save projects and supporting background files. At the moment nothing of value is stored in the cloud except anonymous stats.  Backend database would cost more, need redundancy and security.
- Have smaller devices like microphones auto-scale up in size for large rooms. 

This is a side project. Work is done nights, weekends and holidays.  As of Sept 15, 2024 I'm taking break for a few weeks. 

### Special thanks to those who have tested, gave feedback or were just really patient.
- Tanguay Team - JVV, LT, Clay, Troy, Robbie, Brian, Clarence, Matt, Mark, Mike & Mike. 
- Bobby McGonigle. 
- Win.
- Alexis B. 
- Julie, Anna, Paul & Joshua.
- The Famous One
- *Thank you to everybody who gave feedback or said thank you.*

_Spelling errors, typos, unused functions, incomplete commenting are all purposly inserted as proof this is not written by AI._ 









