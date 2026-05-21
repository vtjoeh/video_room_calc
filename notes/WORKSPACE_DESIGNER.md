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
