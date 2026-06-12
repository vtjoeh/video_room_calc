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
?A1b2600c2000e0f300~RoomName~B10010100C~v1.0~D1a1E2F0G0AB150a200b90c53d6f450...
```

> **Version omitted (2026):** `createShareableLink()` no longer emits the
> app version (`v0.1.653`) — it cost ~8 fixed chars and the decoder never
> read it. Legacy URLs that still carry `v…` decode unchanged (the parser
> stores `item.v` on the `A` item and ignores it). The empty-room
> detection regex makes the `v…` group optional:
> `/^A[01](?:v[0-9\.]+)?b(2[56][09]|79)\dc(200|61)\dB[01]{4,10}(D0a1)?$/`.
> Trade-off: the URL can no longer be version-gated on decode (a
> capability that was never actually used).

## Room-Level Parameters (appear once at start)

| Code | Type | Meaning |
|------|------|---------|
| `A` | Prefix | Unit: `A0`=meters, `A1`=feet |
| `v` | Prefix | App version (e.g., `v0.1.631`) — **legacy/optional**: no longer emitted by the encoder, ignored on decode |
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
| `WM` | Credenza / Cabinet |
| `WN` | Huddle (Bullet) Table |
| `WO` | Row of Swivel Chairs (wallChairsSwivel) |
| `WP` | Row of Stool Chairs (wallChairsStool) |
| `WQ` | Cone (cylinder variant with `data_radius2`) |
| `WR` | Workspace Designer Text (`wdText`) |
| `WS` | Ceiling Grid (`ceilingGrid`; 2-char `gw` / `gl` tile dimensions) |

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
| `c` | width | Number | ×100, in mm. Skipped for `pathShape` / `polyRoom` (sized via `r{points}`) and for `wdText` / `vrcText` (Konva.Label auto-sizes from inner Text + `data_fontSize` on render — stored width is derived state, not source of truth) |
| `d` | length | Number | ×100, in mm. Same skips as `c` |
| `e` | height | Number | ×100, in mm. Skipped for `tblSchoolDesk` (fixed at 0.59m) and for `wdText` / `vrcText` (same auto-size reason as `c`) |
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
| `t` | customItem reference | Number | Points at the room-level `J{n}` block. Omitted when not in a customItem. When present alongside `s`, the per-item `ll` is omitted (group's `ll` wins); when only `t` is present, customItem's `ll` covers the item |
| `u` | fill color (RGB) | RGB triple | `data_fill` for `configurableColor` devices. Always 9 zero-padded digits: `u{RRR}{GGG}{BBB}`. `#FFFFFF` → `u255255255`; `#0F0F0F` → `u015015015`. Default (absent) ⇒ device default fill (`#FFFFFF99`). Encoder uses cached `hexToUrlRgb()`; decoder uses `urlRgbToHex()` |
| `v` | opacity (×100) | Number | `data_opacity` for `wdOpacity` devices. `v{NN}` where NN = opacity × 100 in range [0, 99]. `v50` = 0.50; `v0` = 0. Default (1.0) is omitted entirely |
| `w` | wdText font size | Integer | `data_fontSize` for `wdText` items only. `w{N}` (integer pt-like units). Default (20) is omitted entirely; encoder also gates on `item.data_deviceid === 'wdText'` so other items can never emit `w` |
| `x` | wallChairs chair-on-center spacing (×100) | Number | `data_chairSpacing` for `wallChairs` items only. `x{N}` where N = spacing × 100 in current unit (`x235` = 2.35 ft, `x72` = 0.72 m). Default (`DEFAULT_CHAIR_SPACING_FEET` 2.35 ft / `DEFAULT_CHAIR_SPACING_METERS` 0.7163 m, ×100) is omitted entirely; encoder also gates on `item.data_deviceid === 'wallChairs'` so other items can never emit `x` |
| `y` | dimensionLine line width OR cone radius2 (×100) | Number | Multiplexed by `data_deviceid`. `dimensionLine` → `data_lineWidth` (integer canvas pixels). `cone` → `data_radius2 × 100` in current unit (mm in meters mode, hundredths of a foot in feet mode). Both encoder and decoder gate by deviceid so the meanings never collide |
| `z` | dimensionLine pointer size | Number | `data_pointerSize` for `dimensionLine` items only |
| `ll` | layer number | Number | VRC layer reference: `ll1`=Ceiling, `ll20`+ = custom layers. Omitted for Default (0) and on items that carry `s` or `t` |
| `gw` | ceilingGrid tile width (×100) | Number | `data_gridWidth` for `ceilingGrid` items only. 2-char code (accumulated by the tokenizer like `cd` / `ll`). `gw{N}` where N = width × 100 in current unit. Both encoder and decoder gate on `data_deviceid === 'ceilingGrid'` |
| `gl` | ceilingGrid tile length (×100) | Number | `data_gridLength` for `ceilingGrid` items only. 2-char code. `gl{N}` where N = length × 100 in current unit. Same deviceid gate as `gw` |
| `~text~` | label | String | data_labelField (URL encoded) |

