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
├── README.md                # Release notes & user-facing docs
├── FAQ.md                   # Frequently asked questions
├── LICENSE                  # MIT NON-AI license
├── notes/                          # Lazy-loaded references (not in CLAUDE.md context)
│   ├── GIT_WORKFLOW.md             # Branching, tagging, day-to-day cheatsheet
│   ├── TECH_NOTES.md               # Engineering notes & refactor targets
│   ├── TECH_NOTES_KONVA.md         # Konva.js footguns specific to this codebase
│   ├── KONVA.md                    # Konva.js API/CSS cheat sheet (companion to footgun file)
│   ├── URL_ENCODING.md             # `?x=…` shareable-link format (items / layers / groups)
│   ├── WORKSPACE_DESIGNER.md       # Cisco WD JSON round-trip (incl. Group block)
│   ├── XCONFIG.md                  # Cisco xConfiguration .txt import + export
│   ├── DXF_EXPORT.md               # AutoCAD R12 DXF export (layers, blocks, internals)
│   ├── UI_LAYOUT.md                # HTML structure + CSS organization quick map
│   ├── TEMPLATES.md                # Templates system blurb
│   ├── KEYBOARD_SHORTCUTS.md       # Canonical keyboard shortcut list
│   └── DEPENDENCIES_AND_ISSUES.md  # External CDN deps + common issues cheat sheet
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
`notes/TECH_NOTES.md`); `roomcalc.js` then aliases the public names back into
local `const` bindings near the top of the file so existing call sites
stay unchanged. See the Phase 2 header comment in `roomcalc.js` and the
IIFE pattern note in `js/data/workspaceKey.js`.

The lazy-loaded scripts (`templates.js`, `qrcode.js`,
`drpDownOverride.js`, `dxfWriter.js`, `dxfBlockLibrary.js`) are pulled
in on demand by `loadScriptOnce()` and are *not* listed in
`RoomCalculator.html`.

`notes/TECH_NOTES.md` documents the long-term refactor direction. Read it
before doing structural changes. `notes/GIT_WORKFLOW.md` describes the
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
| `convertMetersFeet()` | 2401 | Converts between units. Walks `roomObj.items` AND `roomObj.groups` (group rect geometry is also stored in unit-space and would otherwise drift away from its members on the next `drawRoom()`). Lives in `js/util/units.js`. |
| `convertToMeters()` | 2278 | Normalizes to meters |
| `convertToUnit()` | 1868 | Converts value to current unit |

---

## HTML & CSS Layout

The page is a fixed top header (`ContainerHeader`) over a
three-column body (`sidebar`, `ContainerRoomSvg` with the Konva
canvas, optional details). All modal dialogs (`newRoomDialog`,
`dialogSave`, `dialogQuestions`, `modalWorkspace`, `dialogQuickAdd`)
are siblings of the body. The CSS uses a single primary colour
variable (`--active: #0352a6`) and four responsive breakpoints
(900 / 783 / 650 / 405 px).

See `notes/UI_LAYOUT.md` for the full layout map, key ID/class
tables, and breakpoint specifics. The actual source files
(`RoomCalculator.html`, `style.css`) are always the source of truth —
the notes file is a quick map.

---

## Workspace Designer Integration

The app exports to (and imports from) Cisco's Workspace Designer
using `workspaceKey` mappings in `js/data/workspaceKey.js`. Quick
coordinate mapping: VRC x = WD x, VRC y = WD z, VRC `data_zPosition`
= WD y, VRC degrees = `-1 * radians`.

See `notes/WORKSPACE_DESIGNER.md` for the per-item mapping conventions
and the VRC Group round-trip (per-member `"group": "<groupid>"` plus
the room-level `data.vrc.groups[]` block).

---

## URL Encoding Format

Shareable links are a compressed `?…` query string. Uppercase 2-char
prefixes mark item types (`AB`=Room Bar, `MA`=Ceiling Mic Pro,
`TA`=Rectangle Table, `WA`=Wall, etc.); lowercase letters encode item
attributes (x is implicit, `a`=y, `b`=z, `c`=width, `d`=length,
`f`=rotation, `m`=color, `s`=group ref, `ll`=layer ref, `~text~`=label).
Room-level prefixes: `A` (unit/version), `B` (visibility flags),
`C~ver~` (author version), `D`/`E`/`F`/`G` (walls), `L{n}` (layers),
`H{n}` (groups). Encode/decode lives in `createShareableLink()` and
`parseShortenedXYUrl()` in `js/roomcalc.js`.

See `notes/URL_ENCODING.md` for the full attribute table, the
complete item-prefix tables, the `B` visibility-flag positions, the
`L{n}` layer encoding, the `H{n}` group encoding (incl. why x/y/z/w/h
are explicit and not derived), worked examples, and the encoder /
parser cross-reference table.

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
 `s{n}` on items. See the "Group URL Encoding" section in
 `notes/URL_ENCODING.md` for the format and the implementation
 cross-reference table.
