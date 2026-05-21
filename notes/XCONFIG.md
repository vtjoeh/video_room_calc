# File Import & xConfiguration .txt Support

VRC supports importing **three** distinct file formats through the same
UI (open-file picker and drag-and-drop). Detection is done by
**content**, not file extension. This file is the canonical reference
for the detection pipeline and the Cisco xConfiguration `.txt` import
and export.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
file import/export code or debugging an xConfig round-trip.

Companion files:
- `../CLAUDE.md` — user-facing dev reference (has a short stub linking
  here for the deep dive).
- `URL_ENCODING.md` — for the `?x=` URL-based round-trip.
- `WORKSPACE_DESIGNER.md` — for the WD JSON-based round-trip.

---

## Detection Pipeline

`routeUploadedFileText(text, fileName)` is the single entry point for
both upload paths:

1. Try `JSON.parse(text)` → if it succeeds and the result is an object,
   hand it to `importJson()` (which routes between VRC JSON and
   Workspace Designer JSON internally based on the presence of `room`
   vs `customObjects`).
2. If JSON parsing fails, test the text against the OR-alternation
   regex
   `/^((?:\*c )?xConfiguration\b)|(Audio\sPeripherals\sMicrophone\s1\sPlacement)|(Cameras\sCamera\s1\sPlacement\sRX)/m`
   — which detects all three xConfig line formats (see below). If
   matched, call `importXConfigFile(text, fileName)`.
3. Otherwise, show an alert that the file format is unrecognized.

The optional `*c ` prefix is what makes xConfig files
**round-trippable**: a file produced by `Ctrl+Shift+E` (no prefix)
re-imports cleanly through the same code path used for raw RoomOS dumps
(with prefix).

The `<input type="file" id="fileUpload">` accept attribute is
`.json,.txt` so both formats appear in the picker dialog.

## Cisco xConfiguration .txt Files

These are configuration dumps from a Cisco RoomOS endpoint. Three line
formats are detected and parsed — only **camera placements** and
**microphone placements** are imported; every other line is ignored.

**Three accepted xConfig line formats:**

| Format | Example | Source |
|--------|---------|--------|
| 1. Raw RoomOS SSH dump | `*c xConfiguration Cameras Camera 1 Placement RX: 112` | SSH session output |
| 2. App export (no `*c`) | `xConfiguration Cameras Camera 1 Placement RX: 112` | `Ctrl+Shift+E` export from this app |
| 3. Bare config dump | `Cameras Camera 1 Placement RX: 112` | Device configuration export tools (no `xConfiguration` keyword) |

Detection (step 2 above) uses an OR alternation: formats 1 & 2 are
caught by the `xConfiguration` arm; format 3 is caught by the
`Audio Peripherals Microphone 1 Placement` or `Cameras Camera 1
Placement RX` arms.

In `parseXConfigText()`, all five parser regexes wrap the optional
prefix in a **capturing** group (group 1, may be `undefined`) so the
data groups are consistently numbered across all regexes: group 2 =
device number, group 3 = field name, group 4 = integer value.

### Microphone xConfig Variants

Two microphone-placement formats are recognized in the same parser:

| Format | Example line | RoomOS |
|--------|--------------|--------|
| **New** (`Audio Peripherals Microphone`) | `*c xConfiguration Audio Peripherals Microphone 1 Placement X: -1809` plus a `Microphone N ID: "<mac>"` line | RoomOS 11+ |
| **Legacy** (`Audio Input Ethernet`) | `*c xConfiguration Audio Input Ethernet 2 Placement X: -83` plus an `Ethernet N StreamName: "<mac>"` line | older RoomOS |

The mic *number* (the `N` in either format) is preserved into the VRC
label. If both formats appear for the same `N`, the new format
**wins** — the legacy entry is discarded entirely. This is handled
inside `ensureMic(n, source)` in `parseXConfigText()` via a `source:
'new' | 'old'` tag stored on each parsed mic entry.

Empty-slot detection differs by format because the defaults differ:

- **New format**: defaults are `X = Y = Z = 0` → skip when *all three*
  are zero.
- **Legacy format**: default is `X = 0, Y = 730, Z = 0` (typical
  table-mic height) with empty `StreamName` → skip when *both X and Z*
  are zero (Y is allowed to be non-zero).

### Coordinate Model

