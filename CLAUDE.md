# Video Room Calculator - Developer Reference

## Overview

The **Video Room Calculator** is a web-based tool for designing Cisco video collaboration room layouts. It provides a 2D canvas for placing equipment (cameras, microphones, displays, tables, chairs) and integrates with Cisco's Workspace Designer for 3D visualization.

**Author:** Joe Hughes (Cisco)
**Version:** v0.1.631
**License:** MIT NON-AI

---

## Project Structure

```
video_room_calculator/
├── RoomCalculator.html      # Main entry point
├── style.css                # Styles with CSS custom properties
├── CLAUDE.md                # This developer reference
├── TECH_NOTES.md            # Engineering notes & refactor targets
├── TECH_NOTES_KONVA.md      # Konva.js footguns specific to this codebase
├── GIT_WORKFLOW.md          # Branching, tagging, day-to-day cheatsheet
├── README.md                # Release notes & user-facing docs
├── FAQ.md                   # Frequently asked questions
├── LICENSE                  # MIT NON-AI license
├── js/
│   ├── konva.min.js         # Canvas rendering library (third party, minified)
│   ├── constants.js         # Global constants + window.VRC namespace bootstrap (loaded first)
│   ├── data/
│   │   └── workspaceKey.js  # Workspace Designer object map (Phase 2 extract; window.VRC.workspaceKey)
│   ├── util/
│   │   ├── uuid.js          # createUuid() (Phase 2 extract; window.VRC.util)
│   │   └── units.js         # convertToUnit / convertToMeters / convertMetersFeet (Phase 2 extract; window.VRC.util)
│   ├── idbStorage.js        # IndexedDB wrapper (undo/redo + bg image library)
│   ├── roomcalc.js          # Core application logic (~26,000 lines)
│   ├── templates.js         # Pre-built room templates             (lazy-loaded — first new-room dialog open)
│   ├── qrcode.js            # QR code generation                   (lazy-loaded — first QR render)
│   ├── drpDownOverride.js   # Dropdown UI for RoomOS               (lazy-loaded — RoomOS only)
│   ├── dxfWriter.js         # DXF (CAD) writer                     (lazy-loaded — first DXF export)
│   └── dxfBlockLibrary.js   # DXF symbol block library             (lazy-loaded — first DXF export)
├── data/                    # Device specifications
│   ├── README.md            # Documentation for data files
│   ├── videoDevices.json    # Video device specs
│   ├── cameras.json         # Camera specs
│   └── microphones.json     # Microphone & navigator specs
├── assets/
│   ├── images/              # 173 device/furniture images
│   │   └── templates/       # Template preview images
│   ├── Inter-VariableFont.ttf
│   ├── MomentumFontIcon.woff2
│   ├── momentum-icons.css
│   └── favicon.ico
```

There is no build step. Open `RoomCalculator.html` directly in a browser.

The eager-loaded `<script>` order is `konva.min.js` → `constants.js` →
`data/workspaceKey.js` → `util/uuid.js` → `util/units.js` →
`idbStorage.js` → `roomcalc.js`. Every module before `roomcalc.js`
attaches to the shared `window.VRC` namespace (per the convention in
`TECH_NOTES.md`); `roomcalc.js` then aliases the public names back into
local `const` bindings near the top of the file so existing call sites
stay unchanged. See the Phase 2 header comment in `roomcalc.js` and the
IIFE pattern note in `js/data/workspaceKey.js`.

The lazy-loaded scripts (`templates.js`, `qrcode.js`,
`drpDownOverride.js`, `dxfWriter.js`, `dxfBlockLibrary.js`) are pulled
in on demand by `loadScriptOnce()` and are *not* listed in
`RoomCalculator.html`.

`TECH_NOTES.md` documents the long-term refactor direction. Read it
before doing structural changes. `GIT_WORKFLOW.md` describes the
`main` / `next` branching model.

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript** | Core application logic |
| **Konva.js** | HTML5 Canvas rendering, drag-and-drop, transformations |
| **DOMPurify** | HTML sanitization (loaded via CDN) |
| **CSS3** | Styling, responsive design, animations |
| **SVG** | Some icons and graphics |

---

## Architecture

### Core Data Structure: `roomObj`

The entire room state is stored in a single object (`roomObj`) defined in `roomcalc.js:77-108`:

```javascript
roomObj = {
  roomId: "uuid",           // Unique room identifier
  name: "Room Name",        // Display name
  version: "v0.1.631",      // App version
  unit: "feet",             // "feet" or "meters"
  room: {
    roomWidth: 26,          // In current unit
    roomLength: 20,
    roomHeight: ""          // Optional
  },
  software: "",             // "mtr" or "webex"
  authorVersion: "",        // User-defined version
  items: {
    videoDevices: [],       // Cameras, Room Bars, etc.
    chairs: [],
    tables: [],
    stageFloors: [],
    boxes: [],
    displays: [],
    speakers: [],
    microphones: [],
    touchPanels: []
  },
  workspace: {
    removeDefaultWalls: false,
    addCeiling: false
  },
  roomSurfaces: {           // Wall configurations
    leftwall: { type: 'regular', acousticTreatment: true },
    videowall: { type: 'regular', acousticTreatment: false },
    rightwall: { type: 'regular', acousticTreatment: false },
    backwall: { type: 'regular', acousticTreatment: false }
  },
  layersVisible: {
    grShadingCamera: true,
    grDisplayDistance: true,
    grShadingMicrophone: true,
    gridLines: true,
    grLabels: false
  },
  layers: [                   // VRC Layer system for organizing items (distinct from Konva layers)
    { name: 'Default',  visible: true, locked: false, layerid: '0' },   // reserved - cannot be deleted
    { name: 'Ceiling',  visible: true, locked: false, layerid: '1' },   // reserved - cannot be deleted
    { name: 'Furniture', visible: true, locked: false, layerid: 'uuid' } // custom layers use createUuid()
  ],
  // items carry an optional data_layerId = layerid string; omitted for Default layer ('0')
  groups: [                   // VRC Group system (PowerPoint-style grouping)
    {
      groupid: "uuid",
      name: "Group 1",
      data_layerId: "0",      // VRC layer shared by all members (matches item.data_layerId convention)
      x: 1.5,                 // bounding rect top-left, in current unit
      y: 3.84,
      width: 2.5,
      height: 3.5,
      rotation: 0,
      data_zPosition: 0,      // lowest z-position of members
      groupMembers: ["item-uuid-1", "item-uuid-2"]
    }
  ]
  // items carry an optional data_groupId = groupid string; omitted if not in a group
}
```




The canvas uses multiple Konva layers for rendering (defined around line 57-500):

| Layer | Purpose |
|-------|---------|
| `stage` | Main Konva stage container |
| `layerGrid` | Grid lines and room outline |
| `layerBackgroundImageFloor` | Floor plan background images |
| `layerTransform` | All draggable objects |
| `layerSelectionBox` | Selection rectangle |
| `grShadingCamera` | Camera FOV visualization |
| `grShadingMicrophone` | Microphone coverage visualization |
| `grDisplayDistance` | Display viewing distance lines |
| `grLabels` | Item labels |

### Groups (within layerTransform)

| Group | Purpose |
|-------|---------|
| `groupVideoDevices` | Cameras, Room Bars, Boards |
| `groupMicrophones` | Table/Ceiling mics |
| `groupChairs` | Chairs and seating |
| `groupTables` | Tables and surfaces |
| `groupDisplays` | Screens and monitors |
| `groupStageFloors` | Stage/floor elements |

---

## Critical Data Flow: Item Updates

**IMPORTANT:** When adding new `data_*` attributes to items, you must update THREE places:

### Flow: Item Update → Konva Node → roomObj

1. **User clicks Update** → `updateItem()` reads form values
2. **Node rebuilt** → `insertShapeItem()` or `insertTable()` creates Konva node
3. **Custom data added** → `data_*` attributes set on the Konva node object
4. **Sync to roomObj** → `canvasToJson()` reads `data_*` from nodes and writes to `roomObj.items`

### Adding a new data_* attribute requires changes in:

| Location | Function | Purpose |
|----------|----------|---------|
| `insertShapeItem()` ~line 9831 | `imageItem.data_xxx = attrs.data_xxx` | Set on Konva node for non-table items |
| `insertTable()` ~line 7793 | `tblWallFlr.data_xxx = attrs.data_xxx` | Set on Konva node for tables/walls |
| `canvasToJson()` → `updateRoomObjFromTrNode()` | `itemAttr.data_xxx = node.data_xxx` | Read from node, write to roomObj — **NOT** in the dead `getNodesJson()` defined inside `canvasToJson()`; that nested function is never called and is annotated as such in source |
| `copyToCanvasClipBoard()` | `newAttr.data_xxx = node.data_xxx` | Preserve during copy/paste |

### Why this matters:
- Konva only supports standard attributes (x, y, width, rotation, etc.)
- Custom `data_*` attributes are stored directly on the node object
- `canvasToJson()` calls `updateRoomObjFromTrNode()`, which syncs the current `tr.nodes()` selection back to `roomObj.items` (the source of truth). For brand-new items (e.g. just pasted), this is the *only* writer that creates the `roomObj.items[]` entry, so the field MUST be added to its `itemAttr` builder. Mirror it on both code paths inside that function: the `roomObjItemsMap.get(...)`-hit branch (existing item — patch on the existing entry) AND the `else` branch (new item — push a fresh `itemAttr`).
- If you skip any step, the attribute will appear to save but then disappear when clicking another item, OR — more subtly — round-trip correctly for items created in-place but vanish for items created via paste/duplicate (the bug pattern that broke group URL persistence on copy/paste in May 2026).

---

## Key Functions Reference

### Initialization & Loading

| Function | Line | Description |
|----------|------|-------------|
| `onLoad()` | 3346 | Main entry point, parses URL, initializes canvas |
| `getQueryString()` | 2522 | Parses URL parameters into roomObj |
| `parseShortenedXYUrl()` | 2734 | Decodes compressed URL format |
| `loadTemplate()` | - | Loads a template by URL string |

### Drawing & Rendering

| Function | Line | Description |
|----------|------|-------------|
| `drawRoom()` | 4484 | Main redraw function |
| `kDrawGrid()` | 4162 | Draws grid lines |
| `drawOutsideWall()` | 3975 | Renders room walls |
| `clearShapeNodesFromStage()` | 4333 | Clears canvas for redraw |

### Item Management

| Function | Line | Description |
|----------|------|-------------|
| `updateItem()` | - | Updates selected item properties |
| `duplicateItems()` | 5878 | Duplicates selected items |
| `deleteTrNodes()` | - | Deletes selected items |
| `copyItems()` | 5780 | Copies to clipboard |
| `pasteItems()` | 5804 | Pastes from clipboard |

### Undo/Redo

| Function | Line | Description |
|----------|------|-------------|
| `btnUndoClicked()` | 5598 | Handles undo |
| `btnRedoClicked()` | 5617 | Handles redo |
| `enableBtnUndoRedo()` | 5632 | Updates button states |

### Groups

