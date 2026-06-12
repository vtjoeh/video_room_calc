# Multi-Room Floor Plan Mode

Note: This is a work in progress. Some code has been created, some removed.

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
| 10 | Undo/Redo + round-trip integrity | Partial (flag + per-room attrs round-trip; WD wall geometry waits on step 8) |
| 11 | Docs | In progress (this file) |

> Line numbers below track `js/roomcalc.js` (~33,300 lines) as of this revision and drift as the file grows; re-grep the function names if they look off.

### What is built so far (anchors)
- Flag default + reset: `roomObj.multiRoomFloorPlanMode = false` (`js/roomcalc.js:160`), reset in `resetRoomObj()` (`js/roomcalc.js:8974`).
- Predicates: `isMultiRoomFloorPlanMode()` / `isMultiRoomOverviewMode()` / `isRoomSubMode()` (`js/roomcalc.js:177-189`). All three are now actively used (overview/Room sub-modes drive gating, draw, accessors, and the Room-tab display).
- Menu allow-list: `MULTI_ROOM_OVERVIEW_MENU_ITEMS` + `isAllowedInMultiRoomOverview()` (`js/roomcalc.js:192-202`); `_lastMultiRoomOverviewMenuState` rebuild guard (`js/roomcalc.js:204`).
- Mode-aware Default-Walls accessors: `activeDefaultWallsSurfaces()` / `activeDefaultWallsWorkspace()` (`js/roomcalc.js:207-219`).
- Persistence: WD export mirror `data.vrc.multiRoomFloorPlanMode` (`js/roomcalc.js:30340`), WD import restore (`js/roomcalc.js:29028`), `.vrc.json` backfill in `importJson()` (`js/roomcalc.js:27095`).
- Reusable confirm modal: `dialogVrcConfirm` (`RoomCalculator.html`) + `vrcConfirm(headerHtml, mainHtml, okLabel, onConfirm, onCancel)` (`js/roomcalc.js:28508`). onCancel fires on Cancel/X/Escape/closeAllDialogModals; onConfirm only on OK.
- Entry dialog: `insertItemFromMenu()` (`js/roomcalc.js:23534`) intercepts first `boxRoomPart`/`polyRoom` insert and prompts; OK sets flag + re-enters insert, Cancel aborts.
- Settings toggle: `multiRoomFloorPlanModeCheckBox` (`RoomCalculator.html`), handler `toggleMultiRoomFloorPlanMode()` (`js/roomcalc.js:222`, warns in BOTH directions; OFF first calls `showEntireFloor()` if zoomed), sync `syncMultiRoomFloorPlanModeToggle()` (`js/roomcalc.js:268`) called from `openSubTab2()` when `SettingDetails` opens (`js/roomcalc.js:12890`).
- **Step 4 UI gating** — `applyMultiRoomModeUi()` (`js/roomcalc.js:274`), called from `drawRoom()` and all three mode transitions (entry-prompt onConfirm, toggle ON, toggle OFF). In MultiRoom **overview** it: disables `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance`/`drpSoftware`; hides `removeDefaultWallsRow`(+`2`); swaps Room→Floor labels on `defaultOpenTab`/`roomNameLabel`/`rotateRoomLabel`; shows message-only Default-Walls panel (`defaultWallsMultiRoomMsg`) and hides `defaultWallSettings`. All reversed when entering a room / normal mode.
- **Step 5 Room-mode UI** — labels/software/menus/default-walls rows auto-revert via `applyMultiRoomModeUi()` (only gates the overview). Fixed duplicate `id="btnBackToFloorPlan"`: inner button renamed to `btnBackToFloorPlanBtn` (`RoomCalculator.html`); JS still targets the wrapper div. `#controlButtons` max-width 750→800px (`style.css`) to fit the back-button group. Per-room Default Walls editing handled in steps 6-7.
- **Step 6 per-room Default Walls** — new boxRoomPart attrs `data_roomSurfaces` (4-wall type/acoustic/door, clone of `defaultRoomSurfaces`) + `data_workspace` (`{removeDefaultWalls}`). Four-place rule wired: `insertTable()` writer, `insertShapeItem()`→`updateNodeAttributes()` mirror, `updateRoomObjFromTrNode()` push + map-hit delete-on-absent, `copyToCanvasClipBoard()`; objects `structuredClone`d so paste/round-trip stay independent. Default init on insert in `insertItemFromMenu()`; backfill for old designs in `zoomRoomPart()` (`js/roomcalc.js:10539`). Mode-aware accessors `activeDefaultWallsSurfaces()`/`activeDefaultWallsWorkspace()` (`js/roomcalc.js:207-219`) return the active roomPart's attrs only in Room sub-mode on a boxRoomPart, else global `roomObj.roomSurfaces`/`workspace` (so normal/overview behavior unchanged). Rewired to the accessors: subtab editors `updateDefaultWallsMenu` (`~21367`)/`updateDefaultWallsMenuAndCanvas`/`doorSelected` (`~21446`)/`updateRemoveDefaultWallsCheckBox`/`removeDefaultWallsChange`, and room-mode canvas readers (`updateDefaultWallTypeOnCanvas ~21494`, `insertDefaultDoorsOnCanvas ~21553`). polyRoom in Room mode = message-only Default Walls panel via `applyMultiRoomModeUi()` (`dwMessageOnly`, dynamic `defaultWallsMultiRoomMsg` text). NOTE: URL/shareable-link wall encoding (`createShareableLink ~11540`) + rotateRoom intentionally stay global (floor-plan-level / step 9).
- **Step 7 Default Walls preview** — overview-only visual preview of each rectangular boxRoomPart's default walls + door, drawn into a dedicated `groupRoomPartWallsPreview` Konva.Group (declared `js/roomcalc.js:4192`, added to `layerTransform`). Builder `drawRoomPartDefaultWallsPreviews()` (`js/roomcalc.js:10000`) clears + rebuilds: skips when not `isMultiRoomOverviewMode()`, iterates `groupRooms` children, reads each boxRoomPart's `data_roomSurfaces`/`data_workspace` from `roomObjItemsMap` (fallback to node attrs so freshly-inserted rooms still draw), skips rooms with `removeDefaultWalls`, and per room builds a child group at the node's `x/y/rotation` with 4 wall rects in local space (videowall=top, backwall=bottom, left/right edges; thickness `0.115*(feet?3.28084:1)*scale`). Fills via `defaultWallTypeFill()` (regular/glass), window walls get the `wallWindowBackground.png` pattern via the shared `applyWindowPatternToRect()` (`js/roomcalc.js:9940`, async-safe + redraw), doors via the door-preview helper (opening rect + leaf line, left/center/right). Each preview group id = `rpwPreview~<roomPartId>`. Hooks: called near end of `drawRoom()`; boxRoomPart listener leaves the preview frozen during the move/resize gesture and full-rebuilds only on `dragend`/`transformend` (no live follow, per user request); also rebuilt immediately after a boxRoomPart insert. Door left/right mapping is approximate (preview only); exact geometry is step 8 (WD export). Window walls don't draw a door (matches subtab rule).
- **Step 4 menu filtering** — allow-list `MULTI_ROOM_OVERVIEW_MENU_ITEMS` + `isAllowedInMultiRoomOverview()` (`js/roomcalc.js:192-202`) = entire `wallsMenu` + 3 doors (`doorRight2/Left2/Double2`) + `boxRoomPart`/`polyRoom` (user wants Room Parts addable from search in the overview). Enforced at 2 sites: `createItemsOnMenu()` chokepoint (Equipment tab + sidebar-search "Other") and `onQuickAddChange()` (Quick Add gallery). Both also have an `else if (isRoomSubMode())` branch that filters OUT Room Parts (can't nest a room inside a room). Menus rebuilt only on overview-state flip via `_lastMultiRoomOverviewMenuState` guard in `applyMultiRoomModeUi()`. New HTML: `defaultWallsMultiRoomMsg` message + ids `roomNameLabel`/`rotateRoomLabel` in `RoomCalculator.html`.

## Follow-up fixes (post step 7, per user requests)
- **Room-mode default walls now RENDER** — `drawRoom()` outer-wall gate (`js/roomcalc.js:10856-10861`, `drawFloorPlanWalls`) draws default walls in single-room mode, the MultiRoom overview outline, AND inside a rectangular room (`isRoomSubMode() && activeRoomPartItem.data_deviceid === 'boxRoomPart'`). `drawOutsideWall()` (`js/roomcalc.js:10068`) locally shadows `roomWidth`/`roomLength` with `activeRoomWidth`/`activeRoomLength` (equal in normal mode → no-op; equal the room's bbox in Room mode → walls hug the room). Filled default walls are suppressed in the overview via the `!isMultiRoomOverviewMode()` gate (`js/roomcalc.js:10098`).
- **Read-only Room tab display** — `populateRoomTabFromActiveRoomPart()` (`js/roomcalc.js:9811`), called from `drawRoom()`, overrides the loaded floor values to SHOW the zoomed boxRoomPart's name/width/length. The Room tab stays disabled (display-only, no write-back, no resize). No-op outside Room sub-mode on a rectangular room part.
- **Room-mode bg-image sub-tab gating** — `applyMultiRoomModeUi()` (`~289`) hides every `.bgFloorOnlySetting` element except Opacity while inside a room (`inRoomBgMode = isRoomSubMode()`), pointing the user back to the overview for floor-level background image edits.
- **Default Door option removed in Room mode** — `updateDefaultWallsMenu()` (`js/roomcalc.js:21424`) hides both `pickDoorSelection` + `noDoorSelectionDiv` whenever `isRoomSubMode()` (door picker not offered per-room). Per-room `defaultRoomSurfaces` has no `door` key, so no doors draw for new rooms.
- **"Wall with Windows" black-bar fix** — shared `applyWindowPatternToRect(rect, layer)` (`js/roomcalc.js:9940`) scales the pattern so panes fit the thin wall (not the image's black margin) AND calls `layer.batchDraw()` after the async image load. Used by both the overview preview and in-room `updateDefaultWallTypeOnCanvas()`; regular/glass branches `fillPatternImage(null)` to clear a stale window pattern. The manual `wallWindow` menu item now uses the same shared helper.
- **Room walls draw on insert** — `drawRoomPartDefaultWallsPreviews()` (`js/roomcalc.js:10000`) reads `data_roomSurfaces`/`data_workspace` from the `roomObjItemsMap` item with a fallback to node attrs, so a freshly-inserted room (not yet in the map) still draws; the boxRoomPart insert block calls the builder once immediately after placement.

## Round 2 fixes
- **Manual `wallWindow` item** — uses the shared `applyWindowPatternToRect()` too, replacing its own un-scaled/no-redraw pattern code (same black-bar fix).
- **Overview keeps an outline, suppresses filled walls** — `drawRoom()` gate (`js/roomcalc.js:10856-10861`) draws the outer-wall outline in the MultiRoom overview but `drawOutsideWall()` suppresses the filled default walls there (`!isMultiRoomOverviewMode()` gate, `js/roomcalc.js:10098`). Filled per-room default walls draw only in normal single-room mode or boxRoomPart Room sub-mode. Default Walls subtab is message-only in overview.
- **Preview wall thickness scales for feet** — `drawRoomPartDefaultWallsPreviews()` thickness is `0.115 * (feet? 3.28084 : 1) * scale`; feet rooms were drawn too thin.
- **Coverage buttons truly disabled in overview** — `applyMultiRoomModeUi()` toggles class `coverageBtnDisabledMultiRoom` on `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance` (the `disabled` attr alone didn't stop their `pointerdown`/`pointerup` listeners). CSS sets `pointer-events:none`, greys the button, and greys the `.holdIndicator` triangle via `filter: grayscale(100%) brightness(1.8)`.

## Decisions confirmed
- **Mode flag:** sticky design-level boolean, mirrored into `data.vrc`. Explicit OFF lives as a **Details > Settings toggle that warns** before reverting to normal mode.
- **Software Experience:** disabled in MultiRoom mode, **enabled in Room mode** (per individual room).
- **Storage shape:** `roomObj.multiRoomFloorPlanMode = true`; `boxRoomPart` item gets `item.data_roomSurfaces` (4-wall config) and `item.data_workspace` (default-walls on/off + door). `polyRoom` stores neither.

## Mode model (3 states)
- **Normal mode** — `roomObj.multiRoomFloorPlanMode` falsy. Everything behaves as today.
- **MultiRoom mode** — flag true AND `isActiveRoomPart === false` (whole floor-plan overview).
- **Room mode** — flag true AND `isActiveRoomPart === true` (zoomed into one roomPart via existing `zoomRoomPart()`).

Add helper `isMultiRoomFloorPlanMode()` reading `roomObj.multiRoomFloorPlanMode`. Sub-mode derives from existing `isActiveRoomPart`.

## Key existing anchors (still relevant for steps 8-10)
- State vars: `isActiveRoomPart`, `activeRoomPartItem`, `activeRoom{X,Y,Width,Length}` (`js/roomcalc.js:26-32`).
- Zoom/exit/draw: `showEntireFloor()` (`js/roomcalc.js:10506`), `zoomRoomPart()` (`js/roomcalc.js:10539`), `drawRoom()` (`js/roomcalc.js:10612`).
- Insert path: `insertItemFromMenu()` (`js/roomcalc.js:23534`) special-cases `polyRoom` + the multi-room entry prompt; `boxRoomPart` flows through normal insert.
- Default walls: `roomObj.roomSurfaces`, `roomObj.workspace.removeDefaultWalls`, `updateDefaultWallsMenu()` (`js/roomcalc.js:21367`-area), `drawOutsideWall()` (`js/roomcalc.js:10068`), `insertDefaultDoorsOnCanvas()` (`js/roomcalc.js:21553`-area).
- WD export: `exportRoomObjToWorkspace()` (`js/roomcalc.js:30173`); per-room floor/wall blocks today read GLOBAL `roomObj2.room.*` + `roomObj.roomSurfaces` (`js/roomcalc.js:30211-30595`) — step 8 must parameterize these per boxRoomPart. `convertToMeters()` in `js/util/units.js` already coordinate-shifts by `activeRoomX/Y` and gates items by `itemsOffStageId`/`isActiveRoomPart`.
- Share link: `createShareableLink()` (`js/roomcalc.js:11540`), `createShareableLinkItem()` (`js/roomcalc.js:11890`), `createShareableLinkItemShading()` (`js/roomcalc.js:12150`) — all still global; no mode handling yet (step 9).
- Import/round-trip: `importJson()` (`js/roomcalc.js:~27090`, `.vrc.json` flag backfill at `27095`), WD import `data.vrc.multiRoomFloorPlanMode` restore (`js/roomcalc.js:29028`).
- HTML: `defaultOpenTab` (Room tab), `roomNameLabel`/`rotateRoomLabel` labels, `drpSoftware`, `subTabDefaultWalls` + `DefaultWalls` panel + `defaultWallsMultiRoomMsg`, `controlButtons` + `btnBackToFloorPlan`/`btnBackToFloorPlanBtn`, shading buttons `btnCamShadeToggle`/`btnMicShadeToggle`/`btnDisplayDistance`, `multiRoomFloorPlanModeCheckBox` (all in `RoomCalculator.html`).

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
- NOTE: per user, turning ON via the toggle ALSO confirms (mirrors the entry prompt). Steps 4/5 landed: both toggle directions now flip the flag, call `applyMultiRoomModeUi()`, and (OFF when zoomed) `showEntireFloor()`, then `canvasToJson()`.

### 4. MultiRoom-mode UI gating (flag on && !isActiveRoomPart)  — DONE
- **Buttons disabled:** `btnCamShadeToggle`, `btnMicShadeToggle`, `btnDisplayDistance`.
- **Menus filtered** to Walls / Glass Walls / Wall-with-Windows / Door types (`doorRight2`/`doorLeft2`/`doorDouble2`) only — `createEquipmentMenu()` (filter the menu arrays), search builder, and Quick Add all consult the mode. roomPart tiles are NOT shown (add more rooms via `**` search).
- **Software Experience** (`drpSoftware`) disabled in MultiRoom mode; re-enabled in Room mode.
- **"Remove Default Walls"** option hidden/removed (both `removeDefaultWallsCheckBox` rows).
- **Label swaps:** `defaultOpenTab` "Room"→"Floor", "Room Name:"→"Floor Name:", "Rotate Room"→"Rotate Floor".
- **Details > Default Walls** panel shows only the message: *"Not available in multi-room floor plan view. Select a rectangular individual room"*.
- Drive all of the above from one `applyMultiRoomModeUi()` invoked in `drawRoom()` / mode transitions.

### 5. Room-mode UI (flag on && isActiveRoomPart)  — DONE (incl. read-only Room-tab display + bg-image gating)
- Label swaps revert to "Room".
- `controlButtons` CSS expands to fit the `btnBackToFloorPlan` group (fix the duplicate `id="btnBackToFloorPlan"` on both wrapper div and button in HTML).
- Software Experience enabled.
- Default Walls available only for rectangular `boxRoomPart` (see step 7).

### 6. Per-roomPart Default Walls storage (four-place rule)  — DONE
- New attrs on `boxRoomPart`: `data_roomSurfaces` (the 4 walls' type/acoustic/door), `data_workspace` (default-walls on/off). Wire through the documented four places: `insertTable()`, `insertShapeItem()` mirror, `updateRoomObjFromTrNode()` push + map-hit branches, `copyToCanvasClipBoard()`.
- In Room mode for a rectangular `boxRoomPart`, the Default Walls subtab edits these per-room attrs (not the global `roomObj.roomSurfaces`). `polyRoom` keeps the "not supported" message.

### 7. Default Walls preview on boxRoomPart (MultiRoom mode)  — DONE
- When a `boxRoomPart` has default walls on, draw its walls (std / window / glass per `data_roomSurfaces`) plus the door as a `Konva.Group` attached to the boxRoomPart node, as a visual preview in MultiRoom mode.
- Rebuild the preview group on draw/update of the roomPart.

### 8. WD export (`exportRoomObjToWorkspace`)  — PENDING (only the flag mirror exists today; floor/wall geometry still global)
- **MultiRoom mode:** do NOT send roomPart items; set `"ignore": true` on all emitted WD objects. For each `boxRoomPart` with default walls on, emit the equivalent walls + door (2 rooms × 4 walls ⇒ 8 walls). Reuse the existing `altDefaultWall` wall-builder logic, parameterized per roomPart bounding box.
- **Room mode:** export only items inside the active room (existing `isActiveRoomPart` + `convertToMeters` coordinate shift already scopes most of this). WD room size = roomPart size (boxRoomPart straightforward; polyRoom must fit inside the WD rectangle). Items keep `ignore:false`/absent unless overridden by Item-Label JSON.
- **Wall clipping (Room mode):** for `wallStd`/`wallGlass`/`wallWindow` extending outside the room, truncate `item.height` (length) so it fits within room −0.10/+0.10 m, using only the main VRC `rotation` (ignore tilt/lean). Do this on the VRC-item clone right before WD push (cleanest in `convertToMeters` output stage or at top of the wall push loop).
- **Normal mode:** unchanged.

### 9. Shareable link (`createShareableLink`)  — PENDING (no mode handling yet)
- **MultiRoom mode:** skip link generation entirely (early return / clear link).
- **Room mode:** include only items inside the active room.
- **Normal/default mode:** unchanged. (Shareable Template Hyperlink works in Room mode and normal mode, not MultiRoom mode.)

### 10. Undo/Redo + round-trip integrity  — PARTIAL
- DONE: flag + per-roomPart `data_roomSurfaces`/`data_workspace` live in `roomObj`, ride existing undo snapshots + `canvasToJson()` (four-place rule), and the flag round-trips through `.vrc.json` (backfill `27095`) and WD `data.vrc.multiRoomFloorPlanMode` (export `30340` / import `29028`).
- PENDING: WD round-trip of per-roomPart default walls as real geometry — blocked on step 8 (export still emits global walls only).

### 11. Docs
- Add `notes/MULTI_ROOM_FLOOR_PLAN.md` (new TECH note) describing modes, storage, WD/link behavior.  — DONE (this file)
- Add a short pointer in `CLAUDE.md` (keep it brief — file is already large).  — PENDING (CLAUDE.md notes list does not yet reference this file).
- Opportunistically trim long block comments in the `roomcalc.js` sections touched (export, share link, menu build, default walls). Add no new comments except brief function-header notes; prefer long names + single-line `/* */` descriptions.

## Resolved decisions (round 2)
- **roomParts in MultiRoom menu:** NOT shown for now — adding more rooms is done via `**` search. Menu filter excludes roomPart tiles.
- **Door "types":** only the door items already present in the menu (`doorRight2`, `doorLeft2`, `doorDouble2`).
- **polyRoom→WD rectangle fit:** use the poly's bounding box as the WD room size.
- **Duplicate `btnBackToFloorPlan` id:** fix it (rename wrapper or button) as part of step 5.

## Remaining risk
- Wall-clipping rotation math is the highest-risk numeric piece; will validate against a rotated wall crossing a room edge.