The xConfiguration coordinate frame is **relative to the Quad Camera's
reference origin**. The X axis is taken as already centered on the Quad
Camera's lens center, so **no X offset is applied** during import or
export. The Z axis is offset from the lens by `+5 cm`, so a `−0.05 m`
correction is applied on import (and re-added on export).

| xConfig axis | Direction | Units | VRC mapping |
|--------------|-----------|-------|-------------|
| `X` | Right of Quad Cam | mm | VRC X (no offset — used directly as `relX` from the Quad Cam) |
| `Y` | Up from floor | mm | VRC `data_zPosition` (elevation) |
| `Z` | Forward into the room | mm | VRC Y (depth) (after `- 0.05 m` offset) |
| `RX/RY/RZ` | Rotation around X/Y/Z | deci-degrees (value/10 = degrees) | RY → VRC `rotation` (negated, since xConfig is right-handed CCW and VRC is CW from north) |

### Device Mapping Rules

| xConfig device | VRC device | Notes |
|----------------|------------|-------|
| `Cameras Camera 1` with `\|X\|` ≤ 10 mm AND `\|Z\|` ≤ 10 mm | `roomKitEqQuadCam` | Camera 1 sitting at (or within 10 mm of) the xConfig origin = the Quad Camera. Imported as Room Kit EQ: Quad Camera (same dimensions as `quadCam` via `cameraParent`) and treated as the reference frame for everything else |
| `Cameras Camera 1` with `\|X\|` > 10 mm OR `\|Z\|` > 10 mm | `ptzVision2` | A Room Vision PTZ wired into the Camera 1 slot. Imported at its actual coordinates (label still "Camera 1"); the room then has no Quad Camera |
| `Cameras Camera 2..N` | `ptzVision2` | Room Vision PTZ |
| `Audio Peripherals Microphone N` with Y < 1.5 m | `tableMicPro` | Below 1.5 m elevation = on a table |
| `Audio Peripherals Microphone N` with Y ≥ 1.5 m | `ceilingMicPro` | At or above 1.5 m = ceiling-mounted |

**Cameras with `Placement Y = 0` are skipped** (applies to **all**
camera slots including Camera 1). xConfig's `Y` is the camera's height
above the floor in mm, and a value of `0` means "no height
configured" — the default for an empty slot. This catches both the
fully‑empty slots (`X = Y = Z = 0`, like Cameras 2..6 in a typical
Codec EQ) **and** stale, partially‑configured ghosts that have non‑zero
`X` / `Z` but `Y = 0` (e.g. a Camera 7 left over from a removed
device). This matches the behavior of Cisco's official xConfig
placement tool.

Mics with `X = Y = Z = 0` are also skipped (those slots exist in
xConfig even when no mic is actually placed). The legacy `Audio Input
Ethernet` mic format defaults to `X = 0, Y = 730, Z = 0`, so for that
format the importer instead drops entries where both `X` and `Z` are
zero.

### Camera-only / Microphone-only Imports

Both flavours are supported — the importer no longer aborts when one
of the two device classes is missing.

| File contents | Behaviour |
|---------------|-----------|
| Cameras + microphones | Normal import, no notice |
| Cameras only (no mics) | Imports normally, then shows an `alertDialog` with the message **"Calibrated microphone missing"** |
| Microphones only (no cameras) | Imports normally, then shows an `alertDialog` with the message **"Cinematic meeting camera missing"** |
| Neither | Aborts with a generic "no cameras or microphones to place" alert (nothing to draw) |

The notice is fired ~3.2 s after import begins so it lands cleanly
after the loading modal dismisses (rather than being stacked behind
it). When there is no Quad Camera in the room, the implicit xConfig
origin (0, 0) still anchors at `(roomWidth / 2, 0.10 m)` so the room
geometry math is unchanged — peripherals are positioned around the
same reference point they would have been if the Quad Cam were
physically there.

### Special Quad Camera Handling

- Placed at xConfig (0, 0) by definition — its VRC center lands at
  `(vrcOriginX, vrcOriginY)` where the **xConfig XYZ tracking columns**
  described below intersect.
- Elevation: `(xConfig Y / 1000) − 0.05 m`. The xConfig Y for the Quad
  Camera reports "base + ~5 cm", so we subtract 0.05 m to get the
  actual mounting elevation.
