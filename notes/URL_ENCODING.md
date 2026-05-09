# URL Encoding Format

Canonical reference for the compressed shareable-link URL format used
by `createShareableLink()` (encode) and `parseShortenedXYUrl()` (decode).

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
URL encoding/decoding, adding a new item attribute, or debugging a
shareable link.

Companion files:
- `../CLAUDE.md` — user-facing dev reference (has a short stub linking
  here for the deep dive).
- `WORKSPACE_DESIGNER.md` — for the JSON-based round-trip format.
- `XCONFIG.md` — for the Cisco xConfiguration text round-trip.

---

The shareable link uses a compressed format. **IMPORTANT:** Uppercase
letters are item type prefixes, lowercase letters are item attributes.
Do not confuse them.

## URL Structure

```
?A1v0.1.631b2600c2000e0f300~RoomName~B10010100C~v1.0~D1a1E2F0G0AB150a200b90c53d6f450...
```

## Room-Level Parameters (appear once at start)

| Code | Type | Meaning |
|------|------|---------|
| `A` | Prefix | Unit: `A0`=meters, `A1`=feet |
| `v` | Prefix | Version string (e.g., `v0.1.631`) |
| `b` | Param | Room width in mm (e.g., `b2600` = 2600mm) |
| `c` | Param | Room length in mm |
| `e` | Param | Software: `e0`=Webex, `e1`=MTR |
| `f` | Param | Room height in mm (optional) |
| `~text~` | Delim | Room name (URL encoded, spaces as `+`) |
| `B` | Prefix | Visibility flags (8-digit binary string) |
| `C~text~` | Prefix | Author version (optional) |

## Visibility Flags (`B` prefix)

`B` is followed by 8 binary digits (0 or 1):

| Position | Meaning |
|----------|---------|
| 0 | Camera coverage visible |
| 1 | Display distance visible |
| 2 | Microphone coverage visible |
| 3 | Grid lines visible |
| 4 | Add ceiling (Workspace Designer) |
| 5 | Remove default walls |
| 6 | Labels visible |
| 7 | Speaker coverage visible |

Example: `B10010100` = camera on, display off, mic on, grid off,
ceiling on, walls on, labels off, speaker off

