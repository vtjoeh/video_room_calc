# Multi-Room Floor Plan Mode

Add a sticky, design-level "Multi-Room Floor Plan Mode" with two sub-modes (MultiRoom / Room) layered on top of the existing roomPart (`boxRoomPart` / `polyRoom`) zoom infrastructure, including per-roomPart Default Walls, WD-export and shareable-link behavior changes, and a WD round-trip via `data.vrc`.

## Progress snapshot (keep updated)

| Step | Description | Status |
| ---- | ----------- | ------ |
| 1 | Mode state + persistence | **Done** |
| 2 | Entry dialog (roomPart insert) | **Done** |
| 3 | Details > Settings toggle (warns) | **Done** (warns both ON and OFF) |
| 4 | MultiRoom-mode UI gating | **Done** |
| 5 | Room-mode UI | **Done** |
| 6 | Per-roomPart Default Walls storage | **Done** |
| 7 | Default Walls preview on boxRoomPart | **Done** |
| 8 | WD export changes | Pending |
| 9 | Shareable link changes | Pending |
| 10 | Undo/Redo + round-trip integrity | Pending |
| 11 | Docs | In progress (this file) |

### What is built so far (anchors)
- Flag default + reset: `roomObj.multiRoomFloorPlanMode = false` (`js/roomcalc.js:161`), reset in `resetRoomObj()` (`js/roomcalc.js:~9228`).
- Predicates: `isRoomPart()`, `isMultiRoomFloorPlanMode()`, `isMultiRoomOverviewMode()`, `isRoomSubMode()` (`js/roomcalc.js:177-195`). NOTE: plan only called for `isMultiRoomFloorPlanMode()`; the two sub-mode predicates were added as conveniences and are currently UNUSED until step 4/5.
- Persistence: WD export mirror `data.vrc.multiRoomFloorPlanMode` (`js/roomcalc.js:~32529`), WD import restore (`js/roomcalc.js:~31073`), `.vrc.json` backfill in `importJson()` (`js/roomcalc.js:~28664`).
- Reusable confirm modal: `dialogVrcConfirm` (`RoomCalculator.html:~2655`) + `vrcConfirm(headerHtml, mainHtml, okLabel, onConfirm, onCancel)` (`js/roomcalc.js:~30520`). onCancel fires on Cancel/X/Escape/closeAllDialogModals; onConfirm only on OK.
- Entry dialog: `insertItemFromMenu()` intercepts first `boxRoomPart`/`polyRoom` insert and prompts; OK sets flag + re-enters insert, Cancel aborts (`js/roomcalc.js:~24599`).
- Settings toggle: `multiRoomFloorPlanModeCheckBox` (`RoomCalculator.html:~1251`), handler `toggleMultiRoomFloorPlanMode()` (warns in BOTH directions per user request; OFF first calls `showEntireFloor()` if zoomed), sync `syncMultiRoomFloorPlanModeToggle()` called from `openSubTab2()` when `SettingDetails` opens (`js/roomcalc.js:~197-238, ~13063`).
- **Step 4 UI gating** — `applyMultiRoomModeUi()` (`js/roomcalc.js:~255-327`), called from `drawRoom()` and all three mode transitions (entry-prompt onConfirm, toggle ON, toggle OFF). In MultiRoom **overview** it: disables `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance`/`drpSoftware`; hides `removeDefaultWallsRow`(+`2`); swaps Room→Floor labels on `defaultOpenTab`/`roomNameLabel`/`rotateRoomLabel`; shows message-only Default-Walls panel (`defaultWallsMultiRoomMsg`) and hides `defaultWallSettings`. All reversed when entering a room / normal mode.
- **Step 5 Room-mode UI** — labels/software/menus/default-walls rows auto-revert via `applyMultiRoomModeUi()` (only gates the overview). Fixed duplicate `id="btnBackToFloorPlan"`: inner button renamed to `btnBackToFloorPlanBtn` (`RoomCalculator.html:1419`); JS still targets the wrapper div. `#controlButtons` max-width 750→800px (`style.css:924`) to fit the back-button group. Per-room Default Walls editing deferred to steps 6-7.
- **Step 6 per-room Default Walls** — new boxRoomPart attrs `data_roomSurfaces` (4-wall type/acoustic/door, clone of `defaultRoomSurfaces`) + `data_workspace` (`{removeDefaultWalls}`). Four-place rule wired: `insertTable()` writer (`~16527`), `insertShapeItem()`→`updateNodeAttributes()` mirror (`~20580`), `updateRoomObjFromTrNode()` push (`~14846`) + map-hit delete-on-absent (`~14946`), `copyToCanvasClipBoard()` (`~13639`); objects `structuredClone`d so paste/round-trip stay independent. Default init on insert in `insertItemFromMenu()` (`~24849`); backfill for old designs in `zoomRoomPart()` (`~10813`). Mode-aware accessors `activeDefaultWallsSurfaces()` / `activeDefaultWallsWorkspace()` (`~216-230`) return the active roomPart's attrs only in Room sub-mode on a boxRoomPart, else global `roomObj.roomSurfaces`/`workspace` (so normal/overview behavior unchanged). Rewired to the accessors: subtab editors `updateDefaultWallsMenu`/`updateDefaultWallsMenuAndCanvas`/`doorSelected`/`updateRemoveDefaultWallsCheckBox`/`removeDefaultWallsChange`, and room-mode canvas readers (outer-wall draw block `~10360`, `updateDefaultWallTypeOnCanvas`, `insertDefaultDoorsOnCanvas`). polyRoom in Room mode = message-only Default Walls panel via `applyMultiRoomModeUi()` (`dwMessageOnly`, dynamic `defaultWallsMultiRoomMsg` text). Canvas draws per-room walls/doors in Room mode (draw calls `~10447-10451` inside the removeDefaultWalls gate). NOTE: URL/shareable-link wall encoding (`createShareableLink ~11804/12422`) + rotateRoom (`~28055`) intentionally stay global (floor-plan-level / step 9).
- **Step 7 Default Walls preview** — overview-only visual preview of each rectangular boxRoomPart's default walls + door, drawn into a dedicated `groupRoomPartWallsPreview` Konva.Group (declared `~4552`, added to `layerTransform` above `groupRooms` `~14018`). Builder `drawRoomPartDefaultWallsPreviews()` (`~10414`) clears + rebuilds: skips when not `isMultiRoomOverviewMode()`, iterates `groupRooms` children, reads each boxRoomPart's `data_roomSurfaces`/`data_workspace` from `roomObjItemsMap`, skips rooms with `removeDefaultWalls`, and per room builds a child group at the node's `x/y/rotation` with 4 wall rects in local space (videowall=top, backwall=bottom, left/right edges; thickness `0.115*scale`). Fills via `defaultWallTypeFill()` (regular/glass), window walls get the `wallWindowBackground.png` pattern via `applyWindowPatternToPreview()` (async-safe `addEventListener('load',…,{once})`), doors via `addRoomPartDoorPreview()` (opening rect + leaf line, left/center/right). Each preview group id = `rpwPreview~<roomPartId>`. Hooks: called near end of `drawRoom()` (`~11205`); boxRoomPart-only listener (`~16882`) leaves the preview frozen during the move/resize gesture and full-rebuilds only on `dragend`/`transformend` (walls snap into the correct place on drop) — per user request, no live follow. Door left/right mapping is approximate (preview only); exact geometry is step 8 (WD export). Window walls don't draw a door (matches subtab rule).
- **Step 4 menu filtering** — allow-list `MULTI_ROOM_OVERVIEW_MENU_ITEMS` + `isAllowedInMultiRoomOverview()` (`js/roomcalc.js:~201-213`) = entire `wallsMenu` + 3 doors (`doorRight2/Left2/Double2`) + `boxRoomPart`/`polyRoom` (user wants Room Parts addable from search in the overview). Enforced at 2 sites: `createItemsOnMenu()` chokepoint (Equipment tab + sidebar-search "Other") and `onQuickAddChange()` (Quick Add gallery). Both also have an `else if (isRoomSubMode())` branch that filters OUT Room Parts (can't nest a room inside a room). Menus rebuilt only on overview-state flip via `_lastMultiRoomOverviewMenuState` guard in `applyMultiRoomModeUi()`. New HTML: `defaultWallsMultiRoomMsg` message + ids `roomNameLabel`/`rotateRoomLabel` in `RoomCalculator.html`.

## Follow-up fixes (post step 7, per user requests)
- **Room-mode default walls now RENDER** — `drawRoom()` outer-wall gate (`~11276`) changed from `!isActiveRoomPart` to also include `isRoomSubMode() && activeRoomPartItem.data_deviceid === 'boxRoomPart'`, so a zoomed rectangular room draws its default walls with the legacy single-room methodology. `drawOutsideWall()` and `insertDefaultDoorsOnCanvas()` now locally shadow `roomWidth`/`roomLength` with `activeRoomWidth`/`activeRoomLength` (equal in normal mode → no-op there; equal the room's bbox in Room mode → walls hug the room).
- **Default Door option removed in Room mode** — `updateDefaultWallsMenu()` (`~22651`) hides both `pickDoorSelection` + `noDoorSelectionDiv` whenever `isRoomSubMode()` (door picker simply not offered per-room). Per-room `defaultRoomSurfaces` has no `door` key, so no doors draw for new rooms.
- **"Wall with Windows" black-bar fix** — replaced `applyWindowPatternToPreview()` with shared `applyWindowPatternToRect(rect, layer)` (`~10364`): scales the pattern so `fillPatternScale = wallThickness / imageWidth` (panes fit the thin wall instead of showing only the image's black margin) AND calls `layer.batchDraw()` after the async image load (the missing redraw was the other half of the bug). Used by both the overview preview and in-room `updateDefaultWallTypeOnCanvas()`; regular/glass branches now `fillPatternImage(null)` to clear a stale window pattern. NOTE: the manual `wallWindow` menu item (`~16443`) still uses the old un-scaled pattern — left unchanged pending confirmation.
- **Room walls draw on insert** — `drawRoomPartDefaultWallsPreviews()` now reads `data_roomSurfaces`/`data_workspace` from the `roomObjItemsMap` item with a fallback to the node attrs (`~10443-10447`), so a freshly-inserted room (not yet in the map) still draws; and the boxRoomPart insert block (`~16906`) calls the builder once immediately after placement.

## Round 2 fixes
- **Manual `wallWindow` item** — now uses the shared `applyWindowPatternToRect()` too (`~16457`), replacing its own un-scaled/no-redraw pattern code (same black-bar fix).
- **No automatic floor-perimeter walls in MultiRoom overview** — `drawRoom()` gate (`~11285`) rewritten: draw default walls only in normal single-room mode (`!isMultiRoomFloorPlanMode() && !isActiveRoomPart`) OR boxRoomPart Room sub-mode. The overview floor no longer gets `drawOutsideWall()`. Default Walls subtab is still message-only in overview (per-room editing only inside a room).
- **Preview wall thickness scales for feet** — `drawRoomPartDefaultWallsPreviews()` thickness is now `0.115 * (feet? 3.28084 : 1) * scale` (`~10441-10445`); feet rooms were drawn too thin.
- **Coverage buttons truly disabled in overview** — `applyMultiRoomModeUi()` (`~306-314`) now also toggles class `coverageBtnDisabledMultiRoom` on `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance` (the `disabled` attr alone didn't stop their `pointerdown`/`pointerup` listeners). CSS (`style.css:~1397`) sets `pointer-events:none`, greys the button, and greys the `.holdIndicator` triangle via `filter: grayscale(100%) brightness(1.8)`.

## Decisions confirmed
- **Mode flag:** sticky design-level boolean, mirrored into `data.vrc`. Explicit OFF lives as a **Details > Settings toggle that warns** before reverting to normal mode.
- **Software Experience:** disabled in MultiRoom mode, **enabled in Room mode** (per individual room).
- **Storage shape:** `roomObj.multiRoomFloorPlanMode = true`; `boxRoomPart` item gets `item.data_roomSurfaces` (4-wall config) and `item.data_workspace` (default-walls on/off + door). `polyRoom` stores neither.

## Mode model (3 states)
- **Normal mode** — `roomObj.multiRoomFloorPlanMode` falsy. Everything behaves as today.
- **MultiRoom mode** — flag true AND `isActiveRoomPart === false` (whole floor-plan overview).
- **Room mode** — flag true AND `isActiveRoomPart === true` (zoomed into one roomPart via existing `zoomRoomPart()`).

Add helper `isMultiRoomFloorPlanMode()` reading `roomObj.multiRoomFloorPlanMode`. Sub-mode derives from existing `isActiveRoomPart`.

## Key existing anchors (read during planning)
- State vars: `isActiveRoomPart`, `activeRoomPartItem`, `activeRoom{X,Y,Width,Length}` (`js/roomcalc.js:24-33`).
- Zoom/exit: `zoomRoomPart()` (~10629), `showEntireFloor()` (~10596), `drawRoom()` (~10688).
- Insert path: `insertItemFromMenu()` (~24560) already special-cases `polyRoom`; `boxRoomPart` flows through normal insert. `rooms[]` menu array (~7431).
- Menus: `createEquipmentMenu()` (~24996) menu arrays incl. `wallsMenu`; `createItemsOnMenu()` (~24927); search builder (~12641); Quick Add (~12843).
- Default walls: `roomObj.roomSurfaces`, `roomObj.workspace.removeDefaultWalls`, `updateDefaultWallsMenu()` / `updateDefaultWallsMenuAndCanvas()` (~22190-22230), default-wall canvas draw block (~10183-10300), `insertDefaultDoorsOnCanvas()`.
- WD export: `exportRoomObjToWorkspace()` (~32275), `workspaceObjWallPush()` (~33684), `convertToMeters()` in `js/util/units.js` (already coordinate-shifts by `activeRoomX/Y` and gates items by `itemsOffStageId`/`isActiveRoomPart`).
- Share link: `createShareableLink()` (~11610), `createShareableLinkItem()` (~11960), `createShareableLinkItemShading()` (~12231).
- Import/round-trip: `importJson()` (~28576), WD import `data.vrc.*` restores (~30996-31200), `wdItemToRoomObjItem()` (~31301).
- HTML: `defaultOpenTab` (Room tab), `Room Name:`/`Rotate Room` labels (`RoomCalculator.html:146,209-223`), `drpSoftware` (~200), `subTabDefaultWalls` + `DefaultWalls` panel (~476,1086), `controlButtons` + duplicate-id `btnBackToFloorPlan` (~1400-1405), shading buttons `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance` (~1407-1423).

## Implementation steps

### 1. Mode state + persistence  — DONE
- Add `roomObj.multiRoomFloorPlanMode` default `false` near other `roomObj` defaults; document in `roomObj` shape.
- Mirror to `workspaceObj.data.vrc.multiRoomFloorPlanMode` in `exportRoomObjToWorkspace()`; restore in WD import block. Confirm `importJson()` preserves the field for `.vrc.json` (it loads `roomObj` wholesale, so just ensure default backfill when absent).
- Backward compat: absent ⇒ `false`. Old designs load and run in the new manner.

### 2. Entry dialog  — DONE
- Intercept roomPart insertion (both `boxRoomPart` and `polyRoom`) in `insertItemFromMenu()` before the actual insert. If flag is off, show a confirm dialog (reuse existing confirm/alert dialog helper) — header "Entering Multi-Room Floor Plan Mode", body describing the feature, Cancel/OK. OK ⇒ set flag, continue insert; Cancel ⇒ abort.
- Centralize so both insert entry points share one guard.
- NOTE: implemented via new reusable `vrcConfirm()` + `dialogVrcConfirm` rather than `alertDialog` (which is OK-only).

### 3. Details > Settings OFF toggle (warns)  — DONE
- Add a labeled toggle in the Settings subtab reflecting `multiRoomFloorPlanMode`.
- Turning OFF ⇒ warn confirm; on confirm, set flag false, exit any active room (`showEntireFloor()`), restore normal menus/labels/buttons, redraw. roomParts remain as ordinary items.
- NOTE: per user, turning ON via the toggle ALSO confirms (mirrors the entry prompt). The "restore normal menus/labels/buttons, redraw" portion depends on step 4/5 (`applyMultiRoomModeUi()`); the toggle currently flips the flag + calls `showEntireFloor()` only. Revisit once step 4/5 land.

### 4. MultiRoom-mode UI gating (flag on && !isActiveRoomPart)
- **Buttons disabled:** `btnCamShadeToggle`, `btnMicShadeToggle`, `btnDisplayDistance`.
- **Menus filtered** to Walls / Glass Walls / Wall-with-Windows / Door types (`doorRight2`/`doorLeft2`/`doorDouble2`) only — `createEquipmentMenu()` (filter the menu arrays), search builder, and Quick Add all consult the mode. roomPart tiles are NOT shown (add more rooms via `**` search).
- **Software Experience** (`drpSoftware`) disabled in MultiRoom mode; re-enabled in Room mode.
- **"Remove Default Walls"** option hidden/removed (both `removeDefaultWallsCheckBox` rows).
- **Label swaps:** `defaultOpenTab` "Room"→"Floor", "Room Name:"→"Floor Name:", "Rotate Room"→"Rotate Floor".
- **Details > Default Walls** panel shows only the message: *"Not available in multi-room floor plan view. Select a rectangular individual room"*.
- Drive all of the above from one `applyMultiRoomModeUi()` invoked in `drawRoom()` / mode transitions.

### 5. Room-mode UI (flag on && isActiveRoomPart)
- Label swaps revert to "Room".
- `controlButtons` CSS expands to fit the `btnBackToFloorPlan` group (fix the duplicate `id="btnBackToFloorPlan"` on both wrapper div and button in HTML).
- Software Experience enabled.
- Default Walls available only for rectangular `boxRoomPart` (see step 7).

### 6. Per-roomPart Default Walls storage (four-place rule)
- New attrs on `boxRoomPart`: `data_roomSurfaces` (the 4 walls' type/acoustic/door), `data_workspace` (default-walls on/off). Wire through the documented four places: `insertTable()`, `insertShapeItem()` mirror, `updateRoomObjFromTrNode()` push + map-hit branches, `copyToCanvasClipBoard()`.
- In Room mode for a rectangular `boxRoomPart`, the Default Walls subtab edits these per-room attrs (not the global `roomObj.roomSurfaces`). `polyRoom` keeps the "not supported" message.

### 7. Default Walls preview on boxRoomPart (MultiRoom mode)
- When a `boxRoomPart` has default walls on, draw its walls (std / window / glass per `data_roomSurfaces`) plus the door as a `Konva.Group` attached to the boxRoomPart node, as a visual preview in MultiRoom mode.
- Rebuild the preview group on draw/update of the roomPart.

### 8. WD export (`exportRoomObjToWorkspace`)
- **MultiRoom mode:** do NOT send roomPart items; set `"ignore": true` on all emitted WD objects. For each `boxRoomPart` with default walls on, emit the equivalent walls + door (2 rooms × 4 walls ⇒ 8 walls). Reuse the existing `altDefaultWall` wall-builder logic, parameterized per roomPart bounding box.
- **Room mode:** export only items inside the active room (existing `isActiveRoomPart` + `convertToMeters` coordinate shift already scopes most of this). WD room size = roomPart size (boxRoomPart straightforward; polyRoom must fit inside the WD rectangle). Items keep `ignore:false`/absent unless overridden by Item-Label JSON.
- **Wall clipping (Room mode):** for `wallStd`/`wallGlass`/`wallWindow` extending outside the room, truncate `item.height` (length) so it fits within room −0.10/+0.10 m, using only the main VRC `rotation` (ignore tilt/lean). Do this on the VRC-item clone right before WD push (cleanest in `convertToMeters` output stage or at top of the wall push loop).
- **Normal mode:** unchanged.

### 9. Shareable link (`createShareableLink`)
- **MultiRoom mode:** skip link generation entirely (early return / clear link).
- **Room mode:** include only items inside the active room.
- **Normal/default mode:** unchanged. (Shareable Template Hyperlink works in Room mode and normal mode, not MultiRoom mode.)

### 10. Undo/Redo + round-trip integrity
- Flag + per-roomPart default-wall attrs live in `roomObj`, so they ride existing undo snapshots and `canvasToJson()`; verify the new `data_*` attrs survive a canvasToJson cycle (four-place rule) and undo/redo.
- WD round-trip: ensure `data.vrc.multiRoomFloorPlanMode` and per-roomPart default walls reconstruct the `vrc.json` on import.

### 11. Docs
- Add `notes/MULTI_ROOM_FLOOR_PLAN.md` (new TECH note) describing modes, storage, WD/link behavior.  — DONE (this file)
- Add a short pointer in `CLAUDE.md` (keep it brief — file is already large).
- Opportunistically trim long block comments in the `roomcalc.js` sections touched (export, share link, menu build, default walls). Add no new comments except brief function-header notes; prefer long names + single-line `/* */` descriptions.

## Resolved decisions (round 2)
- **roomParts in MultiRoom menu:** NOT shown for now — adding more rooms is done via `**` search. Menu filter excludes roomPart tiles.
- **Door "types":** only the door items already present in the menu (`doorRight2`, `doorLeft2`, `doorDouble2`).
- **polyRoom→WD rectangle fit:** use the poly's bounding box as the WD room size.
- **Duplicate `btnBackToFloorPlan` id:** fix it (rename wrapper or button) as part of step 5.

## Remaining risk
- Wall-clipping rotation math is the highest-risk numeric piece; will validate against a rotated wall crossing a room edge.