- The X/Z xConfig values for the Quad Camera are typically 0 by
  definition (it's the reference frame). When the user later moves the
  Quad Cam off-origin in the VRC, the tracking columns preserve the
  original origin so the move is reflected as a non-zero offset on the
  next export rather than silently shifting every other peripheral.

> **Historical note**: In earlier versions the Quad Cam was
> force-placed at `(roomWidth/2, 0.10 m)` and the room was sized
> symmetrically around it. As of the bounding-box rework, no device is
> locked to a specific room location — the room is sized to fit the
> device bounding box with a 0.15 m wall buffer (see
> [Room Sizing](#room-sizing) below) and items are translated as a
> group via `vrcOriginX` / `vrcOriginY`.

### xConfig XYZ Tracking Columns

After every successful import, two thin `columnRect` items are dropped
into `roomObj.items[]` (their `parentGroup` resolves to `tables` via
`allDeviceTypes['columnRect'].parentGroup`) to mark the xConfig
coordinate origin in VRC space:

| Column | id prefix | data_labelField | x | y | rotation | width | height |
|--------|-----------|-----------------|---|---|----------|-------|--------|
| **Blue** (X = 0 axis) | `xConfig-x-0-<uuid>` | `{"color":"blue", "opacity":0.03}` | vrcOriginX | 0 | 0 | 0.01 m | roomLength |
| **Red** (Z = 0 axis) | `xConfig-z-0-<uuid>` | `{"color":"red", "opacity":0.03}` | 0 | vrcOriginY | -90 | 0.01 m | roomWidth |

Where `vrcOriginX` and `vrcOriginY` are the VRC coordinates of xConfig
(0, 0) — derived from the bounding-box translation in [Room
Sizing](#room-sizing). The columns are **not** guaranteed to be
centered in the room; they sit wherever xConfig (0, 0) lands relative
to the imported devices.

Both columns are assigned to a dedicated **`xConfig XYZ` layer** that
is created **locked** by default so the user can't accidentally drag
them around. The layer is `visible: true` so the planes render as
faint guide lines in Workspace Designer (the JSON `color`/`opacity`
in `data_labelField` is read by `parseDataLabelFieldJson()` during the
WD export).

The exporter reads:

- `blueColumn.x` ⇒ xConfig X = 0 origin in VRC meters
- `redColumn.y`  ⇒ xConfig Z = 0 origin in VRC meters

If both columns are present, they take priority over Camera 1 for the
origin computation. Camera 1 then emits its own xConfig (X, Z)
**relative to the columns** — so dragging Camera 1 produces a non-zero
offset rather than shifting the whole frame. Note that Camera 1 still
does **not** add the `+0.05 m` Z offset (peripherals do), preserving
the round-trip property where a Quad Cam at the column intersection
emits `Camera 1 X=0, Z=0`.

Column id matching is **case-insensitive** so older saves using the
lowercase `xconfig-x-…` form (see the example
`xconfig with xyz planes.vrc.json`) still round-trip cleanly. If
either column is missing the exporter falls back to the legacy
"Camera 1 = origin" path; if Camera 1 is also missing it falls back to
the implicit `(roomWidth/2, 0.10 m)` origin.

### Special Room Vision PTZ Handling

Room Vision PTZ cameras (`ptzVision2`) get an additional `−0.15 m`
correction on their elevation only. The xConfig Y for these cameras
reports the **mount point** (~15 cm above the lens), so we subtract
0.15 m to recover the lens elevation that VRC stores in
`data_zPosition`. The export reverses this with a `+0.15 m`
correction.

This offset is **not** applied to the Quad Camera (which uses its own
0.05 m correction) or to microphones (which already report
lens-equivalent height directly).

### Room Sizing

Room dimensions are derived from the **bounding box** of every imported
device, with a **0.15 m buffer** to the walls on every side. No device
is locked to a specific room location — the items are placed as a
group and translated into the room.

```
For each device, in xConfig-frame meters:
   leftEdge   = relX − halfWidth
   rightEdge  = relX + halfWidth
   topEdge    = relY − halfDepth
   bottomEdge = relY + halfDepth
   topOfDevice = elevationM + deviceHeightM

bbox dimensions (after taking min/max across all devices):
   bboxWidth  = (maxRightEdge  − minLeftEdge)  + 2 × 0.15 m
   bboxLength = (maxBottomEdge − minTopEdge)   + 2 × 0.15 m

Apply minimums:
   roomWidth   = max(3 m, bboxWidth)
   roomLength  = max(3 m, bboxLength)
   roomHeight  = max(2 m, max over devices of topOfDevice)
```

`deviceHeightM` reads from `allDeviceTypes[deviceId].height` (in mm) —
e.g. `ceilingMicPro` = 48 mm, `quadCam` = 120 mm, `ptzVision2` = 193
mm. If a device type has no height listed, a **0.05 m (50 mm)**
fallback is used. `halfWidth` / `halfDepth` come from the same table;
rotation is intentionally ignored when computing extents (a
90°-rotated device would actually project its `halfDepth` onto the X
axis, but the worst-case error is a few cm so it's not worth the
math).

When the bounding box is **smaller** than the 3 m × 3 m floor, the
extra slack splits **evenly** between opposing walls (Option B) so
items remain visually centered in the larger room rather than anchored
in one corner. The translation that achieves this:

```
slackX = roomWidth  − bboxWidth        (≥ 0)
slackY = roomLength − bboxLength       (≥ 0)
vrcOriginX = 0.15 m + slackX/2 − minLeftEdge
vrcOriginY = 0.15 m + slackY/2 − minTopEdge

For each device:    centerX = vrcOriginX + relX
                    centerY = vrcOriginY + relY
For tracking columns:
   blueColumn.x    = vrcOriginX
   redColumn.y     = vrcOriginY
```

All three room values are rounded **up** to 2 decimal places so the
user sees tidy numbers in the UI.

### Device Naming

| Device | `data_labelField` |
|--------|-------------------|
| Camera 1 (Room Kit EQ: Quad Camera) | `Camera 1` |
| Camera 2..N | `Camera N` |
| Microphone N (any format, with ID) | `Microphone N ID: <id>` (e.g. `Microphone 1 ID: 50:00:e0:32:ec:cd`) — applied to **both** `tableMicPro` and `ceilingMicPro` and **both** xConfig variants (new `Audio Peripherals Microphone` *and* legacy `Audio Input Ethernet` StreamName), so labels are consistent across the room and round-trip cleanly through xConfig export |
| Microphone N without ID/StreamName | `Microphone N` |

### Implementation Files

- Parser: `parseXConfigText()` in `js/roomcalc.js` — pure function,
  takes the raw text and returns `{ cameras: [...], microphones: [...] }`
  arrays.
- Importer: `importXConfigFile(text, fileName)` in `js/roomcalc.js` —
  applies all the coordinate math, builds a fresh `roomObj2`, and uses
  the same timing pattern as `importWorkspaceDesignerFile()` (set up
  roomObj2 → `setTimeout(1500ms)` → `drawRoom()` → `setTimeout(500ms)`
  → `canvasToJson()` + `createShareableLink()`).

## Exporting to xConfiguration

`exportXConfigFile()` is the inverse of `importXConfigFile()`. It is
bound to **`Ctrl/Cmd+Shift+E`** (the existing `Ctrl/Cmd+E` exports to
Workspace Designer; the extra `Shift` selects the xConfig variant).
The output is a `.xconfig.txt` file download with no `*c` prefix on any
line — it is meant to be sent over RoomOS's command interface, not
parsed back as a SSH log.

### Reverse coordinate math

For each item, `attrs.x` / `attrs.y` is the rotation-aware **center**
in current units (set by `canvasToJson()` via `getNodeCenter()`). The
exporter calls `canvasToJson()` first to ensure those values are
fresh, then converts to meters via
`unitToM = (roomObj.unit === 'feet') ? 1/3.28084 : 1`, then:

```
xConfigX_mm  = round(relX × 1000)                 for peripherals (always 0 for Quad Cam)
xConfigZ_mm  = round((relY + 0.05) × 1000)        for peripherals (always 0 for Quad Cam)
xConfigY_mm  = round(elevationM × 1000)           for microphones
xConfigY_mm  = round((elevationM + 0.05) × 1000)  for the Quad Cam (re-adds the +5 cm mount offset)
xConfigY_mm  = round((elevationM + 0.15) × 1000)  for Room Vision PTZ (re-adds the +15 cm mount offset)
xConfigRY    = round(-rotationDeg × 10)           VRC CW degrees → xConfig CCW deci-degrees (negate)
```

`relX` / `relY` are computed against the Quad Camera's own center, so
the shared reference frame matches what the importer expects.

`RX` and `RZ` are emitted as `0` for every camera — VRC does not
currently track tilt or slant for cameras imported from xConfig, so
there's nothing to round-trip.

### Device coverage

Only the device types the importer understands are emitted. Anything
else in the room is silently skipped:

| roomObj item | xConfig section |
|--------------|-----------------|
| `roomKitEqQuadCam` *or* `quadCam` (always Camera 1) | `Cameras Camera 1 Placement *` |
| `ptzVision2` | `Cameras Camera N Placement *` (N ≥ 2) |
| `ceilingMicPro`, `tableMicPro` | `Audio Peripherals Microphone N *` |
| anything else (chairs, tables, displays, walls, …) | skipped |

The exporter accepts either id as Camera 1 because the importer emits
`roomKitEqQuadCam` while older saves may still contain a bare
`quadCam` — both are recognised via the `QUAD_DEVICE_IDS` set. **The
Quad Camera is optional**: a room with only PTZ cameras and/or only
microphones can still be exported. When no Quad Cam is present, the
implicit xConfig origin is anchored at `(roomWidth / 2, 0.10 m)`
(matching the importer's behaviour), so a no-Quad-Cam export
round-trips cleanly back through the importer.

### Strict label-format checks

Every device must carry a `data_labelField` that matches the expected
pattern, otherwise it is **silently skipped** (and counted for the
summary dialog described below):

| Device class | Required label | Matched by |
|--------------|----------------|------------|
| Cameras (Quad and PTZ) | `Camera <#>` (e.g. `Camera 7`) | `/^Camera\s+(\d+)\s*$/i` |
| Microphones | `Microphone <#> ID: <id>` (e.g. `Microphone 2 ID: 50:00:e0:32:ec:cd`) | `/^Microphone\s+(\d+)\s+ID:\s*(\S.*?)\s*$/i` |

Notes:

- The legacy `Microphone <#> <streamname>` shape produced by older
  imports does **not** match (no literal `ID:` marker) and gets
  skipped — fix the labels by hand or re-import the source xConfig
  with the new format.
- A PTZ camera labelled `Camera 1` claims a number reserved for the
  Quad Cam, so it gets bumped to the next free number rather than
  skipped.
- The Quad Camera's position is used as the reference frame **even if
  its label is malformed** (so the other peripherals' relative coords
  stay correct); the only thing the label gate controls is whether the
  Camera 1 line itself is emitted.

### Post-export summary dialog

Whenever the export emits at least one item, a final `alertDialog`
summarises the result:

```
An xConfiguration file was successfully exported with 2 cameras and 3 microphones.
```

If any items were skipped due to a malformed label, a second sentence
is appended explaining how many were dropped and what the required
label format is:

```
An xConfiguration file was successfully exported with 2 cameras and 3 microphones.

1 camera and 2 microphones were not exported because the name label did not match the required format. Cameras must be labelled `Camera <#>` (e.g. `Camera 7`) and microphones must be labelled `Microphone <#> ID: <id>` (e.g. `Microphone 2 ID: 50:00:e0:32:ec:cd`).
```

If the exported file ends up with **only one device class** (cameras
but no microphones, or microphones but no cameras), a yellow `⚠️`
warning is appended to the dialog so the imbalance can't be missed:

```
An xConfiguration file was successfully exported with 2 cameras and 0 microphones.

⚠️ Microphone missing — a Cisco room should include at least one microphone alongside the camera(s).
```

Both warnings can appear in the same dialog (e.g. label-skipped items
leaving a class empty fires the format explainer **and** the ⚠️
missing-class line).

Pluralisation handles 0/1/2+ correctly via `describeCounts()`; the
helper omits a clause entirely when its count is 0 (e.g. only-cameras:
"with 2 cameras"). When **no** items have valid labels the export
aborts before writing the file and shows the same explainer in a "No
cameras or microphones could be exported." dialog instead.

### Number preservation (round-trip integrity)

Cameras and microphones get their numbers from `data_labelField` when
possible:

- A label like `"Camera 7"` → `Cameras Camera 7 ...`
- A label like `"Microphone 3 ID: 50:00:e0:32:ec:cd"` →
  `Audio Peripherals Microphone 3 ID: "50:00:e0:32:ec:cd"`
- Imported labels are always normalized to `Microphone N ID: <id>`
  regardless of source variant, so the export side always sees the
  same shape.

Numbers already taken (e.g. by another item with the same explicit
label number) get bumped via a `nextFreeNumber()` helper. Items
without an extractable number are assigned the lowest free number
starting at 2 (cameras) or 1 (microphones).

### Output format

Always written in the **new** format
(`Audio Peripherals Microphone N`). The legacy format
(`Audio Input Ethernet N`) is only supported on import. Each device
block ends with a blank line so the file is easy to scan.
