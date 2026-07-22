---
name: floorplan-to-vrc
description: Convert a floor plan image (PNG/JPEG) or PDF into a Video Room Calculator .vrc.json file — trace walls/doors/furniture, create named Room Parts, and embed the source image as the background floor plan. Use when the user supplies a floor plan and wants it recreated in the VRC.
---

# Floor Plan → Video Room Calculator JSON

Convert a floor plan picture (`.png`, `.jpeg`) or PDF into a `.vrc.json`
file that opens directly in the Video Room Calculator (VRC). The output
recreates the plan's walls, doors, rooms, and furniture as VRC items,
names each room, and embeds the original image as a traceable
background layer.

## Recommended AI

This task needs strong **vision + spatial reasoning + long structured
output**. Use a frontier-tier multimodal model with reasoning turned up:

| Rank | Model | Notes |
|------|-------|-------|
| 1 | **Claude Opus (4.8+) with extended thinking on high**, run inside Claude Code | Best combination: can run scripts to rasterize PDFs, measure pixel distances, compute the scale numerically, and validate the JSON before handing it back. |
| 2 | Claude Sonnet (5) with extended thinking | Very capable; slightly weaker on dense multi-room plans. |
| 3 | ChatGPT — GPT-5-class with high reasoning effort | Good vision; verify anchor conventions carefully in the output. |
| 4 | Gemini 2.5 Pro / 3 Pro | Strong vision and long context; same caveat. |

Do **NOT** use small/fast tiers (Haiku, GPT-mini, Gemini Flash) — they
consistently misjudge geometry, scale, and the anchor conventions
below. Wherever possible, measure pixel distances **with code** (crop,
zoom, count pixels) instead of eyeballing; every coordinate in the
output is derived from those measurements.

## Critical: coordinate system and anchor conventions

- Origin `(0,0)` is the **top-left inside corner of the floor**;
  x grows right, y grows **down** (screen convention, not CAD).
- Rotation is in **degrees, clockwise**, `0` = unrotated. Rotation
  pivots around the item's anchor point (below).
- Work in **meters** (`"unit": "meters"`). Every `x`, `y`, `width`,
  `height` in the file is then meters.

**Anchor rules — getting these wrong shifts items by half their size:**

| Device class | Anchor (`x`,`y` means…) | Examples |
|--------------|--------------------------|----------|
| Tables, walls, columns, boxes, floors, Room Parts | **Upper-left corner** (unrotated local frame) | `tblRect`, `wallStd`, `wallGlass`, `columnRect`, `boxRoomPart`, `polyRoom`, `stageFloor`, `box`, `carpet` |
| Chairs, doors, people, plants, video devices, microphones, displays | **Visual center** of the item | `chair`, `chairSwivel`, `doorLeft2`, `doorRight2`, `doorDouble2`, `personStanding`, `roomBarPro`, `displaySngl_2` |

