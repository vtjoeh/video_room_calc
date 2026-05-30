# Workspace Designer Round-Trip

The app exports to (and imports from) Cisco's Workspace Designer JSON
format. This file documents the per-item mapping, the coordinate
transforms, and how VRC Groups round-trip through WD.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
WD export/import code or debugging a round-trip.

Companion files:
- `../CLAUDE.md` — user-facing dev reference (has a short stub linking
  here for the deep dive).
- `URL_ENCODING.md` — for the `?x=` URL-based round-trip.
- `XCONFIG.md` — for the Cisco xConfiguration text round-trip.

---

## Workspace Designer Integration

The app exports to Cisco's Workspace Designer using `workspaceKey`
mappings (lines 223-427 of `js/roomcalc.js`). Each device type maps to
a Workspace Designer object:

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

## VRC Group Round-Trip

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

### Coordinate model

Items in `customObjects[]` go through the full WD coordinate transform
(swap X/Z, centre on `roomWidth/2, roomLength/2`, apply `roomX`/`roomY`
offsets via `convertToMeters()`). Groups in `data.vrc.groups[]` do
**not** — they stay in VRC top-left meters. The asymmetry is deliberate
and matches the existing `data.vrc.backgroundImage` block. On import
both flows reconstruct items + groups in VRC top-left coords, so they
align.

### Items in hidden VRC layers

`removeHiddenLayerItemsForExport()` already drops items in hidden
layers from `customObjects[]` before export. Groups always share their
members' layer (`createGroup()` / `updateItemLayer()` enforce this), so
a group on a hidden layer has all its members dropped and ends up
filtered by the empty-group rule on import. No extra handling needed
on the export side — the empty group survives in `data.vrc.groups[]`
but is dropped on the post-parse rebuild.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Per-item `group` attribute encoder | `setGroupOnWorkspaceItem()` inside `exportRoomObjToWorkspace()` (mirror of `setLayerOnWorkspaceItem()`) |
| Per-item `group` attribute call sites | All four push helpers (`workspaceObjItemPush`, `workspaceObjDisplayPush`, `workspaceObjTablePush`, `workspaceObjWallPush`) call `setGroupOnWorkspaceItem(workspaceItem, item)` immediately before `workspaceObj.customObjects.push(workspaceItem)` |
| `data.vrc.groups[]` encoder | `exportRoomObjToWorkspace()` — block immediately after the `data.vrc.backgroundImage` emit. Reads `roomObj.groups` directly (not `roomObj2.groups` — `convertToMeters()` drops `groups` from the clone) and applies `groupRatio = (roomObj.unit === 'feet') ? (1/3.28084) : 1` |
| Per-item `group` attribute decoder | `wdItemToRoomObjItem()` — `if ('group' in wdItem)` block immediately after the `wdItem.layer` extraction. Strips the key from `wdItem` so it doesn't leak into `data_labelField` |
| `data.vrc.groups[]` decoder + post-parse member rebuild | `importWorkspaceDesignerFile()` — block immediately after the `data.vrc.backgroundImageFile` import. Calls `ensureGroups(roomObj2)`, then walks `data.vrc.groups[]` and pushes new entries into `roomObj2.groups`, then mirrors the URL parser's `roomObj.groups.filter(g => g.groupMembers && g.groupMembers.length)` rebuild |
| Group rect skip in `customObjects[]` | `canvasToJson()` already enforces `if (node.data_deviceid === 'group') return;` so group rects never enter `roomObj.items` and therefore never reach the WD push helpers |

---

## VRC CustomItem Round-Trip

VRC CustomItems round-trip cleanly through the Workspace Designer JSON
format using exactly the same two-piece pattern as Groups (read the
section above first; this section only calls out the differences).

1. **Per-member item attribute** — every `customObjects[]` member of a
   customItem carries a plain `"customItem": "<customitemid>"` string
   attribute. An item that belongs to BOTH a group and a customItem
   carries both `"group": "<groupid>"` AND `"customItem": "<customitemid>"`.

2. **Room-level customItem block in `data.vrc.customItems`**:

```json
{
  "customitemid": "uuid",
  "name": "Custom Item 1",
  "x": 1.5,
  "y": 3.84,
  "width": 2.5,
  "height": 3.5,
  "rotation": 0,
  "data_zPosition": 0,
  "layerName": "Furniture"
}
```

Same conventions as the `data.vrc.groups[]` block: always meters, VRC
top-left coords, `layerName` instead of `layerid` (omitted for
Default), `customItemMembers` rebuilt on import.