- **Workspace Designer round-trip** — items carry their `data_groupId`
 on the WD JSON as a `"group": "<groupid>"` string attribute, and the
 Group rect's geometry / metadata round-trips via
 `workspaceObj.data.vrc.groups[]`. See the stub immediately below and
 `notes/WORKSPACE_DESIGNER.md` for the full format and the
 implementation cross-reference table.

### Workspace Designer Group Round-Trip

Groups round-trip through Workspace Designer via two parallel pieces:
each member item carries a plain `"group": "<groupid>"` string
attribute on its `customObjects[]` entry, and the Group rect itself
(geometry + metadata + `layerName`) is stashed in
`workspaceObj.data.vrc.groups[]` (always meters, VRC top-left
coords — same convention as `data.vrc.backgroundImage`). On import,
`groupMembers` is rebuilt by scanning items for `data_groupId`
references; empty groups are filtered.

See `notes/WORKSPACE_DESIGNER.md` for the JSON shape, the coordinate
asymmetry between items and groups, hidden-layer handling, and the
implementation cross-reference table.

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

VRC supports importing **three** distinct file formats through the
same UI (open-file picker and drag-and-drop): VRC JSON, Workspace
Designer JSON, and Cisco xConfiguration `.txt`. Detection is done by
**content** (in `routeUploadedFileText()`), not file extension.

The xConfig variant is bidirectional — `Ctrl/Cmd+Shift+E` writes a
matching `.xconfig.txt` that re-imports cleanly through the same
parser (`parseXConfigText()`).

See `notes/XCONFIG.md` for the full detection pipeline, the three
xConfig line formats, the coordinate model + Quad Camera handling,
the xConfig XYZ tracking columns, room-sizing rules, and the export
contract (label format checks, summary dialog, etc.).

---

## CAD DXF Export

Exports the room as an AutoCAD R12 (AC1009) `.dxf` file via the
**Save** dialog → **Export CAD DXF (meters)** menu item, or
**`Ctrl/Cmd+Shift+D`**. Always meters, always AIA / NCS layer scheme.
Implementation lives in `js/dxfWriter.js`, `js/dxfBlockLibrary.js`,
and `exportDxfFile()` in `js/roomcalc.js`.

See `notes/DXF_EXPORT.md` for the full layer table, block library,
coordinate transform, and instructions for adding a new device block.

---

## Templates System

Pre-built room templates surface in the **Templates** tab of
`#newRoomDialog`. Each template is a single encoded `?x=…` URL fed
to `loadTemplate(url)`. Definitions live in `js/templates.js`
(lazy-loaded on first dialog open via `ensureTemplatesPopulated()`).

See `notes/TEMPLATES.md` for the entry shape, the placeholder-swap
flow in `populateTemplates()`, and the loading-state CSS contract.

---

## Keyboard Shortcuts

See `notes/KEYBOARD_SHORTCUTS.md` for the canonical list of every
keyboard shortcut bound by `js/roomcalc.js` (Cmd is accepted in place
of Ctrl on macOS). The handler lives near the `keydown` listener
registration in `js/roomcalc.js`.

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

> **Working on Konva code? Read `notes/TECH_NOTES_KONVA.md` first.**
> It documents the 26 Konva.js footguns that have bitten this project
> (selector limits, the `data_*` JS-property convention vs `setAttr`,
> Transformer scale-not-size, `findOne` vs `find[0]`, why
> `stage.toJSON()` is NOT viable here, the
> `tr.nodes([])`-detach-before-bulk-mutate speed pattern, etc.).

**IMPORTANT:** Konva.js uses CSS-like property names in JavaScript
objects, but these are NOT CSS properties (e.g. `fill`, `stroke`,
`strokeWidth`, `cornerRadius`, `rotation` in **degrees**). Items store
their VRC-specific data as plain JS properties on the node:
`node.data_deviceid`, `node.data_zPosition`, `node.data_labelField`,
etc.

See `notes/KONVA.md` for the API/CSS-vs-Konva cheat sheet, common
Konva methods used in VRC, and the VRC-specific Konva patterns.

---

## External Dependencies & Common Issues

The only CDN dependency is **DOMPurify** (HTML sanitization). Every
other JS file lives in `js/`. There is no build step. See
`notes/DEPENDENCIES_AND_ISSUES.md` for the script-load order and a
short troubleshooting cheat sheet.

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
in `notes/GIT_WORKFLOW.md`.

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
- See `notes/GIT_WORKFLOW.md` for the day-to-day cheat sheet, the
  merge-forward pattern for hotfixes, and the "everything went wrong"
  recovery steps.