| Function | Line | Description |
|----------|------|-------------|
| `createGroup(nodesToGroup?)` | 13933 | Groups current selection (or supplied nodes) into a new VRC Group |
| `ungroupItems(groupId, keepItems)` | 13884 | Dissolves group; `keepItems=false` also destroys members |
| `ungroupSelectedItems()` | 14031 | Calls `ungroupItems(..., true)` for all groups in selection |
| `insertGroupRect(groupObj)` | 14048 | Creates the Konva Rect (`fill:'#8FD9FB'`, `stroke:'blue'`, `opacity:0` by default; `listening:false`, `draggable:true`; no per-rect drag handlers; rides in `tr.nodes()`). Selection visual is opacity-only — `updateTrNodesShading()` raises opacity to 0.2 on select, `removeShadingTrNodes()` drops it back to 0 on deselect |
| `updateGroupBounds(groupId)` | 264 | Recalculates group rect bounds from member `getMemberBoundingRect()` (matches the Transformer's tight blue box exactly) |
| `getMemberBoundingRect(node)` | 244 | `node.getClientRect({ skipShadow: true, relativeTo: layerTransform })` — same call the Transformer uses internally; correctly handles rotation, stroke, image offsets, and the `smallItemsHighlight` outline trick |
| `getGroupById(groupId)` | 226 | Finds a group object in `roomObj.groups` |
| `getGroupMemberNodes(groupId)` | 252 | Returns member Konva nodes across all item groups |
| `ensureGroups(obj?)` | 231 | Ensures `roomObj.groups` array exists |
| `expandSelectionForGroups()` | 11939 | Expands `tr.nodes()` to `[rect, ...members]` whenever any group-related node is selected |
| `getActiveGroupSelection(nodes?)` | 312 | Returns `{ rectNode, group, groupId }` when the selection is exactly one Group rect plus only members of that same group; `null` otherwise. Used by `enableCopyDelBtn()` to recognise a "single conceptual item" Group selection and route to the single-item Details panel |
| `getRotatedRectCenter(rectNode)` | 334 | Visual centre of a (possibly rotated) Konva.Rect in `layerTransform`-local coords. Used as the rotation pivot for `updateGroupItem()` |
| `rotateNodeAroundPoint(node, cx, cy, deltaR)` | 353 | Rigid rotation of a Konva node around an arbitrary parent-space point (rotates origin around the point AND increments the node's own rotation by deltaR) |
| `populateGroupDetails(rectNode)` | 394 | Renders the Details panel for a Group: shows Label/Layer/X/Y/Z/Rotation, hides irrelevant divs, disables Width/Length |
| `refreshGroupDetailsFromCanvas()` | 372 | Lightweight live-refresh of the Group's X / Y / Rotation / Width / Length form inputs from the rect's current canvas state. Hooked into `tr.on('dragmove')`, `tr.on('transform')`, `tr.on('dragend')`, `tr.on('transformend')` and `followGroupDragFromMember()` so the panel tracks the canvas while the user drags or rotates the group. No-op when the active selection isn't a single Group bundle |
| `updateGroupItem(group)` | 455 | Group fast-path inside `updateItem()`: applies X/Y/Z deltas to all members + rect, rotates members rigidly around the rect centre, and cascades label/layer changes. Z delta uses `Number(m.data_zPosition) \|\| 0` per member so missing/NaN values are treated as 0. Also calls `updateShading()` per-member so FOV/audio/display-distance/labels follow |
| `beginGroupDragFollow(node)` | 184 | Captures the pre-drag snapshot of every sibling + Group rect. **MUST be called from `dragstart`**, not `dragmove` — by the first dragmove `target.x()` has already advanced past its pre-drag value, baking that offset into the snapshot and causing the rect/siblings to drift behind by the first-frame jump |
| `followGroupDragFromMember(node)` | 219 | Member-direct drag follower; shifts siblings + rect by absolute delta from snapshot. Calls `updateShading(sibling)` for every moved member (skipping the Group rect) so each sibling's `#fov~` / `#audio~` / `#dispDist~` / `#speaker~` / `#label~` coverage tracks the move. Falls back to `beginGroupDragFollow()` if no snapshot exists |
| `endGroupDragFollow()` | 257 | Clears the drag-follow snapshot (called from all `dragend` paths) |

### URL & Sharing

| Function | Line | Description |
|----------|------|-------------|
| `createShareableLink()` | 4961 | Generates shareable URL |
| `copyLinkToClipboard()` | 2225 | Copies link to clipboard |
| `createShareableLinkItem()` | 5135 | Encodes single item |

### File Operations

| Function | Line | Description |
|----------|------|-------------|
| `downloadRoomObj()` | - | Downloads VRC JSON |
| `downloadFileWorkspace()` | - | Exports to Workspace Designer format |
| `downloadCanvasPNG()` | 5330 | Downloads PNG image |
| `routeUploadedFileText()` | - | Detects file format (VRC JSON / WD JSON / xConfig .txt) and routes to correct importer. Used by both file picker and drag-and-drop. |
| `parseXConfigText()` | - | Parses Cisco xConfiguration .txt content into `{cameras, microphones}` arrays |
| `importXConfigFile()` | - | Builds a fresh roomObj from a parsed xConfiguration dump |
| `exportXConfigFile()` | - | Reverse of `importXConfigFile()` — writes the current room out as an xConfiguration .txt download. Bound to `Ctrl/Cmd+Shift+E`. |

### Unit Conversion

| Function | Line | Description |
|----------|------|-------------|
| `convertMetersFeet()` | 2401 | Converts between units |
| `convertToMeters()` | 2278 | Normalizes to meters |
| `convertToUnit()` | 1868 | Converts value to current unit |

---

## HTML Structure

### Main Layout (Three-Column)

```
┌─────────────────────────────────────────────────────────┐
│                    ContainerHeader                       │  <- Fixed top bar
├──────────────┬─────────────────────────┬────────────────┤
│   sidebar    │   ContainerRoomSvg      │                │
│              │   ┌─controlButtons─┐    │                │
│  Room Tab    │   │ [cam][mic][dsp]│    │                │
│  Equipment   │   └────────────────┘    │                │
│  Details     │   ┌─scroll-container─┐  │                │
│              │   │                   │  │                │
│              │   │   Canvas (Konva) │  │                │
│              │   │                   │  │                │
│              │   └───────────────────┘  │                │
└──────────────┴─────────────────────────┴────────────────┘
```

### Key HTML Element IDs

| ID | Purpose |
|----|---------|
| `ContainerHeader` | Top navigation bar |
| `sidebar` | Left panel with tabs |
| `ContainerRoomSvg` | Canvas container |
| `canvasDiv` | Konva stage mount point |
| `scroll-container` | Scrollable canvas wrapper |
| `controlButtons` | Toolbar above canvas |

### Dialog Modals

| ID | Purpose |
|----|---------|
| `newRoomDialog` | New room / templates dialog |
| `dialogSave` | Save/export options |
| `dialogQuestions` | Help and documentation |
| `modalWorkspace` | Workspace Designer preview |
| `dialogQuickAdd` | Quick add search (spacebar) |

---

## CSS Organization

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.ContainerHeader` | Fixed black header bar |
| `.ContainerInputsFeedback` | White panel containers |
| `.tabcontent` | Tab panel content |
| `.subtabcontent` | Nested tab content |
| `.inputField` | Form field wrapper |
| `.button` | Primary button style |
| `.btn` | Icon button in toolbar |
| `.button-group` | Grouped toolbar buttons |
| `.flexItems` | Equipment menu items |
| `.dialog` | Modal dialog base |
| `.tooltip` | Hover tooltip |

### CSS Variables

```css
:root {
  --active: #0352a6;  /* Primary blue color */
}
```

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| `max-width: 900px` | Sidebar stacks below canvas |
| `max-width: 783px` | Full-screen dialogs |
| `max-width: 650px` | Hide header text, icon-only |
| `max-width: 405px` | iPhone SE specific adjustments |

---

## Workspace Designer Integration

The app exports to Cisco's Workspace Designer using `workspaceKey` mappings (lines 223-427). Each device type maps to a Workspace Designer object:

```javascript
workspaceKey.roomBar = {
  objectType: 'videoDevice',
  model: 'Room Bar',
  color: 'light',
  mount: "wall",
  yOffset: 0.032
};
```

**Coordinate System Differences:**
- VRC x = Designer x
- VRC y = Designer z
- VRC data_zPosition = Designer y
- VRC degrees = Designer -1*(radians)

---

## URL Encoding Format

The shareable link uses a compressed format. **IMPORTANT:** Uppercase letters are item type prefixes, lowercase letters are item attributes. Do not confuse them.

### URL Structure

```
?A1v0.1.631b2600c2000e0f300~RoomName~B10010100C~v1.0~D1a1E2F0G0AB150a200b90c53d6f450...
```

### Room-Level Parameters (appear once at start)

| Code | Type | Meaning |
|------|------|---------|
| `A` | Prefix | Unit: `A0`=meters, `A1`=feet |
| `v` | Prefix | Version string (e.g., `v0.1.631`) |
| `b` | Param | Room width in mm (e.g., `b2600` = 2600mm) |
| `c` | Param | Room length in mm |
| `e` | Param | Software: `e0`=Webex, `e1`=MTR |
| `f` | Param | Room height in mm (optional) |
| `~text~` | Delim | Room name (URL encoded, spaces as `+`) |
| `B` | Prefix | Visibility flags (8-digit binary string) |
| `C~text~` | Prefix | Author version (optional) |

### Visibility Flags (`B` prefix)

`B` is followed by 8 binary digits (0 or 1):

| Position | Meaning |
|----------|---------|
| 0 | Camera coverage visible |
| 1 | Display distance visible |
| 2 | Microphone coverage visible |
| 3 | Grid lines visible |
| 4 | Add ceiling (Workspace Designer) |
| 5 | Remove default walls |
| 6 | Labels visible |
| 7 | Speaker coverage visible |

Example: `B10010100` = camera on, display off, mic on, grid off, ceiling on, walls on, labels off, speaker off

> **Note:** VRC layers are **not** encoded inside the `B` section. They are
> emitted at the room level using the `L{num}` prefix (e.g., `L20~New+Layer~`).
> See [Layer URL Encoding](#layer-url-encoding) below for the canonical spec.
>
> Example URL fragment with two custom layers:
> `...B100100000L20~New+Layer~L21~New+Layer+2~SA223a190`

### Wall Configuration Prefixes

| Prefix | Wall |
|--------|------|
| `D` | Left wall |
| `E` | Right wall |
| `F` | Video wall (front) |
| `G` | Back wall |

Wall values: `0`=regular, `1`=glass, `2`=window
Sub-attributes: `a1`=acoustic treatment, `b0`/`b1`/`b2`=door position (left/center/right)

Example: `D1a1b1` = Left wall is glass with acoustic treatment and center door

### Item Type Prefixes (UPPERCASE)

Each device/furniture type has a 2-character uppercase key:

**Video Devices (A_):**
| Key | Device |
|-----|--------|
| `AB` | Room Bar |
| `AC` | Room Bar Pro |
| `AD` | Room Kit EQX: Wall Mount |
| `AE` | Room Kit EQ: Quad Camera |
| `AF` | _Kit EQ: Quad Cam Extended (deprecated) |
| `AG` | _Room Kit EQ: PTZ 4K Camera (deprecated) |
| `AH` | _Room Kit EQ: Quad+PTZ Extended (deprecated) |
| `AI` | Room Kit Pro: Quad Camera |
| `AJ` | Board Pro 55* |
| `AK` | Board Pro 75* |
| `AL` | Board Pro 55 G2: Wall Mount |
| `AM` | Board Pro 75 G2: Wall Mount |
| `AN` | Desk [RoomOS] |
| `AO` | Desk Pro |
| `AP` | Desk Mini [RoomOS] |
| `AQ` | Room 55* |
| `AR` | Room Kit Mini* |
| `AS` | Room Kit* |
| `AT` | Virtual Lens Bar Pro |
| `AU` | Room Kit EQX: Floor Stand |
| `AV` | Board Pro 55 G2: Floor Stand |
| `AW` | Board Pro 75 G2: Floor Stand |
| `AX` | Room Kit EQX: Wall Stand |
| `AY` | Board Pro 75 G2: Wheel Stand |
| `AZ` | Board Pro 55 G2: Wheel Stand |
| `BA` | Board Pro 55 G2: Wall Stand |
| `BB` | Board Pro 75 G2: Wall Stand |

**Cameras (C_):**
| Key | Camera |
|-----|--------|
| `CA` | Precision 60 Camera* |
| `CB` | _PTZ 4K Camera* (deprecated) |
| `CC` | Quad Camera |
| `CD` | _Quad Cam Extended (deprecated) |
| `CE` | _Quad+PTZ Extended* (deprecated) |
| `CF` | _Room Vision PTZ (deprecated) |
| `CG` | _PTZ 4K & Bracket (deprecated) |
| `CH` | Room Vision PTZ Cam & Bracket |
| `CI` | PTZ 4K Cam & Bracket |

**Microphones/Peripherals (M_):**
| Key | Device |
|-----|--------|
| `MA` | Ceiling Microphone Pro |
| `MB` | Table Microphone |
| `MC` | Table Microphone Pro |
| `MD` | Ceiling Microphone |
| `ME` | Table Navigator |
| `MF` | Wall Navigator |
| `MG`-`MX` | Various peripherals (headsets, webcams, phones, etc.) |

**Tables (T_):**
| Key | Table Type |
|-----|------------|
| `TA` | Rectangle Table |
| `TB` | Ellipse Table |
| `TC` | Stadium Table |
| `TD` | Boat Table |
| `TE` | Trapezoid Table |
| `TF` | Curved Table |

**Walls/Shapes (W_):**
| Key | Shape |
|-----|-------|
| `WA` | Wall |
| `WB` | Glass Wall |
| `WC` | Column Rectangle |
| `WE` | Door Left |
| `WF` | Door Right |
| `WG` | Door Double |
| `WH` | Box |
| `WI` | Stage Floor |
| `WJ` | Column Cylinder |
| `WK` | Sphere |
| `WL` | Path Shape |

**Chairs (S_):**
| Key | Chair Type |
|-----|------------|
| `SA` | Chair |
| `SB` | Row of Chairs |
| `SC` | Person Standing |

**Displays (D_):** *(Note: `D` alone is also wall prefix - context matters)*
| Key | Display Type |
|-----|--------------|
| `DA` | Single Display |
| `DB` | Dual Display |
| `DC` | Triple Display |
| `DD` | Display 21:9 |

### Item Attribute Codes (lowercase)

After an item type prefix, lowercase letters encode attributes:

| Letter | Attribute | Format | Notes |
|--------|-----------|--------|-------|
| *(none)* | x position | Number | First number after prefix (×100, in mm) |
| `a` | y position | Number | ×100, in mm |
| `b` | z position (elevation) | Number | ×100, in mm (data_zPosition) |
| `c` | width | Number | ×100, in mm |
| `d` | length | Number | ×100, in mm |
| `e` | height | Number | ×100, in mm |
| `f` | rotation | Number | ×10, in degrees |
| `g` | diagonal inches | Number | Display size |
| `h` | corner radius | Number | ×100, table corner radius |
| `i` | corner radius right | Number | ×100, right side corner radius |
| `j` | vertical height | Number | ×100, data_vHeight |
| `k` | trapezoid narrow width | Number | ×100, data_trapNarrowWidth |
| `l` | role | Index | Camera/display role (0-based index) |
| `m` | color | Index | Device color (0-based index) |
| `n` | hidden shading | Decimal | Bitfield for FOV/audio/display visibility |
| `o` | tilt | Number | ×10, data_tilt |
| `p` | slant | Number | ×10, data_slant |
| `q` | mount | Index | Mount type (0-based index) |
| `r` | path shape points | Numbers | Space-separated point values (×100, in mm) for pathShape |
| `s` | group reference | Number | Points at the room-level `H{n}` block. Omitted when not in a group. When present, the per-item `ll` is also omitted (group's `ll` covers all members) |
| `ll` | layer number | Number | VRC layer reference: `ll1`=Ceiling, `ll20`+ = custom layers. Omitted for Default (0) and on items that carry `s` |
| `~text~` | label | String | data_labelField (URL encoded) |

**AVAILABLE for future ITEM use:** `t`, `u`, `v`. (`w`/`x`/`y`/`z`/`h` are used inside `H{n}` blocks for group geometry; the parser keys by `sid` so they could still be reused on items, but prefer `t`/`u`/`v` first.)

**Reserved room-level prefixes:** `A` (metadata+unit), `B` (visibility), `C` (authorVersion), `D`/`E`/`F`/`G` (walls), `L` (layers), `H` (groups). Available: `I`, `J`, `K`, `N`, `O`, `P`, `Q`, `R`, `U`, `V`, `X`, `Y`, `Z`. (`M`/`S`/`T`/`W` are item-type prefix families.)

### Layer URL Encoding

VRC Layers (not Konva layers) are encoded at the **room level** using the `L` prefix:

| Format | Meaning |
|--------|---------|
| `L0v0` | Default layer hidden (`visible=false`) — only emitted when non-default |
| `L0k1` | Default layer locked (`locked=true`) — only emitted when non-default |
| `L0v0k1` | Default layer hidden AND locked |
| `L1v0` / `L1k1` / `L1v0k1` | Same flags applied to the Ceiling layer |
| `L20~Name~` | Custom layer number 20, name "Name", visible=true, locked=false |
| `L20v0~Name~` | Layer 20 with `visible=false` (sub-attribute `v0`) |
| `L20k1~Name~` | Layer 20 with `locked=true` (sub-attribute `k1`) |
| `L20v0k1~Name~` | Layer 20, hidden and locked |

- Custom layers are numbered starting at **20** (L20, L21, …)
- **L0 (Default)** and **L1 (Ceiling)** are reserved layers and are normally **implicit** (not encoded), to keep URLs short
- Reserved layers L0 and L1 are encoded **only when they are at non-default state** — i.e., when `visible=false` OR `locked=true`. If a reserved layer is `visible=true` AND `locked=false`, it is omitted from the URL.
- Reserved layer entries do **not** include a `~name~` block (their names are fixed: "Default", "Ceiling")
- Numbers 2–19 are reserved for future built-in layers
- Items reference their layer with `ll{number}` (e.g., `ll20`, `ll1` for Ceiling)
- If an item has `ll{n}` but no matching `L{n}`, a layer named `"Layer {n}"` is auto-created
- Layer `visible` defaults to `true`; only encoded if `false` (sub-attribute `v0`)
- Layer `locked` defaults to `false`; only encoded if `true` (sub-attribute `k1`)

### Example Decoded

```
AB150a200b90c53d6f450m1~My+Label~
```

| Part | Meaning |
|------|---------|
| `AB` | Room Bar (item type) |
| `150` | x = 1.50m (150/100) |
| `a200` | y = 2.00m |
| `b90` | z = 0.90m (elevation) |
| `c53` | width = 0.53m |
| `d6` | length = 0.06m |
| `f450` | rotation = 45° (450/10) |
| `m1` | color index 1 (Carbon Black) |
| `~My+Label~` | label = "My Label" |

### Example with a Group + custom Layer

```
L20~Furniture~H1x140y180w180h300ll20~My+Group~AB150a200s1~Bar+A~MB300a400s1~Mic~
```

| Part | Meaning |
|------|---------|
| `L20~Furniture~` | Custom layer #20 named "Furniture" (visible, unlocked) |
| `H1x140y180w180h300ll20~My+Group~` | Group #1: rect at (1.40, 1.80) m, 1.80 × 3.00 m, on layer 20, rotation 0, named "My Group" |
| `AB150a200s1~Bar+A~` | Room Bar at (1.5, 2.0) m, member of group 1 (no `ll` — inherited from H1's `ll20`) |
| `MB300a400s1~Mic~` | Table Microphone at (3.0, 4.0) m, also member of group 1 |

After parse: `roomObj.groups[0]` gets `x`/`y`/`width`/`height` directly from the H block (rect renders correctly on frame 1), and `data_layerId = <Furniture layerid>`. Both items inherit the same `data_layerId` via `s1`. `groupMembers` is rebuilt post-pass. `data_zPosition` defaults to `0` (omitted from H block).

### Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `createShareableLink()` | 5039 | Builds complete URL |
| `createShareableLinkItem()` | ~5220 | Encodes single item |
| `createShareableLinkItemShading()` | 5346 | Encodes `B` visibility flags |
| `parseShortenedXYUrl()` | 2734 | Decodes URL back to roomObj |

### Adding New Attributes

When adding new item attributes:
1. Use next available lowercase letter (`t`, `u`, etc.)  — `r` is taken by path points, `s` is taken by group reference, `ll` is taken by layer number
2. Only encode non-default values to save URL space
3. Update both `createShareableLinkItem()` and `parseShortenedXYUrl()`
4. Ensure backwards compatibility (old URLs without new attribute use defaults)

### Group URL Encoding

VRC Groups serialize via the room-level `H{n}` prefix and the per-item
`s{n}` reference. `H` blocks are emitted after `L` (layer) blocks and
before items, so `ll` and `s` references resolve in-order.

#### Format

`H{num}x{x×100}[y{y×100}][z{z×100}]w{w×100}[h{h×100}][ll{layerNum}][f{rot×10}]~name~`

| Attr | Meaning | Omitted when |
|------|---------|--------------|
| `x{n}` / `w{n}` | Group rect X / width (×100) | always emitted |
| `y{n}` / `h{n}` | Group rect Y / height (×100) | `0` |
| `z{n}` | `data_zPosition` (×100) | `0` |
| `ll{n}` | Layer ref (same numbering as item `ll`) | Default layer (`'0'`) |
| `f{n}` | Rotation (×10, degrees) | `0` |
| `~text~` | Group name (URL-encoded) | always emitted |

`groupMembers` is rebuilt post-parse from items whose `data_groupId`
matches the group's `groupid`, so `H` block / item ordering doesn't matter.

#### Item rule: `s` suppresses `ll`

When an item is in a group, the encoder emits `s{n}` and **omits** the
per-item `ll` — the group's `H` block already encodes the layer, and
members always share their group's layer (`createGroup()` /
`updateItemLayer()` enforce this). The decoder inherits `data_layerId`
from the group when only `s` is present; if a hand-edited URL has both,
per-item `ll` wins. Items NOT in a group emit `ll` as before.

#### Why x/y/z/w/h are explicit (not derived)

Item `Konva.Image` nodes are added to their parent groups inside the
async `imageObj.onload` callback (see line ~15042). So at draw time,
`getGroupMemberNodes()` returns empty and any bounds recompute bails
out. Encoding bounds directly in the URL renders the rect correctly on
frame 1 and makes JSON ↔ URL roundtrip lossless. `updateGroupBounds()`
is still called in `roomObjToCanvas()` as a defensive recompute, but
**only when `g.width` or `g.height` is missing** — so partial-load
races (cached images) can't clobber correct URL-supplied bounds.

#### Numbering

`_groupUrlEncodeMap = {}` (groupid → 1, 2, 3, …) is rebuilt each
`createShareableLink()` call. Flat, no reserved range. Empty groups are
skipped on encode and dropped on decode.

#### Backwards compat

Old URLs without `H` / `s` load cleanly into a room with no groups.
Layer encoding is unchanged.

#### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Encoder map | `_groupUrlEncodeMap` global next to `_layerUrlEncodeMap` |
| Encoder room-level | `createShareableLink()` — after `L{n}` block |
| Encoder item-level + `ll` suppression | `createShareableLinkItem()` — before label tilde |
| Parser room-level | `parseShortenedXYUrl()` — `else if (item.sid === "H")` branch |
| Parser item-level | `parseShortenedXYUrl()` — `if ('s' in item)` after per-item `ll` |
| Post-parse member rebuild | `parseShortenedXYUrl()` — before `return output;` |
| Defensive bounds rebuild | `roomObjToCanvas()` — guarded by `if (!g.width \|\| !g.height)` |

---

## VRC Group System

VRC Groups bundle multiple canvas items so they move and rotate as a unit (PowerPoint-style). Groups are a **logical grouping** separate from Konva.js layers.

### Concept

A VRC Group lets the user:
- **Move** all member items together by dragging the Group rect
- **Rotate** all member items together around the Group rect center
- **Delete** the whole group (group rect + all members) in one operation
- **Ungroup** (dissolve) without losing items (Ctrl/Cmd+Shift+G)

### Data Structure

```javascript
roomObj.groups = [
    {
        groupid: "uuid",          // unique identifier (the group's own UUID; stays as `groupid` for parallelism with `roomObj.layers[].layerid`)
        name: "Group 1",          // display name (editable)
        data_layerId: "0",        // VRC layer all members share (matches item.data_layerId convention)
        x: 1.5,                   // top-left of bounding rect, in current unit
        y: 3.84,
        width: 2.5,               // outer bounds in current unit
        height: 3.5,
        rotation: 0,              // degrees
        data_zPosition: 0,        // lowest z of all members
        groupMembers: ["uuid1", "uuid2"]  // item IDs
    }
]
```

Each item in `roomObj.items.*` carries:
```javascript
item.data_groupId = "groupid-string"  // omitted if not in a group (matches the node.data_groupId Konva attribute)
```

On the Konva node:
```javascript
node.data_groupId = "groupid-string"  // null if not in a group
```

### Selection model

The Group rect **always travels with its members in `tr.nodes()`**. Once any group-related node is selected, `expandSelectionForGroups()` adds the rect plus every member, and Konva's Transformer then moves and rotates the whole bundle natively (preserving relative positions).

- **Group rect**: `listening: false` (passive visual anchor), `draggable: true` (so the Transformer can carry it).
- **Member items**: `listening: true` (the user clicks any member to initiate the group selection), `draggable: true`.
- The user typically clicks any member item to select the group; the selection then expands to `[rect, ...members]`.

### Drag behaviour: Transformer drag vs. member-direct drag

There are two distinct drag paths to keep in mind:

1. **Transformer drag** — user grabs the Transformer's bounding box. `tr.isDragging() === true`. Konva moves every node in `tr.nodes()` natively, preserving relative positions. No manual sync is needed.
2. **Member-direct drag** — user click-drags directly on a single member. Konva's drag system moves only that one node; siblings + Group rect would otherwise stay put. The member's **`dragstart`** handler calls `beginGroupDragFollow(node)`, which snapshots the pre-drag positions of every sibling + the Group rect. The member's **`dragmove`** handler then calls `followGroupDragFromMember(node)`, which applies absolute deltas to all siblings + the Group rect AND calls `updateShading(sibling)` for every moved member (skipping the Group rect) so each sibling's `#fov~` / `#audio~` / `#dispDist~` / `#speaker~` / `#label~` coverage tracks the move. Both helpers no-op when `tr.isDragging()` is true to avoid double-shifting during Transformer drags.

**Why snapshot in `dragstart`, not `dragmove`?** By the first dragmove fires, Konva has already advanced the dragged node's `x()` / `y()` past their pre-drag values (the few-pixel jump it takes for Konva to recognise a drag). Snapshotting at that point bakes the offset into `startPos`, so every subsequent `dx = target.x() - startPos.x` underreports the true delta by exactly that initial jump — and the rect/siblings drift behind the dragged member by that amount for the rest of the drag. `dragstart` fires before any positional change, so capturing then keeps `startPos` at the true pre-drag value and the deltas stay accurate from the very first dragmove. `followGroupDragFromMember()` retains a fallback `beginGroupDragFollow()` call in case any code path skips the dragstart hook.

The snapshot is cleared on each `dragend` (member's `dragend`, table's `dragend`, and `tr.on('dragend')` all call `endGroupDragFollow()`).

#### Selection promotion in `dragmove`

The existing item `dragmove` handlers in `tblWallFlr` and `imageItem` contain a "promote to tr.nodes() if not already there" block (so click-then-drag on an unselected item still works). For group members this would clobber the whole-group selection down to just the dragged item. Both handlers now branch on `data_groupId`:

- **Group member** → `tr.nodes([target])` then `expandSelectionForGroups()` to re-add the rect + every sibling.
- **Non-group item** → original behaviour (single-item selection + conditional resize anchors).

### Konva Layout

The Group rect lives in `groupGroupRects` (a `Konva.Group` added to `layerTransform` **before** all item groups so it renders behind items):

```
layerTransform
  └── groupGroupRects        ← Group rects (light blue / dashed blue stroke; opacity 0 default, 0.2 when selected)
  └── groupStageFloors
  └── groupTables
  └── groupChairs
  └── ... (item groups)
  └── groupVideoDevices
  └── groupMicrophones
```

### Group Rect Properties

| Property | Value |
|----------|-------|
| `data_deviceid` | `'group'` |
| `data_groupId` | the group's UUID |
| `data_layerId` | inherited from members |
| `data_labelField` | the group's `name` |
| `fill` | `'#8FD9FB'` (light blue, baked-in) |
| `stroke` | `'blue'`, `strokeWidth:1`, `dash:[6,4]` |
| `opacity` | `0` by default (rect is visually absent), raised to `0.2` while selected by `updateTrNodesShading()` and dropped back to `0` by `removeShadingTrNodes()`. Selection state therefore conveys via opacity only — stroke/fill never change |
| `draggable` | `true` (so Transformer can carry it in `tr.nodes()`) |
| `listening` | `false` (passive visual anchor; user selects via any member item) |
| Bounds | Computed from `getMemberBoundingRect()` (Konva `getClientRect`); flush with the items, **no padding** so the rect matches the Transformer's tight blue box exactly |
| Transformer | rotation-only (`tr.enabledAnchors([])`, `tr.resizeEnabled(false)`) — once grouped, items always move together as a unit, so resize is meaningless |

### Right-click menu behaviour

The right-click menu's **Group** entry is disabled when:
- Fewer than 2 items are selected (excluding the Group rect itself), OR
- All selected items already belong to the same single group (regrouping the same items would just dissolve and recreate the existing group — a no-op).

The **Ungroup** entry is enabled whenever the selection contains a Group rect or any group member.

### Key Group Functions

| Function | Purpose |
|----------|---------|
| `createGroup(nodesToGroup?)` | Groups current `tr.nodes()` (or passed nodes). Layer conflict → moves all to `drpAddItemLayer`. |
| `ungroupItems(groupId, keepItems)` | `keepItems=true` = Ungroup (keep items). `keepItems=false` = hard-delete members too. |
| `ungroupSelectedItems()` | Calls `ungroupItems(..., true)` for all groups in `tr.nodes()`. |
| `insertGroupRect(groupObj)` | Creates the Konva Rect (`fill:'#8FD9FB'`, `stroke:'blue'`, `opacity:0`; `listening:false`, `draggable:true`; no per-rect drag handlers; rides in `tr.nodes()` and is moved by Konva natively). |
| `updateGroupBounds(groupId)` | Recalculates group rect pixel bounds from member `getMemberBoundingRect()`. **Currently used only at create time** (rect travels with members during drags). Kept available for future "rebuild after Details-panel edit". |
| `getMemberBoundingRect(node)` | `node.getClientRect({ skipShadow: true, relativeTo: layerTransform })` — same call the Transformer uses internally. Returns the tight visual bbox in `layerTransform`-local coords. |
| `getGroupById(groupId)` | Finds a group object in `roomObj.groups`. |
| `getGroupMemberNodes(groupId)` | Returns all Konva nodes across all item groups whose `data_groupId` matches. |
| `ensureGroups(obj?)` | Ensures `roomObj.groups` (or `obj.groups`) exists as an array. |
| `expandSelectionForGroups()` | Post-click/drag-select hook that expands `tr.nodes()` to `[rect, ...members]` whenever any group-related node is selected. |
| `followGroupDragFromMember(node)` | Called from each member's `dragmove`; shifts siblings + Group rect to match a member-direct drag. No-op during a Transformer drag (`tr.isDragging()`). |
| `endGroupDragFollow()` | Called from `dragend` handlers (member, table, `tr`) to clear the drag-follow snapshot. |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+G` | Group selected items |
| `Ctrl/Cmd+Shift+G` | Ungroup (dissolve, keep items) |

### Critical Guards

**`updateRoomObjFromTrNode()`** — must skip group rects (Konva nodes
with `data_deviceid === 'group'` carry no `allDeviceTypes` mapping, so
the `parentGroup` lookup at the top of the loop short-circuits with a
`console.error` — but defensive guards in any new walker code should
mirror the `getNodesJson()` pattern below):
```javascript
if (node.data_deviceid === 'group') return;
```

> **Note:** the `getNodesJson()` function nested inside `canvasToJson()`
> is **dead code** (never called). It is annotated in the source as
> such; do NOT mirror new `data_*` propagation there. The active writer
> is `updateRoomObjFromTrNode()`, called from the top of
> `canvasToJson()`. See the "Where `data_groupId` Must Be Updated"
> table below.

**`updateTrNodesShading()`** — members excluded from blue outline:
```javascript
if (node.data_groupId && node.data_deviceid !== 'group') return;
```

**`allNodeShapeGroups`** does NOT include `groupGroupRects`. Group rects are managed separately.

### Where `data_groupId` Must Be Updated

When adding new data to items, the four-place rule still applies. For `data_groupId` specifically:

| Location | Function | Done? |
|----------|----------|-------|
| `insertShapeItem()` → `updateNodeAttributes()` | `node.data_groupId = attrs.data_groupId \|\| null` | ✓ |
| `insertTable()` | `tblWallFlr.data_groupId = attrs.data_groupId \|\| null` | ✓ |
| `canvasToJson()` → `updateRoomObjFromTrNode()` | `if (node.data_groupId) itemAttr.data_groupId = node.data_groupId` (push branch); also patches the existing entry's `data_groupId` in the `roomObjItemsMap`-hit branch so groups added/removed via direct `roomObj.items[].data_groupId` mutation stay in sync after the next canvasToJson | ✓ |
| `copyToCanvasClipBoard()` | Copy `data_groupId` with UUID remapping on paste | ✓ |

> **Why this matters / why `getNodesJson()` is the wrong place:** the
> nested `getNodesJson()` function inside `canvasToJson()` is dead —
> never invoked. The actual canvas → `roomObj.items` writer is
> `updateRoomObjFromTrNode()`, which only walks `tr.nodes()`. After a
> paste/duplicate, the new items aren't in `roomObjItemsMap` yet, so
> they go through the "push fresh `itemAttr`" branch — which means the
> writer code itself must include the field, otherwise it's silently
> dropped on the round-trip and `createShareableLink()` emits no
> `s{n}` for the affected members (URL persistence breaks for pasted
> groups).

### Details panel for a selected Group

When the current selection is exactly one Group's bundle (the rect plus only members of that same group), the right-hand Details panel shows **Group fields** instead of either single-item or multi-item fields. Detection happens in `enableCopyDelBtn()` via `getActiveGroupSelection()`; if it returns a match, the single-item Details panel is shown and `updateFormatDetails()` is called with the Group rect's id.

Fields shown for a Group:
- **Group Name** (the `Item Label:` field re-labelled; backed by `group.name` and `rectNode.data_labelField`)
- **Layer** (backed by `group.data_layerId`; the dropdown's `onchange` handler calls `updateItemLayer()` which has a Group-rect branch that cascades the layer to every member)
- **X / Y** (backed by `rectNode.x()` / `rectNode.y()` — the rect's unrotated top-left, same convention as tables/walls)
- **Z** (backed by `group.data_zPosition`)
- **Width / Length** — display-only (`disabled = true`); these reflect the bounding box of the members and are recomputed by `updateGroupBounds()` / the Konva Transformer, never typed in directly
- **Rotation** (backed by `rectNode.rotation()`)

Fields hidden for a Group: `itemNameDiv`, `labelPathId`, `itemTopElevationDiv`, `itemDiagonalTvDiv`, `itemVheightDiv`, `trapNarrowWidthDiv`, `tblRectRadiusDiv`, `tblRectRadiusRightDiv`, `itemTiltSlantDiv`, `itemTiltDiv`, `itemSlantDiv`, `isPrimaryDiv`, `itemOffsetDiv`, `roleDiv`, `mountDiv`, `colorDiv`. The non-group branch of `updateFormatDetails()` re-shows `itemNameDiv` at the top so a subsequent click on a normal item finds the div in its default-visible state.

Click-on-a-member also reroutes to Group fields: `updateFormatDetails()` swaps the clicked member's `shape` over to the Group rect when `shape.data_groupId` is set, so the very first click immediately shows Group details (no flicker between member details and group details).

### Update flow for a selected Group

`updateItem()` has a fast-path at the top: if the displayed `itemId` matches a `roomObj.groups[].groupid`, it routes to `updateGroupItem(group)` and returns before any of the per-item logic runs (which is built around `roomObjItemsMap.get(id)` and would otherwise silently no-op for groups).

`updateGroupItem(group)` reads the form values, computes deltas against the current state, then:

1. **Translation** (`deltaX`, `deltaY` in pixels): every member node + the rect get `node.x(node.x() + dX)` and `node.y(node.y() + dY)`. Done first so the rotation pivot computed next is the new visual centre.
2. **Rotation** (`deltaR` degrees): rigid rotation around the rect's (post-translation) visual centre via `rotateNodeAroundPoint(node, cx, cy, deltaR)`. The helper rotates the node's origin around `(cx, cy)` AND adds `deltaR` to the node's own rotation — that combination keeps every point of the node rigid with the rotation around `(cx, cy)`. Applied to every member and to the rect.
3. **Z elevation** (`deltaZ`): added to every member's `data_zPosition`. A member with no `data_zPosition` (or a NaN/non-numeric value) is treated as `0` via `Number(m.data_zPosition) || 0`, so the resulting value lands at exactly `deltaZ` for those members. The `if (deltaZ !== 0)` guard avoids polluting nodes that previously had no `data_zPosition` with an explicit `0` when the user didn't actually change Z. The group object's `data_zPosition` is then set to the new form value (matches the new minimum since everyone shifted by the same delta).
4. **Group name**: written to `group.name` and `rectNode.data_labelField`.
5. **Layer cascade**: if the layer changed, `group.data_layerId`, `rectNode.data_layerId`, and every member's `data_layerId` are updated and `applyLayerStateToNode()` is run on each.
6. **Coverage realignment**: `updateShading(member)` is called on every member so `#fov~`, `#audio~`, `#dispDist~`, `#speaker~`, and `#label~` nodes follow the moves. (`updateShading()` reads each member's current centre/rotation and re-positions the coverage node — same call the per-member `dragmove` and `transform` handlers make natively.)

Width/Length deltas are intentionally NOT applied because the form fields are disabled. Rotation delta is computed as `newRot - currentRot` without normalising to the shortest path; member rotations may end up with values outside `[-360, 360]` after large rotations, which Konva renders correctly but produces unusual values in the saved JSON. If this becomes a UX issue, normalise `deltaR` to `[-180, 180]` and explicitly set the rect's rotation back to `newRot` after the rigid rotation completes.

### Live Details-panel refresh during drag and rotate

When a Group is selected and the user moves or rotates it on the canvas (rather than typing into the form), `refreshGroupDetailsFromCanvas()` updates the Details panel's `itemX`, `itemY`, `itemRotation`, `itemWidth`, `itemLength` inputs from the current rect state. This mirrors the per-item `if (tr.nodes().length === 1) updateFormatDetails(...)` call in the `imageItem`/`tblWallFlr` `dragmove` handlers, but is keyed off `getActiveGroupSelection()` so it's a no-op outside Group selections.

Hook points:

| Event | Why |
|-------|-----|
| `tr.on('dragmove')` | Transformer-driven group drag — Konva moves all nodes natively, so the rect's x/y reflect the drag in real time |
| `tr.on('dragend')`   | Final flush after Transformer drag (catches missed-frame edge cases) |
| `tr.on('transform')` | Group rotation (rotate anchor) — rotates every node around the bbox centre, so rect.x/y AND rect.rotation update mid-drag. Refresh runs before the existing `if (trNodesLength !== 1) return` early-out because group bundles have `trNodesLength > 1` |
| `tr.on('transformend')` | Final flush after rotation |
| `followGroupDragFromMember()` | Member-direct drag — refresh fires after the snapshot delta is applied to siblings + rect |

### Done (recent)

- **Copy / paste / duplicate (Ctrl/Cmd+C, V, D, and the right-click menu)**
 — Group rects ride through the clipboard as a special
 `{ isGroupRect, oldGroupId, groupAttrs }` entry alongside the regular
 member entries (which carry `data_groupId` in `newAttr`). On paste,
 every Group rect in the clipboard mints a fresh `groupid` via
 `createUuid()`; member items get their `data_groupId` remapped to the
 new id, a fresh `roomObj.groups` entry is pushed (with the offset
 top-left and `groupMembers` rebuilt from the new uuids), and
 `insertGroupRect()` materializes the rect on canvas. Members of
 incomplete groups (rect missing OR some members absent) paste as
 ungrouped, mirroring the URL/WD-import "drop empty groups" rule.
 The new bundle (rect + all members) is selected after paste so the
 Details panel immediately shows Group fields. Clipboard is
 JSON-serialized to `localStorage`, so cross-tab copy/paste works too.
 See `copyToCanvasClipBoard()` and `pasteItems()` for the
 implementation.
- **URL encoding** — `H{n}` room-level prefix for group definitions plus
 `s{n}` on items. See "Group URL Encoding" in the URL Encoding Format
 section above for the format and the implementation cross-reference
 table.
- **Workspace Designer round-trip** — items carry their `data_groupId`
 on the WD JSON as a `"group": "<groupid>"` string attribute, and the
 Group rect's geometry / metadata round-trips via
 `workspaceObj.data.vrc.groups[]`. See "Workspace Designer Group
 Round-Trip" below for the format and the implementation
 cross-reference table.

### Workspace Designer Group Round-Trip

VRC Groups round-trip cleanly through the Workspace Designer JSON
format. The Workspace Designer has no native concept of a Group item,
so the round-trip uses two parallel pieces:

1. **Per-member item attribute** — every `customObjects[]` member of a
   group carries a plain `"group": "<groupid>"` string attribute (the
   same UUID that lives in the source `roomObj.groups[].groupid` and
   `item.data_groupId`). WD preserves arbitrary string attributes on
   custom objects, so this survives a save/reload through the WD UI
   even though WD doesn't render anything special for it.

2. **Room-level group block in `data.vrc.groups`** — the Group rect's
   geometry and metadata are stashed in VRC's own JSON namespace under
   `workspaceObj.data.vrc.groups[]`, alongside the existing
   `data.vrc.backgroundImage` block. **Always meters**, **VRC top-left
   coordinates** (no `roomX`/`roomY` shift, no centring on
   `roomWidth/2, roomLength/2`), so it lines up with the items the
   importer reconstructs at VRC top-left coords:

```json
{
  "groupid": "uuid",
  "name": "Group 1",
  "x": 1.5,
  "y": 3.84,
  "width": 2.5,
  "height": 3.5,
  "rotation": 0,
  "data_zPosition": 0,
  "layerName": "Furniture"
}
```

`layerName` is omitted when the group is on the Default layer
(`data_layerId === '0'`), mirroring the per-item `layer` convention.
Layer NAMES (not UUIDs) are emitted so the JSON is human-readable and
stable across round-trips that may regenerate layer UUIDs.
`groupMembers` is **never emitted** — it's rebuilt on import by
scanning items for `data_groupId` references (same pattern the URL
parser uses post-parse). Empty groups are skipped on export and
filtered on import.

#### Coordinate model

Items in `customObjects[]` go through the full WD coordinate transform
(swap X/Z, centre on `roomWidth/2, roomLength/2`, apply `roomX`/`roomY`
offsets via `convertToMeters()`). Groups in `data.vrc.groups[]` do
**not** — they stay in VRC top-left meters. The asymmetry is deliberate
and matches the existing `data.vrc.backgroundImage` block. On import
both flows reconstruct items + groups in VRC top-left coords, so they
align.

#### Items in hidden VRC layers

`removeHiddenLayerItemsForExport()` already drops items in hidden layers
from `customObjects[]` before export. Groups always share their
members' layer (`createGroup()` / `updateItemLayer()` enforce this), so
a group on a hidden layer has all its members dropped and ends up
filtered by the empty-group rule on import. No extra handling needed
on the export side — the empty group survives in
`data.vrc.groups[]` but is dropped on the post-parse rebuild.

#### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Per-item `group` attribute encoder | `setGroupOnWorkspaceItem()` inside `exportRoomObjToWorkspace()` (mirror of `setLayerOnWorkspaceItem()`) |
| Per-item `group` attribute call sites | All four push helpers (`workspaceObjItemPush`, `workspaceObjDisplayPush`, `workspaceObjTablePush`, `workspaceObjWallPush`) call `setGroupOnWorkspaceItem(workspaceItem, item)` immediately before `workspaceObj.customObjects.push(workspaceItem)` |
| `data.vrc.groups[]` encoder | `exportRoomObjToWorkspace()` — block immediately after the `data.vrc.backgroundImage` emit. Reads `roomObj.groups` directly (not `roomObj2.groups` — `convertToMeters()` drops `groups` from the clone) and applies `groupRatio = (roomObj.unit === 'feet') ? (1/3.28084) : 1` |
| Per-item `group` attribute decoder | `wdItemToRoomObjItem()` — `if ('group' in wdItem)` block immediately after the `wdItem.layer` extraction. Strips the key from `wdItem` so it doesn't leak into `data_labelField` |
| `data.vrc.groups[]` decoder + post-parse member rebuild | `importWorkspaceDesignerFile()` — block immediately after the `data.vrc.backgroundImageFile` import. Calls `ensureGroups(roomObj2)`, then walks `data.vrc.groups[]` and pushes new entries into `roomObj2.groups`, then mirrors the URL parser's `roomObj.groups.filter(g => g.groupMembers && g.groupMembers.length)` rebuild |
| Group rect skip in `customObjects[]` | `canvasToJson()` already enforces `if (node.data_deviceid === 'group') return;` so group rects never enter `roomObj.items.*` and therefore never reach the WD push helpers |

---

## VRC Layer System

VRC Layers are a **logical grouping** mechanism for canvas items, entirely separate from Konva.js layers.

### Concept

A VRC Layer lets the user:
- **Show / hide** all items assigned to the layer (`node.show()` / `node.hide()`)
- **Lock / unlock** all items in the layer (`node.listening(true/false)`)

### Layers Tab UI

The Layers tab uses a 4-column row layout: `[hide/show btn] [lock/unlock btn] [name] [delete btn]`.

A **header row** at the top of the list mirrors the same columns and exposes global actions across **all** layers:
- **Global hide/show button** — if any layer is hidden, shows all; otherwise hides all (and clears the canvas selection).
- **Global lock/unlock button** — if any layer is locked, unlocks all; otherwise locks all (and clears the canvas selection).

Per-row behavior:
- Clicking the **layer name** opens an inline rename input (custom layers only). Reserved layers (Default / Ceiling) ignore the click.
- Toggling **hide** or **lock** on a layer immediately removes that layer's nodes from the current `tr.nodes()` selection (via `removeLayerNodesFromSelection()`).

### Data Structure

```javascript
roomObj.layers = [
  { name: 'Default',   visible: true, locked: false, layerid: '0' },  // reserved
  { name: 'Ceiling',   visible: true, locked: false, layerid: '1' },  // reserved
  { name: 'Furniture', visible: true, locked: false, layerid: 'uuid' } // custom
]
```

- `layerid: '0'` = Default (implicit, items without `data_layerId` belong here)
- `layerid: '1'` = Ceiling (reserved for ceiling microphones etc.)
- Custom layers use `createUuid()` for their `layerid`
- An internal `_urlNum` (20, 21, …) is assigned during URL encoding to map UUIDs ↔ URL numbers

Items carry an optional `data_layerId` attribute:
```javascript
item.data_layerId = '0';            // Default  (usually omitted from JSON/URL)
item.data_layerId = '1';            // Ceiling
item.data_layerId = 'some-uuid';    // custom layer
```

### Reserved Layer IDs

| `layerid` | Name | Notes |
|-----------|------|-------|
| `'0'` | Default | Cannot be renamed or deleted |
| `'1'` | Ceiling | Cannot be renamed or deleted |
| `'2'`–`'19'` | Reserved | For future built-in layers |

### Key Layer Functions

| Function | Purpose |
|----------|---------|
| `getDefaultLayers()` | Returns the two built-in layer objects |
| `ensureDefaultLayers(layers)` | Inserts Default/Ceiling if missing |
| `getLayerById(layerId)` | Finds a layer object in `roomObj.layers` |
| `addLayer(name)` | Creates a new custom layer with a UUID |
| `deleteLayer(layerId)` | Removes a custom layer; items reassigned to Default |
| `renameLayer(layerId, name)` | Renames a custom layer (unique name check) |
| `toggleLayerVisible(layerId)` | Flips `visible`; calls `applyAllLayerStates()`; removes layer's items from selection if now hidden |
| `toggleLayerLocked(layerId)` | Flips `locked`; calls `applyAllLayerStates()`; removes layer's items from selection if now locked |
| `toggleAllLayersVisible()` | Global hide/show button: if any layer hidden → show all; else hide all (clears selection on hide) |
| `toggleAllLayersLocked()` | Global lock button: if any layer locked → unlock all; else lock all (clears selection on lock) |
| `removeLayerNodesFromSelection(layerId)` | Filters out the layer's nodes from current `tr.nodes()` |
| `applyLayerStateToNode(node, layerId)` | Shows/hides and enables/disables a single node, dims its opacity to 0.7× when locked (via `applyLayerLockOpacity()`), and applies the same to its coverage nodes (`audio~`, `speaker~`, `fov~`, `dispDist~`, `label~`) via `applyLayerStateToCoverageNodes()` |
| `applyLayerLockOpacity(node, locked)` | Dims a node to 0.7× of its original opacity when its layer is locked, and restores it when unlocked. Original opacity is captured once in `node.data_originalOpacity`; `node.data_lockOpacityApplied` tracks the dim state to keep repeat calls idempotent |
| `applyLayerStateToCoverageNodes(node, layerVisible)` | Shows/hides the per-item coverage and label nodes based on layer visibility AND the per-item `data_audioHidden`, `data_speakerHidden`, `data_fovHidden`, `data_dispDistHidden` flags |
| `applyAllLayerStates()` | Re-applies all layer states to all canvas nodes (and coverage layers) |
| `isItemInHiddenLayer(itemOrNode)` | Returns true if the item/node's `data_layerId` resolves to a layer with `visible=false` |
| `removeHiddenLayerItemsForExport(roomObj2)` | Used by `exportRoomObjToWorkspace()` to drop every item whose layer is hidden from the cloned roomObj before export (mutates the cloned roomObj) |
| `applyLabelLayerVisibility()` | Iterates all `Konva.Label` children of `grLabels` and hides the ones whose parent item is in a hidden VRC layer (called by `labelsVisible(true)`) |
| `selectLayerItems(layerId)` | Selects all items in a layer via `tr.nodes()` (legacy helper — not currently bound to UI) |
| `renderLayersList()` | Rebuilds the Layers tab HTML (header row + per-layer rows) and refreshes dropdowns |
| `populateLayerDropdown(id, selected)` | Fills a `<select>` with current layers |
| `updateItemLayer(nodeId, layerId)` | Changes one item's layer |
| `updateMultipleItemsLayer(layerId)` | Changes all selected items' layer |

### Where `data_layerId` Must Be Updated

When adding new data to items, the critical four places still apply (see Critical Data Flow above). For `data_layerId` specifically:

| Location | Function | Done? |
|----------|----------|-------|
| `insertShapeItem()` → `updateNodeAttributes()` | `node.data_layerId = attrs.data_layerId \|\| '0'` | ✓ |
| `insertTable()` | `tblWallFlr.data_layerId = attrs.data_layerId \|\| '0'` | ✓ |
| `canvasToJson()` → `updateRoomObjFromTrNode()` | Save `data_layerId` to `itemAttr` (the `getNodesJson()` defined inside `canvasToJson()` is dead code — see the `data_groupId` table for details) | ✓ |
| `copyToCanvasClipBoard()` | Copy `data_layerId` in `newAttr` | ✓ |

### Layer Encoding in `_layerUrlEncodeMap`

The global `_layerUrlEncodeMap` maps `layerid → urlNumber (20+)` and is rebuilt each time `createShareableLink()` runs. It is used only during URL encoding; for decoding, the `_urlNum` property is set directly on the layer object.

### Hidden Layers: Coverage Nodes & Workspace Designer Export

When a VRC layer is **hidden** (`visible=false`):

1. **Item nodes** are hidden via `node.hide()` (already part of `applyLayerStateToNode`).
2. **Per-item coverage / label nodes** are also hidden:
   - `#audio~{id}` (microphone shading)
   - `#speaker~{id}` (speaker shading)
   - `#fov~{id}` (camera FOV shading)
   - `#dispDist~{id}` (display distance arc)
   - `#label~{id}` (Konva.Label tooltip)

   This is handled by `applyLayerStateToCoverageNodes(node, layerVisible)`. When the layer becomes visible again, coverage visibility is **restored from the per-item flags** (`data_audioHidden`, `data_speakerHidden`, `data_fovHidden`, `data_dispDistHidden`). Labels have no per-item flag and simply follow the layer's visibility.

3. **Workspace Designer export**: `exportRoomObjToWorkspace()` calls `removeHiddenLayerItemsForExport(roomObj2)` immediately after `convertToMeters()`. This **drops** every cloned item whose layer is hidden, so it is never sent to the Workspace Designer (the workspace `customObjects` array does not include them at all). Items with the per-item `data_hiddenInDesigner` flag are still emitted as `{ "hidden": true }` by the existing `workspaceObj*Push()` helpers — that path is unchanged.

The per-item single-item toggles (`toggleMicShadingSingleItem`, `toggleSpeakerShadingSingleItem`, `toggleCamShadeSingleItem`, `toggleDisplayDistanceSingleItem`) still flip the `data_*Hidden` flag, but the actual coverage node visibility they apply is `layerVisible && !perItemHidden` — so toggling a single item back on while its layer is hidden keeps it visually hidden until the layer is shown again.

`addLabel()` also checks `isItemInHiddenLayer(node)` so newly-created labels for items in hidden layers start out hidden.

---

## File Import & xConfiguration .txt Support

VRC supports importing **three** distinct file formats through the same UI (open-file picker and drag-and-drop). Detection is done by **content**, not file extension.

### Detection Pipeline

`routeUploadedFileText(text, fileName)` is the single entry point for both upload paths:

1. Try `JSON.parse(text)` → if it succeeds and the result is an object, hand it to `importJson()` (which routes between VRC JSON and Workspace Designer JSON internally based on the presence of `room` vs `customObjects`).
2. If JSON parsing fails, test the text against the OR-alternation regex `/^((?:\*c )?xConfiguration\b)|(Audio\sPeripherals\sMicrophone\s1\sPlacement)|(Cameras\sCamera\s1\sPlacement\sRX)/m` — which detects all three xConfig line formats (see below). If matched, call `importXConfigFile(text, fileName)`.
3. Otherwise, show an alert that the file format is unrecognized.

The optional `*c ` prefix is what makes xConfig files **round-trippable**: a file produced by `Ctrl+Shift+E` (no prefix) re-imports cleanly through the same code path used for raw RoomOS dumps (with prefix).

The `<input type="file" id="fileUpload">` accept attribute is `.json,.txt` so both formats appear in the picker dialog.

### Cisco xConfiguration .txt Files

These are configuration dumps from a Cisco RoomOS endpoint. Three line formats are detected and parsed — only **camera placements** and **microphone placements** are imported; every other line is ignored.

**Three accepted xConfig line formats:**

| Format | Example | Source |
|--------|---------|--------|
| 1. Raw RoomOS SSH dump | `*c xConfiguration Cameras Camera 1 Placement RX: 112` | SSH session output |
| 2. App export (no `*c`) | `xConfiguration Cameras Camera 1 Placement RX: 112` | `Ctrl+Shift+E` export from this app |
| 3. Bare config dump | `Cameras Camera 1 Placement RX: 112` | Device configuration export tools (no `xConfiguration` keyword) |

Detection (step 2 above) uses an OR alternation: formats 1 & 2 are caught by the `xConfiguration` arm; format 3 is caught by the `Audio Peripherals Microphone 1 Placement` or `Cameras Camera 1 Placement RX` arms.

In `parseXConfigText()`, all five parser regexes wrap the optional prefix in a **capturing** group (group 1, may be `undefined`) so the data groups are consistently numbered across all regexes: group 2 = device number, group 3 = field name, group 4 = integer value.

#### Microphone xConfig Variants

Two microphone-placement formats are recognized in the same parser:

| Format | Example line | RoomOS |
|--------|--------------|--------|
| **New** (`Audio Peripherals Microphone`) | `*c xConfiguration Audio Peripherals Microphone 1 Placement X: -1809` plus a `Microphone N ID: "<mac>"` line | RoomOS 11+ |
| **Legacy** (`Audio Input Ethernet`) | `*c xConfiguration Audio Input Ethernet 2 Placement X: -83` plus an `Ethernet N StreamName: "<mac>"` line | older RoomOS |

The mic *number* (the `N` in either format) is preserved into the VRC label. If both formats appear for the same `N`, the new format **wins** — the legacy entry is discarded entirely. This is handled inside `ensureMic(n, source)` in `parseXConfigText()` via a `source: 'new' | 'old'` tag stored on each parsed mic entry.

Empty-slot detection differs by format because the defaults differ:
- **New format**: defaults are `X = Y = Z = 0` → skip when *all three* are zero.
- **Legacy format**: default is `X = 0, Y = 730, Z = 0` (typical table-mic height) with empty `StreamName` → skip when *both X and Z* are zero (Y is allowed to be non-zero).

#### Coordinate Model

The xConfiguration coordinate frame is **relative to the Quad Camera's reference origin**. The X axis is taken as already centered on the Quad Camera's lens center, so **no X offset is applied** during import or export. The Z axis is offset from the lens by `+5 cm`, so a `−0.05 m` correction is applied on import (and re-added on export).

| xConfig axis | Direction | Units | VRC mapping |
|--------------|-----------|-------|-------------|
| `X` | Right of Quad Cam | mm | VRC X (no offset — used directly as `relX` from the Quad Cam) |
| `Y` | Up from floor | mm | VRC `data_zPosition` (elevation) |
| `Z` | Forward into the room | mm | VRC Y (depth) (after `- 0.05 m` offset) |
| `RX/RY/RZ` | Rotation around X/Y/Z | deci-degrees (value/10 = degrees) | RY → VRC `rotation` (negated, since xConfig is right-handed CCW and VRC is CW from north) |

#### Device Mapping Rules

| xConfig device | VRC device | Notes |
|----------------|------------|-------|
| `Cameras Camera 1` with `\|X\|` ≤ 10 mm AND `\|Z\|` ≤ 10 mm | `roomKitEqQuadCam` | Camera 1 sitting at (or within 10 mm of) the xConfig origin = the Quad Camera. Imported as Room Kit EQ: Quad Camera (same dimensions as `quadCam` via `cameraParent`) and treated as the reference frame for everything else |
| `Cameras Camera 1` with `\|X\|` > 10 mm OR `\|Z\|` > 10 mm | `ptzVision2` | A Room Vision PTZ wired into the Camera 1 slot. Imported at its actual coordinates (label still "Camera 1"); the room then has no Quad Camera |
| `Cameras Camera 2..N` | `ptzVision2` | Room Vision PTZ |
| `Audio Peripherals Microphone N` with Y < 1.5 m | `tableMicPro` | Below 1.5 m elevation = on a table |
| `Audio Peripherals Microphone N` with Y ≥ 1.5 m | `ceilingMicPro` | At or above 1.5 m = ceiling-mounted |

**Cameras with `Placement Y = 0` are skipped** (applies to **all** camera slots including Camera 1). xConfig's `Y` is the camera's height above the floor in mm, and a value of `0` means "no height configured" — the default for an empty slot. This catches both the fully‑empty slots (`X = Y = Z = 0`, like Cameras 2..6 in a typical Codec EQ) **and** stale, partially‑configured ghosts that have non‑zero `X` / `Z` but `Y = 0` (e.g. a Camera 7 left over from a removed device). This matches the behavior of Cisco's official xConfig placement tool.

Mics with `X = Y = Z = 0` are also skipped (those slots exist in xConfig even when no mic is actually placed). The legacy `Audio Input Ethernet` mic format defaults to `X = 0, Y = 730, Z = 0`, so for that format the importer instead drops entries where both `X` and `Z` are zero.

#### Camera-only / Microphone-only Imports

Both flavours are supported — the importer no longer aborts when one of the two device classes is missing.

| File contents | Behaviour |
|---------------|-----------|
| Cameras + microphones | Normal import, no notice |
| Cameras only (no mics) | Imports normally, then shows an `alertDialog` with the message **"Calibrated microphone missing"** |
| Microphones only (no cameras) | Imports normally, then shows an `alertDialog` with the message **"Cinematic meeting camera missing"** |
| Neither | Aborts with a generic "no cameras or microphones to place" alert (nothing to draw) |

The notice is fired ~3.2 s after import begins so it lands cleanly after the loading modal dismisses (rather than being stacked behind it). When there is no Quad Camera in the room, the implicit xConfig origin (0, 0) still anchors at `(roomWidth / 2, 0.10 m)` so the room geometry math is unchanged — peripherals are positioned around the same reference point they would have been if the Quad Cam were physically there.

#### Special Quad Camera Handling

- Placed at xConfig (0, 0) by definition — its VRC center lands at `(vrcOriginX, vrcOriginY)` where the **xConfig XYZ tracking columns** described below intersect.
- Elevation: `(xConfig Y / 1000) − 0.05 m`. The xConfig Y for the Quad Camera reports "base + ~5 cm", so we subtract 0.05 m to get the actual mounting elevation.
- The X/Z xConfig values for the Quad Camera are typically 0 by definition (it's the reference frame). When the user later moves the Quad Cam off-origin in the VRC, the tracking columns preserve the original origin so the move is reflected as a non-zero offset on the next export rather than silently shifting every other peripheral.

> **Historical note**: In earlier versions the Quad Cam was force-placed at `(roomWidth/2, 0.10 m)` and the room was sized symmetrically around it. As of the bounding-box rework, no device is locked to a specific room location — the room is sized to fit the device bounding box with a 0.15 m wall buffer (see [Room Sizing](#room-sizing) below) and items are translated as a group via `vrcOriginX` / `vrcOriginY`.

#### xConfig XYZ Tracking Columns

After every successful import, two thin `columnRect` items are dropped into `roomObj.items.tables[]` to mark the xConfig coordinate origin in VRC space:

| Column | id prefix | data_labelField | x | y | rotation | width | height |
|--------|-----------|-----------------|---|---|----------|-------|--------|
| **Blue** (X = 0 axis) | `xConfig-x-0-<uuid>` | `{"color":"blue", "opacity":0.03}` | vrcOriginX | 0 | 0 | 0.01 m | roomLength |
| **Red** (Z = 0 axis) | `xConfig-z-0-<uuid>` | `{"color":"red", "opacity":0.03}` | 0 | vrcOriginY | -90 | 0.01 m | roomWidth |

Where `vrcOriginX` and `vrcOriginY` are the VRC coordinates of xConfig (0, 0) — derived from the bounding-box translation in [Room Sizing](#room-sizing). The columns are **not** guaranteed to be centered in the room; they sit wherever xConfig (0, 0) lands relative to the imported devices.

Both columns are assigned to a dedicated **`xConfig XYZ` layer** that is created **locked** by default so the user can't accidentally drag them around. The layer is `visible: true` so the planes render as faint guide lines in Workspace Designer (the JSON `color`/`opacity` in `data_labelField` is read by `parseDataLabelFieldJson()` during the WD export).

The exporter reads:
- `blueColumn.x` ⇒ xConfig X = 0 origin in VRC meters
- `redColumn.y`  ⇒ xConfig Z = 0 origin in VRC meters

If both columns are present, they take priority over Camera 1 for the origin computation. Camera 1 then emits its own xConfig (X, Z) **relative to the columns** — so dragging Camera 1 produces a non-zero offset rather than shifting the whole frame. Note that Camera 1 still does **not** add the `+0.05 m` Z offset (peripherals do), preserving the round-trip property where a Quad Cam at the column intersection emits `Camera 1 X=0, Z=0`.

Column id matching is **case-insensitive** so older saves using the lowercase `xconfig-x-…` form (see the example `xconfig with xyz planes.vrc.json`) still round-trip cleanly. If either column is missing the exporter falls back to the legacy "Camera 1 = origin" path; if Camera 1 is also missing it falls back to the implicit `(roomWidth/2, 0.10 m)` origin.

#### Special Room Vision PTZ Handling

Room Vision PTZ cameras (`ptzVision2`) get an additional `−0.15 m` correction on their elevation only. The xConfig Y for these cameras reports the **mount point** (~15 cm above the lens), so we subtract 0.15 m to recover the lens elevation that VRC stores in `data_zPosition`. The export reverses this with a `+0.15 m` correction.

This offset is **not** applied to the Quad Camera (which uses its own 0.05 m correction) or to microphones (which already report lens-equivalent height directly).

#### Room Sizing

Room dimensions are derived from the **bounding box** of every imported device, with a **0.15 m buffer** to the walls on every side. No device is locked to a specific room location — the items are placed as a group and translated into the room.

```
For each device, in xConfig-frame meters:
   leftEdge   = relX − halfWidth
   rightEdge  = relX + halfWidth
   topEdge    = relY − halfDepth
   bottomEdge = relY + halfDepth
   topOfDevice = elevationM + deviceHeightM

bbox dimensions (after taking min/max across all devices):
   bboxWidth  = (maxRightEdge  − minLeftEdge)  + 2 × 0.15 m
   bboxLength = (maxBottomEdge − minTopEdge)   + 2 × 0.15 m

Apply minimums:
   roomWidth   = max(3 m, bboxWidth)
   roomLength  = max(3 m, bboxLength)
   roomHeight  = max(2 m, max over devices of topOfDevice)
```

`deviceHeightM` reads from `allDeviceTypes[deviceId].height` (in mm) — e.g. `ceilingMicPro` = 48 mm, `quadCam` = 120 mm, `ptzVision2` = 193 mm. If a device type has no height listed, a **0.05 m (50 mm)** fallback is used. `halfWidth` / `halfDepth` come from the same table; rotation is intentionally ignored when computing extents (a 90°-rotated device would actually project its `halfDepth` onto the X axis, but the worst-case error is a few cm so it's not worth the math).

When the bounding box is **smaller** than the 3 m × 3 m floor, the extra slack splits **evenly** between opposing walls (Option B) so items remain visually centered in the larger room rather than anchored in one corner. The translation that achieves this:

```
slackX = roomWidth  − bboxWidth        (≥ 0)
slackY = roomLength − bboxLength       (≥ 0)
vrcOriginX = 0.15 m + slackX/2 − minLeftEdge
vrcOriginY = 0.15 m + slackY/2 − minTopEdge

For each device:    centerX = vrcOriginX + relX
                    centerY = vrcOriginY + relY
For tracking columns:
   blueColumn.x    = vrcOriginX
   redColumn.y     = vrcOriginY
```

All three room values are rounded **up** to 2 decimal places so the user sees tidy numbers in the UI.

#### Device Naming

| Device | `data_labelField` |
|--------|-------------------|
| Camera 1 (Room Kit EQ: Quad Camera) | `Camera 1` |
| Camera 2..N | `Camera N` |
| Microphone N (any format, with ID) | `Microphone N ID: <id>` (e.g. `Microphone 1 ID: 50:00:e0:32:ec:cd`) — applied to **both** `tableMicPro` and `ceilingMicPro` and **both** xConfig variants (new `Audio Peripherals Microphone` *and* legacy `Audio Input Ethernet` StreamName), so labels are consistent across the room and round-trip cleanly through xConfig export |
| Microphone N without ID/StreamName | `Microphone N` |

#### Implementation Files

- Parser: `parseXConfigText()` in `js/roomcalc.js` — pure function, takes the raw text and returns `{ cameras: [...], microphones: [...] }` arrays.
- Importer: `importXConfigFile(text, fileName)` in `js/roomcalc.js` — applies all the coordinate math, builds a fresh `roomObj2`, and uses the same timing pattern as `importWorkspaceDesignerFile()` (set up roomObj2 → `setTimeout(1500ms)` → `drawRoom()` → `setTimeout(500ms)` → `canvasToJson()` + `createShareableLink()`).

### Exporting to xConfiguration

`exportXConfigFile()` is the inverse of `importXConfigFile()`. It is bound to **`Ctrl/Cmd+Shift+E`** (the existing `Ctrl/Cmd+E` exports to Workspace Designer; the extra `Shift` selects the xConfig variant). The output is a `.xconfig.txt` file download with no `*c` prefix on any line — it is meant to be sent over RoomOS's command interface, not parsed back as a SSH log.

#### Reverse coordinate math

For each item, `attrs.x` / `attrs.y` is the rotation-aware **center** in current units (set by `canvasToJson()` via `getNodeCenter()`). The exporter calls `canvasToJson()` first to ensure those values are fresh, then converts to meters via `unitToM = (roomObj.unit === 'feet') ? 1/3.28084 : 1`, then:

```
xConfigX_mm  = round(relX × 1000)                 for peripherals (always 0 for Quad Cam)
xConfigZ_mm  = round((relY + 0.05) × 1000)        for peripherals (always 0 for Quad Cam)
xConfigY_mm  = round(elevationM × 1000)           for microphones
xConfigY_mm  = round((elevationM + 0.05) × 1000)  for the Quad Cam (re-adds the +5 cm mount offset)
xConfigY_mm  = round((elevationM + 0.15) × 1000)  for Room Vision PTZ (re-adds the +15 cm mount offset)
xConfigRY    = round(-rotationDeg × 10)           VRC CW degrees → xConfig CCW deci-degrees (negate)
```

`relX` / `relY` are computed against the Quad Camera's own center, so the shared reference frame matches what the importer expects.

`RX` and `RZ` are emitted as `0` for every camera — VRC does not currently track tilt or slant for cameras imported from xConfig, so there's nothing to round-trip.

#### Device coverage

Only the device types the importer understands are emitted. Anything else in the room is silently skipped:

| roomObj item | xConfig section |
|--------------|-----------------|
| `roomKitEqQuadCam` *or* `quadCam` (always Camera 1) | `Cameras Camera 1 Placement *` |
| `ptzVision2` | `Cameras Camera N Placement *` (N ≥ 2) |
| `ceilingMicPro`, `tableMicPro` | `Audio Peripherals Microphone N *` |
| anything else (chairs, tables, displays, walls, …) | skipped |

The exporter accepts either id as Camera 1 because the importer emits `roomKitEqQuadCam` while older saves may still contain a bare `quadCam` — both are recognised via the `QUAD_DEVICE_IDS` set. **The Quad Camera is optional**: a room with only PTZ cameras and/or only microphones can still be exported. When no Quad Cam is present, the implicit xConfig origin is anchored at `(roomWidth / 2, 0.10 m)` (matching the importer's behaviour), so a no-Quad-Cam export round-trips cleanly back through the importer.

#### Strict label-format checks

Every device must carry a `data_labelField` that matches the expected pattern, otherwise it is **silently skipped** (and counted for the summary dialog described below):

| Device class | Required label | Matched by |
|--------------|----------------|------------|
| Cameras (Quad and PTZ) | `Camera <#>` (e.g. `Camera 7`) | `/^Camera\s+(\d+)\s*$/i` |
| Microphones | `Microphone <#> ID: <id>` (e.g. `Microphone 2 ID: 50:00:e0:32:ec:cd`) | `/^Microphone\s+(\d+)\s+ID:\s*(\S.*?)\s*$/i` |

Notes:
- The legacy `Microphone <#> <streamname>` shape produced by older imports does **not** match (no literal `ID:` marker) and gets skipped — fix the labels by hand or re-import the source xConfig with the new format.
- A PTZ camera labelled `Camera 1` claims a number reserved for the Quad Cam, so it gets bumped to the next free number rather than skipped.
- The Quad Camera's position is used as the reference frame **even if its label is malformed** (so the other peripherals' relative coords stay correct); the only thing the label gate controls is whether the Camera 1 line itself is emitted.

#### Post-export summary dialog

Whenever the export emits at least one item, a final `alertDialog` summarises the result:

```
An xConfiguration file was successfully exported with 2 cameras and 3 microphones.
```

If any items were skipped due to a malformed label, a second sentence is appended explaining how many were dropped and what the required label format is:

```
An xConfiguration file was successfully exported with 2 cameras and 3 microphones.

1 camera and 2 microphones were not exported because the name label did not match the required format. Cameras must be labelled `Camera <#>` (e.g. `Camera 7`) and microphones must be labelled `Microphone <#> ID: <id>` (e.g. `Microphone 2 ID: 50:00:e0:32:ec:cd`).
```

If the exported file ends up with **only one device class** (cameras but no microphones, or microphones but no cameras), a yellow `⚠️` warning is appended to the dialog so the imbalance can't be missed:

```
An xConfiguration file was successfully exported with 2 cameras and 0 microphones.

⚠️ Microphone missing — a Cisco room should include at least one microphone alongside the camera(s).
```

Both warnings can appear in the same dialog (e.g. label-skipped items leaving a class empty fires the format explainer **and** the ⚠️ missing-class line).

Pluralisation handles 0/1/2+ correctly via `describeCounts()`; the helper omits a clause entirely when its count is 0 (e.g. only-cameras: "with 2 cameras"). When **no** items have valid labels the export aborts before writing the file and shows the same explainer in a "No cameras or microphones could be exported." dialog instead.

#### Number preservation (round-trip integrity)

Cameras and microphones get their numbers from `data_labelField` when possible:

- A label like `"Camera 7"` → `Cameras Camera 7 ...`
- A label like `"Microphone 3 ID: 50:00:e0:32:ec:cd"` → `Audio Peripherals Microphone 3 ID: "50:00:e0:32:ec:cd"`
- Imported labels are always normalized to `Microphone N ID: <id>` regardless of source variant, so the export side always sees the same shape.

Numbers already taken (e.g. by another item with the same explicit label number) get bumped via a `nextFreeNumber()` helper. Items without an extractable number are assigned the lowest free number starting at 2 (cameras) or 1 (microphones).

#### Output format

Always written in the **new** format (`Audio Peripherals Microphone N`). The legacy format (`Audio Input Ethernet N`) is only supported on import. Each device block ends with a blank line so the file is easy to scan.

---

## CAD DXF Export

Exports the room as an AutoCAD‑compatible **DXF** file via the **Save** dialog → **Export CAD DXF (meters)** menu item, or the keyboard shortcut **`Ctrl+Shift+D`** (`Cmd+Shift+D` on macOS). The file is named `<RoomName>_YYYY-MM-DDTHHMMSS.SSS.dxf` and downloaded straight to the browser.

### Format: AutoCAD R12 (AC1009)

Targeting R12 (the oldest text DXF version) gives the broadest compatibility — every CAD tool tested reads it cleanly: AutoCAD desktop, **AutoCAD Web App** (which is unusually strict about subclass markers in newer versions), BricsCAD, DraftSight, LibreCAD, QCAD, FreeCAD, online viewers. Files round‑trip cleanly to R2000/R2018 in tools that prefer those versions.

R12 limits the entity vocabulary; the writer adapts as follows:
- `LWPOLYLINE` → emitted as `POLYLINE` + `VERTEX` × N + `SEQEND` (still supports per‑vertex bulge for arc segments).
- `ELLIPSE` → tessellated to a 64‑point closed `POLYLINE` approximation.
- `CIRCLE`, `ARC`, `LINE`, `TEXT`, `INSERT`, `BLOCK` are emitted natively.

### Files

| File | Purpose |
|------|---------|
| `js/dxfWriter.js` | Zero‑dependency text‑DXF writer. Owns handle allocation, HEADER vars, full TABLES section (VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE), reserved `$Model_Space` / `$Paper_Space` blocks, user blocks and entities. Public API: `addLayer()`, `addLineType()`, `addBlock()`, plus `line()`, `lwpolyline()` / `polyline()`, `circle()`, `arc()`, `ellipse()`, `text()`, `insert()`, `toString()`. Also exposes static helpers `DxfWriter.tessellateSvgPath(d, samples)` and `DxfWriter.roundedRectPoints(w, h, r)`. |
| `js/dxfBlockLibrary.js` | AIA / NCS layer scheme, item‑category → layer mapping, and starter library of vector blocks. Each block is centered at the origin with the device's "front" facing **+Y**, so `dxf.insert(name, x, y, { rotation })` rotates around the centroid. |
| `exportDxfFile()` in `js/roomcalc.js` | Orchestrator. Calls `canvasToJson()` first, then walks `roomObj`, emits the perimeter wall, registers VRC layer mirrors, and emits each item via `emitItem()` / `emitFootprintItem()` / `emitDisplay()` / `emitPathShape()`. |

### Coordinate system

- **Units**: meters (always). VRC items in feet are converted via `convertToMeters()` before serialization.
- **Origin**: room's lower‑left corner at `(0, 0)`.
- **Axes**: VRC uses Y‑down (Konva); CAD uses Y‑up. The exporter applies `flipY = roomLengthM - vrcY`.
- **Rotation**: VRC uses Konva CW degrees; CAD uses CCW degrees. The exporter applies `flipRot = -konvaDeg`.

For block instances, the exporter computes the item's centroid in CAD coordinates and inserts the block there with `rotation = -konvaDeg`. For inline footprints (tables, walls, displays, stage floors, paths) the exporter rotates corner points around the item's pivot, then maps the result through `flipY`.

### Layer scheme (AIA / NCS)

Layer names follow the US National CAD Standard `D-MAJR-MINR` pattern so the file drops cleanly into a real architectural set:

| Layer | ACI color | Used for |
|-------|-----------|----------|
| `A-WALL-EXTR` | 250 (near‑black) | Room perimeter |
| `A-WALL-FULL` | 250 (near‑black) | Standard interior walls (`wallStd`) |
| `A-WALL-GLAZ` | 141 | Glass walls (`wallGlass`) |
| `A-WALL-PATT` | 8 | Window walls and acoustic panels (`wallWindow`, `wallChairs`) |
| `A-DOOR` | 4 | Doors (single/double, left/right swings) |
| `A-FLOR-RISR` | 30 (DASHED) | Stage floors / risers |
| `A-FLOR-CARP` | 8 (DASHED) | Carpets |
| `A-FLOR-IDEN` | 250 (near‑black) | Floor‑item labels |
| `A-COLS` | 8 | Columns (rectangular and cylindrical) |
| `A-FURN-CHRS` | 5 | Chairs, wheelchairs |
| `A-FURN-TBLS` | 250 (near‑black) | Tables |
| `A-FURN-PEOP` | 8 | People silhouettes, plants, trees, poufs |
| `A-FURN-IDEN` | 250 (near‑black) | Furniture labels |
| `A-EQPM` | 9 (DASHED) | Generic equipment, boxes, spheres |
| `E-AV-CODE` | 1 | Codecs / Room Bars / Boards / Desks |
| `E-AV-CMRA` | 6 | Cameras (Quad, PTZ, P60, etc.) |
| `E-AV-MICR` | 3 | Table & ceiling microphones |
| `E-AV-DSPL` | 250 (near‑black) | Displays (single, dual, triple, 21:9) |
| `E-AV-SPKR` | 211 | Speakers |
| `E-AV-CTRL` | 4 | Navigators (table & wall) |
| `E-AV-PERF` | 8 | AV peripherals (projectors, headsets, phones) |
| `E-AV-IDEN` | 250 (near‑black) | AV labels |
| `A-ROOM-PATH` | 9 | `pathShape` (arbitrary user paths) |

**Why ACI 250 instead of 7 for "black"?** ACI 7 is officially "white/black depending on background", but several DXF viewers — notably AutoDesk Viewer — render it as a faint cream/yellow on a light background instead of inverting. ACI 250 is the darkest gray in the index (RGB ≈ 51,51,51) and renders solidly dark in every viewer we've tested. So architectural lines that should read as black (walls, tables, displays, identification labels) use 250, while distinct accent colors (red codecs, magenta cameras, green mics, blue chairs, cyan glass walls / doors) keep equipment categories visually separated.

In addition, every VRC layer (the user‑facing ones from the Layers tab) is mirrored into a `Z-VRC-LAYER-<sanitized name>` CAD layer (color 9). When a VRC layer is hidden or locked, the mirror CAD layer is set off / locked too, **and** every item from that VRC layer is routed onto the mirror layer instead of its normal AIA layer. This preserves the user's organisation when the file is opened in CAD.

### Labels (`TEXT` entities)

Labels are placed below the item's centroid on the matching `*-IDEN` layer:

- AV devices (codec, camera, navigator, touch panel) → always show the **model name** (matching VRC's default behavior).
- All other items (chairs, tables, displays, walls, etc.) → show the user's `data_labelField` if set, otherwise no label.

Text height is 0.10 m (≈4 inches), single‑line `TEXT` (chosen over `MTEXT` for cross‑tool compatibility).

### Block library

The block library lazily registers blocks the first time an item of a given `data_deviceid` is exported, so the file only contains the blocks it needs. Block names use the pattern `VRC_<DEVICEID>` (uppercased, underscored). Each block is built from primitives (`lwpolyline`, `circle`, `line`, `arc`) on the appropriate layer:

| Item kind | Block contents |
|-----------|----------------|
| Codec / room bar | Rounded rectangle + small line on +Y face marking the lens/display side |
| Camera (compact: P60, Room Vision PTZ, PTZ 4K + Bracket, …) | Body rectangle + concentric lens circles on the +Y face + short tick on the +Y edge for orientation |
| Camera (bracket‑style: w / d > 4, e.g. Quad Camera) | Long thin bar + concentric lens circles centered on the +Y face |
| Microphone (table) | Single circle |
| Microphone (ceiling) | Circle + cross‑hairs (standard CAD ceiling‑fixture symbol) |
| Speaker | Outer circle + inner cone circle |
| Navigator / touch panel | Rounded rectangle + inset rectangle for screen face |
| Chair | Rounded rectangle + chair‑back line on −Y |
| Door (single) | Door jambs + single leaf + 90° swing arc |
| Door (double) | Door jambs + two leaves + two swing arcs |
| Person standing | Two concentric circles (shoulders + head) |
| Plant / tree | Single (or nested) circle |
| Wheelchair / turn cycle | Rounded rectangle (or circle for turn‑radius) |

Tables, walls, columns, displays, stage floors, boxes, carpets, and `pathShape` items are emitted **inline** (no block) because their geometry varies per‑item.

### Adding a new device block

1. Add the device id to the appropriate `LAYER_*` map in `dxfBlockLibrary.js` (`DEVICE_LAYER_FOR_DEVICE_ID`).
2. If it needs a custom block visual, add a `_defineXxxBlock(name, dims, layer)` method modeled on the existing helpers, and route to it from `blockForItem()` based on either `data_deviceid` or the resolved layer category.
3. If the device should always be labelled with its model name (like other AV devices), make sure its layer is one of the AV layers — `ALWAYS_LABELLED_DEVICE_IDS` is computed from those.

### Internals worth knowing

- **Handles**: every entity carries a hex handle (group code 5). The writer pre‑allocates **all** boilerplate + user‑block handles before serializing the HEADER, so `$HANDSEED` is the true upper bound and no two records collide. User block contents are allocated handles incrementally as `addBlock(...).lwpolyline(...)` etc. are called on the proxy returned by `addBlock()`.
- **Reserved blocks**: `$Model_Space` and `$Paper_Space` MUST exist in every R12 file. The writer emits them automatically with empty bodies.
- **Required tables**: VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE are emitted unconditionally (most with minimal default records). Skipping any of them causes AutoCAD Web App to reject the file.
- **Line endings**: CRLF, per the DXF spec.
- **Coordinate precision**: 4 decimal places (≈0.1 mm in meters) — keeps file size reasonable while staying well below human‑perceptible accuracy.

### Validation

The output is validated by `ezdxf` (Python). A clean export reports `errors=0, fixes=0` against `ezdxf.audit()` and round‑trips cleanly through `ezdxf.readfile() → saveas('R2018') → readfile()`.

---

## Templates System

Templates are defined in `js/templates.js`:

```javascript
const templates = [
  {
    id: 'round-angle',
    name: 'Round corner table at angle',
    image: 'round-angle.png',
    url: 'A1v0.1.608b2402c2300...',  // Encoded room state
    note: 'Optional note',
    noteUrl: 'https://...'  // Optional link
  },
  // ...
]
```

Templates are loaded via `loadTemplate(url)` function.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Quick add menu |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Shift+Ctrl+Z` | Redo |
| `Ctrl+R` | Rotate 90° |
| `Ctrl+G` | Group selected items (≥2 items required) |
| `Ctrl+Shift+G` | Ungroup (dissolve, keep items) |
| `Ctrl+S` | Save/Download JSON |
| `Ctrl+E` | Export to Workspace Designer |
| `Ctrl+Shift+E` | Export to Cisco xConfiguration .txt |
| `Ctrl+Shift+D` | Export to AutoCAD R12 DXF |
| `Ctrl+I` | Import file |
| `Delete` / `Backspace` | Delete selected |
| `Esc` | Deselect all |
| `C` | Toggle camera coverage |
| `M` | Toggle microphone coverage |
| `D` | Toggle display coverage |
| `Arrow keys` | Move selected items |

---

## Development Notes

### To Make Changes:

1. **Modify roomcalc.js** for logic changes
2. **Modify style.css** for styling changes
3. **Modify RoomCalculator.html** for layout changes
4. Refresh browser to see changes (no build step needed)

### Key Areas for Common Modifications:

- **Add new device type:** Add to device arrays in `roomcalc.js`, add `workspaceKey`, add image to `assets/images/`
- **Change UI layout:** Edit HTML structure and CSS
- **Modify coverage visualization:** Look for `grShading*` groups
- **Change toolbar:** Edit `#controlButtons` in HTML
- **Add new template:** Add to `templates.js`

### Testing:

- Open `RoomCalculator.html` directly in browser
- Use browser DevTools for debugging
- Check console for errors
- Test on different screen sizes for responsive behavior

---

## Konva.js Notes

> **Working on Konva code? Read `TECH_NOTES_KONVA.md` first.**
> It documents the 26 Konva.js footguns that have bitten this project
> (selector limits, the `data_*` JS-property convention vs `setAttr`,
> Transformer scale-not-size, `findOne` vs `find[0]`, why
> `stage.toJSON()` is NOT viable here, the
> `tr.nodes([])`-detach-before-bulk-mutate speed pattern, etc.). The
> section below is a short summary; the deep dives are in that file.

**IMPORTANT:** Konva.js uses CSS-like property names in JavaScript objects, but these are NOT CSS properties. Do not confuse them.

### Konva Properties vs CSS

```javascript
// This is KONVA (JavaScript object), NOT CSS:
new Konva.Rect({
  x: 100,
  y: 200,
  width: 50,
  height: 30,
  fill: 'blue',           // Konva property, not CSS
  stroke: '#ccc',         // Konva property, not CSS
  strokeWidth: 2,         // Konva property (camelCase, not stroke-width)
  cornerRadius: 5,        // Konva property
  opacity: 0.5,           // Konva property
  rotation: 45,           // Konva property (degrees, not CSS transform)
  draggable: true         // Konva property
});
```

### Key Differences from CSS

| Konva | CSS Equivalent | Notes |
|-------|----------------|-------|
| `fill` | `background-color` | Konva uses `fill` for shapes |
| `stroke` | `border-color` | Konva uses `stroke` for outline |
| `strokeWidth` | `border-width` | camelCase in Konva |
| `cornerRadius` | `border-radius` | camelCase in Konva |
| `rotation` | `transform: rotate()` | Degrees as number, not string |
| `x`, `y` | `left`, `top` | Direct coordinates |
| `listening` | - | Whether shape receives events |
| `visible` | `display`/`visibility` | Boolean in Konva |

### Common Konva Methods Used in VRC

```javascript
// Creating shapes
new Konva.Line({ points: [x1,y1,x2,y2], stroke: '#000' })
new Konva.Rect({ x, y, width, height, fill })
new Konva.Circle({ x, y, radius, fill })
new Konva.Image({ x, y, image, width, height })
new Konva.Group({ x, y, rotation })
new Konva.Text({ x, y, text, fontSize, fill })

// Transformations
shape.x()           // Get x position
shape.x(100)        // Set x position
shape.rotation()    // Get rotation in degrees
shape.rotation(45)  // Set rotation
shape.scale({ x: 2, y: 2 })

// Layer management
layer.add(shape)
layer.draw()
layer.batchDraw()

// Events
shape.on('click', handler)
shape.on('dragend', handler)

// Attributes
shape.setAttrs({ fill: 'red', opacity: 0.5 })
shape.getAttr('fill')
shape.attrs  // All attributes object
```

### VRC-Specific Konva Patterns

```javascript
// Items store data in Konva node attributes
node.data_deviceid = 'roomBar';
node.data_zPosition = 0.9;
node.data_labelField = 'My Label';

// Access via attrs
const deviceId = node.attrs.data_deviceid;

// The transformer for selection
const tr = new Konva.Transformer({
  nodes: [selectedShape],
  rotationSnaps: [0, 90, 180, 270]
});
```

---

## External Dependencies (CDN)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

All other dependencies are local in the `js/` folder.

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Canvas not rendering | Check browser console for Konva errors |
| Images not loading | Verify paths in `assets/images/` |
| URL too long | Room has too many objects (>500), use JSON file instead |
| Workspace Designer export fails | Check `workspaceKey` mapping exists |

---

## File Modification Guide

| To Change... | Edit This File |
|--------------|----------------|
| App behavior/logic | `js/roomcalc.js` |
| Visual styling | `style.css` |
| Page structure | `RoomCalculator.html` |
| Room templates | `js/templates.js` |
| Device images | `assets/images/` |
| Icons | `assets/momentum-icons.css` |

---

## Git Branching Model

This repo uses a two-branch workflow. Full details and command reference live
in `GIT_WORKFLOW.md` at the repo root.

| Branch | Purpose |
|--------|---------|
| `main` | Stable. Always something the author would be willing to deploy. Bug fixes and small safe additions go here. |
| `next` | Work-in-progress. Big refactors and risky features live here until they're ready to merge into `main`. |

Tags (e.g. `v0.1.645`) mark deployed/stable snapshots and are pushed to
`origin` alongside the branch.

### When working in this repo, the assistant should

**Hard rule: the user always runs git themselves.** The assistant must
NOT run any state-changing git command — no `git add`, `git commit`,
`git push`, `git pull`, `git merge`, `git rebase`, `git reset`,
`git checkout` of a different branch, `git stash`, branch creation /
deletion, tag creation / deletion, or anything else that mutates the
repo. This applies even when the user says "let's commit" — that means
"give me the commands to run", not "run them for me".

Read-only inspection is fine and encouraged: `git status`, `git diff`,
`git log`, `git branch`, `git show`, `git blame`, `git remote -v`, etc.

When the user is ready to commit, the assistant should provide:

1. The exact CLI commands to run (copy-paste-ready, with proper
   quoting and HEREDOC for multi-line commit messages).
2. A drafted commit message in the repo's style.
3. A note about which branch the commit should land on (`main` for
   small safe additions and bug fixes; `next` for risky refactors and
   large features — see the table above).

Other guidance:

- Before suggesting commits, the assistant may run read-only
  `git status` / `git branch` to see the lay of the land.
- For risky refactors or large new features, suggest `next` rather
  than `main` (or ask which branch the user wants).
- For small bug fixes the user wants live soon, `main` is appropriate.
- Never suggest destructive git operations (`reset --hard`,
  `push --force`, branch deletion) without flagging the risk
  prominently first.
- See `GIT_WORKFLOW.md` for the day-to-day cheat sheet, the
  merge-forward pattern for hotfixes, and the "everything went wrong"
  recovery steps.