**AVAILABLE for future ITEM use:** `y`, `z`. (`u` is fill color, `v`
is opacity — both added in the 2026 configurableColor work. `w` was
claimed in 2026 for wdText `data_fontSize`. `x` was claimed in 2026
for wallChairs `data_chairSpacing`. `w`/`x`/`y`/`z`/`h` are also used
inside `H{n}` / `J{n}` blocks for group/customItem geometry; the
parser keys by `sid` so they could still be reused on items, but
prefer the remaining unused letters first.)

**Reserved room-level prefixes:** `A` (metadata+unit), `B` (visibility),
`C` (authorVersion), `D`/`E`/`F`/`G` (walls), `L` (layers), `H`
(groups), `J` (customItems). Available: `I`, `K`, `N`, `O`, `P`, `Q`,
`R`, `U`, `V`, `X`, `Y`, `Z`. (`M`/`S`/`T`/`W` are item-type prefix
families.)

## Item Repeat Compression (`_`)

Consecutive items of the **same type prefix** are compressed with the
`_` marker instead of re-emitting the full `SID…` string. On decode,
`_` clones the immediately-previous parsed item (`structuredClone`),
then the tokens after the `_` override attributes on that clone. A
bare number after `_` overrides `x` (the prefix-less `value`), a
lowercase token overrides that attribute, and `~text~` overrides the
label. Multiple `_` chain (each repeats the prior result), so N
identical items collapse to the first full item + (N−1) bare `_`.

### Examples

| URL fragment | Decodes to |
|--------------|-----------|
| `SA895a868_400` | 2 chairs; 2nd identical except `x` = 4.00 |
| `SA895a868_400_a400f900` | 3rd is the 2nd cloned with `y` = 4.00, rotation = 90 |
| `SA895a868c210e210_~the+text~` | 2nd identical + label "the text" |
| `…_800f0` | clone with `x` = 8.00 and rotation reset to 0 |

### Encoder rules

`_` can only **override or add** attributes on the clone — it can
never remove one. So the encoder emits a `_` diff only when the
current item carries **every** attribute the previous one had
(current ⊇ previous), then writes only the fragments whose value
differs (or is new); unchanged fragments are dropped.

- **Sole exception** — if rotation (`f`) is the *only* dropped
  attribute, the encoder emits an explicit `f0` reset (rotation
  default is 0), e.g. `_800f0`.
- **Any other dropped attribute** ⇒ full `SID…` repeat (lossless
  fallback).
- The diff is always shorter than the full item when used (`_` is one
  char vs the 2-char prefix), so no length comparison is needed.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Encoder | `createShareableLinkItem(item, prevTokens)` — builds ordered `{key, str}` fragments, returns `{str, tokens}`, runs the diff at the end |
| Encoder loop | `createShareableLink()` — tracks `prevTokens` of the **last actually-emitted** item (off-stage items, which return `''`, do not advance the diff base) |
| Decoder | `parseShortenedXYUrl()` — `if (char === '_' …)` branch clones `output[objCount]` and continues overriding |

