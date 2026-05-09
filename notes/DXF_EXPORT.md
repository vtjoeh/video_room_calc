# CAD DXF Export

Exports the room as an AutoCAD‑compatible **DXF** file via the
**Save** dialog → **Export CAD DXF (meters)** menu item, or the
keyboard shortcut **`Ctrl+Shift+D`** (`Cmd+Shift+D` on macOS). The
file is named `<RoomName>_YYYY-MM-DDTHHMMSS.SSS.dxf` and downloaded
straight to the browser.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
DXF export code or adding/changing a device block.

Companion files:
- `../CLAUDE.md` — user-facing dev reference (has a short stub linking
  here for the deep dive).
- Source files: `js/dxfWriter.js`, `js/dxfBlockLibrary.js`,
  `exportDxfFile()` in `js/roomcalc.js`.

---

## Format: AutoCAD R12 (AC1009)

Targeting R12 (the oldest text DXF version) gives the broadest
compatibility — every CAD tool tested reads it cleanly: AutoCAD
desktop, **AutoCAD Web App** (which is unusually strict about subclass
markers in newer versions), BricsCAD, DraftSight, LibreCAD, QCAD,
FreeCAD, online viewers. Files round‑trip cleanly to R2000/R2018 in
tools that prefer those versions.

R12 limits the entity vocabulary; the writer adapts as follows:

- `LWPOLYLINE` → emitted as `POLYLINE` + `VERTEX` × N + `SEQEND` (still
  supports per‑vertex bulge for arc segments).
- `ELLIPSE` → tessellated to a 64‑point closed `POLYLINE` approximation.
- `CIRCLE`, `ARC`, `LINE`, `TEXT`, `INSERT`, `BLOCK` are emitted
  natively.

## Files

| File | Purpose |
|------|---------|
| `js/dxfWriter.js` | Zero‑dependency text‑DXF writer. Owns handle allocation, HEADER vars, full TABLES section (VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE), reserved `$Model_Space` / `$Paper_Space` blocks, user blocks and entities. Public API: `addLayer()`, `addLineType()`, `addBlock()`, plus `line()`, `lwpolyline()` / `polyline()`, `circle()`, `arc()`, `ellipse()`, `text()`, `insert()`, `toString()`. Also exposes static helpers `DxfWriter.tessellateSvgPath(d, samples)` and `DxfWriter.roundedRectPoints(w, h, r)`. |
| `js/dxfBlockLibrary.js` | AIA / NCS layer scheme, item‑category → layer mapping, and starter library of vector blocks. Each block is centered at the origin with the device's "front" facing **+Y**, so `dxf.insert(name, x, y, { rotation })` rotates around the centroid. |
| `exportDxfFile()` in `js/roomcalc.js` | Orchestrator. Calls `canvasToJson()` first, then walks `roomObj`, emits the perimeter wall, registers VRC layer mirrors, and emits each item via `emitItem()` / `emitFootprintItem()` / `emitDisplay()` / `emitPathShape()`. |

## Coordinate system

- **Units**: meters (always). VRC items in feet are converted via
  `convertToMeters()` before serialization.
- **Origin**: room's lower‑left corner at `(0, 0)`.
- **Axes**: VRC uses Y‑down (Konva); CAD uses Y‑up. The exporter
  applies `flipY = roomLengthM - vrcY`.
- **Rotation**: VRC uses Konva CW degrees; CAD uses CCW degrees. The
  exporter applies `flipRot = -konvaDeg`.

For block instances, the exporter computes the item's centroid in CAD
coordinates and inserts the block there with `rotation = -konvaDeg`.
For inline footprints (tables, walls, displays, stage floors, paths)
the exporter rotates corner points around the item's pivot, then maps
the result through `flipY`.

## Layer scheme (AIA / NCS)

Layer names follow the US National CAD Standard `D-MAJR-MINR` pattern
so the file drops cleanly into a real architectural set:

| Layer | ACI color | Used for |
|-------|-----------|----------|
| `A-WALL-EXTR` | 250 (near‑black) | Room perimeter |
| `A-WALL-FULL` | 250 (near‑black) | Standard interior walls (`wallStd`) |
| `A-WALL-GLAZ` | 141 | Glass walls (`wallGlass`) |
| `A-WALL-PATT` | 8 | Window walls and acoustic panels (`wallWindow`, `wallChairs`) |
| `A-DOOR` | 4 | Doors (single/double, left/right swings) |
| `A-FLOR-RISR` | 30 (DASHED) | Stage floors / risers |
| `A-FLOR-CARP` | 8 (DASHED) | Carpets |
| `A-FLOR-IDEN` | 250 (near‑black) | Floor‑item labels |
| `A-COLS` | 8 | Columns (rectangular and cylindrical) |
| `A-FURN-CHRS` | 5 | Chairs, wheelchairs |
| `A-FURN-TBLS` | 250 (near‑black) | Tables |
| `A-FURN-PEOP` | 8 | People silhouettes, plants, trees, poufs |
| `A-FURN-IDEN` | 250 (near‑black) | Furniture labels |
| `A-EQPM` | 9 (DASHED) | Generic equipment, boxes, spheres |
| `E-AV-CODE` | 1 | Codecs / Room Bars / Boards / Desks |
| `E-AV-CMRA` | 6 | Cameras (Quad, PTZ, P60, etc.) |
| `E-AV-MICR` | 3 | Table & ceiling microphones |
| `E-AV-DSPL` | 250 (near‑black) | Displays (single, dual, triple, 21:9) |
| `E-AV-SPKR` | 211 | Speakers |
| `E-AV-CTRL` | 4 | Navigators (table & wall) |
| `E-AV-PERF` | 8 | AV peripherals (projectors, headsets, phones) |
| `E-AV-IDEN` | 250 (near‑black) | AV labels |
| `A-ROOM-PATH` | 9 | `pathShape` (arbitrary user paths) |

