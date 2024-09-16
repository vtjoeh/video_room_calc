# video_room_calc 
Video Room Calculator for Cisco video devices by Joe Hughes (beta)
https://collabexperience.com 

### Reasons for posting on github 
1) Post release notes 
2) Post code (code needs major cleanup effort, but anybody can "view-source" from main website)
3) Post roadmap/ideas
4) Get others to join and help in the project
5) Post attribution/licenses
6) Post supporting collateral 
7) Request tracking using github

### Release Notes:

**v0.1.502**
- Full URL query string in address bar now updated dynamically with changes. Copying address bar is similar to clicking on Shareable Link.
- Shareable Link now copies a hyperlink that is name of the room.  If the room does not have a name then "Video Room Calculator" is used.
- RoomOS QR code now automatically updates with changes. Updates are delayed 2-5 second for performance reasons.  QR code blurs during updates.  The QR code is designed for RoomOS web apps on the Board Pro or Desk Pro. QR Code is also accessible in any browser by adding '&qr' to query string parameter.  
- Improvements to Quick Setup menu to keep confusing things from happening.

**v0.1.502**
- Added template examples. 
- Added QR Code for Shareable Link. Only visible on RoomOS.
- Slightly more complex video devices supported where camera and microphone are not located in x/y center of device. Added Room Kit EQX Floor Stand. 

**v0.1.5**- 
Huge update: 
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
(circa 10/2023) Updated table / camera FOV based on more accurate data. 

**v0.0** 
(circa 9/2023) First release.  Table / camera FOV and distances only. 

### License/Attribution 
- Google Fonts: https://fonts.google.com/ license can be found at https://fonts.google.com/attribution
- Konva.js: MIT license can be found at https://github.com/konvajs/konva/blob/master/LICENSE
- DOMPurify: https://github.com/cure53/DOMPurify license can be found at https://github.com/cure53/DOMPurify/blob/main/LICENSE
- kazuhikoarase QR Code Generator: https://github.com/kazuhikoarase/qrcode-generator 

### Roadmap / ideas
Not listed in order of priority or timeline. No warranty or guarantee below features will ever be added. 
- Major code cleanup and documentation. 
- Major UI update.
- Create an intro video.
- Add Navigator/Touch Panel and corresponding layers. 
- Add ability to make shading invisible per a device.
- Add height (z value) for room.
- Add height (z value) per a device.
- Export configuration to JSON file / Import JSON file. 
- Upload background floorplan to draw over. JSON file to include background image. 
- Add labels.
- Add keyboard commands. Arrow keys to move objects. CTRL+C. CTRL+V.
- Further shorten URL when an item repeats itself. 
- Ability to add custom generic devices.  Camera, microphones and displays. 
- Add other room objects. Add a ceiling layer that can be toggled off/on. 
- Add draggable/resizable walls.  Might require an additional layer.
- Windows. Doors.
- Other tables. Rectangle U-Table. Tappered table. 
- MTR only devices to be labeled or selectable. 
- Print out parts list, summary and picture. Format TBD. Options include: HTML to print/PDF. Direct to PowerPoint. Direct to PDF. 
- Snap to grid. Snap to other.
- Add warnings and info for possible design flaws, recommendations or general info.
- Add tooltip with help next to items.
- Create a short intro video.
- Remove dependency on Google Icon/Fonts or shorten download time. 
- Remove dependency on DOMPurify. 

This is a side project. Work is done nights, weekends and holidays.  As of Sept 15, 2024 I'm taking break for a few weeks. 

### Special thanks to those who have tested, gave feedback or were just really patient.
Tanguay Team - JVV, LT, Clay, Troy, Robbie, Brian, Clarence, Matt, Mark, Mike & Mike. 
Bobby McGonigle. 
Win.
Alexis B. 
Julie. Anna, Paul & Joshua. 
*Thank you to everybody who gave feedback or said thank you.*

_Spelling errors, typos, unused functions, incomplete commenting are all purposly inserted as proof this is not written by AI._ 









