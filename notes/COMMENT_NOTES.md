# Comment Notes

Extended explanations moved out of inline `roomCalc.js` comments to keep the
source terse. Referenced from the code as `See notes/COMMENT_NOTES.md`.

## getPartRenderRect() — local-frame geometry

Computes a customItem member's geometry in the customItem's normalized local
frame (upper-left at 0,0, customItem rotation removed). With
`θ = customItem.rotation`, `dx = part.x - ci.x`, `dy = part.y - ci.y`:

```
localX  =  cos(θ)*dx + sin(θ)*dy
localY  = -sin(θ)*dx + cos(θ)*dy
localRotation = part.rotation - θ   (wrapped into (-180, 180])
```

Fixed-size devices resolve w/h from the device library (mm): device `.height`
is the 3D vHeight, so `.depth` is used for the floor-plan height. Feet rooms
re-scale the mm→meter output to feet for parity with `item.x/y`.

## copyCustomItemAsParentTemplate() — authoring helper

Test-mode helper (gated on `localStorage.test === 'true'`, set by the `?test`
query param). Converts a CustomItem library record into a
`workspaceKey.<id> = { parentItem: true, childItemParts: [...] }` snippet on the
clipboard for paste into `js/data/workspaceKey.js`.

The IDB library record's `customItemParts` already hold parts in the canonical
Parent-Item child frame (METERS, parent-local UL=0,0 origin, normalized
rotation), so the conversion is essentially a field whitelist + JSON
pretty-print. Surfaced via the orange "Copy as parentItem template" button on
the Edit Custom Item dialog (`#customItemEditCopyAsParentBtn`).

### data_zPosition normalization

The snippet normalizes `data_zPosition` so the LOWEST part rests at 0 and the
rest shift by the same delta. The parent's own `data_zPosition` is added back to
every child on export (`pushParentItemChildren`), so the user controls resting
height via the parent (0 = on the ground; a device-default vHeight raises it on
insert).

CRITICAL: a part WITHOUT `data_zPosition` rests on the assembly floor and MUST
count as 0 in the minimum. Scanning only parts with an explicit numeric
`data_zPosition` mis-computes the floor when some parts sit at implicit 0 (e.g.
base/stand boxes): the min would land on the lowest ELEVATED part and collapse
every elevated part toward the base. The net effect: the shift only happens when
EVERY part is elevated (the ceiling-fan case); a mixed assembly keeps its
vertical structure (min already 0 → no shift).

## Storage and Local Data dialog

Opened from Details → Settings → "Storage and Local Data…". Shows per-bucket
counts plus a `navigator.storage.estimate()` total when available, and offers
two destructive actions:

- **Clear Undo/Redo History (recommended)** — safe; addresses "many tabs
  sluggish" complaints. Clears the IDB undo/redo stores, resets in-memory
  `undoArray`/`redoArray`, and closes the Workspace Designer iframe (the
  heaviest in-memory consumer). No page reload — the user keeps their canvas.
- **Clear All** — wipes every IDB store the app manages (undo, redo, Custom Item
  Library, Background Image Library) plus localStorage (snap settings, default
  unit, WD overrides, copyItemsObj, etc.) and navigates to the base URL so the
  user lands on a fresh default room with no `?x=` shareable-link params. The
  reload restarts every in-memory cache from a clean slate.

Both buttons are no-ops with a tooltip when `idbStore.isAvailable()` is false
(Safari private mode quirks etc.). Counts are point-in-time (fetched on dialog
open); the Clear Undo/Redo path refreshes them after running.

## Unit conversion helpers (`js/util/units.js`)

The three functions (`convertToUnit`, `convertToMeters`, `convertMetersFeet`)
were extracted from `roomCalc.js` (Phase 2) and attached to
`window.VRC.util.<name>`; `roomCalc.js` aliases them back as top-level consts so
its call sites stay unchanged. The file is loaded BEFORE `roomCalc.js` and wraps
its assignments in an IIFE so the local `util` alias can't collide with another
classic `<script>`'s top-level `const`.