> **Note:** VRC layers are **not** encoded inside the `B` section. They
> are emitted at the room level using the `L{num}` prefix (e.g.,
> `L20~New+Layer~`). See [Layer URL Encoding](#layer-url-encoding) below
> for the canonical spec.
>
> Example URL fragment with two custom layers:
> `...B100100000L20~New+Layer~L21~New+Layer+2~SA223a190`

## Wall Configuration Prefixes

| Prefix | Wall |
|--------|------|
| `D` | Left wall |
| `E` | Right wall |
| `F` | Video wall (front) |
| `G` | Back wall |

Wall values: `0`=regular, `1`=glass, `2`=window
Sub-attributes: `a1`=acoustic treatment, `b0`/`b1`/`b2`=door position
(left/center/right)

Example: `D1a1b1` = Left wall is glass with acoustic treatment and
center door

## Item Type Prefixes (UPPERCASE)

Each device/furniture type has a 2-character uppercase key:

**Video Devices (A_):**

| Key | Device |
|-----|--------|
| `AB` | Room Bar |
| `AC` | Room Bar Pro |
| `AD` | Room Kit EQX: Wall Mount |
| `AE` | Room Kit EQ: Quad Camera |
| `AF` | _Kit EQ: Quad Cam Extended (deprecated) |
| `AG` | _Room Kit EQ: PTZ 4K Camera (deprecated) |
| `AH` | _Room Kit EQ: Quad+PTZ Extended (deprecated) |
| `AI` | Room Kit Pro: Quad Camera |
| `AJ` | Board Pro 55* |
| `AK` | Board Pro 75* |
| `AL` | Board Pro 55 G2: Wall Mount |
| `AM` | Board Pro 75 G2: Wall Mount |
| `AN` | Desk [RoomOS] |
| `AO` | Desk Pro |
| `AP` | Desk Mini [RoomOS] |
| `AQ` | Room 55* |
| `AR` | Room Kit Mini* |
| `AS` | Room Kit* |
| `AT` | Virtual Lens Bar Pro |
| `AU` | Room Kit EQX: Floor Stand |
| `AV` | Board Pro 55 G2: Floor Stand |
| `AW` | Board Pro 75 G2: Floor Stand |
| `AX` | Room Kit EQX: Wall Stand |
| `AY` | Board Pro 75 G2: Wheel Stand |
| `AZ` | Board Pro 55 G2: Wheel Stand |
| `BA` | Board Pro 55 G2: Wall Stand |
| `BB` | Board Pro 75 G2: Wall Stand |

**Cameras (C_):**

| Key | Camera |
|-----|--------|
| `CA` | Precision 60 Camera* |
| `CB` | _PTZ 4K Camera* (deprecated) |
| `CC` | Quad Camera |
| `CD` | _Quad Cam Extended (deprecated) |
| `CE` | _Quad+PTZ Extended* (deprecated) |
| `CF` | _Room Vision PTZ (deprecated) |
| `CG` | _PTZ 4K & Bracket (deprecated) |
| `CH` | Room Vision PTZ Cam & Bracket |
| `CI` | PTZ 4K Cam & Bracket |

**Microphones/Peripherals (M_):**

| Key | Device |
|-----|--------|
| `MA` | Ceiling Microphone Pro |
| `MB` | Table Microphone |
| `MC` | Table Microphone Pro |
| `MD` | Ceiling Microphone |
| `ME` | Table Navigator |
| `MF` | Wall Navigator |
| `MG`-`MX` | Various peripherals (headsets, webcams, phones, etc.) |

**Tables (T_):**

| Key | Table Type |
|-----|------------|
| `TA` | Rectangle Table |
| `TB` | Ellipse Table |
| `TC` | Stadium Table |
| `TD` | Boat Table |
| `TE` | Trapezoid Table |
| `TF` | Curved Table |

**Walls/Shapes (W_):**

| Key | Shape |
|-----|-------|
| `WA` | Wall |
| `WB` | Glass Wall |
| `WC` | Column Rectangle |
| `WE` | Door Left |
| `WF` | Door Right |
| `WG` | Door Double |
| `WH` | Box |
| `WI` | Stage Floor |
| `WJ` | Column Cylinder |
| `WK` | Sphere |
| `WL` | Path Shape |

**Chairs (S_):**

| Key | Chair Type |
|-----|------------|
| `SA` | Chair |
| `SB` | Row of Chairs |
| `SC` | Person Standing |

**Displays (D_):** *(Note: `D` alone is also wall prefix — context matters)*

| Key | Display Type |
|-----|--------------|
| `DA` | Single Display |
| `DB` | Dual Display |
| `DC` | Triple Display |
| `DD` | Display 21:9 |

## Item Attribute Codes (lowercase)

After an item type prefix, lowercase letters encode attributes:

| Letter | Attribute | Format | Notes |
|--------|-----------|--------|-------|
| *(none)* | x position | Number | First number after prefix (×100, in mm) |
| `a` | y position | Number | ×100, in mm |
| `b` | z position (elevation) | Number | ×100, in mm (data_zPosition) |
| `c` | width | Number | ×100, in mm |
| `d` | length | Number | ×100, in mm |
| `e` | height | Number | ×100, in mm |
| `f` | rotation | Number | ×10, in degrees |
| `g` | diagonal inches | Number | Display size |
| `h` | corner radius | Number | ×100, table corner radius |
| `i` | corner radius right | Number | ×100, right side corner radius |
| `j` | vertical height | Number | ×100, data_vHeight |
| `k` | trapezoid narrow width | Number | ×100, data_trapNarrowWidth |
| `l` | role | Index | Camera/display role (0-based index) |
| `m` | color | Index | Device color (0-based index) |
| `n` | hidden shading | Decimal | Bitfield for FOV/audio/display visibility |
| `o` | tilt | Number | ×10, data_tilt |
| `p` | slant | Number | ×10, data_slant |
| `q` | mount | Index | Mount type (0-based index) |
| `r` | path shape points | Numbers | Space-separated point values (×100, in mm) for pathShape |
| `s` | group reference | Number | Points at the room-level `H{n}` block. Omitted when not in a group. When present, the per-item `ll` is also omitted (group's `ll` covers all members) |
| `ll` | layer number | Number | VRC layer reference: `ll1`=Ceiling, `ll20`+ = custom layers. Omitted for Default (0) and on items that carry `s` |
| `~text~` | label | String | data_labelField (URL encoded) |

**AVAILABLE for future ITEM use:** `t`, `u`, `v`. (`w`/`x`/`y`/`z`/`h`
are used inside `H{n}` blocks for group geometry; the parser keys by
`sid` so they could still be reused on items, but prefer `t`/`u`/`v`
first.)

**Reserved room-level prefixes:** `A` (metadata+unit), `B` (visibility),
`C` (authorVersion), `D`/`E`/`F`/`G` (walls), `L` (layers), `H`
(groups). Available: `I`, `J`, `K`, `N`, `O`, `P`, `Q`, `R`, `U`, `V`,
`X`, `Y`, `Z`. (`M`/`S`/`T`/`W` are item-type prefix families.)

## Layer URL Encoding

VRC Layers (not Konva layers) are encoded at the **room level** using
the `L` prefix:

| Format | Meaning |
|--------|---------|
| `L0v0` | Default layer hidden (`visible=false`) — only emitted when non-default |
| `L0k1` | Default layer locked (`locked=true`) — only emitted when non-default |
| `L0v0k1` | Default layer hidden AND locked |
| `L1v0` / `L1k1` / `L1v0k1` | Same flags applied to the Ceiling layer |
| `L20~Name~` | Custom layer number 20, name "Name", visible=true, locked=false |
| `L20v0~Name~` | Layer 20 with `visible=false` (sub-attribute `v0`) |
| `L20k1~Name~` | Layer 20 with `locked=true` (sub-attribute `k1`) |
| `L20v0k1~Name~` | Layer 20, hidden and locked |

- Custom layers are numbered starting at **20** (L20, L21, …)
- **L0 (Default)** and **L1 (Ceiling)** are reserved layers and are
  normally **implicit** (not encoded), to keep URLs short
- Reserved layers L0 and L1 are encoded **only when they are at
  non-default state** — i.e., when `visible=false` OR `locked=true`. If
  a reserved layer is `visible=true` AND `locked=false`, it is omitted
  from the URL.
- Reserved layer entries do **not** include a `~name~` block (their
  names are fixed: "Default", "Ceiling")
- Numbers 2–19 are reserved for future built-in layers
- Items reference their layer with `ll{number}` (e.g., `ll20`, `ll1` for
  Ceiling)
- If an item has `ll{n}` but no matching `L{n}`, a layer named
  `"Layer {n}"` is auto-created
- Layer `visible` defaults to `true`; only encoded if `false`
  (sub-attribute `v0`)
- Layer `locked` defaults to `false`; only encoded if `true`
  (sub-attribute `k1`)

## Example Decoded

```
AB150a200b90c53d6f450m1~My+Label~
```

| Part | Meaning |
|------|---------|
| `AB` | Room Bar (item type) |
| `150` | x = 1.50m (150/100) |
| `a200` | y = 2.00m |
| `b90` | z = 0.90m (elevation) |
| `c53` | width = 0.53m |
| `d6` | length = 0.06m |
| `f450` | rotation = 45° (450/10) |
| `m1` | color index 1 (Carbon Black) |
| `~My+Label~` | label = "My Label" |

## Example with a Group + custom Layer

```
L20~Furniture~H1x140y180w180h300ll20~My+Group~AB150a200s1~Bar+A~MB300a400s1~Mic~
```

| Part | Meaning |
|------|---------|
| `L20~Furniture~` | Custom layer #20 named "Furniture" (visible, unlocked) |
| `H1x140y180w180h300ll20~My+Group~` | Group #1: rect at (1.40, 1.80) m, 1.80 × 3.00 m, on layer 20, rotation 0, named "My Group" |
| `AB150a200s1~Bar+A~` | Room Bar at (1.5, 2.0) m, member of group 1 (no `ll` — inherited from H1's `ll20`) |
| `MB300a400s1~Mic~` | Table Microphone at (3.0, 4.0) m, also member of group 1 |

After parse: `roomObj.groups[0]` gets `x`/`y`/`width`/`height` directly
from the H block (rect renders correctly on frame 1), and `data_layerId
= <Furniture layerid>`. Both items inherit the same `data_layerId` via
`s1`. `groupMembers` is rebuilt post-pass. `data_zPosition` defaults to
`0` (omitted from H block).

## Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `createShareableLink()` | 5039 | Builds complete URL |
| `createShareableLinkItem()` | ~5220 | Encodes single item |
| `createShareableLinkItemShading()` | 5346 | Encodes `B` visibility flags |
| `parseShortenedXYUrl()` | 2734 | Decodes URL back to roomObj |

## Adding New Attributes

When adding new item attributes:
1. Use next available lowercase letter (`t`, `u`, etc.) — `r` is taken
   by path points, `s` is taken by group reference, `ll` is taken by
   layer number
2. Only encode non-default values to save URL space
3. Update both `createShareableLinkItem()` and `parseShortenedXYUrl()`
4. Ensure backwards compatibility (old URLs without new attribute use
   defaults)

## Group URL Encoding

VRC Groups serialize via the room-level `H{n}` prefix and the per-item
`s{n}` reference. `H` blocks are emitted after `L` (layer) blocks and
before items, so `ll` and `s` references resolve in-order.

### Format

`H{num}x{x×100}[y{y×100}][z{z×100}]w{w×100}[h{h×100}][ll{layerNum}][f{rot×10}]~name~`

| Attr | Meaning | Omitted when |
|------|---------|--------------|
| `x{n}` / `w{n}` | Group rect X / width (×100) | always emitted |
| `y{n}` / `h{n}` | Group rect Y / height (×100) | `0` |
| `z{n}` | `data_zPosition` (×100) | `0` |
| `ll{n}` | Layer ref (same numbering as item `ll`) | Default layer (`'0'`) |
| `f{n}` | Rotation (×10, degrees) | `0` |
| `~text~` | Group name (URL-encoded) | always emitted |

`groupMembers` is rebuilt post-parse from items whose `data_groupId`
matches the group's `groupid`, so `H` block / item ordering doesn't
matter.

### Item rule: `s` suppresses `ll`

When an item is in a group, the encoder emits `s{n}` and **omits** the
per-item `ll` — the group's `H` block already encodes the layer, and
members always share their group's layer (`createGroup()` /
`updateItemLayer()` enforce this). The decoder inherits `data_layerId`
from the group when only `s` is present; if a hand-edited URL has both,
per-item `ll` wins. Items NOT in a group emit `ll` as before.

### Why x/y/z/w/h are explicit (not derived)

Item `Konva.Image` nodes are added to their parent groups inside the
async `imageObj.onload` callback (see line ~15042). So at draw time,
`getGroupMemberNodes()` returns empty and any bounds recompute bails
out. Encoding bounds directly in the URL renders the rect correctly on
frame 1 and makes JSON ↔ URL roundtrip lossless. `updateGroupBounds()`
is still called in `roomObjToCanvas()` as a defensive recompute, but
**only when `g.width` or `g.height` is missing** — so partial-load
races (cached images) can't clobber correct URL-supplied bounds.

### Numbering

`_groupUrlEncodeMap = {}` (groupid → 1, 2, 3, …) is rebuilt each
`createShareableLink()` call. Flat, no reserved range. Empty groups are
skipped on encode and dropped on decode.

### Backwards compat

Old URLs without `H` / `s` load cleanly into a room with no groups.
Layer encoding is unchanged.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Encoder map | `_groupUrlEncodeMap` global next to `_layerUrlEncodeMap` |
| Encoder room-level | `createShareableLink()` — after `L{n}` block |
| Encoder item-level + `ll` suppression | `createShareableLinkItem()` — before label tilde |
| Parser room-level | `parseShortenedXYUrl()` — `else if (item.sid === "H")` branch |
| Parser item-level | `parseShortenedXYUrl()` — `if ('s' in item)` after per-item `ll` |
| Post-parse member rebuild | `parseShortenedXYUrl()` — before `return output;` |
| Defensive bounds rebuild | `roomObjToCanvas()` — guarded by `if (!g.width \|\| !g.height)` |
