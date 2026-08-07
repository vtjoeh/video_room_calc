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
| 8 | WD export changes | **Partial** (Room mode done — room-sized export, intersection filter +0.10 m margin, wall truncation, per-room default walls; zoomed-out export emits each walled boxRoomPart's 4 walls as real WD walls; overview ignore-gating still pending) |
| 9 | Shareable link changes | **Done** (Room-mode scoped link mirrors WD export; per-room walls persist via the `rs` item code; address bar untouched while zoomed) |
| 10 | Undo/Redo + round-trip integrity | Partial (flag + per-room attrs round-trip; WD wall geometry waits on step 8) |
| 11 | Docs | In progress (this file) |

> Line numbers below track `js/roomcalc.js` (~33,300 lines) as of this revision and drift as the file grows; re-grep the function names if they look off.

### What is built so far (anchors)
- Flag default + reset: `roomObj.multiRoomFloorPlanMode = false` (`js/roomcalc.js:160`), reset in `resetRoomObj()` (`js/roomcalc.js:8974`).
- Predicates: `isMultiRoomFloorPlanMode()` / `isMultiRoomOverviewMode()` / `isRoomSubMode()` (`js/roomcalc.js:177-189`). All three are now actively used (overview/Room sub-modes drive gating, draw, accessors, and the Room-tab display).
- Menu gating: the original overview allow-list (`MULTI_ROOM_OVERVIEW_MENU_ITEMS` + `isAllowedInMultiRoomOverview()`) was later deleted (see the update further below) — only the Room sub-mode filter (no Room Parts inside a room) remains, with the `_lastMultiRoomOverviewMenuState` rebuild-on-flip guard.
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

### 8. WD export (`exportRoomObjToWorkspace`)  — PARTIAL (Room mode DONE; MultiRoom overview still pending)

#### Room-mode implementation (done)
- **Item scoping** — `convertToMeters()` (`js/util/units.js`) now drops every item in `itemsOffStageId` in Room mode too (previously they rode along and were flagged `ignore:true`), and drops `boxRoomPart`/`polyRoom` items entirely when `isActiveRoomPart`. `listItemsOffStage()` already classifies intersection against the active roomPart (bbox for boxRoomPart, `activeRoomAbsPoints` polygon for polyRoom), so "only if an item intersects the Room Part is it sent" falls out of the existing classifier. Items straddling the boundary intersect → they export whole (walls excepted, see truncation).
- **Frame normalization** — new block at the top of `exportRoomObjToWorkspace()` (right after the `activeRoom*` locals): when `isActiveRoomPart`, every item (and the backgroundImage record) is shifted by `frameShift = (floor − room)/2` so the roomPart occupies `[0, activeRoomWidth] × [0, activeRoomLength]`, then `roomObj2.room.roomWidth/Length` are overwritten with the roomPart size and the local `activeRoomX/Y` zeroed. Everything downstream (wallPush centering on `room.roomWidth/2`, floor/ceiling emission, `roomShape.width/length`) then works unchanged — the WD room IS the roomPart.
- **Wall truncation** — `truncateWallsToActiveRoomRect(roomObj2)` + `clipSegmentToRect()` (Liang-Barsky), defined just above `exportRoomObjToWorkspace()`. For `wallStd`/`wallGlass`/`wallWindow`: the wall's x/y/width/height/rotation is converted to a centerline — the midpoints of the two SHORT sides (run axis = the longer of width/height, so it survives user-resized walls) — via `findNewTransformationCoordinate()` (negative deltas ADD the rotated local vector to the UL anchor). The centerline is clipped to the room rect expanded by 0.10 m; the UL anchor is rebuilt from the clipped start point (positive deltas subtract) and the run-axis dimension set to the clipped length. Main `rotation` only; tilt/lean ignored. A centerline that never enters the rect leaves the item untouched (the intersection filter already decided it belongs). Verified for rot 0/90/45, both run axes, missing rotation, fully-inside, fully-outside.
- **Per-room default walls** — `roomShape.roomSurfaces` now sources from `structuredClone(activeDefaultWallsSurfaces())` (per-room `data_roomSurfaces` on a boxRoomPart in Room sub-mode; global otherwise). The clone also fixes a latent bug where `door: 'none'` cleanup mutated the LIVE `roomObj.roomSurfaces`. `removeDefaultWalls` is read via `exportRemoveDefaultWalls` = `activeDefaultWallsWorkspace().removeDefaultWalls` (replacing the DOM-checkbox read), with a polyRoom override: a zoomed polyRoom ALWAYS exports without default walls (its walls are hand-drawn; the WD room is just the bbox). The ceiling block gates on the same effective value.
- **Known limits** — `data.vrc.groups`/`customItems` geometry still exports in floor coordinates (Room-mode WD JSON is a preview/push surface, not a round-trip surface); room height/software remain global (no per-room attrs yet); non-wall items straddling the boundary are not clipped (only walls truncate).

#### Room-mode round 2 (done)
- **The drop margin** — `listItemsOffStage()` Room-mode branches expand the intersection bounds before testing each item. The rect branch inflates min/max; the polygon branch (`activeRoomAbsPoints` — used for BOTH boxRoomPart corners and polyRoom outlines) goes through `expandPolygonByMargin()`, a miter offset with shoelace winding detection and a clamped miter denominator for spike vertices. It started as one uniform 0.10 m outward margin; it is now the two-way split in `roomPartItemMarginUnits()` described under "Which items a Room Part captures" below. `roomPartBoundsMarginUnits()` (0.10 m) survives as the separate WALL-TRUNCATION margin only.
- **Wall preview moved OUTSIDE the part** — `drawRoomPartDefaultWallsPreviews()` wall rects now sit outside the boxRoomPart bbox (videowall/backwall at `y = -t` / `y = h`, extended past the corners; left/right at `x = -t` / `x = w`), mirroring `drawOutsideWall()`'s default-wall placement. Doors follow their wall geometry.
- **Zoomed-out export emits real walls** — nested `pushRoomPartDefaultWalls(part)` in `exportRoomObjToWorkspace()`: when `!isActiveRoomPart`, every `boxRoomPart` in `wdBuckets.rooms` with per-room walls ON emits 4 wall customObjects via `workspaceObjWallPush()`. Types map `regular/glass/window → wallStd/wallGlass/wallWindow`; thickness 0.10 m; geometry matches the canvas preview (outside the part, rotation-composed via `findNewTransformationCoordinate`); `data_vHeight` = room height; acousticTreatment rides the label JSON; the part's `data_layerId` is inherited. Ids use the `secondary-roomPartWall-…` prefix so the WD importer drops them (no round-trip duplication).
- **Mode-dependent wall representation** — zoomed OUT: room-part walls are real WD wall objects (above). Zoomed IN: the active room's walls export as native WD `roomShape.roomSurfaces` default walls (round 1); per-room walls OFF ⇒ `roomShape` is deleted (floor-only export), so no default walls are sent for wall-less rooms. The Details → Default Walls panel therefore configures per-room walls whose export form depends on the zoom state.

#### Room-mode round 3 (done) — every room owns walls by default
- **`ensureRoomPartWallDefaults()`** (next to the preview builder, called from `drawRoom()` right before `drawRoomPartDefaultWallsPreviews()`): seeds missing `data_roomSurfaces` (clone of `defaultRoomSurfaces` — all standard walls) + `data_workspace` (`{removeDefaultWalls: false}`) on EVERY `boxRoomPart` item AND its Konva node. Fresh inserts were already seeded in `insertItemFromMenu()`; this covers rooms arriving via shareable URL, WD import, or pre-step-6 designs, which previously had no wall attrs → no preview walls, no exported walls, and no per-room Default Walls editing until zoomed once. The node mirror is required because `updateRoomObjFromTrNode()`'s delete-on-absent branch would wipe an item-only backfill on the next drag of the part. `pushRoomPartDefaultWalls()` keeps a `|| defaultRoomSurfaces` safety net.
- **Net behavior**: every rectangular room shows standard walls drawn on its outside from the moment it exists; zoomed-in Details → Default Walls always has per-room attrs to edit (accessors `activeDefaultWallsSurfaces()`/`activeDefaultWallsWorkspace()`); zoomed-out export emits the walls as real WD objects; zoomed-in export as native roomShape default walls.
- **Persistence**: per-room wall attrs ride `.vrc.json`, undo snapshots, AND (since step 9 landed) the shareable URL via the `rs` item code.

#### Room-mode round 4 (done) — Room Part walls decoupled from the mode flag
- **Root cause**: `zoomRoomPart()` fires on dblclick regardless of `roomObj.multiRoomFloorPlanMode`, but the wall accessors were gated on `isRoomSubMode()` (= flag AND zoomed) and the preview on `isMultiRoomOverviewMode()` (= flag AND not zoomed). The flag does NOT ride the shareable URL (step 9 pending), so a URL-loaded floor plan had flag=false → no walls drew around Room Parts, and zoomed-in Details → Default Walls fell back to editing the GLOBAL `roomObj.roomSurfaces` — the Room Part and the floor shared one setting.
- **Fix**: new predicate `isZoomedIntoBoxRoomPart()` (zoom state + boxRoomPart only, no flag). Used by: `activeDefaultWallsSurfaces()` / `activeDefaultWallsWorkspace()`, the `drawFloorPlanWalls` gate in `drawRoom()`, the door-picker hiding in `updateDefaultWallsMenu()`, and `populateRoomTabFromActiveRoomPart()`. `drawRoomPartDefaultWallsPreviews()` now draws whenever zoomed OUT (`if (isActiveRoomPart) return`) instead of requiring the overview mode. The multiRoom flag remains a menu/label/UI-gating concern only.
- **Wall thickness**: the drawn Room Part walls are now 0.10 m (was 0.115), matching the exported WD wall thickness.

#### Room-mode round 5 (done) — rotation handling + two Room Part menu types
- **The rotation bug**: zooming uses the axis-aligned bbox while `data_roomSurfaces` names walls by LOCAL side (videowall=top). A part rotated 90° showed its window wall on top zoomed out but on the left zoomed in (native default walls hug the bbox in screen frame).
- **90-multiple rotations are rebaked at zoom** — `normalizeRoomPartRotation(item)` (next to `ensureRoomPartWallDefaults`): for rotation ≈ n×90 (±0.5° drift tolerance), rewrites the item to rotation 0 (x/y = bbox UL via `findFourCorners`, width/height swapped for odd quarters) and shifts the wall map one side per clockwise quarter turn (cycle `videowall → rightwall → backwall → leftwall`). Called ONLY from `zoomRoomPart()` (before `getBoundingBoxInUnit`), where the following `drawRoom(true)` full redraw rebuilds the node from the item — calling it anywhere without a guaranteed node rebuild risks a node/item mismatch that double-remaps on the next zoom. Verified for 90/180/270/-90/360/90.3°.
- **Odd angles (1°, 40°, 113°…)** — `isActiveRoomPartRotated()`: zoomed in, the native bbox default walls are suppressed (`drawFloorPlanWalls` gate) and the rotated wall rects draw around the actual part via `drawRoomPartDefaultWallsPreviews()` (which now also runs zoomed-in for the active odd-rotated part only; `updateDefaultWallsMenuAndCanvas()` rebuilds it so zoomed-in wall edits show). WD export: `roomShape` walls suppressed (`exportRemoveDefaultWalls` forced) and the walls emit as real rotated wall objects via a frame-space part record (`rotatedActiveRoomPartFrame`) fed to `pushRoomPartDefaultWalls()`.
- **Two Room Part menu types** — `boxRoomPart` tile renamed "Room Part with Default Walls"; new menu-only alias device `boxRoomPartNoWalls` (key `ZW`, "Room Part - No Walls") converts to a plain `boxRoomPart` with `data_workspace = {removeDefaultWalls: true}` at the top of `insertItemFromMenu()`. Stored items/URLs/WD JSON only ever carry `boxRoomPart`; the alias id never persists.

#### Room-mode round 6 (done) — invisible roomPart box removed from WD export
- roomParts were pushed to `customObjects` as a `hidden: true, opacity: 0.01` wall box, which cast shadows in the Designer. The rooms-bucket push (and the dead hidden/opacity branch in `workspaceObjWallPush`) are removed — roomParts themselves never reach WD in any mode; only their walls export (real walls zoomed out / roomShape or rotated walls zoomed in). roomParts still persist via `.vrc.json` and the shareable URL; they were never restored from WD JSON anyway (the hidden box imported back as a plain wall).

#### Room-mode round 7 (done) — per-room name + software experience
- **Zoomed-in Room tab**: `populateRoomTabFromActiveRoomPart()` enables the Room name input + Software dropdown per room (width/length/height stay disabled). The name field shows/edits the part's `data_labelField` (the shared textInput input/blur handlers branch via `setActiveRoomPartLabel()`); the floor's `roomObj.name` is untouched while zoomed. The software dropdown reads/writes the new `item.data_software` (`'webex'|'mtr'|'zoomRooms'`, absent = inherit the design-level `roomObj.software`) via the zoomed-in branch in `updateRoomDetails()`.
- **`data_software` four-place rule**: `insertTable()` writer, `updateNodeAttributes()` mirror, `updateRoomObjFromTrNode()` push + map-hit delete-on-absent, `copyToCanvasClipBoard()`.
- **`activeSoftware()` accessor** (sibling of `activeDefaultWalls*`): zoomed room's `data_software` when set, else global. Drives `workspaceObj.meetingPlatform` in the WD export (zoomRooms → 'bolt') and the room-scoped link's `e` code (`linkSrc.software`).
- **URL**: per-item 2-char `sw` code on boxRoomPart (`sw0`=webex `sw1`=mtr `sw2`=zoomRooms, same digit mapping as the room-level `e` code), omitted when unset. The part's label already rode the URL as its `~text~` label.
- **Guard**: `update()` (the Software dropdown's onChange path via `updateButtonRoomDimensions()`) no longer writes the Room-tab width/length inputs back to `roomObj.room` while zoomed in — those inputs show the PART's dims and would have resized the floor.
- **Guard 2 (rename-offset bug)**: the shared textInput blur handler ends with `updateItem()`, and zoomed in the Details panel can still hold the roomPart selected BEFORE the zoom — with floor-frame X/Y values. `updateItem()` rebuilt the part from those stale values, re-materializing it offset inside the zoomed view (a floating blue rect). `updateItem()` now early-returns when zoomed in and the Details panel's `#itemId` resolves to a roomPart (parts are never selectable while zoomed, so that panel state is always stale).

#### MultiRoom overview (still pending — ignore:true gating, menu-item scoping)
- **MultiRoom mode:** do NOT send roomPart items; set `"ignore": true` on all emitted WD objects. For each `boxRoomPart` with default walls on, emit the equivalent walls + door (2 rooms × 4 walls ⇒ 8 walls). Reuse the existing `altDefaultWall` wall-builder logic, parameterized per roomPart bounding box.
- **Room mode:** export only items inside the active room (existing `isActiveRoomPart` + `convertToMeters` coordinate shift already scopes most of this). WD room size = roomPart size (boxRoomPart straightforward; polyRoom must fit inside the WD rectangle). Items keep `ignore:false`/absent unless overridden by Item-Label JSON.
- **Wall clipping (Room mode):** for `wallStd`/`wallGlass`/`wallWindow` extending outside the room, truncate `item.height` (length) so it fits within room −0.10/+0.10 m, using only the main VRC `rotation` (ignore tilt/lean). Do this on the VRC-item clone right before WD push (cleanest in `convertToMeters` output stage or at top of the wall push loop).
- **Normal mode:** unchanged.

### 9. Shareable link (`createShareableLink`)  — DONE (Room-mode scoping + per-room walls in URL)

#### Per-room walls in the URL — the `rs` item code
`boxRoomPart` items carry a 2-char `rs` code (parsed by the same consecutive-letter state machine as `ll`/`cd`/`gw`): sentinel `1` + `[type, acoustic]` digit pairs for leftwall/videowall/rightwall/backwall (type 0=regular 1=glass 2=window) + a final removeDefaultWalls digit. The leading sentinel keeps the fixed-width digit string safe from leading-zero loss. Omitted entirely when equal to the seeded defaults (`1010000000` — left regular+acoustic, rest regular, walls on); the load-time `ensureRoomPartWallDefaults()` backfill regenerates the defaults. Encoder: `encodeRoomPartWallsDigits()` (called from `createShareableLinkItem`); decoder: `decodeRoomPartWallsDigits()` (called from `parseShortenedXYUrl`).

#### Room-mode link scoping — `buildRoomModeLinkSource()`
Zoomed into a Room Part, the shareable link is a standalone single-room design of exactly what's on screen, mirroring the WD export scoping:
- items filtered to those intersecting the room (+0.10 m margin via `itemsOffStageId`), roomParts excluded, coordinates shifted to room-relative, walls truncated via the shared `truncateWallItemsToRect()` (unit-agnostic core extracted from the WD truncator; WD passes meters, the link passes room units)
- room size = the part's bbox; `D/E/F/G` walls from `activeDefaultWallsSurfaces()`; `B` flag bit 5 from the per-room removeDefaultWalls (override param on `createShareableLinkItemShading()`)
- polyRoom / odd-rotated rooms force remove-default-walls; an odd-rotated walled room additionally materializes its 4 walls as REAL wall items via `buildRoomPartWallItems()` (unit-space sibling of the WD `pushRoomPartDefaultWalls()`, fresh `crypto.randomUUID()` ids)
- `H{n}`/`J{n}` bundle rects shift by the same offset and membership is computed from the SCOPED item list
- **the address bar is NOT rewritten while zoomed in** (`history.replaceState` skipped) so a reload restores the whole floor plan; only the Share link/QR are room-scoped. Zooming back out refreshes the address bar on the next canvasToJson.
- **MultiRoom overview:** link stays the full floor plan (roomParts + `rs` walls ride along) — the earlier "skip link generation in overview" idea was dropped in favor of full-floor persistence, since the URL is the primary save mechanism.

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

## Round 8 (2026-07) — auto mode entry, zoomed-in Room tab cleanup, per-room notes

- **Mode derivation:** `isMultiRoomFloorPlanMode()` is now `flag || roomObjHasRoomPart()` — a design containing any Room Part IS a floor plan, even when the sticky flag was lost (the flag doesn't ride the shareable URL). The Settings-tab toggle remains hidden (`multiRoomFloorPlanModeDiv` forced `display:none`).
- **First-part alert:** `enterRoomFloorPlanModeOnFirstRoomPart()` fires from `insertItemFromMenu()` (boxRoomPart, incl. the boxRoomPartNoWalls alias) and `finishPolyBuilder()` (polyRoom). It sets the sticky flag on every part insert; the `alertDialog` explaining Room Floor Plan Mode shows only on the transition (flag was false AND the just-added part is the design's only one). Paste / URL / imports do not alert.
- **Tab label:** `defaultOpenTab` reads "Floor" for the WHOLE mode (overview AND zoomed in); `roomNameLabel` stays "Floor name:" in overview / "Room name:" zoomed in (unchanged).
- **Zoomed-in Room tab hides** (all in `applyMultiRoomModeUi()`, keyed off the renamed local `inRoom = isRoomSubMode()`): `removeDefaultWallsRow` (also hidden — per-room walls stay editable in the Default Walls subtab via `removeDefaultWallsRow2`), `rotateRoomRow`, `versionAuthorRow`. `roomNotesRow` shows in their place.
- **Room notes (`data_roomNotes`):** per-room free text on the Room Part item (BOTH part types), edited via the `#roomNotes` textarea (`.textInput`, special-cased next to `roomName` in the shared input/blur handlers → `setActiveRoomPartNotes()`, DOMPurify-sanitized, empty ⇒ attribute deleted). Populated by `populateRoomTabFromActiveRoomPart()` (which now runs its notes block for polyRoom too). Four-place rule wired like `data_software`: `insertTable()`, `insertShapeItem()`→`updateNodeAttributes()`, `updateRoomObjFromTrNode()` push + map-hit (explicit-delete-on-absent), `copyToCanvasClipBoard()`. Rides `.vrc.json` and undo snapshots; **NOT encoded in the shareable URL** (notes can be long) and **NOT in the WD export** (roomParts aren't pushed to WD).
- **Locked floor settings zoomed in:** Unit / Width / Length / Height wrappers carry `onclick="roomPartLockedSettingClick()"`; zoomed in the (already-disabled) inputs get `pointer-events:none` so the wrapper click fires and an `alertDialog` says "Go back to the full floor plan to make changes to this setting." Zoomed out the handler no-ops.

## Round 9 (2026-07) — Default Software Experience, full Equipment menu in overview, blue-rect fix

- **Blue-rect bug fixed:** any full `drawRoom()` rebuild while zoomed into a Room Part (Update click after a software change, undo fallback, etc.) re-created the part's node with its default `#ADD8E655` fill — the transparent/passive state (`fill('')`, `listening(false)`, `draggable(false)`) lived only in `zoomRoomPart()`'s post-step. That block now runs at `drawRoom()`'s tail (gated on `isActiveRoomPart && activeRoomPartItem`); the duplicate in `zoomRoomPart()` is removed.
- **Default Software Experience (overview):** `drpSoftware` is no longer disabled in the MultiRoom overview. The label (`#softwareExperienceLabel` span in `RoomCalculator.html`) reads "Default Software Experience:" in overview / "Software Experience:" otherwise (swapped in `applyMultiRoomModeUi()`). Overview edits write the design-level `roomObj.software` via the existing `updateRoomDetails()` else-branch.
- **Inheritance model:** a NEW Room Part (both types: `insertItemFromMenu` boxRoomPart path and `finishPolyBuilder` polyRoom path) is stamped `data_software = roomObj.software` at insert — BEFORE `insertShapeItem()` so the Konva node mirror carries it (else `updateRoomObjFromTrNode`'s delete-on-absent would wipe it on the next selection sync). Paste / URL / imports are untouched (they carry their own value or none). At WD-export/link time, `activeSoftware()` falls back to `roomObj.software` for a part with no `data_software` (pre-existing designs), so export inheritance works without stamping.
- **Per-room software now covers BOTH part types:** `activeSoftware()`, the per-room write in `updateRoomDetails()`, and the Room-tab populate were gated on `isZoomedIntoBoxRoomPart()`; all three now gate on `isActiveRoomPart && activeRoomPartItem`, since stamped polyRooms carry `data_software` and it must stay editable per-room (previously a software change inside a polyRoom silently overwrote the global default). The populate shows the inherited floor default when the room has no override.
- **Equipment menu in overview:** the walls/shapes+doors restriction is removed — `MULTI_ROOM_OVERVIEW_MENU_ITEMS` and `isAllowedInMultiRoomOverview()` are deleted; the Equipment tab, sidebar search, and Quick Add offer everything in the overview (items land on the floor). The only remaining menu filter is Room sub-mode (no Room Part tiles inside a room). The `_lastMultiRoomOverviewMenuState` rebuild-on-flip trigger stays: room-sub-mode entry/exit always passes through an overview flip, so the roomPart filter is applied/cleared correctly.

## Round 10 (2026-07) — coverage overlays forced off in the overview

Coverage overlays (camera FOV / mic / speaker / display-distance) are a
per-room concern — their toggle buttons are disabled in the MultiRoom
overview. But the overlay *groups* still rendered from
`roomObj.overlaysVisible.*` (all default `true`), so a video device
dropped on the floor in overview showed its FOV.

Fix — force the four coverage groups hidden whenever
`isMultiRoomOverviewMode()` is true, WITHOUT writing
`roomObj.overlaysVisible` (so zooming into a room restores the user's
saved settings, and the toggle buttons work normally there):

- `drawRoom()`: right after the six `*Visible(roomObj.overlaysVisible.*)`
  calls, an overview guard sets `cameraCoverage/microphoneCoverage/
  speakerCoverage/displayDistanceCoverage .visible(false)`. Group
  visibility cascades, so a device inserted onto the floor while in
  overview stays uncovered (its freshly-added `#fov~`/`#audio~` child
  lands in an already-hidden group; no `drawRoom` on insert needed).
- `hideAllCoverageGroups(false)` (the show side of the drag/transform/
  arrow-nudge hide-cycle): the `group.show()` branch now also checks
  `!isMultiRoomOverviewMode()`, so dragging/nudging an item in the
  overview can't leak coverage back on.
- `applyMultiRoomModeUi()`: `btnSpeakerShadeToggle` added to the
  coverage-button disable list (was missing; camera/mic/display were
  already there) so all four toggles are consistently disabled in the
  overview and enabled only when zoomed into a room.

## Round 11 (2026-07) — floor-level Default Walls in overview, per-room Update button

- **Floor Default Walls restored in the overview:** `dwMessageOnly` in
  `applyMultiRoomModeUi()` no longer includes `overview` (only
  polyRoom-zoomed keeps the read-only message). In the overview the
  Default Walls subtab and the Room-tab "Remove Default Walls" row edit
  the FLOOR's outside walls — `activeDefaultWallsSurfaces()` /
  `activeDefaultWallsWorkspace()` already fall back to
  `roomObj.roomSurfaces` / `roomObj.workspace` when not zoomed into a
  rectangular room, so no handler changes were needed. The
  `!isMultiRoomOverviewMode()` suppression in `drawOutsideWall()` is
  removed, so the floor's filled default walls render in the overview
  per those settings. (`getOuterWallSnapSegments()` still returns [] in
  overview — door snap-to-outer-wall stays room-scoped.)
- **Per-room Update button:** zoomed into a room, the floor Update
  button (`#updateButtonId`, disabled + pointless there) is hidden and
  `#btnUpdateRoomPartFields` ("Update Room") shows in its place.
  `updateActiveRoomPartFields()` saves the per-room fields — name (via
  `setActiveRoomPartLabel`, skipped when the input is disabled i.e.
  polyRoom), notes (via `setActiveRoomPartNotes`), and software (via
  `updateRoomDetails()`, which also fires `canvasToJson()` for the undo
  snapshot / share link). Both buttons toggle in `applyMultiRoomModeUi()`.

## Round 12 (2026-07) — per-room Room Height (`data_roomHeight`)

Room Parts inherit the floor's `roomObj.room.roomHeight`; a per-room
override lives in `item.data_roomHeight` (both part types). Model mirrors
per-room software:

- **Helper:** `activeRoomHeight()` — zoomed room's `data_roomHeight` when
  set, else `roomObj.room.roomHeight`. Sibling of `activeSoftware()`.
- **UI:** the Height field is UNLOCKED zoomed in (removed from the
  pointer-events lock list + its HTML wrapper's `roomPartLockedSettingClick`
  guard removed). `populateRoomTabFromActiveRoomPart()` re-enables it;
  an explicit `data_roomHeight` shows as a real `value`, while an
  inherited room shows the floor height as a grey **placeholder**
  (empty `value`) so the user can tell inherited from overridden at a
  glance. `drawRoom()`'s zoomed-out height set clears the placeholder
  first so it never lingers on the floor view. Saving goes through
  `updateRoomDetails()`: zoomed in, a positive value DIFFERENT from the
  floor height writes `data_roomHeight` (item + node mirror); blank, 0,
  or exactly the floor value deletes it (stays inherited, so later floor
  height changes flow into never-diverged rooms). Zoomed out the original
  floor write is unchanged.
- **Four-place rule:** copy (`copyToCanvasClipBoard`), push + map-hit
  (delete-on-absent) in `updateRoomObjFromTrNode`, `insertTable()` writer,
  `updateNodeAttributes()` mirror — all alongside `data_software`.
- **URL:** 2-char `rh` code = height ×100 in current unit, encoded for
  BOTH part types (own `isRoomPart()` gate — the `rs`/`sw` block is
  boxRoomPart-only); decoder mirrors. Absent = inherit.
- **Units:** `data_roomHeight` scales in `convertItemUnitBasedOnRatio()`
  (feet↔meters toggle) and in `convertToMeters()`'s item loop (WD export).
- **WD export:** `exportRoomObjToWorkspace()` overrides
  `roomObj2.room.roomHeight` with the part's value (pre-`convertToMeters`,
  so unit scaling applies) — `roomShape.height` and any wall-default
  heights derived from the room height inherit it.
- **Room-scoped share link:** the room-level `f` height code now emits
  `activeRoomHeight()` so a zoomed-in link carries the room's effective
  height; zoomed out this is byte-identical to the old output.

## Round 13 (2026-07) — pathShape draw offset when zoomed into a Room Part

Drawing a Path Shape (customPathEditor poly builder) while zoomed into a
Room Part placed it offset by `(activeRoomX, activeRoomY)` from where it
was drawn. `convertPointsToUnit()` returns FLOOR coords (it adds
`activeRoomX/Y`), and `finishPolyBuilder()` wrote those straight into the
Details `#itemX`/`#itemY` fields — but those fields are ROOM-RELATIVE and
`updateItem()` adds `activeRoomX/Y` back, double-applying the offset. Fix:
`finishPolyBuilder()`'s customPathEditor branch now writes
`attrs.x - activeRoomX` / `attrs.y - activeRoomY` into the fields. Zoomed
out (`activeRoomX/Y === 0`) it's a no-op, so single-room drawing is
unchanged. Covers both the fresh-insert auto-launch and re-editing an
existing pathShape's path (both route through the same branch).
The WD export shares the same root cause: `workspaceObjItemPush()` reads `item.x`, so the double-offset made the exported shape land ~`activeRoomX/Y` off. Correcting `item.x` fixes both surfaces at once (A/B verified: with the fix a zoomed-in pathShape exports at the centered room-relative position; the old code exported it shifted by the room offset). No WD-specific change needed.

## Round 14 (2026-07) — polyRoom wall truncation along the polyline on WD export

Zoomed into a polyRoom, the WD export (and the room-scoped share link)
previously cut walls only against the part's axis-aligned BBOX
(`truncateWallsToActiveRoomRect`), so walls extending into a concave
polyRoom's notch exported whole. Walls (`wallStd` / `wallGlass` /
`wallWindow`) are now additionally cut along the polyline itself, mirror
of the boxRoomPart behaviour.

- **New helper `truncateWallItemsToPolygon(items, polygonPoints, margin)`**
  (next to `truncateWallItemsToRect` in `js/roomcalc.js`). Clips each
  wall's centerline against the polygon expanded by the margin (reuses
  `expandPolygonByMargin` — same expansion `listItemsOffStage()` uses for
  the intersection filter, so the two stay consistent: a wall the filter
  keeps is truncated, never orphaned). Crossing parameters come from
  `segmentPolygonCrossingTs()`; each sub-interval keeps or drops by an
  `isPointInPolygon` midpoint test, so **concave polygons work** — a wall
  spanning a U-shaped room's notch SPLITS into multiple wall pieces
  (extras appended with fresh `crypto.randomUUID()` ids). A wall whose
  centerline runs along a polygon edge (within margin) is left whole,
  same as the rect version's margin semantics. Unit-agnostic like the
  rect version.
- **Shared centerline math extracted**: `wallCenterlineGeom(item)` /
  `setWallFromCenterlineStart(item, geom, startPt, newLength)` are now
  used by both the rect and the polygon truncators (rect behaviour
  unchanged — regression-checked).
- **WD export wiring** (`exportRoomObjToWorkspace()`, inside the
  `isActiveRoomPart` block, AFTER `truncateWallsToActiveRoomRect`):
  gated on `activeRoomPartItem.data_deviceid === 'polyRoom'`.
  `activeRoomAbsPoints` (unit-space floor coords, captured at
  `zoomRoomPart()`) is converted to the items' room-local METERS frame
  via `p * rpRatio - (roomObj2.activeRoomX + frameShiftX)` — note the
  local `activeRoomX` variable is shadowed and already zeroed at that
  point, hence the reconstruction from `roomObj2.activeRoomX +
  frameShift`. Margin 0.10 m (same as the rect call).
- **Share-link wiring** (`buildRoomModeLinkSource()`, after its
  `truncateWallItemsToRect` call): polygon shifted by the global
  `activeRoomX/Y` (unit space), margin `roomPartBoundsMarginUnits()`.
  Split pieces ride into the URL as additional wall items.
- **Latent bug fixed in passing**: `buildRoomPartWallItems()` (rotated
  room-mode link path) called the nonexistent `createUuid()` —
  `crypto.randomUUID()` is the codebase-wide convention (there is no
  `js/util/uuid.js` in this repo despite older doc references). Any
  rotated-boxRoomPart share link with default walls would have thrown a
  ReferenceError.
- **Verified**: Node geometry harness (L-shape truncation both axes,
  U-shape split, 45°-rotated deep-diagonal split at notch edges ±margin,
  margin-graze untouched, rect regression) + live browser end-to-end in
  meters AND feet (feet U-shape wall exported as two 1.01 m pieces =
  0.914 m notch edge + 0.10 m margin; off-stage notch wall dropped
  entirely; link path split matches).

## Round 15 (2026-07) — switching to a polyRoom while already zoomed in mislocated everything

Zoomed into Room Part A, then double-clicking a polyRoom Room Part B put
the whole room + its contents at the wrong position. Root cause:
`getBoundingBoxInUnit()`'s Line branch → `getAbsolutePointsOfLine(node)`
converted the node's absolute pixel points to units with
`(point.x - pxOffset) / scale` but **omitted the `+ activeRoomX/Y`** that
every other pixel→floor-unit conversion in the codebase applies. While
zoomed into A, those points came back relative to A's frame, so
`zoomRoomPart()` seeded `activeRoomX/Y` and `activeRoomAbsPoints` from
A-relative coords instead of B's floor coords. The boxRoomPart branch of
`getBoundingBoxInUnit()` reads `item.x/item.y` (already floor coords), so
only polyRoom targets were affected.

Fix: the `pixelUnit === false` branch of `getAbsolutePointsOfLine()` now
adds `activeRoomX` / `activeRoomY` (both 0 when zoomed out, so
single-room and zoomed-out behaviour is byte-identical). The `pixelUnit
=== true` caller (`24202`, drag-snap outline) is untouched.

Verified live: computing polyRoom B's bbox while zoomed into A returns
floor coords (12,3) not A-relative; and switching into B via **any**
path — direct out→B, poly A→B, box A→B — produces byte-identical
`activeRoomX/Y/W/L`, `activeRoomAbsPoints`, and on-screen device pixel
positions.

## Round 16 (2026-07) — pathShape dropped from WD export in an offset Room Part

Same root-cause family as Round 15, different function. A pathShape (or
polyRoom) inside a Room Part whose `activeRoomX/Y` is non-zero was
filtered out of the Workspace Designer export (and the room-scoped share
link) when zoomed into that part. Zooming into the Room Part at the
floor origin ("Room 1", `activeRoomX/Y ≈ 0`) worked; any other part
dropped the shape.

Root cause: `findFourCorners()`'s pathShape/polyRoom branch takes the
live node's `getClientRect()` (on-screen pixels) and converts to units
with `(b.x - pxOffset) / scale`, **omitting `+ activeRoomX/Y`**. So the
computed corners came back shifted toward the origin by the active
room's offset. `listItemsOffStage()` builds the room border in FLOOR
coords, so the shifted corners failed the intersection test and the
shape was pushed onto `itemsOffStageId` → excluded from
`customObjects[]`. (Other `findFourCorners()` callers — the boxRoomPart
rotation normalizer and the inventory CSV/room-part polygon builders —
also compare against floor coords, so the fix makes all of them
consistent; the non-path branches already read `item.x/item.y` = floor
coords.)

Fix: the pathShape/polyRoom branch of `findFourCorners()` now adds
`activeRoomX` / `activeRoomY` (and uses `pyOffset` for y). Both are 0
when zoomed out, so single-room and zoomed-out behaviour is unchanged.

Verified live (A/B against the pre-fix branch): zoomed into an offset
Room Part (activeRoom 13,2), a pathShape at floor (15,5) previously
computed corners at ~(1.5,2.5) → off-stage → absent from export; with
the fix corners are ~(14.5,4.5) → on-stage → present. Full matrix
(pathShape in each of two rooms, zoom into each, meters AND feet): each
room exports exactly its own pathShape and not the other's.

## Round 17 (2026-07) — toolbar-zoom (zoomValue > 100) before double-clicking a Room Part

If the user zoomed the canvas in with the toolbar zoom button
(`zoomInOut()` → `zoomValue > 100`, `stage.scaleX/Y > 1`) and *then*
double-clicked a Room Part, the part sometimes opened at the wrong
location or looked empty. At `zoomValue === 100` it was always fine.

Root cause: `getClientRect()` / `getAbsoluteTransform()` bake in the
stage's zoom scale (`stage.scaleX/Y`), but the pixel→unit conversion in
`getAbsolutePointsOfLine()` (polyRoom bbox) and `findFourCorners()`
(pathShape/polyRoom off-stage test) divide by the **un-zoomed** global
`scale` and subtract the un-zoomed `pxOffset`. So when the stage scale
was ≠ 1 at read time, the polyRoom bbox came back inflated and offset
(e.g. at 1.3× a floor-(13,2) 8×8 room read as x≈17.3, w≈10.4) →
`zoomRoomPart()` seeded a bad `activeRoomX/Y/W/L` (**wrong location**)
and the inflated/misplaced bounds pushed the room's items onto
`itemsOffStageId` (**room looks empty**). boxRoomPart is immune (its
bbox branch reads `item.x/item.y`, which are scale-free floor coords),
matching the report that it's the polyRoom / contents that misbehave.

`zoomRoomPart()` does call `zoomInOut('reset')` first (sets
`stage.scaleX(1)`), which is why it's intermittent — normally the reset
lands before the bbox read, but a stale Konva absolute-transform cache
can leave `getClientRect()` reporting the pre-reset scale for one frame.

Fix: make both readers scale-invariant by dividing the client-rect /
absolute-transform pixels by the live `stage.scaleX()/scaleY()` (guarded
`|| 1`) before the `pxOffset`/`scale` conversion. At 1× this is a no-op,
so single-room and zoomed-out behaviour is unchanged; at any other zoom
the bbox is now correct regardless of whether the reset has propagated.
The `pixelUnit === true` branch of `getAbsolutePointsOfLine()` (drag-snap
outline, wants on-screen pixels) is left untouched.

Verified live: `getBoundingBoxInUnit()` on a floor-(13,2) 8×8 polyRoom
returns x=13 y=2 w=8 h=8 at stage scales 1×, 1.3×, 2.5×, 4× (old
un-guarded math returned x≈17.3 w≈10.4 at 1.3×); its device + pathShape
stay on-stage.

## Round 18 (2026-07) — the real cause of Round 17: stage PAN position (scroll), not just zoom scale

Round 17's scale-only guard was **incomplete**. The actual trigger is
the stage **pan position**, not the zoom scale. `repositionStage()`
([js/roomcalc.js](js/roomcalc.js), bound to the scroll-container's
`'scroll'` event) sets `stage.x(-scrollLeft)` / `stage.y(-scrollTop)`
every time the canvas scrolls. When the user toolbar-zooms (zoomValue >
100) and **scrolls** to bring a Room Part into view before
double-clicking it, `stage.x/y` hold a large negative pan.

`zoomRoomPart()` → `zoomInOut('reset')` sets `scrollLeft/Top = 0`, but
`repositionStage()` (which would zero `stage.x/y`) runs on the **async**
`'scroll'` event — it hasn't fired by the time `getBoundingBoxInUnit()`
runs synchronously in the same call stack. So `stage.x/y` still holds
the pre-reset pan (e.g. `stage.y() === -825`), and
`getClientRect()` / `getAbsoluteTransform()` (which bake in stage
position) come back offset by the scroll amount. Result: `activeRoomY`
resolved to ≈ -58.8 instead of 70, the room's items failed the
floor-coord intersection test in `listItemsOffStage()`, and the room
opened **empty**. This is why image-3 showed 100 % zoom (scale already
reset) yet still broken — the leftover was the pan, not the scale.

Fix (completes Round 17): invert BOTH stage transforms in the
`pixelUnit === false` branch of `getAbsolutePointsOfLine()` and in the
pathShape/polyRoom branch of `findFourCorners()` — **subtract
`stage.x()` / `stage.y()`** and then divide by `stage.scaleX()/scaleY()`:

```
unit = ((clientPixel - stagePos) / stageScale - pxOffset) / scale + activeRoom
```

Widths/heights only divide by scale (deltas — the pan cancels). At the
floor view (`stage.x/y === 0`, scale 1) every term is a no-op, so
zoomed-out and single-room behaviour is byte-identical. The
`pixelUnit === true` branch (drag-snap outline) is still untouched.

Verified live with the reporter's exact flow — L-shape polyRoom in the
bottom-left of a 110×88 ft floor, zoom to 225 %, scroll to the room,
double-click: A/B in one session showed the scale-only build resolving
`activeRoomY ≈ -58.8` with the chair off-stage (empty room) and the
full build resolving `activeRoomY = 70` with the chair on-stage across
scroll fractions 0 / 0.5 / 1.0.

---

## Which items a Room Part captures (`roomPartItemMarginUnits`)

Entering a Room Part hides only what is off the Room Canvas entirely.
**What the canvas DRAWS and what the WD export SENDS are two separate
questions**, and the canvas is deliberately the more generous of the
two: everything on screen stays on screen, and only this room's own
items are exported from here.

`listItemsOffStage()` answers both in one pass — one polygon
intersection per item (`doPolygonsIntersect2`) against the part outline
offset by a margin — and fills two arrays:

| Array | Means | Read by |
|-------|-------|---------|
| `itemsOffStageId` | not this room's item | the shareable link, the WD export (`convertToMeters` drops them), the Inventory CSV, the coverage menus |
| `roomPartCanvasOnlyIds` | a subset of the above that the canvas still draws, greyed and fully editable | `applyRoomPartOutsideItemVisibility()` and `refreshRoomPartGhostState()` only |

Two margins decide OWNERSHIP:

| Class | Tolerance | Default | Why |
|-------|-----------|---------|-----|
| Ordinary items (chairs, tables, video devices, …) | `wdItemCapture` | **-0.03 m**, i.e. 0.03 INSIDE the outline | Walls are 0.10 thick, so this sits just past the inner wall face. An item in the NEXT room that is pushed up against the shared wall must not be pulled into this one. |
| Edge devices: every wall (`wallStd`, `wallGlass`, `wallWindow`, `wallCustomWindow`, `wallStdHeader`, `wallGlassHeader`), `columnRect`, any `door*`, and `navigatorWall` | `wdEdgeCapture` | **+0.13 m** OUTSIDE | These are drawn ON the outline rather than inside it. 0.13 is the full wall thickness plus the same 0.03, so a wall drawn flush against the OUTER face of the outline still counts as this room's wall. A door's swing can put its whole footprint on the far side of the wall it hangs in, and a Wall Navigator mounts in the hallway. |

VISIBILITY is not a tolerance. `roomPartCanvasBorder()` returns the
**Room Canvas rectangle**: the active part's bbox plus `pxOffset` /
`pyOffset` converted to units, the same margin the floor view leaves
around the whole room and the same area `drawRoom()` sizes the stage
to. Any off-stage item touching it is canvas-only, whatever device it
is.

`isRoomPartEdgeDevice(deviceId)` is the export membership test
(`ROOM_PART_EDGE_DEVICES` plus a `door` prefix match). It is not
`family === 'wallBox'`: that family also holds `box`, `boxdrop`,
`carpet`, `stageFloor` and the room parts themselves, none of which may
reach outward on the export rule.

| Concern | Where |
|---------|-------|
| Three polygons | `listItemsOffStage()` builds `border` (inner), `edgeBorder` (outer) and `canvasBorder` (the Room Canvas rectangle) once, then picks per item. `getInventoryRoomParts()` mirrors the first two with `polygon` / `edgePolygon`. Wall Navigators used to be the only outer case, so the old names were `navBorder` / `navPolygon`. |
| Why the canvas rectangle replaced a device list | An item dragged out of the room but still plainly on screen VANISHED, which reads as a delete and was the most confusing thing the zoomed view did. The rule is now simply "if it can be drawn, draw it", so the only items that disappear are ones that were already off screen. |
| Every device class, not just structure | An earlier cut drew neighbouring walls, doors, columns, boxes, stage floors and carpets only (`isRoomPartStructureDevice`, since removed), deliberately excluding anything carrying camera, mic, speaker or display coverage so a neighbour's wedges could not bleed in. The vanishing act above outweighed that, and the reason behind it is answered directly instead: a greyed item's coverage is hidden outright (two rows down). |
| A canvas-only item IS interactive | It can be selected, moved, resized and deleted from inside the room, exactly like an item the room owns, and the edit lands on the one shared object. Only a locked VRC layer takes that away: `node.listening(!isItemInLockedLayer(node))`. |
| Why it is editable, having started out passive | A wall, column, box or door on a boundary is ONE object serving two rooms, and the room the user is standing in is the only place they can see what a nudge to it does. Passive meant leaving the room, finding that wall among everything on the floor plan, adjusting it blind, and coming back to check. Owning it and editing it are separate questions, and only the first one decides the export. |
| A canvas-only item is greyed | `applyRoomGhostOpacity()` at `ROOM_PART_GHOST_OPACITY` (0.35), on the item and its `label~`. The grey means "this room will not export it", not "you may not touch it", and it is the only thing on screen that says so, which is why there is no toggle for it. |
| **Its coverage comes OFF, not down** | `audio~` / `speaker~` / `fov~` / `dispDist~` (`ROOM_PART_COVERAGE_PREFIXES`) are HIDDEN for a greyed item, not dimmed with it. A wedge cast by the room next door is the one thing the zoomed view exists to keep out, and a faint one still reads as this room's. `setRoomPartCoverageVisible(node, on)` owns both halves and rides inside `applyRoomGhostOpacity()`, so the redraw pass and the live drag pass get it for free and un-greying restores it. **Restoring goes through `applyLayerStateToCoverageNodes()`** rather than a bare `show()`, so the per-item `data_*Hidden` flags and the VRC layer still decide. Confirmed live: owned Room Bar fov visible at opacity 1, greyed one hidden with the icon at 0.35 and its label at 0.3; dragged in, fov back and opacity 1; dragged out, fov gone; and with `data_fovHidden` set it stays off through the whole round trip. |
| Two levels of coverage visibility | This sets the coverage NODE's own `visible`. The overlay buttons hide the whole `cameraCoverage` / `microphoneCoverage` / `speakerCoverage` / `displayDistanceCoverage` `Konva.Group`, and `isVisible()` reports false when any ancestor is hidden. The two compose, so nothing here can override a global toggle, and on the multi-room floor plan (where the groups are hidden wholesale) none of this shows through. |
| The grey follows the item across the boundary | `refreshRoomPartGhostState()` runs from the debounced tail of `canvasToJson()`. It greys **everything still visible that is off-stage**, not only the canvas-only subset, so an item pushed past the canvas edge is grey for as long as it is on screen rather than snapping back to full. Measured live on a chair: owned at 0.7, dragged just outside 0.24, dragged well outside 0.24, dragged back in 0.7. It touches ONLY the grey, because hiding an item the moment it left would read as a delete. |
| Why the ghost list is kept | `roomPartGhostedIds` is what the last pass actually greyed, and `clearStaleRoomPartGhosts(keep)` un-greys whatever the next pass will not, including an item on its way to being hidden. Without it the grey is one-way and the item reappears at 0.35 later. |
| **Two dimming reasons have to compose** | `applyNodeDimming(node, flag, on)` recomputes opacity as a product of ONE captured `data_baseOpacity`. The locked-layer dim and the ghost dim each used to capture and restore their own "original", so whichever ran second baked the first one's dimmed value in as the original and the node never came back to full. Verified: lock 0.7, lock+ghost 0.245, unlock 0.35, unghost exactly 1.0 with the base field deleted. |
| A hidden VRC layer still wins | The pass only calls `show()` when `isItemInHiddenLayer(node)` is false, or a layer toggle would be overridden by the ghosting. |
| Why the outward reach is safe for export | A wall long enough to run past the room is cut back by `truncateWallItemsToRect()` / `truncateWallItemsToPolygon()` at `roomPartBoundsMarginUnits()` / `roomPartBoundsMarginM()`, so a captured neighbour wall arrives in the WD JSON trimmed to this room's own extent rather than overshooting it. |
| An irregular part uses its own capture on BOTH cuts | `roomPartWallCaptureKey()` returns `wdPolyWallCapture` for a `polyRoom`, and the bbox pre-cut reads the same key as the polyline cut, so one setting decides what an irregular room keeps. Otherwise the poly value could never widen past the rect value. |
| The `0.00` capture reads as "no truncation" | `truncateWallItemsTo*` leaves a wall untouched when its CENTERLINE never falls inside the expanded outline. A wall hugging the outside has its centreline ~0.066 m out, so at 0.00 nothing is cut and the full run is exported. Measured: 0.02 and 0.05 keep 6.72 m, 0.08 trims to 6.66, 0.10 to 6.70, 0.11 to 6.716 — i.e. `room + 2 × margin`, capped at the wall's own length. |
| Shared walls belong to both rooms | Two adjacent parts both capture the wall between them, which is what each room needs to look right on its own. |
| The bug this fixed | Walls hand-drawn snug against the OUTSIDE of a part sit 0.007 to 0.017 m clear of the outline, so at -0.03 every one of them failed the test: entering the room showed no walls at all and the WD export carried none. Measured on the reporter's file, all five perimeter walls were dropped; all five are now kept, and the export trims 6.72 m runs to 6.70 m. |

### Room Parts swap ends of the stack with the zoom

`applyRoomPartStacking()` puts `groupRooms` at one end of
`layerTransform` or the other, and the two ends are deliberately
different behaviour rather than one rule:

| Where | groupRooms | Why |
|-------|------------|-----|
| Floor plan | ABOVE every item group, just under `groupRoomPartWallsPreview` | A part has to read as a room drawn over its own contents. This is the original order, the one `stageAddLayers()` adds in. Its fill is `#ADD8E655`, so the furniture still shows through |
| Zoomed into a part | `zIndex(0)`, the first child and the first thing painted | An adjacent part is a backdrop rather than a pale rectangle lying over this room's furniture |

| Concern | Where |
|---------|-------|
| **It has to put them back, not just lower them** | Konva's `add()` returns early for a child already in the container, so `stageAddLayers()` re-adding every group does NOT rebuild the order: `layerTransform`'s order is established at first load and nothing else touches it. A one-way `zIndex(0)` left the floor plan wearing the zoomed-in stacking for the rest of the session, every room part under the furniture, from the first time a room was entered. Confirmed live before the fix and after: floor 15, in room 0, back out 15, into another room 0, back out 15, with the tail reading `rooms / roomPartWallsPreview / overlayLabels / theTransformer` every time. |
| How the floor branch restores it | `moveToTop()` on `groupRooms`, `groupRoomPartWallsPreview`, `overlayLabels` and `tr`, in that order, which is exactly the tail `stageAddLayers()` builds. Cheaper and harder to get wrong than computing an insert index, since `zIndex(n)` removes before it inserts and the target shifts under you. |
| Where it runs | The tail of `stageAddLayers()`, which `drawRoom()` calls on every rebuild. Doing it there rather than in the later visibility pass (which fires after an image-load `setTimeout`) avoids a frame of the wrong order. |
| Only the floor plan image is lower | That lives in `layerBackgroundImageFloor` inside `layerGrid`, a different Konva layer entirely, so it is unaffected. |
| The Transformer stays on top | `tr.zIndex(children.length - 1)` runs just before; moving another child to 0 shifts the ones below it up by one and leaves the last index alone. |
| Walls need nothing of their own | Every item now draws above the room parts, so structure keeps its ordinary place among the item groups. The previous cut re-parented walls, columns and doors into a `groupRoomModeWalls` added last, because **Konva z-order is per parent** and `moveToTop()` inside `groupTables` could never clear `groupChairs` and the device groups above it. That group, its `allNodeShapeGroups` and `selectAllNodes()` registrations, and the `wallsOnTop` toggle are all gone. |
| The footgun it left | Four selection paths decided resizability by comparing `getParent()` against `groupTables` / `groupStageFloors` / `groupBoxes` / `groupRooms`, so every wall silently lost its resize handles while the re-parenting was in place. `isResizableParentGroup(node)` is the one test all four use now. Two other places asked the same question about anchoring rather than resizing (`copyToCanvasClipBoard()`'s upper-left vs centre branch, and the table height default in the overlap check); both read `allDeviceTypes[id].parentGroup`, which is what the node's parent was standing in for all along. |

### The tolerance panel (Room → Settings → Room Part wall tolerance)

Every number above was a hardcoded constant. The panel is a
`.menuReach` popover built by `createRoomPartToleranceMenu()`, using
the same floating-div placement and outside-click handle as
`deviceMenu-hasCamera`, with a testing notice at the top, four numeric
fields, and Update / Reset / Close.

It held five fields and two checkboxes when the canvas drew a
tolerance-picked subset of the neighbours: `canvasStructure` (how far
out to reach for structure), `wallsOnTop` and `dimCanvasOnly`. The Room
Canvas rectangle took the first job over, the room parts dropping to
the bottom removed the need for the second, and the grey is now the
only thing distinguishing an item this room will not export, so it is
not optional. Everything left is about the Workspace Designer export. A
stored blob still carrying the old keys is harmless: `loadRoomPartTolerance()`
only reads the keys `ROOM_PART_TOLERANCE_DEFAULTS` names.

| Concern | Where |
|---------|-------|
| Stored in meters, shown in the room's unit | `ROOM_PART_TOLERANCE_DEFAULTS` is meters; `roomPartToleranceUnits()` converts on read and the boxes are 3 decimals. A feet/meters switch therefore never changes what a saved value MEANS. `updateFeetMetersToggleBtn()` calls `refreshRoomPartToleranceMenu()`, which restates both the numbers and the unit suffixes, so an open popover cannot go stale. |
| Persistence | `localStorage.roomPartTolerance`, one JSON blob, loaded once at script evaluation. Never in the room file, the shareable link or the WD export, so a tolerance is this browser's testing state and can never travel to someone else's room. |
| One commit path | `commitRoomPartToleranceMenu()` reads EVERY box back rather than only the one that changed, so a blur, the Update button and an outside-click dismissal are the same code. An unreadable or out-of-range value (`ROOM_PART_TOLERANCE_LIMIT`, 50 m) keeps its stored value and is rewritten on screen rather than refused. |
| Redraw | `applyRoomPartToleranceChange()` re-runs `listItemsOffStage()`, then `drawRoom(true, true, true, true)` with `dontSaveUndo` set, then `createShareableLink()`. A tolerance changes what is drawn and exported, never the room, so it must not spend an undo step. |
| **An outside click deliberately does NOT close it** | It did at first, copying `createDeviceMenu()`. That is wrong for this panel: tuning a tolerance means clicking into a Room Part on the canvas and watching what changes, and the very first of those clicks dismissed the panel, so every comparison meant reopening it. There is no document-level listener at all now. Three ways out: the **Close** button, the `✕`, and the Settings button (which toggles). All three run `commitRoomPartToleranceMenu(false)` first, and a value typed then abandoned still lands anyway, because the input's own blur commits. |
| Per-setting help | `roomPartToleranceHelpIcon(help)` builds the `i` plus its `.tooltiptext` bubble and returns it for the row to append. **It cannot rely on `tooltip2Hover()`**: that runs once at module load over `document.querySelectorAll('.tooltip, …')`, so a panel built later is invisible to it. Each icon therefore gets its own pointerenter (1 second delay, matching the sidebar) and pointerleave; the leave calls the shared `closeTooltipTitleText2()`, which already queries every `.tooltiptext` on the page, so nothing extra was needed for hiding. The bubble is 250px against the shared 200px and offset left of centre (`margin-left: -190px`, arrow repositioned) so a row this close to the panel's left edge does not push it off the window — verified on all seven. |
| The head | `✕` on the left, the centred title **Room Part wall tolerance**, gripper on the right, over a hairline rule. The `✕` and the gripper are `flex: 0 0 auto` with the title `flex: 1 1 auto`, so the title stays centred no matter what the other two measure. |
| The footer | Update / Reset / Close, each `flex: 1 1 0` so they share the width evenly, with a 14px left margin on Close to group it apart from the two that act on values. 400px of panel leaves each button comfortably wide. |
| Draggable by the whole head, not just the grip | `dragElement(menu)` binds to whatever carries the id `<menuId>-dragger`, so that id is on the **head** rather than on the gripper icon: the title, the icon and the empty space either side all drag. The `icon-dragger-vertical-bold` stays as the visual cue only and the head wears `cursor: all-scroll`. The `✕` sits inside the head, so it stops propagation on `mousedown` and `touchstart` or pressing it and moving would drag the panel instead of closing it; it also restates `cursor: pointer`, since it is a button rather than a grip. Verified: title, grip and bare head all drag, the `✕` and the panel body do not, and the `✕` still closes. |
| Its shadow is the default, not a drag artefact | `dragElement()` paints `10px 10px 20px rgba(0,0,0,0.8)` inline once a drag starts; `.menuTolerance` carries the same value in CSS from the outset, so this panel reads as moveable before it is moved and the inline write on drag changes nothing visually. |
| **Placed by measurement, not by anchor** | The Settings tab scrolls, and its button is the LAST row, so `top: rect.bottom` put the panel almost entirely below the fold with the fields unreachable (reported). `positionRoomPartToleranceMenu()` runs after the append (offsetHeight needs it in the DOM), flips the panel ABOVE the button when it will not fit below, then clamps top and left into the viewport with an 8 px gutter either way. Clamping alone was not enough: a tall panel anchored low still needs the flip to land somewhere sensible. |
| Two ways to close | The `✕` in the head (upper left, opposite the drag handle) and a click anywhere outside. Both run `commitRoomPartToleranceMenu(false)` first, so neither loses a value typed but not blurred. |
