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
