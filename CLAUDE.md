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
├── package.json             # NPM config for linting
├── .eslintrc.json           # ESLint configuration
├── CLAUDE.md                # This developer reference
├── RECOMMENDATIONS.md       # Code improvement recommendations
├── js/
│   ├── constants.js         # Configuration constants (NEW)
│   ├── roomcalc.js          # Core application logic (~13,000 lines)
│   ├── templates.js         # Pre-built room templates
│   ├── konva.min.js         # Canvas rendering library
│   ├── qrcode.js            # QR code generation
│   └── drpDownOverride.js   # Dropdown UI for RoomOS
├── data/                    # Device specifications (NEW)
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
├── README.md                # Release notes & documentation
├── FAQ.md                   # Frequently asked questions
└── LICENSE                  # MIT NON-AI license
```

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
  ]
  // items carry an optional data_layerId = layerid string; omitted for Default layer ('0')
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
| `canvasToJson()` ~line 6945 | `itemAttr.data_xxx = node.data_xxx` | Read from node, write to roomObj |
| Copy function ~line 6221 | `newAttr.data_xxx = node.data_xxx` | Preserve during copy/paste |

### Why this matters:
- Konva only supports standard attributes (x, y, width, rotation, etc.)
- Custom `data_*` attributes are stored directly on the node object
- `canvasToJson()` syncs these back to `roomObj` which is the source of truth
- If you skip any step, the attribute will appear to save but then disappear when clicking another item

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

### Layer Configuration (`y` attribute in `B` section)

Layers are encoded as a `y` attribute within the `B` section, using tilde-delimited text with pipe separators:

Format: `B10010100y~numLayers|name1|VL|name2|VL|...~`

| Part | Description |
|------|-------------|
| `numLayers` | Number of layers (e.g., `2`) |
| `name1` | Layer 1 name (URL encoded, `+` for spaces) |
| `VL` | Two digits: V=visible(0/1), L=locked(0/1) |

Example: `B10010100y~2|Layer+1|10|Background|01~`
- 2 layers total
- Layer 1: name="Layer 1", visible=true, locked=false (`10`)
- Layer 2: name="Background", visible=false, locked=true (`01`)

**Note:** Layer data is only encoded if non-default (more than 1 layer, or Layer 1 has modified name/visibility/lock).

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
| `s` | group index | Index | Group index (items with same index are grouped) |
| `ll` | layer number | Number | VRC layer reference: `ll1`=Ceiling, `ll20`+ = custom layers. Omitted for Default (0) |
| `~text~` | label | String | data_labelField (URL encoded) |

**AVAILABLE for future use:** `t`, `u`, `v`, `w`, `x`, `z`

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

### Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `createShareableLink()` | 5039 | Builds complete URL |
| `createShareableLinkItem()` | ~5220 | Encodes single item |
| `createShareableLinkItemShading()` | 5346 | Encodes `B` visibility flags |
| `parseShortenedXYUrl()` | 2734 | Decodes URL back to roomObj |

### Adding New Attributes

When adding new item attributes:
1. Use next available lowercase letter (`s`, `t`, `u`, etc.)  — `r` is taken by path points, `ll` is taken by layer number
2. Only encode non-default values to save URL space
3. Update both `createShareableLinkItem()` and `parseShortenedXYUrl()`
4. Ensure backwards compatibility (old URLs without new attribute use defaults)

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
| `canvasToJson()` | Save `data_layerId` to `itemAttr` (both `getNodesJson` sections) | ✓ |
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
| `Ctrl+S` | Save/Download JSON |
| `Ctrl+E` | Export to Workspace Designer |
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
