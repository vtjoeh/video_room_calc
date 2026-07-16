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

### 8. WD export (`exportRoomObjToWorkspace`)  — PARTIAL (Room mode DONE; MultiRoom overview still pending)

#### Room-mode implementation (done)
- **Item scoping** — `convertToMeters()` (`js/util/units.js`) now drops every item in `itemsOffStageId` in Room mode too (previously they rode along and were flagged `ignore:true`), and drops `boxRoomPart`/`polyRoom` items entirely when `isActiveRoomPart`. `listItemsOffStage()` already classifies intersection against the active roomPart (bbox for boxRoomPart, `activeRoomAbsPoints` polygon for polyRoom), so "only if an item intersects the Room Part is it sent" falls out of the existing classifier. Items straddling the boundary intersect → they export whole (walls excepted, see truncation).
- **Frame normalization** — new block at the top of `exportRoomObjToWorkspace()` (right after the `activeRoom*` locals): when `isActiveRoomPart`, every item (and the backgroundImage record) is shifted by `frameShift = (floor − room)/2` so the roomPart occupies `[0, activeRoomWidth] × [0, activeRoomLength]`, then `roomObj2.room.roomWidth/Length` are overwritten with the roomPart size and the local `activeRoomX/Y` zeroed. Everything downstream (wallPush centering on `room.roomWidth/2`, floor/ceiling emission, `roomShape.width/length`) then works unchanged — the WD room IS the roomPart.
- **Wall truncation** — `truncateWallsToActiveRoomRect(roomObj2)` + `clipSegmentToRect()` (Liang-Barsky), defined just above `exportRoomObjToWorkspace()`. For `wallStd`/`wallGlass`/`wallWindow`: the wall's x/y/width/height/rotation is converted to a centerline — the midpoints of the two SHORT sides (run axis = the longer of width/height, so it survives user-resized walls) — via `findNewTransformationCoordinate()` (negative deltas ADD the rotated local vector to the UL anchor). The centerline is clipped to the room rect expanded by 0.10 m; the UL anchor is rebuilt from the clipped start point (positive deltas subtract) and the run-axis dimension set to the clipped length. Main `rotation` only; tilt/lean ignored. A centerline that never enters the rect leaves the item untouched (the intersection filter already decided it belongs). Verified for rot 0/90/45, both run axes, missing rotation, fully-inside, fully-outside.
- **Per-room default walls** — `roomShape.roomSurfaces` now sources from `structuredClone(activeDefaultWallsSurfaces())` (per-room `data_roomSurfaces` on a boxRoomPart in Room sub-mode; global otherwise). The clone also fixes a latent bug where `door: 'none'` cleanup mutated the LIVE `roomObj.roomSurfaces`. `removeDefaultWalls` is read via `exportRemoveDefaultWalls` = `activeDefaultWallsWorkspace().removeDefaultWalls` (replacing the DOM-checkbox read), with a polyRoom override: a zoomed polyRoom ALWAYS exports without default walls (its walls are hand-drawn; the WD room is just the bbox). The ceiling block gates on the same effective value.
- **Known limits** — `data.vrc.groups`/`customItems` geometry still exports in floor coordinates (Room-mode WD JSON is a preview/push surface, not a round-trip surface); room height/software remain global (no per-room attrs yet); non-wall items straddling the boundary are not clipped (only walls truncate).

#### Room-mode round 2 (done)
- **0.10 m drop margin** — `listItemsOffStage()` Room-mode branches expand the intersection bounds by `roomPartBoundsMarginUnits()` (0.10 m, unit-adjusted) on every side, matching the wall-truncation margin. The rect branch inflates min/max; the polygon branch (`activeRoomAbsPoints` — used for BOTH boxRoomPart corners and polyRoom outlines) goes through `expandPolygonByMargin()`, a miter offset with shoelace winding detection and a clamped miter denominator for spike vertices. Items hugging the outside of the part (e.g. its own perimeter walls, centerline ~0.06 m outside) now stay in the export instead of being edge-dropped.
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
- polyRoom / odd-rotated rooms force remove-default-walls; an odd-rotated walled room additionally materializes its 4 walls as REAL wall items via `buildRoomPartWallItems()` (unit-space sibling of the WD `pushRoomPartDefaultWalls()`, fresh `createUuid()` ids)
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