## Item Ordering Optimization

The `_` repeat compression (above) only collapses **consecutive**
same-`sid` items, and `createShareableLink()` walks `roomObj.items` in
insertion/z-order — so interleaved same-type items break the chain.

`reorderItemsForSharing()` reorders `roomObj.items` **in place** to
maximize `_` chaining. It runs at two times:

1. **On every load** — right after `dedupeRoomItems()` and before the
   first draw, on all four load paths: URL page load (`getQueryString`),
   template-string loader (`loadTemplate`), `.vrc.json` import
   (`finishVrcImport`), and WD `.json` import
   (`importWorkspaceDesignerFile`). So a freshly loaded room is already
   compact without any user action. (Deliberately **not** wired into the
   undo/redo restore or xConfig-import paths.)
2. **On the Shareable Template Hyperlink button** (`copyLinkToClipboard()`)
   — re-runs with warm encode maps for the optimal result.

The reorder persists (mutates `roomObj.items`), so every later
auto-synced link in the session stays compact.

> **Cold maps on load:** at load time `_groupUrlEncodeMap` /
> `_layerUrlEncodeMap` / `itemsOffStageId` aren't built yet (they're
> populated inside `createShareableLink()`), so the load-time sort of
> *grouped/layered* items is slightly less optimal than the button's.
> The URL is still correct and the common case (repeated ungrouped
> items) is fully optimized; clicking the button self-heals to optimal.
>
> **Stored template URLs** (`js/templates.js`) are intentionally left in
> old full-form — they auto-optimize on load via path #1, so there's no
> need to pre-compress the source strings.

### Ordering rules (`reorderItemsForSharing()`)

1. Group by type prefix (`sid`) in first-appearance order — makes all
   same-type items consecutive.
2. Within a group, sort by **fewer attributes first** (`keyCount`) so
   each item is a superset of the prior (the `_` diff can add/override
   but not remove keys).
3. Then by attribute-set signature (`keySig`) to cluster identical
   structures, then by full encoded string to cluster identical
   labels/geometry — so `~text~` and shared value fragments drop out of
   the diff.
4. Off-stage items (`itemsOffStageId`, never URL-encoded) are preserved
   at the end so no item is lost when the array is reassigned.

### Safety

- Reorder can only help or be neutral — the `_` diff already falls back
  to a full `SID…` repeat when not beneficial.
- Only **z-order (draw stacking)** is affected; group/customItem
  membership is rebuilt post-parse from `data_groupId` /
  `data_customItemId` (order-independent).
- `canvasToJson()` / `updateRoomObjFromTrNode()` update items **in place
  by id** and only append genuinely-new items, so the persisted reorder
  survives subsequent edits (new items append at the end until the next
  template-link click regroups them).

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Reorder helper | `reorderItemsForSharing(items)` — just above `createShareableLink()` |
| Button trigger | `copyLinkToClipboard()` — `roomObj.items = reorderItemsForSharing(roomObj.items)` before `createShareableLink()` |
| Load triggers | after `dedupeRoomItems()` in `getQueryString` (URL), `loadTemplate` (templates/default), `finishVrcImport` (.vrc.json), and the WD-import block (`importWorkspaceDesignerFile`) |

## ConfigurableColor URL Encoding (`u` / `v`)

Items whose device definition has `configurableColor: true` and / or
`wdOpacity: true` (initially `box`, `carpet`, `stageFloor`) can carry
a custom fill color and / or opacity via the per-item `u` and `v`
prefixes.

### Format

| Letter | Field | Format | Examples |
|--------|-------|--------|----------|
| `u` | `data_fill` | `u{RRR}{GGG}{BBB}` (always 9 digits, zero-padded) | `u255255255` = `#FFFFFF`, `u015015015` = `#0F0F0F`, `u255170000` = `#FFAA00` |
| `v` | `data_opacity` | `v{NN}` (NN = opacity × 100, range 0–99) | `v50` = 0.50, `v0` = 0, `v75` = 0.75 |