### CustomItem can sit inside a Group (Option 1 design)

A CustomItem may have a parent Group — i.e., its members can also be
in a Group, and the CustomItem rect's `data_layerId` always matches
the members' shared layer. The WD round-trip handles this naturally:
each item carries both attributes, and the two room-level blocks are
independent. On import, `groupMembers` and `customItemMembers` are
rebuilt independently from the per-item refs. The reverse (a Group
that contains CustomItems) is **not** supported — see the design
discussion in `CLAUDE.md`.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Per-item `customItem` attribute encoder | `setGroupOnWorkspaceItem()` — same function as `group`, also writes `workspaceItem.customItem = item.data_customItemId` when set. Renamed conceptually to "set bundle attrs" but kept the same JS name to avoid touching every call site |
| Per-item `customItem` attribute call sites | Same four push helpers as `group` — the single `setGroupOnWorkspaceItem(workspaceItem, item)` call covers both bundle types |
| `data.vrc.customItems[]` encoder | `exportRoomObjToWorkspace()` — block immediately after the `data.vrc.groups` emit. Mirror of the groups block, walks `roomObj.customItems` |
| Per-item `customItem` attribute decoder | `wdItemToRoomObjItem()` — `if ('customItem' in wdItem)` block immediately after the `'group' in wdItem` block. Strips the key from `wdItem` |
| `data.vrc.customItems[]` decoder + post-parse member rebuild | `importWorkspaceDesignerFile()` — block immediately after the `data.vrc.groups` import. Calls `ensureCustomItems(roomObj2)`, walks `data.vrc.customItems[]`, and rebuilds `customItemMembers` from `data_customItemId` references |
| CustomItem rect skip in `customObjects[]` | `canvasToJson()` already enforces `if (node.data_deviceid === 'group' \|\| node.data_deviceid === 'customItem') return;` so CustomItem rects never enter `roomObj.items` and therefore never reach the WD push helpers |

---

## VRC Parent Item Round-Trip

VRC **Parent Items** are a different round-trip pattern from Groups /
CustomItems: they are NOT a bundle of existing VRC items, but a single
VRC item (e.g. `genericSecurityCamera`) that has no native Workspace
Designer object type and is therefore exported as **multiple WD
primitives** (cylinder + sphere + box + ...) plus a metadata block
that round-trips the original parent record. Workspace Designer's
schema is unchanged — every emitted child is a normal `cylinder` /
`sphere` / `box` / etc.; the only VRC-specific surface on each child
is a vrc-namespaced back-reference.

The mechanism is opt-in per device: `workspaceKey[deviceid]` declares
`parentItem: true` and a `childItemParts: [...]` array of part
templates (in VRC's native `roomObj.items` shape — meters, upper-left
origin, width-as-X-extent). At export time a pre-pass pulls every
flagged item out of every parentGroup bucket and routes it through
`pushParentItemChildren()` instead of the normal per-bucket push.

### JSON shape

Two pieces, parallel to Groups / CustomItems:

