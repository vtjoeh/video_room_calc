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
| Group rect skip in `customObjects[]` | `canvasToJson()` already enforces `if (node.data_deviceid === 'group') return;` so group rects never enter `roomObj.items.*` and therefore never reach the WD push helpers |