- `u` is **omitted entirely** when `data_fill` is absent — the item
  falls back to the device's hardcoded fill (`#FFFFFF99` for box /
  carpet / stageFloor).
- `v` is **omitted entirely** when `data_opacity` is absent OR equals
  1.0 — the item falls back to full opacity.
- The encoder uses a session-lifetime `_hexToUrlRgbCache` Map so each
  unique hex only converts once per session (the URL is regenerated on
  every drag/resize/paste). The decoder runs only on URL load and has
  no cache.
- Order: `u` and `v` are emitted in `createShareableLinkItem()`
  immediately after the `t{n}` customItem reference and before the
  `~label~` block.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Hex → URL RGB (cached) | `hexToUrlRgb()` near `_layerUrlEncodeMap` global |
| URL RGB → hex (uncached) | `urlRgbToHex()` next to `hexToUrlRgb()` |
| Encoder | `createShareableLinkItem()` — block immediately after `t{n}` emission |
| Decoder | `parseShortenedXYUrl()` — block immediately after `r` (points) parsing |
| Tokenizer | `parseShortenedXYUrl()` uses `/[a-z]/` so `u` and `v` are accepted natively without any regex update |

## wallChairs Spacing URL Encoding (`x`)

`wallChairs` items can override the default 2.35 ft / 0.7163 m
chair-on-center spacing via the per-item `x` prefix. Both the default
value and the encoded value are **unit-native** — the value travels in
the URL in the same unit the room itself is in (`A1` = feet, `A0` =
meters), so a feet-mode URL never carries a meters-converted number
and vice versa.

### Format

| Letter | Field | Format | Examples |
|--------|-------|--------|----------|
| `x` | `data_chairSpacing` | `x{N}` where N = spacing × 100 in current unit | `x235` = 2.35 ft, `x300` = 3.00 ft, `x72` = 0.72 m |

- `x` is **omitted entirely** when `data_chairSpacing` is absent OR
  when it equals the current-unit default (2.35 ft / 0.7163 m × 100).
  The common case (every wallChairs row left at default) costs zero
  URL bytes.
- The encoder also gates on `item.data_deviceid === 'wallChairs'` so
  any other item that somehow carries a stray `data_chairSpacing`
  cannot emit `x` (which is reserved for chair spacing on items but
  also used inside `H{n}` / `J{n}` geometry blocks — the parser keys
  by `sid` so the meanings don't collide, but the encoder gate keeps
  the URL clean).
- The decoder mirrors the encoder gate (`newItem.data_deviceid ===
  'wallChairs'`); any `x{N}` token on a non-wallChairs item is
  silently ignored.

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Default constants | `DEFAULT_CHAIR_SPACING_FEET` / `DEFAULT_CHAIR_SPACING_METERS` near the top of `js/roomcalc.js` |
| Helper | `getChairSpacing(item, unit)` — central source for "what spacing does this row use right now" |
| Encoder | `createShareableLinkItem()` — block immediately after the dimensionLine `y`/`z` emission and before the `~label~` block |
| Decoder | `parseShortenedXYUrl()` — block immediately after the `y`/`z` dimensionLine decode |
| Tokenizer | `parseShortenedXYUrl()` uses `/[a-z]/` so `x` is accepted natively without any regex update |

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

## CustomItem URL Encoding

VRC CustomItems serialize via the room-level `J{n}` prefix and the
per-item `t{n}` reference. Mirror of the Group encoding above —
re-read the Group section for the full rationale; this section only
calls out the differences.

### Format

`J{num}x{x×100}[y{y×100}][z{z×100}]w{w×100}[h{h×100}][ll{layerNum}][f{rot×10}]~name~`

Same field set as `H` blocks; `J` is emitted **after** the `H` block(s)
and **before** items, so `ll`, `s`, and `t` references all resolve
in-order.