**Why ACI 250 instead of 7 for "black"?** ACI 7 is officially
"white/black depending on background", but several DXF viewers —
notably AutoDesk Viewer — render it as a faint cream/yellow on a light
background instead of inverting. ACI 250 is the darkest gray in the
index (RGB ≈ 51,51,51) and renders solidly dark in every viewer we've
tested. So architectural lines that should read as black (walls,
tables, displays, identification labels) use 250, while distinct
accent colors (red codecs, magenta cameras, green mics, blue chairs,
cyan glass walls / doors) keep equipment categories visually
separated.

In addition, every VRC layer (the user‑facing ones from the Layers
tab) is mirrored into a `Z-VRC-LAYER-<sanitized name>` CAD layer
(color 9). When a VRC layer is hidden or locked, the mirror CAD layer
is set off / locked too, **and** every item from that VRC layer is
routed onto the mirror layer instead of its normal AIA layer. This
preserves the user's organisation when the file is opened in CAD.

## Labels (`TEXT` entities)

Labels are placed below the item's centroid on the matching `*-IDEN`
layer:

- AV devices (codec, camera, navigator, touch panel) → always show the
  **model name** (matching VRC's default behavior).
- All other items (chairs, tables, displays, walls, etc.) → show the
  user's `data_labelField` if set, otherwise no label.

Text height is 0.10 m (≈4 inches), single‑line `TEXT` (chosen over
`MTEXT` for cross‑tool compatibility).

## Block library

The block library lazily registers blocks the first time an item of a
given `data_deviceid` is exported, so the file only contains the
blocks it needs. Block names use the pattern `VRC_<DEVICEID>`
(uppercased, underscored). Each block is built from primitives
(`lwpolyline`, `circle`, `line`, `arc`) on the appropriate layer:

| Item kind | Block contents |
|-----------|----------------|
| Codec / room bar | Rounded rectangle + small line on +Y face marking the lens/display side |
| Camera (compact: P60, Room Vision PTZ, PTZ 4K + Bracket, …) | Body rectangle + concentric lens circles on the +Y face + short tick on the +Y edge for orientation |
| Camera (bracket‑style: w / d > 4, e.g. Quad Camera) | Long thin bar + concentric lens circles centered on the +Y face |
| Microphone (table) | Single circle |
| Microphone (ceiling) | Circle + cross‑hairs (standard CAD ceiling‑fixture symbol) |
| Speaker | Outer circle + inner cone circle |
| Navigator / touch panel | Rounded rectangle + inset rectangle for screen face |
| Chair | Rounded rectangle + chair‑back line on −Y |
| Door (single) | Door jambs + single leaf + 90° swing arc |
| Door (double) | Door jambs + two leaves + two swing arcs |
| Person standing | Two concentric circles (shoulders + head) |
| Plant / tree | Single (or nested) circle |
| Wheelchair / turn cycle | Rounded rectangle (or circle for turn‑radius) |

Tables, walls, columns, displays, stage floors, boxes, carpets, and
`pathShape` items are emitted **inline** (no block) because their
geometry varies per‑item.

## Adding a new device block

1. Add the device id to the appropriate `LAYER_*` map in
   `dxfBlockLibrary.js` (`DEVICE_LAYER_FOR_DEVICE_ID`).
2. If it needs a custom block visual, add a
   `_defineXxxBlock(name, dims, layer)` method modeled on the existing
   helpers, and route to it from `blockForItem()` based on either
   `data_deviceid` or the resolved layer category.
3. If the device should always be labelled with its model name (like
   other AV devices), make sure its layer is one of the AV layers —
   `ALWAYS_LABELLED_DEVICE_IDS` is computed from those.

## Internals worth knowing

- **Handles**: every entity carries a hex handle (group code 5). The
  writer pre‑allocates **all** boilerplate + user‑block handles before
  serializing the HEADER, so `$HANDSEED` is the true upper bound and
  no two records collide. User block contents are allocated handles
  incrementally as `addBlock(...).lwpolyline(...)` etc. are called on
  the proxy returned by `addBlock()`.
- **Reserved blocks**: `$Model_Space` and `$Paper_Space` MUST exist in
  every R12 file. The writer emits them automatically with empty
  bodies.
- **Required tables**: VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID,
  DIMSTYLE are emitted unconditionally (most with minimal default
  records). Skipping any of them causes AutoCAD Web App to reject the
  file.
- **Line endings**: CRLF, per the DXF spec.
- **Coordinate precision**: 4 decimal places (≈0.1 mm in meters) —
  keeps file size reasonable while staying well below human‑perceptible
  accuracy.

## Validation

The output is validated by `ezdxf` (Python). A clean export reports
`errors=0, fixes=0` against `ezdxf.audit()` and round‑trips cleanly
through `ezdxf.readfile() → saveas('R2018') → readfile()`.