1. **Per-child back-reference attributes** on each emitted
   `customObjects[]` entry (a normal cylinder / sphere / box):

   ```json
   {
     "objectType": "cylinder",
     "id": "genericSecurityCamera~253c1ed1-3767-4bb2-9f1d-fb56770fbd92~0",
     "position": [-0.04, 2.495, -0.02],
     "rotation": [0, 0, 0],
     "length": 0.05,
     "radius": 0.06,
     "vrcParent": "253c1ed1-3767-4bb2-9f1d-fb56770fbd92",
     "vrcParentDeviceId": "genericSecurityCamera"
   }
   ```

   The child `id` is **deterministic**:
   `<parentDeviceId>~<parentInstanceUuid>~<childIndex>` (the index is
   the part's position in `childItemParts`). It is stable across
   re-exports of the same room, so re-importing an unchanged WD file
   keeps identical child ids and a WD-side diff doesn't churn on a
   fresh random UUID each save. The parent instance UUID keeps
   children of two instances of the same device distinct; the index
   keeps siblings within one parent unique.

   `vrcParent` is the parent's instance UUID;
   `vrcParentDeviceId` is the parent's `data_deviceid`. Both are
   **vrc-prefixed** because they are VRC-specific additions to a WD
   top-level `customObjects[]` entry — the WD-team contract today
   only formally agrees on `group`, so anything else VRC writes onto
   a top-level customObjects entry that ISN'T part of the agreed
   schema starts with `vrc` to protect against collisions with future
   native WD attributes. (Pre-existing exceptions `group`,
   `customItem`, `comment`, `layer` are locked in by prior
   round-trips.)

2. **Room-level parent block in `data.vrc.parentItems[]`**:

   ```json
   {
     "itemId": "253c1ed1-3767-4bb2-9f1d-fb56770fbd92",
     "data_deviceid": "genericSecurityCamera",
     "name": "Security Camera (generic)",
     "version": "1",
     "x": 0.4,
     "y": 0.42,
     "width": 0.12,
     "height": 0.12,
     "rotation": 0,
     "data_zPosition": 2.42
   }
   ```

   Same conventions as the `data.vrc.groups[]` / `data.vrc.customItems[]`
   blocks: always meters, VRC top-left coords (no `roomX`/`roomY`
   shift), `layerName` instead of `layerid` (omitted for Default),
   `group` / `customItem` for bundle membership when present.
   Optional pass-through fields (`data_tilt`, `data_slant`,
   `data_vHeight`, `data_fill`, `data_opacity`, `data_color`,
   `data_role`, `data_mount`, `data_hiddenInDesigner`,
   `data_labelField`) are emitted only when set.

### Coordinate model

`childItemParts[].x, .y` is the offset (meters) from the parent's
upper-left corner in the parent's **local (un-rotated) frame** — same
convention as `roomObj.items`. At export the world position of each
child is computed as: rotate `(part.x, part.y)` around the parent's
upper-left by `parent.rotation`, then translate to `(parent.x,
parent.y)`. With rotation=0 this collapses to a plain
`(parent.x + part.x, parent.y + part.y)` add. `data_zPosition` is a
plain add. Rotation is `parent.rotation + part.rotation`.

### Inheritance from parent → child

Each emitted child WD object inherits these attributes from the
parent so a layer hide / Group / CustomItem / hidden-in-Designer flag
applied to the parent flows to every WD primitive:

- `data_layerId` → emitted as `layerName` via `setLayerOnWorkspaceItem()`
- `data_groupId` → emitted as `group: "<groupid>"`
- `data_customItemId` → emitted as `customItem: "<customitemid>"`
- `data_hiddenInDesigner` → emitted as `hidden: true`

Children's own `data_fill`, `data_opacity`, `data_radius2`, and
`data_labelField` come from the part template (when set).

### Items in hidden VRC layers

`removeHiddenLayerItemsForExport()` runs BEFORE the parentItem
pre-pass and drops the parent itself, so its children are never
emitted. No extra handling needed.

### Parent anchor heuristic — UL vs. visual-center

`childItemParts[]` `x` / `y` values are documented as offsets from
the parent's **upper-left** corner in the parent's local
(un-rotated) frame. This works directly for **UL-anchored device
classes** (`parentGroup` ∈ `tables` / `stageFloors` / `boxes` /
`rooms`). **Center-anchored device classes** (`videoDevices` /
`microphones` / `chairs` / `displays` — including
`genericSecurityCamera` and `room55`) are different: the canvas
renders them with `offsetX = w/2` / `offsetY = h/2` so the user's
`(item.x, item.y)` is the **visual centre** of the icon, not the
upper-left.

> **The UL-vs-center decision keys off the device CLASS
> (`parentGroup`), not the instance's width/height presence** — same
> convention as `partAnchorIsUL()` in `createCustomItemMenuImage()`.
> The earlier `parent.width != null` check broke on reload: a
> center-anchored parent (e.g. `room55`, a `videoDevice`) has no
> width/height when freshly inserted but gains them after any canvas
> round-trip (`drawRoom()` → `canvasToJson()`), flipping the anchor to
> UL and shifting every child by half the extent on the next export
> (the "refresh breaks alignment" bug).

`pushParentItemChildren()` resolves both cases with a **pivot +
anchor-offset** model at the top of the function:

- **UL-anchored** (`parentGroup` ∈ tables / stageFloors / boxes /
  rooms): pivot = stored `(parent.x, parent.y)`, anchor offset =
  `(0, 0)`.
- **Centre-anchored** (every other class): pivot = stored
  `(parent.x, parent.y)` (the centre), anchor offset =
  `(−effW/2, −effH/2)` where `effW`/`effH` come from `parent.width` /
  `parent.height` if present, else `allDeviceTypes[deviceid].width` /
  `.depth` (mm ÷ 1000 — `roomObj2` is already meters here).

Each child world position is
`pivot + R(rot) · (partOffset + anchorOffset)`. **The anchor offset is
rotated together with the part offset** — it's part of the local
vector. The original implementation subtracted `effW/2`/`effH/2` in
world axes and rotated only the part offset around that pre-shifted
point; that's correct at rot 0 but drifts every child up to a
half-extent (~1–1.5 m on `room55`) at 90° / 180° / −90° (the "only
rotation 0 lines up" bug). Verified against a `room55` parentItem
stacked on the equivalent CustomItem across all four rotations: max
error dropped from ~1.0–1.5 m to ~0.02–0.10 m.

### Authoring helper (test-mode-only)

The Edit Custom Item dialog (`#dialogCustomItemEdit`, opened via
the Quick Add tile ellipsis) carries a hidden orange button **"Copy
as parentItem template"** that copies a paste-ready
`workspaceKey.<id> = { parentItem: true, childItemParts: [...] }`
snippet to the clipboard. Visibility is gated on
`localStorage.getItem('test') === 'true'` (set by appending `?test`
to the URL).

The conversion is essentially a field whitelist + JSON pretty-print:
the IDB library record's `customItemParts` array already stores
parts in METERS, in the CustomItem-local frame with UL=0,0 origin
and rotation normalized to (-180°, 180°] — exactly the convention
`pushParentItemChildren()` expects. The helper drops runtime-only
fields the customItem exporter carries (`data_diagonalInches`,
`data_fovHidden`, `data_audioHidden`, …) that parentItem children
never use, slugifies the customItem name into a JS-identifier device
id, and writes via `navigator.clipboard.writeText`.

Two numeric normalizations run first: (1) `data_zPosition` is rebased
so the lowest part sits at 0 (the parent's own `data_zPosition` is
added back on export, so the user sets resting height via the parent
— 0 = on the ground). A part with NO `data_zPosition` counts as 0
(floor) in the minimum, so a mixed assembly (base parts at implicit 0
+ elevated parts) keeps its vertical structure — only an
all-elevated assembly (ceiling fan) actually shifts. (2) `x` / `y` /
`data_zPosition` are rounded to 4 decimal places for readability.

| Concern | Location |
|---------|----------|
| Button HTML | `#customItemEditCopyAsParentBtn` in `RoomCalculator.html` |
| Visibility wire-up | `openEditCustomItemDialog()` in `js/roomcalc.js` |
| Conversion handler | `copyCustomItemAsParentTemplate(baseId)` in `js/roomcalc.js` |

### Coverage / canvas behaviour

Parent Items live in their own `roomObj.items[]` entry like any other
VRC item, so they ride existing surfaces (URL encoding, `.vrc.json`
import/export, undo/redo, copy/paste, layers, groups, customItems)
unchanged. The composite-WD behaviour ONLY affects the WD JSON
export/import paths. A parentItem device's `parentGroup` (e.g.
`microphones` for `genericSecurityCamera`) determines its on-canvas
shading — orthogonal to the round-trip.

### Round-trip identity

- The parent's instance UUID (`item.id`) is preserved end-to-end via
  `data.vrc.parentItems[].itemId`.
- Children get fresh UUIDs every export (`<deviceid>~<freshUuid>`,
  matching the `stageFloor~` pattern); on import every child is
  dropped via the `vrcParent` discriminator BEFORE the workspaceKey
  scoring loop runs, so it never becomes a VRC item. The parent is
  reconstructed from the `data.vrc.parentItems[]` block.
- A WD-side hand-edit that adds a child without a `vrcParent` will
  flow through the normal scoring loop and land as a real cylinder /
  sphere / box VRC item — by design (forward-compatible).

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Device registration (parent) | Whatever array the device naturally belongs to — e.g. `genericSecurityCamera` is in the `microphones` array in `js/roomcalc.js` |
| `workspaceKey` mapping | `workspaceKey.<deviceid> = { parentItem: true, childItemParts: [...] }` in `js/data/workspaceKey.js` |
| Export — pre-pass | `exportRoomObjToWorkspace()` in `js/roomcalc.js`, immediately after `const wdBuckets = bucketItemsByParentGroup(roomObj2)`. Walks every bucket, invokes `pushParentItemChildren()` for flagged items, collects metadata into `workspaceObj.data.vrc.parentItems` |
| Export — children dispatcher | `pushParentItemChildren(parent, wsKey)` (function declaration nested inside `exportRoomObjToWorkspace()` so it hoists above the call site). Builds a synthetic VRC item per template part, then dispatches by class: **display-class children** (`allDeviceTypes[childId].parentGroup === 'displays'` — `displaySngl_2`, `displayScreen_2`, `projector`, etc.) go through `workspaceObjDisplayPush()`, which sizes the panel from `data_diagonalInches` (defaulted to the device-def `diagonalInches` when the template omits it) and ignores width/height; **wall-class children** (cylinder / sphere / cone / box / wall / columnRect / floor / carpet / stageFloor) go through `workspaceObjWallPush()`. Both paths tag the just-pushed `customObjects[]` entry with `vrcParent` / `vrcParentDeviceId` after the push (outside the push helper so it stays parentItem-agnostic). Display children carry `data_diagonalInches` / `data_role` / `data_color` / `data_mount` from the template (these are in the orange-button whitelist AND the `synth` field copy). Resolves the parent's effective UL anchor at the top — see "Parent anchor heuristic" above |
| Export — parent metadata | `buildParentItemExportRecord(item)` (also nested in `exportRoomObjToWorkspace()`). Mirrors the `data.vrc.customItems[]` builder — meters, VRC top-left, `layerName` for non-Default layer, optional pass-through fields |
| Import — drop children | `importWorkspaceDesignerFile()` scoring loop, immediately inside `if (wdItem) { ... }` at the top: `if (wdItem.vrcParent) { delete wdItems[i]; continue; }`. Runs BEFORE every other scoring guard so children never produce a `cylinder` / `sphere` VRC item |
| Import — restore parents | `importWorkspaceDesignerFile()`, block immediately after the `data.vrc.dimensionLines` restore and BEFORE the `data.vrc.groups` restore (so groupMembers / customItemMembers rebuild passes pick up the restored parent items). Resolves `layerName` to a layerid via `resolveImportLayerName()`, maps `group` → `data_groupId`, `customItem` → `data_customItemId` |
| Hidden VRC layer drop | `removeHiddenLayerItemsForExport()` (unchanged) — drops the parent before the parentItem pre-pass runs, so children are never emitted |

---

## Ceiling Grid Round-Trip (`ceilingGrid`)

`ceilingGrid` is a **hybrid**: the single VRC item round-trips verbatim
via `workspaceObj.data.vrc.ceilingGrids[]` (mirror of `data.vrc.vrcTexts`
/ `dimensionLines`), while the on-canvas grid is *also* emitted as one
thin box per grid line under `customObjects[]` so Workspace Designer can
render it. The grid-line boxes are derived geometry only — they are
dropped on import so the verbatim record is the single source of truth.

### Wire shape

`workspaceObj.data.vrc.ceilingGrids[]` — the full `roomObj.items[]`
record, in **meters** (×`1/3.28084` if the source room is in feet), VRC
top-left coords (no roomX/roomY shift), with `data_layerId` swapped for
the human-readable `layerName` (Default `'0'` omitted) and
`data_groupId` / `data_customItemId` passed through verbatim. Carries
`width` / `height` / `rotation` / `data_zPosition` / `data_gridWidth` /
`data_gridLength` / `data_vHeight` / `data_fill` / `data_opacity`.

Each grid-line box in `customObjects[]`:

| Field | Value |
|-------|-------|
| `id` | `gridLines~v~<row>~<itemId>` (vertical, runs along Y) or `gridLines~h~<row>~<itemId>` (horizontal, runs along X) |
| `objectType` | `wall` (emitted via `workspaceObjWallPush` with a synthetic `box` item) |
| footprint | vertical: 24 mm (X) × grid Y-extent; horizontal: grid X-extent × 24 mm |
| WD Y height | `0.05 m` (`data_vHeight`) |
| position / rotation | derived from the parent's UL pivot + rotation (parent is UL-anchored, so `(x, y)` is the upper-left and the rotation pivot) |
| inherited | `data_layerId` / `data_groupId` / `data_customItemId` / `data_hiddenInDesigner` from the parent |
| `color` / `opacity` | emitted only when the parent `data_fill` is set and NOT black (`#000000` / `black`); otherwise omitted so WD renders the default grey. `opacity` rides along whenever set |

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Device def | `boxes` array in `js/roomcalc.js` (`id:'ceilingGrid'`, `key:'WS'`, `configurableColor:true`, `wdOpacity:true`, `default_vHeight:2500`) |
| Export — dispatch | `wdBuckets.boxes` loop in `exportRoomObjToWorkspace()` — `ceilingGrid` branch calls `pushCeilingGridChildren(item)` instead of `workspaceObjWallPush` |
| Export — children | `pushCeilingGridChildren(parent)` (nested in `exportRoomObjToWorkspace()`, beside `pushParentItemChildren`) — synthesizes one `box` per line and dispatches through `workspaceObjWallPush` |
| Export — verbatim record | `data.vrc.ceilingGrids[]` emit block, right after the `data.vrc.dimensionLines` emit |
| Import — drop boxes | `importWorkspaceDesignerFile()` scoring loop — `if (wdItem.id.startsWith('gridLines~')) { delete; continue; }` next to the `vrcParent` drop |
| Import — restore | block after the `data.vrc.dimensionLines` restore and BEFORE the groups / customItems restore |

---

## ConfigurableColor & Opacity Round-Trip

Items whose device definition has `configurableColor: true` and / or
`wdOpacity: true` (initially `box`, `carpet`, `stageFloor`) can carry
a custom fill color and / or opacity. Both round-trip through the
standard `customObjects[]` array — no separate `data.vrc.*` block is
needed because the WD `customObjects[]` schema already understands
`color` and `opacity` for several object types (e.g. `wallGlass`,
`circulationSpace`).

### JSON shape

Per-item attributes on the WD `customObjects[]` entry:

| WD field | VRC field | Type | Notes |
|----------|-----------|------|-------|
| `color` | `data_fill` | 6-digit hex string `"#RRGGBB"` | Uppercase on export. Overrides any `color` default coming from `workspaceKey[deviceId]` |
| `opacity` | `data_opacity` | **String** (e.g. `"0.5"`) | String format matches existing `wallGlass` / `circulationSpace` convention in `workspaceKey.js`. Omitted entirely when opacity is the default (1.0) |

### Coordinate / unit model

Neither field has any unit transform — fills are absolute colors,
opacity is unit-less in [0, 1).

### Color asymmetry (export vs. import)

- **Export** always emits 6-digit hex (`"#FFAA00"`) so downstream
  consumers don't have to know about CSS named colors.
- **Import** accepts both 6-digit hex AND CSS named colors
  (`"AliceBlue"`, `"red"`, `"DarkSeaGreen"`) via the
  `normalizeColorToHex()` helper, which leans on the browser's CSS
  parser (`document.createElement('div')` + `getComputedStyle()`)
  rather than maintaining a names table. Invalid names cache as `null`
  in `_namedColorToHexCache` to avoid re-hammering the DOM on repeated
  bad inputs.

The asymmetry is deliberate — a strict hex-only import would silently
reject perfectly-valid WD JSON that a hand-edit or external tool
produced.

### Asymmetry with the existing `data_color` dropdown system

Items with `colors: [{ light: 'First Light' }, …]` (e.g. roomBar) use
`data_color = { value, index }` and emit `workspaceItem.color =
'light'` (a keyword). Items with `configurableColor: true` use
`data_fill = '#FFAA00'` and emit `workspaceItem.color = '#FFAA00'`
(hex). The two systems are **mutually exclusive on a single device**
and the import branches are gated on `deviceType.colors` vs
`deviceType.configurableColor` so they don't collide.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Color name → hex normalization (cached) | `normalizeColorToHex()` near `_layerUrlEncodeMap`, in `js/roomcalc.js` |
| Export — color override | `workspaceObjWallPush()` — block immediately after the existing `data_color` color override |
| Export — opacity emit | Same function, right after the color override |
| Import — hex / named color | `wdItemToRoomObjItem()` (around the existing `'color' in wdItem` block) — new branch gated on `deviceType.configurableColor` |
| Import — opacity | Same function, new `'opacity' in wdItem && deviceType.wdOpacity` block immediately after the color import |

---

## Box vs. Stage Floor Disambiguation

Both `workspaceKey.box` and `workspaceKey.stageFloor` map to WD
`objectType: 'box'`, so the import scoring loop (`js/roomcalc.js`
around line 28412) gives both candidates the same +200 from the
`objectType` match. The tie is broken by `workspaceKey.stageFloor`'s
`idRegex` field, which adds another +100 when the WD item's id
matches one of three patterns:

- `^stage$` — legacy WD-authored "stage" floor
- `^step-` — legacy WD-authored riser steps (`step-1`, `step-bigStep`, …)
- `^stageFloor~` — VRC-emitted export prefix (see export prefix logic
  in `workspaceObjWallPush()`'s caller around line 30119)

Without the `^stageFloor~` alternative, every VRC-exported Stage Floor
tied with `workspaceKey.box` at 200 and lost the tie-break because
`box` is defined first in the iteration order, so every Stage Floor
silently round-tripped as a Box. `workspaceKey.circulationSpace` (also
`objectType: 'box'`) round-trips correctly via a different path — its
`color: '#8FDBCE'` adds +4 hits when WD emits the matching colour.

### Prefix strip on import

`wdItemToRoomObjItem()` strips the `stageFloor~` prefix from
`item.id` immediately after the spaces / hash sanitisation, so the
imported VRC item keeps its original UUID. The exporter's existing
`startsWith('stage') || startsWith('step')` guard re-adds the prefix
on the next export, so `VRC → WD JSON → VRC → WD JSON` cycles stay
stable instead of growing the id by `stageFloor~` each pass. Legacy
WD-authored ids (`stage`, `step-N`) are untouched — only the
VRC-emitted prefix is stripped.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Export — `stageFloor~` prefix add | `(wdBuckets.stageFloors \|\| []).forEach()` in `exportRoomObjToWorkspace()` — `wdBuckets` is the one-shot result of `bucketItemsByParentGroup(roomObj2)` populated at the top of the function (see `js/roomcalc.js`) |
| Import — scoring regex | `workspaceKey.stageFloor.idRegex` in `js/data/workspaceKey.js` (`'(^stage$)|(^step-)|(^stageFloor~)'`) |
| Import — prefix strip | `wdItemToRoomObjItem()` in `js/roomcalc.js`, just after the `item.id = wdItem.id.replace(...)` sanitisation |

---

## wdText (Workspace Designer Text) Round-Trip

`wdText` (`data_deviceid: 'wdText'`, parentGroup `boxes`, family
`wdText`) round-trips through Workspace Designer using the simple
`objectType: "text"` shape from the user-supplied spec:

```json
{
  "id": "<id>",
  "objectType": "text",
  "text": "Executive suite",
  "position": [0, 1, 0],
  "size": 20,
  "color": "black"
}
```

### Field mapping

| WD field | VRC source | Notes |
|----------|-----------|-------|
| `id` | `item.id` | UUID; unchanged on import |
| `objectType` | always `"text"` | Matched on import via `workspaceKey.wdText.objectType` |
| `text` | `item.data_labelField` (free-text prefix only) | Inline JSON `{...}` blob is stripped from the prefix on export (rendered glyph only). The blob itself is parsed and spread onto the `workspaceItem` BEFORE the known fields, so `comment` + any unknown attrs the user preserved survive the round-trip. On import the inverse: `wdItem.text` becomes the prefix; everything left in `wdItem` (incl. `comment`) gets `JSON.stringify`d back into the blob. See "Comment & unknown-attribute preservation" below |
| `position` | `[item.x - roomWidth/2, item.data_zPosition, item.y - roomLength/2]` | `wdText` uses the **text-origin** convention (no center math) — the upper-left of the Konva.Label is treated as the WD position. On import, the same shift in reverse |
| `size` | `item.data_fontSize` (default `20`) | Routed to `data_fontSize` on import via the wdText-specific branch in the `'size' in wdItem` block of `wdItemToRoomObjItem()` (other devices' `size` → `data_diagonalInches` is unaffected) |
| `color` | `item.data_fill` (default `"black"`) | Driven by the `configurableColor` color picker. Default emit (`"black"`) is intentional so unconfigured wdText items show up in WD instead of rendering as an empty / invisible default |

### Width / height / rotation

The WD spec for `text` does not have `width`, `height`, or `rotation`
fields, so none are emitted. Width and height on the VRC side are
auto-computed by `Konva.Label` from the inner `Konva.Text` (text
content × fontSize) — `canvasToJson()` reads them via `node.width()`
/ `node.height()` (special-cased for `wdText` because `attrs.width` is
undefined for auto-sized Labels). VRC canvas rotation still works
locally but is intentionally not round-tripped through the WD JSON.

### Coordinate model

`wdText` lives in the boxes parentGroup, but its `family: 'wdText'`
opts it out of the existing `wallBox`-family upper-left-to-center
math. On the import side, the position branch in
`wdItemToRoomObjItem()` includes a `data_deviceid === 'wdText'`
clause that treats the WD position as the text origin (same as the
`default` family path) rather than the centre of a (non-existent)
rectangle.

### Comment & unknown-attribute preservation

`wdText` deliberately diverges from every other boxes-bucket item in
how it uses `data_labelField`:

| Device class | Free-text prefix | JSON `{...}` blob |
|--------------|------------------|-------------------|
| Every other boxes-bucket item (`box`, `carpet`, `wallStd`, `pathShape`, …) | becomes `workspaceItem.comment` (WD's comment field) | unknown attrs only |
| `wdText` | becomes `workspaceItem.text` (the rendered glyph) | `comment` AND any unknown attrs |

The asymmetry exists because the free-text prefix slot is consumed by
the rendered glyph for `wdText`, so `comment` (a known-but-non-visible
WD field) is pushed into the JSON blob alongside any forward-compat
unknown attributes. Visible result on the canvas's Details panel for a
wdText whose WD JSON had `text: "Love"`, `comment: "my comment"`, and
an unknown `attributeX: "test"`:

```
Love {"attributeX":"test", "comment":"my comment"}
```

The renderer (`insertTable()` → `Konva.Text`) strips `{...}` and only
paints `Love`. The JSON blob is purely a round-trip carrier.

**Round-trip rules:**

- *Import* — `wdItem.text` is captured into `data_labelField` early
  (immediately after the `customItem` extraction block). The late
  "unused keys → data_labelField" merger at the bottom of
  `wdItemToRoomObjItem()` PREPENDS that captured text to the
  `JSON.stringify(wdItem)` blob (rather than overwriting it the way
  the legacy merger did). The early `comment` extraction is guarded
  with `data_deviceid !== 'wdText'` so `wdItem.comment` flows into
  the blob instead of becoming the free-text prefix.
- *Export* — `workspaceObjTextPush()` parses the `/{.*}/` blob out
  of `data_labelField`, spreads it onto `workspaceItem` BEFORE the
  known fields, and then writes the known fields second. JSON-blob
  `comment` survives; unknown attrs survive; VRC-authoritative
  `text` / `position` / `rotation` / `size` / `color` / `opacity`
  always win on export.

**Why JSON-blob keys are spread first on export, not last:** mirroring
`parseDataLabelFieldJson()`'s spread-last pattern would let a
hand-edited blob hijack core geometry (e.g. `{"position":[99,99,99]}`
in the prefix). For wdText the spread-first order ensures the
labelField is a safe forward-compat carrier — the user can stuff any
key they want into the blob and only future unknown keys are
preserved; everything VRC understands continues to win.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Device registration | `js/roomcalc.js` `boxes[]` (wdText entry with `key: 'WR'`, `family: 'wdText'`, `configurableColor: true`, `default_fontSize: 20`) |
| `workspaceKey` mapping | `workspaceKey.wdText = { objectType: 'text' }` in `js/data/workspaceKey.js` |
| Export push function | `workspaceObjTextPush()` in `js/roomcalc.js` (sits next to `workspaceObjWallPush()`) |
| Export routing | `(wdBuckets.boxes \|\| []).forEach()` branches on `item.data_deviceid === 'wdText'` to call `workspaceObjTextPush()` instead of `workspaceObjWallPush()` |
| Canvas rendering | `insertTable()` `if (insertDevice.id === 'wdText')` branch — `Konva.Label` + blue `Konva.Tag` + white `Konva.Text` |
| Font-size scaling | `computeWdTextKonvaFontSize()` helper next to `findUpperLeftXY()` |
| Import — text capture | `wdItemToRoomObjItem()`, immediately after the `customItem` extraction block |
| Import — size → font | `wdItemToRoomObjItem()`, inside the existing `'size' in wdItem` block (wdText branch) |
| Import — position | `wdItemToRoomObjItem()`, position branch extended `if (family === 'default' || data_deviceid === 'wdText')` |
| Import — color | Existing `configurableColor` branch (no wdText-specific code needed) |
| Import — comment / unknown attrs → blob | `wdItemToRoomObjItem()`, two-part change: (1) the `let comment = '';` extraction is guarded with `data_deviceid !== 'wdText'` so `wdItem.comment` falls through; (2) the "merge comments and unused JSON attributes" block at the bottom has a `data_deviceid === 'wdText'` branch that PREPENDS the captured text prefix to `JSON.stringify(wdItem)` instead of overwriting `item.data_labelField` |
| Export — comment / unknown attrs spread | `workspaceObjTextPush()` parses the `/{.*}/` blob from `data_labelField` via `JSON.parse` (try/catch — bad JSON logs to `console.info` and is dropped) and spreads `...extras` BEFORE the known fields in the `workspaceItem` literal |