`customItemMembers` is rebuilt post-parse from items whose
`data_customItemId` matches the customItem's `customitemid`, so block /
item ordering doesn't matter.

### Item rule: `s` and `t` both suppress `ll`

When an item carries `s{n}` (group) and/or `t{n}` (customItem), the
encoder omits the per-item `ll`. On decode:

- `s` + `ll` together → per-item `ll` wins.
- `s` only → item inherits the group's layer.
- `t` only → item inherits the customItem's layer.
- `s` + `t` (item is in both) → group's layer wins (Option 1 design:
  Group selection takes precedence over CustomItem, so layer cascading
  follows the same rule).

### Why a separate per-item key (`t`) was chosen

A `t{num}` ref is encoded independently of `s{num}` so an item can be
in **both** a group and a customItem at the same time (Option 1
design). The encoder/decoder treats the two refs as independent.

`t` was chosen because it's the next free single letter alphabetically
after `s`. In May 2026 a long-standing bug was fixed in
`deleteBlankDotKeys()` inside `parseShortenedXYUrl()` — the old `if
(outputObj.t = '.')` was an assignment instead of a comparison, which
unconditionally stripped any `t` (and the associated `text`) from the
last object in the URL and from any object preceding a `_` repeat
marker. The corrected `if (outputObj.t === '.')` restores the
documented `t.` sentinel behaviour and lets `t{num}` round-trip
cleanly.

### Numbering

`_customItemUrlEncodeMap = {}` (customitemid → 1, 2, 3, …) is rebuilt
each `createShareableLink()` call, parallel to `_groupUrlEncodeMap`.
Flat, no reserved range. Empty customItems are skipped on encode and
dropped on decode (same rule as groups).

### Backwards compat

Old URLs without `J` / `t` load cleanly into a room with no
customItems. Existing groups (`H` / `s`) are unaffected. `t` was free
as a per-item attribute (see "Adding New Attributes" above which now
lists it as taken), and the bug fix in `deleteBlankDotKeys()` does not
affect any prior URL that did not carry `t` — i.e., every URL emitted
by VRC ≤ v0.1.645.

### Example with a Group + CustomItem

```
H1x140y180w180h200~My+Group~J1x100y100w120h150~My+CustomItem~AB150a200s1t1~Bar~MB300a400s1~Mic~
```

| Part | Meaning |
|------|---------|
| `H1x140y180w180h200~My+Group~` | Group #1 rect at (1.40, 1.80) m, 1.80 × 2.00 m |
| `J1x100y100w120h150~My+CustomItem~` | CustomItem #1 rect at (1.00, 1.00) m, 1.20 × 1.50 m |
| `AB150a200s1t1~Bar~` | Room Bar at (1.5, 2.0) m, member of BOTH group 1 and customItem 1 |
| `MB300a400s1~Mic~` | Mic at (3.0, 4.0) m, member of group 1 only |

### Implementation cross-reference

| Concern | Location |
|---------|----------|
| Encoder map | `_customItemUrlEncodeMap` global next to `_groupUrlEncodeMap` |
| Encoder room-level | `createShareableLink()` — immediately after the `H{n}` block emission |
| Encoder item-level + `ll` suppression | `createShareableLinkItem()` — `itemHasCustomItemRef` branch alongside `itemHasGroupRef` |
| Parser room-level | `parseShortenedXYUrl()` — `else if (item.sid === "J")` branch right after the `"H"` branch |
| Parser item-level | `parseShortenedXYUrl()` — `if ('t' in item)` block right after the `if ('s' in item)` block |
| Parser bug fix (`t.` sentinel) | `parseShortenedXYUrl()` → `deleteBlankDotKeys()` — corrected to `outputObj.t === '.'` |
| Post-parse member rebuild | `parseShortenedXYUrl()` — same loop that rebuilds `groupMembers`, walking `data_customItemId` instead |
| Defensive bounds rebuild | `roomObjToCanvas()` — `updateCustomItemBounds()` guarded by `if (!c.width \|\| !c.height)` |