Cross-script references resolve lazily at call time in the shared classic-script
lexical scope (after `roomCalc.js` runs):

- `convertToUnit` reads the module-scoped `unit` from `roomCalc.js` — NOT
  `roomObj.unit`. The two can briefly differ while the user is mid-toggle on the
  feet/meters dropdown, which is why call sites read `unit`.
- `convertToMeters` reads `activeRoomX/Y/Width/Length`, `itemsOffStageId`,
  `isActiveRoomPart`, `round`.
- `convertMetersFeet` calls back into `roomCalc.js` for DOM / Konva side effects
  (`drawRoom`, `wallBuilderOn`, `zoomInOut`, etc.).

### Groups / CustomItems unit scaling in `convertMetersFeet`

`roomObj.groups[]` and `roomObj.customItems[]` store `x/y/width/height/
data_zPosition` in unit-space (same convention as items + `data.vrc.groups` in
the Workspace Designer round-trip). They MUST be scaled by the same ratio as
items, or the bundle rect drifts from its members on the next `drawRoom()`:
`insertGroupRect()` reads `group.x/y/width/height` and multiplies by `scale`
(pixels per current unit), so a missed conversion lands the rect at the OLD
unit's coordinate in the NEW unit's pixel grid. `convertItemUnitBasedOnRatio()`
handles exactly those fields, so it's reused for both arrays.

## Certified Displays catalogue (`js/data/certifiedDisplays.js`)

APPEND-ONLY array. Each entry's `index` equals its position in the array, and
the per-item attribute `data_certifiedDisplayIndex` (stored in the shareable URL
as `cd<index>`) references it by position. Never reorder or remove entries —
doing so resolves previously-saved URLs / JSON to the wrong (or a missing)
display. Only append new entries at the end. Per-entry attributes: `index`
(array position), `size` (diagonal inches, locks on-canvas size), `model`
(Workspace Designer model id, round-tripped via WD JSON), `aspect` (e.g.
`"16:9"`), `name` (user-facing label; picker falls back to `model` when absent).

## Workspace Designer keys (`js/data/workspaceKey.js`)

Pure data mapping each VRC item type to the Workspace Designer object that
represents it on import / export (no DOM, Konva, or functions). Attached to
`window.VRC.workspaceKey`; `roomCalc.js` reads it back as a top-level
`workspaceKey` const. Loaded BEFORE `roomCalc.js`, wrapped in an IIFE so the
local `workspaceKey` alias can't collide with `roomCalc.js`'s top-level `const`.

Coordinate systems differ between the two apps:

```
VRC x              = Designer x
VRC y              = Designer z
VRC data_zPosition = Designer y
Rotation: VRC degrees = Designer -1 * (radians)
```

Per-entry attributes: `vertOffset` (meters; added to VRC `data_zPosition` on
export), `yOffset` (meters; VRC↔Designer Y difference applied before export),
`role` (default device role, per-item overridable).

### Parent Items (`parentItem: true`)

Composite WD export from a single VRC item. The `parentItem: true` flag routes
the item out of the normal per-bucket push and into `pushParentItemChildren()`
in `roomCalc.js`, which emits one WD primitive per entry in `childItemParts`
(each tagged with `vrcParent` / `vrcParentDeviceId`) plus a metadata record in
`workspaceObj.data.vrc.parentItems[]` for round-trip restore. Each child
template's `x/y/width/height/rotation/data_zPosition/data_vHeight/data_tilt/
data_slant` follow VRC's native item convention: `x/y` is the offset (meters)
from the parent's upper-left corner in the parent's local (un-rotated) frame,
with `width` as the X-extent and `height` as the Y-extent.
`data_fill/data_opacity/data_radius2/data_labelField` pass through verbatim when
present. See CLAUDE.md "Parent Items" for the full round-trip contract.