Rule of thumb: anything freely resizable (you set `width`/`height`)
is upper-left anchored; anything with a fixed catalog size (you omit
`width`/`height` and the device's real dimensions are used) is
center-anchored.

## Workflow

### 1. Rasterize and inspect

- PDF: render the plan page to PNG at 150–200 DPI, crop to the plan.
- Rotate the image first if the plan isn't axis-aligned — VRC tracing
  is much easier when most walls are horizontal/vertical.

### 2. Establish the scale (pixels per meter)

In priority order:
1. **Printed dimensions** on the plan (e.g. "24'-6"", "7500") — measure
   the same span in pixels: `ppm = pixels / meters`.
2. A **scale bar** or stated scale (1:50, 1/4" = 1'-0").
3. **Standard element fallback**: single doors ≈ 0.9 m (36"),
   corridors ≈ 1.5–1.8 m, parking stalls ≈ 2.7 m wide.

Convert every measured pixel coordinate: `meters = px / ppm`.
Sanity-check: a typical office is 3–10 m across. If rooms come out
0.3 m or 40 m wide, the scale is wrong — stop and re-derive it.

### 3. Size the floor

`room.roomWidth` / `room.roomLength` = the building extent in meters
(the traced content must fit inside; add ~0.5 m slack). Pick the room
origin `(0,0)` at the **upper-left of the building extent** on the
image and derive all item coordinates relative to it.

### 4. Embed the background image

Two pieces, both required:

```json
"backgroundImageFile": "data:image/png;base64,....",   // top level of the JSON
"backgroundImage": {                                    // geometry, room units (meters)
  "x": -0.4,          // UL of the IMAGE in floor coords — negative offsets
  "y": -0.6,          //   account for image margins outside the building extent
  "width": 32.5,      // imagePixelWidth / ppm
  "height": 24.0,     // imagePixelHeight / ppm
  "opacity": 50       // 0–100 (50 = default)
}
```

`x`/`y` place the image's top-left so the drawn plan lines up under
the traced items: if the building extent starts `leftMarginPx` from
the image's left edge, `x = -(leftMarginPx / ppm)` (same for y). Keep
`width/height = pixel size / ppm` so the image is at 1:1 scale with
the traced geometry. This is the single most valuable QA aid — the
user immediately sees any tracing drift against the underlay.

### 5. Trace walls

- **Standard wall**: `wallStd` — `x`,`y` = UL, `width` = run length,
  `height` = thickness (use `0.1` = the 10 cm standard), `rotation`
  for angled walls (pivots on the UL corner). One item per straight
  run; break at corners and junctions.
- **Glass walls**: `wallGlass`, same geometry. Detect glazing by
  drawing conventions: thin double/parallel lines, dashed or
  blue-tinted runs, storefront mullion ticks, curtain-wall symbols,
  or interior "window to corridor" markings. When unsure, use
  `wallStd` — a wrong glass wall is more misleading than a plain one.
- **Columns**: `columnRect` with `width`/`height`, UL-anchored.
- Optional wall height: `data_vHeight` (meters). Omit to inherit the
  room height.

### 6. Place doors

Door symbols are quarter-circle swing arcs. Pick by hinge side and
leaf count, and align the door **centered in the wall opening** (door
items are center-anchored):

| Symbol | Device id |
|--------|-----------|
| Single leaf, hinge left | `doorLeft2` |
| Single leaf, hinge right | `doorRight2` |
| Double door | `doorDouble2` |

Rotate so the leaf sits in the wall line and the swing arc matches the
plan. Leave a **gap in the traced wall** at each opening — don't run
`wallStd` through a doorway.

### 7. Create named Room Parts (multi-room plans)

One Room Part per enclosed room. Set `"multiRoomFloorPlanMode": true`
at the top level when any Room Part exists.

- **Rectangular room** → `boxRoomPart` (UL-anchored, `width`/`height`).
  A boxRoomPart auto-generates its own 4 default walls on Workspace
  Designer export (placed just OUTSIDE its outline), so for a clean
  rectangular room you can skip tracing its 4 walls entirely and
  instead describe them on the part:

  ```json
  "data_roomSurfaces": {
    "videowall": { "type": "regular" },              // TOP edge (y-min)
    "backwall":  { "type": "regular", "door": "center" },  // BOTTOM edge
    "leftwall":  { "type": "glass" },                // x-min edge
    "rightwall": { "type": "regular" }               // x-max edge
  }
  ```

  **All four wall keys MUST be present** whenever you include
  `data_roomSurfaces` — `leftwall`, `videowall`, `rightwall`, AND
  `backwall`, each with a `type`. Do NOT emit only the wall you want a
  door on; a partial object (e.g. just `{"rightwall": …}`) is invalid.
  Give unchanged walls `{ "type": "regular" }`. If a room has no
  special walls or doors at all, **omit `data_roomSurfaces` entirely**
  (the part defaults to four regular walls) rather than writing a
  partial object.

  `type`: `"regular" | "glass" | "window"`. `door`:
  `"left" | "center" | "right"` (omit for no door). Size the part to
  the room's **inner** face — the default walls are added outside it.
- **Irregular room** → `polyRoom`: `x`,`y` = UL of the outline's
  bounding box; `width`/`height` = bbox size; `points` = the outline
  vertices as a flat `[x0,y0, x1,y1, ...]` array in meters, **local to
  the bbox UL** (so the minimum x and minimum y across points are both
  0). The outline must not self-intersect. polyRooms have no default
  walls — trace their walls explicitly.
- **Naming**: read room numbers / names printed on the plan ("201",
  "Conference A", "Huddle") and set them as `data_labelField` on the
  part. Unlabeled rooms: invent short descriptive names ("Room 1",
  "Corner Office") rather than leaving them blank.

**Wall coverage rule (matters for Workspace Designer export):** when
the user zooms into a Room Part and exports to the WD, only items
that intersect the part's outline **plus a 0.10 m margin** ride along
— walls outside that are dropped. So:

- Extend each Room Part to the **outer edge of its walls** wherever
  rooms don't share a wall, so every traced wall run intersects the
  part.
- For shared/party walls between two rooms, run both parts to the
  wall centerline — the 0.10 m margin catches the wall for both
  rooms.
- Never leave a traced wall floating outside every part's outline
  + margin; it will silently vanish from per-room WD exports.

### 8. Place furniture

- **Tables**: `tblRect` (rectangle), `tblEllip` (ellipse/round),
  `tblCurved`, `tblShapeU`, `tblBar`, `credenza` — UL-anchored,
  `width`/`height` from the plan, rotate to match.
- **Chairs**: `chair` (standard), `chairSwivel`, `chairHigh`,
  `couch` — center-anchored, omit `width`/`height` (catalog size),
  set `rotation` so each chair faces its table. Place one item per
  chair symbol; don't guess chairs that aren't drawn.
- Other recognizable symbols: `plant`, `personStanding`,
  `wheelchair`, `stageFloor`, `carpet`.
- Skip ambiguous blobs. A sparse, accurate plan beats a dense wrong
  one — the user adds AV equipment themselves afterwards.

### 9. Assemble the JSON

```json
{
  "roomId": "<uuid-v4>",
  "name": "Floor 2 — Imported Plan",
  "version": "v0.1.663",
  "unit": "meters",
  "room": { "roomWidth": 32, "roomLength": 24, "roomHeight": "" },
  "software": "",
  "authorVersion": "",
  "multiRoomFloorPlanMode": true,
  "backgroundImageFile": "data:image/png;base64,...",
  "backgroundImage": { "x": 0, "y": 0, "width": 32, "height": 24, "opacity": 50 },
  "items": [
    { "id": "<uuid>", "data_deviceid": "boxRoomPart", "x": 1.0, "y": 1.0,
      "width": 6.0, "height": 4.5, "rotation": 0, "data_labelField": "Conf 201",
      "data_roomSurfaces": { "videowall": {"type":"regular"}, "backwall": {"type":"regular","door":"center"},
                             "leftwall": {"type":"glass"}, "rightwall": {"type":"regular"} } },
    { "id": "<uuid>", "data_deviceid": "wallStd", "x": 8.0, "y": 1.0,
      "width": 5.2, "height": 0.1, "rotation": 0 },
    { "id": "<uuid>", "data_deviceid": "doorLeft2", "x": 9.5, "y": 5.5, "rotation": 90 },
    { "id": "<uuid>", "data_deviceid": "tblRect", "x": 2.5, "y": 2.2,
      "width": 3.0, "height": 1.2, "rotation": 0 },
    { "id": "<uuid>", "data_deviceid": "chair", "x": 3.0, "y": 1.9, "rotation": 180 }
  ],
  "workspace": { "removeDefaultWalls": true, "addCeiling": false },
  "roomSurfaces": {
    "leftwall":  { "type": "regular" }, "videowall": { "type": "regular" },
    "rightwall": { "type": "regular" }, "backwall":  { "type": "regular" }
  },
  "overlaysVisible": { "cameraCoverage": true, "displayDistanceCoverage": true,
    "microphoneCoverage": true, "speakerCoverage": true, "gridLines": true, "overlayLabels": false },
  "layers": [
    { "name": "Default", "visible": true, "locked": false, "layerid": "0" },
    { "name": "Ceiling", "visible": true, "locked": false, "layerid": "1" }
  ],
  "groups": [],
  "customItems": []
}
```

Rules:
- Every `id` and `roomId` is a **fresh UUID v4** — never sequential,
  never reused.
- `items` is a **flat array** (no category buckets).
- For a multi-room floor, set `workspace.removeDefaultWalls: true` so
  the floor's implicit outer walls don't double up with traced walls.
- Save as `<name>.vrc.json`. The user opens it via VRC → Open File
  (or drag-and-drop onto the canvas).

### 10. Validate before delivering

- [ ] JSON parses; every item has `id`, `data_deviceid`, `x`, `y`.
- [ ] Scale sanity: doors ≈ 0.9 m, rooms 2.5–12 m across.
- [ ] Anchors: tables/walls/parts = UL; chairs/doors = center.
- [ ] No wall runs through a doorway.
- [ ] Every room has a named Room Part; every traced wall intersects
      a Room Part outline + 0.10 m.
- [ ] `backgroundImage` geometry is `imagePixels / ppm` with margin
      offsets, so the underlay lines up under the traced items.
- [ ] polyRoom `points` are bbox-local (min x = min y = 0) and don't
      self-intersect.
- [ ] Every `data_roomSurfaces` present has **all four** wall keys
      (`leftwall`/`videowall`/`rightwall`/`backwall`), or is omitted
      entirely — never a partial object.
