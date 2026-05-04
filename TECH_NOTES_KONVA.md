# Konva Traps & Gotchas (VRC-specific)

A reference of every Konva.js footgun that has bitten — or is likely to
bite — work on `roomcalc.js`. Read this **before** touching anything
that uses `Konva.*`, especially selectors, transforms, custom node
attributes, or the `roomObj` ↔ canvas sync.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
Konva-touching code.

Companion files:
- `CLAUDE.md` — user-facing dev reference (has a short Konva.js Notes
  section that points here for the deep dives).
- `TECH_NOTES.md` — engineering log of refactor targets and known
  workarounds (e.g. the `setTimeout` cluster around `batchDraw()`).

---

## 1. Selectors are NOT CSS — they are tiny

`Container.find(selector)` supports **only** four things:

- `#id`               — literal id match
- `.name`             — literal name match
- `Type` / ClassName  — e.g. `Rect`, `Image`, `Group`
- Comma-separated lists of any of the above (e.g. `'Image, Rect, Circle'`)

It does **NOT** support any of:

- Wildcards: `*`, `^=`, `$=`, `*=`, `:contains()`
- Combinators: descendant (` `), child (`>`), sibling (`~`, `+`)
- Attribute selectors: `[name=value]`
- Pseudo-classes: `:first-child`, `:not()`, etc.
- Partial / prefix / suffix matching of any kind

### VRC-specific traps from this rule

The IDs `#audio~<uuid>`, `#fov~<uuid>`, `#dispDist~<uuid>`,
`#label~<uuid>`, `#speaker~<uuid>` (used at e.g. `roomcalc.js:260-280,
9788-9792`) work **only because Konva does literal string matching on
the id attribute** — not because `~` is a CSS combinator. Do NOT
"normalize" or "fix" these IDs without thinking; you would break every
coverage-shading lookup in the codebase.

To find "all `audio~*` nodes" you cannot use a selector at all. Do:

```javascript
stage.find('Image').filter(n => n.id().startsWith('audio~'));
```

---

## 2. `find()` vs `findOne()` return shapes

| Method                  | Return type                    | When match fails |
|-------------------------|--------------------------------|------------------|
| `container.find(sel)`   | `Konva.Collection` (Array-like)| empty array      |
| `container.findOne(sel)`| `Konva.Node \| undefined`      | `undefined`      |

The codebase uses both: `stage.find('#' + id)[0]` (lines 567, 7339,
9434) and `stage.findOne('#' + id)`. Both work. `findOne` is preferred
for id lookups (clearer intent, one fewer indirection).

Do NOT chain `.attrs` or `.id()` directly off `find('#…')` without the
`[0]` — `find()` returns the collection, not the node.

---

## 3. Konva ids are NOT enforced unique

`Konva.Node.id()` says "Id is global for whole page" but Konva does not
check it. `find('#foo')` returns **every** node with id `'foo'`, not
just the first.

VRC dodges this by using UUIDs. Do not introduce a hand-written id
without confirming it is unique across the entire stage tree.

---

## 4. `name` is multi-valued like CSS class, not a single string

```javascript
node.name('foo bar');   // sets TWO names: 'foo' and 'bar'
node.hasName('foo');    // true
node.hasName('bar');    // true
find('.foo');           // matches it
find('.bar');           // also matches it

node.addName('baz');    // now 'foo bar baz'
node.removeName('bar'); // now 'foo baz'
```

Common mistake: writing `node.name('selected')` to "add a class" —
that **replaces** the name list, dropping any previous names.

---

## 5. zIndex is an array index, NOT CSS z-index

`shape.zIndex(2)` reorders the node within its parent's `children`
array only. The Konva docs are explicit:

> You can't use `zIndex` to set absolute position of the node, like we
> do in CSS. Konva draws nodes in the strict order as they are defined
> in the nodes tree.

Practical consequences:

- You cannot make a child of `layerA` paint above a child of `layerB`
  via zIndex — you need `node.moveTo(otherContainer)`.
- `shape.zIndex(99)` on a parent with 5 children silently caps at 4.
- `shape.zIndex() === shape.getParent().children.indexOf(shape)` is
  always true.

VRC has THREE different "z-axis" concepts; do not mix them up:

1. **VRC layers** (`roomObj.layers[]`) — logical grouping with
   show/hide/lock. See `CLAUDE.md` → "VRC Layer System".
2. **Konva layers** (`layerGrid`, `layerTransform`, `grShadingCamera`,
   etc.) — separate `<canvas>` elements stacked in the DOM.
3. **Konva `zIndex`** — sibling-array order within a single Konva
   layer or group.

---

## 6. Konva attributes are GETTER/SETTER FUNCTIONS, not bare properties

```javascript
node.x(50);               // ✅ sets, triggers Konva bookkeeping
node.x = 50;              // ❌ silently ignored by Konva, no redraw
node.fill('red');         // ✅
node.fill = 'red';        // ❌ no-op visually
node.setAttrs({x: 50, fill: 'red'}); // ✅ batches multiple at once
```

### CRITICAL: VRC-specific exception — custom `data_*` properties

VRC stores custom state as **direct JS properties** on the Konva node:

```javascript
node.data_layerId = 'uuid';
node.data_zPosition = 0.9;
node.data_labelField = 'My Label';
```

This works because **nothing in Konva reads these fields** — they're
plain JS-object properties, kept in sync manually by `canvasToJson()`
(see `CLAUDE.md` → "Critical Data Flow: Item Updates").

Two completely separate storage systems:

| Pattern                                | Stored in      | In `node.attrs`? | In `toObject()`/`toJSON()`? |
|----------------------------------------|----------------|------------------|------------------------------|
| `node.data_xxx = …` *(VRC convention)* | JS object slot | ❌ No            | ❌ No                        |
| `node.setAttr('data_xxx', …)`          | `node.attrs`   | ✅ Yes           | ✅ Yes                       |

**Never mix the two on the same field.** Reading via `node.data_xxx`
will not see a value written via `setAttr('data_xxx', …)`, and vice
versa. The codebase uniformly uses the first pattern; keep it that way
unless you do a wholesale migration.

This is also why `Konva.Node.create(json)` is **not viable** for VRC's
persistence model — see trap #23.

---

## 7. Transformer changes scaleX/scaleY, NOT width/height

When the user drags a `Konva.Transformer` handle to resize a shape,
the underlying node's `scaleX` and `scaleY` change. `width()` and
`height()` are **unchanged**.

```javascript
const rect = new Konva.Rect({width: 100, height: 100});
// user resizes to twice as wide via Transformer
rect.width();   // still 100
rect.scaleX();  // 2
// visible width = width * scaleX = 200
```

Common Claude error: writing `if (node.width() > 200) …` and missing
the user's resize entirely. To "bake" the resize into width/height in
the `transformend` handler:

```javascript
node.on('transformend', () => {
    node.width(node.width() * node.scaleX());
    node.height(node.height() * node.scaleY());
    node.scaleX(1);
    node.scaleY(1);
});
```

---

## 8. `width()` / `height()` semantics differ by shape class

| Shape class                       | `width()` / `height()` returns…                     |
|-----------------------------------|-----------------------------------------------------|
| `Rect`, `Image`, `Text`           | Real stored attrs                                   |
| `Circle`                          | `radius() * 2` (computed); setter calls `radius()`  |
| `RegularPolygon`, `Star`, `Wedge`, `Ring`, `Ellipse` | Computed from radius/sides    |
| `Line`, `Path`, `Arrow`, `Konva.Shape` (custom sceneFunc) | Bounding box of points/sceneFunc — setter usually no-ops |
| `Group`                           | Whatever you set (or 0). NOT auto-sized from children |

For `Group`, use `group.getClientRect()` to get the children's
bounding box. Do not assume `group.width()` reflects content.

---

## 9. `getClientRect()` defaults

`node.getClientRect()` includes **stroke and shadow** by default and
applies the node's transform.

```javascript
// What you usually want for snap-to-grid / collision:
node.getClientRect({ skipStroke: true, skipShadow: true });

// What you want for local-space size (no transform):
node.getClientRect({ skipTransform: true });

// Compute relative to a specific ancestor:
node.getClientRect({ relativeTo: someParentGroup });
```

Performance: on a `Group` with thousands of children it recurses and
is expensive. Cache the result if you call it in a loop.

---

## 10. Position vs. offset vs. rotation origin

- `x`, `y` is the position of the node's **origin**.
- Default origin:
  - `Rect`, `Image`, `Text`, `Sprite` → top-left
  - `Circle`, `RegularPolygon`, `Star`, `Wedge`, `Ring`, `Ellipse` → center
- `offsetX`, `offsetY` shifts the origin **within the shape** —
  **AND the visual position moves too**, so you typically have to
  compensate by adjusting `x`/`y` by the same amount.
- Rotation is around the (post-offset) origin.

```javascript
// Rotate a rectangle around its center:
const rect = new Konva.Rect({
    x: 100, y: 100, width: 50, height: 50,
    offsetX: 25, offsetY: 25,   // origin is now the center
    rotation: 45,                // rotates around that center
});
// But note: visually the rect is now centered at (75, 75),
// not (100, 100) — you'd need x: 125, y: 125 to keep it visually
// in the same place as the un-offset version.
```

VRC has lots of "rotation-aware center" math (`getNodeCenter()`,
pivot rotations in `exportDxfFile()`, etc.). When changing any of
it, remember: a rotated `Rect` at `(x, y)` has its `x, y` at the
**un-rotated top-left** (assuming default offset), not the visual
top-left after rotation.

---

## 11. Cancel event bubble: Konva ≠ DOM

Konva nodes have their own event bubbling model, separate from the DOM.

```javascript
node.on('click', (e) => {
    e.target;              // The Konva node that was clicked (NOT a DOM element)
    e.currentTarget;       // The Konva node whose listener is firing (this `node`)
    e.evt;                 // The native browser event object

    e.cancelBubble = true; // Konva-specific: stops bubbling to parent Konva nodes
    e.evt.stopPropagation(); // Native: stops bubbling to DOM listeners
    e.evt.preventDefault();  // Native: prevents default browser action (e.g. scroll)
});
```

Common mistake: writing `e.stopPropagation()` inside a Konva listener
— that method does not exist on the Konva event wrapper, and the call
will silently throw `TypeError: e.stopPropagation is not a function`
or be a no-op depending on the wrapper version.

Note: `roomcalc.js:789` calls `e.stopPropagation()` and that works
*only* because that handler is bound to a native DOM element, not a
Konva node. Do not copy that pattern into a Konva listener.

---

## 12. `batchDraw()` is async (rAF), `draw()` is sync

`layer.batchDraw()` schedules a redraw on the next `requestAnimationFrame`.
The canvas pixels are NOT updated synchronously.

This is the root cause of the `setTimeout(..., n)` cluster documented
in `TECH_NOTES.md` item 1. Anything that reads pixel-derived data
(`stage.toDataURL()`, hit tests, `getClientRect()` after a transform
change in some cases) will get **stale results** if you call it
immediately after a `batchDraw()`.

Use `layer.draw()` (synchronous) when you need pixels updated right
now (e.g. immediately before `toDataURL()`). Otherwise prefer
`batchDraw()` for performance.

---

## 13. `destroy()` vs `remove()` — memory leaks

| Method                       | Detaches from parent? | Tears down listeners / hit graph / cache? | Reusable after? |
|------------------------------|-----------------------|--------------------------------------------|-----------------|
| `node.remove()`              | ✅ Yes               | ❌ No                                      | ✅ Yes          |
| `node.destroy()`             | ✅ Yes               | ✅ Yes                                     | ❌ Never        |
| `container.removeChildren()` | ✅ all                | ❌ No                                      | ✅ Yes          |
| `container.destroyChildren()`| ✅ all                | ✅ Yes                                     | ❌ Never        |

Forgetting to `destroy()` an unused node leaks memory (the node, its
listeners, and any cached canvas buffers stay alive). Calling
`destroy()` on a node you intend to reuse later is also a bug —
re-adding it to a layer will silently misbehave.

---

## 14. Caching pitfalls

- `node.cache()` snapshots the node onto an off-screen canvas. After
  caching, **mutations to the node do not appear on screen** until you
  call `node.clearCache()` (or re-cache).
- Function-style filters (`Konva.Filters.Blur`, `Konva.Filters.Invert`,
  etc.) **require** the node to be cached first.
- CSS-string filters (`'blur(5px)'`) do NOT require caching.
- Caching a `Group` with thousands of children is usually a big perf
  win. Caching every leaf shape individually is usually a perf LOSS
  (every cache creates several canvas buffers — memory cost).

Rule of thumb: cache a node if it (a) is complex and (b) doesn't
change often, but is redrawn frequently.

---

## 15. `Konva.Image` requires an already-loaded image

```javascript
new Konva.Image({ image: htmlImg });
```

`htmlImg` must be one of:
- a **fully loaded** `HTMLImageElement` (`img.complete === true`)
- an `HTMLCanvasElement`
- an `HTMLVideoElement`
- an `ImageBitmap`

Passing an `<img>` whose `src` hasn't finished loading produces a
blank node and **no error**. Always wait on `img.onload`, or use
`Konva.Image.fromURL(url, callback)`.

VRC loads device images at startup and caches them; new image types
must follow the same pattern.

---

## 16. `toDataURL()` and tainted canvas

- `stage.toDataURL()` reads the **current** pixel buffer. If you
  haven't called `stage.draw()` (sync) since the last mutation, you
  will export a stale frame. `batchDraw()` is NOT enough.
- Any image loaded cross-origin without proper CORS taints the
  canvas. `toDataURL()` then throws `SecurityError: Tainted canvases
  may not be exported`.

VRC currently loads user-uploaded background images via IndexedDB →
object URL, so it is safe. A casual change to "load a remote logo
image" could break PNG export silently.

---

## 17. `node.to({...})` (Tween) is async

```javascript
node.to({ x: 100, duration: 1 });
console.log(node.x()); // still the OLD value — tween is in progress
```

Use the `onFinish` callback:

```javascript
node.to({
    x: 100,
    duration: 1,
    onFinish: () => console.log(node.x()), // 100
});

// Or with await:
await new Promise(r => node.to({ x: 100, duration: 1, onFinish: r }));
```

VRC does not currently use `to()` heavily, but if a tweened animation
gets added (e.g. for the undo/redo Phase 5 work in `TECH_NOTES.md`),
remember this.

---

## 18. Transformer needs `forceUpdate()` after silent attr changes

If you mutate a node's `width` / `height` / `x` / `y` programmatically
**while a `Konva.Transformer` is attached to it**, the transformer
handles can desync from the node.

```javascript
tr.nodes([rect]);
rect.width(200);     // handles are now in the wrong place
tr.forceUpdate();    // resync
```

VRC mostly avoids this because `drawRoom(true)` rebuilds the world
and reattaches the transformer. But the planned delta-based undo
(`TECH_NOTES.md` item 1, Phase 5) will introduce targeted edits that
WILL hit this — wire `tr.forceUpdate()` into any code path that
mutates a tracked node's geometry.

---

## 19. `dragBoundFunc` works in ABSOLUTE coordinates

```javascript
node.dragBoundFunc(function (pos) {
    // pos is the ABSOLUTE stage position the user is trying to drag to
    // you MUST return ABSOLUTE position
    return {
        x: this.absolutePosition().x, // lock x — only allow vertical drag
        y: pos.y,
    };
});
```

Returning relative-to-parent coordinates causes the node to teleport.
This is especially confusing when the node is inside a transformed
group (which VRC has when zoom mode is on — `isActiveRoomPart`).

---

## 20. `clipFunc` masks rendering, NOT hit-testing

A clipped child still receives events in its un-clipped area unless
you also disable listening on it. Not currently a VRC issue, but
worth knowing if clip-based UI features get added.

---

## 21. Stage zoom & pan affect coordinate math

`stage.scale()` and `stage.position()` change the conversion between
mouse pixels and "world" coordinates. The right way to do conversions:

```javascript
stage.getPointerPosition();           // pixels relative to stage container
node.getRelativePointerPosition();    // local to `node`'s coordinate system
stage.getRelativePointerPosition();   // local to stage's coordinate system
                                      //   (accounts for stage scale/position)
```

VRC currently does its own `pxOffset`-based math (see `TECH_NOTES.md`
item 4 — "Improved zoom"). When the planned native-zoom rewrite
happens, every `mouse → world` conversion **must** go through these
helpers, not raw `mouse.x` / `mouse.y` arithmetic.

---

## 22. Only `Konva.Layer` should be a direct child of `Konva.Stage`

`stage.add(group)` is invalid. Konva 9+ logs a console warning and
the hit graph misbehaves. The hierarchy is always:

```
Stage → Layer → (Group | Shape) → ...
```

Never shorten "stage → layer → group" to "stage → group".

---

## 23. `Konva.Node.create(json)` does NOT restore everything

`stage.toJSON()` / `Konva.Node.create(json)` is **not viable** as
VRC's persistence model. The serialization explicitly excludes:

- Event listeners (`.on('click', …)` etc.)
- Image bitmaps (the `image:` attr is dropped)
- Custom `sceneFunc` / `hitFunc` for `Konva.Shape`
- **All custom JS properties**, including every `data_*` field VRC
  uses (because they are not in `node.attrs` — see trap #6)

The Konva docs themselves recommend "use your own state object as the
source of truth and recreate the canvas from it" — which is exactly
what VRC does:

- `roomObj` is the source of truth.
- `drawRoom(roomObj2 → Konva nodes)` is the recreate step.
- `canvasToJson()` is the reverse-sync reconciler.

This is an **intended design**, not technical debt. Do not be tempted
to "simplify" it by leaning on `stage.toJSON()` — you would lose
every `data_*`, every event handler, and every image. The right
direction is the one already documented in `TECH_NOTES.md` item 1
(single source of truth, debounced redraw, delta-based undo).

---

## 24. `node.setAttrs({...})` MERGES, it does not REPLACE

```javascript
const rect = new Konva.Rect({ x: 0, y: 0, fill: 'red', stroke: 'black' });
rect.setAttrs({ fill: 'blue' });
// stroke is STILL 'black' — setAttrs is Object.assign, not cssText overwrite
```

To clear an attribute, set it explicitly to `undefined` or `null`,
or recreate the node.

---

## 25. `globalCompositeOperation` does NOT affect the hit graph

Setting `globalCompositeOperation: 'destination-out'` (eraser-style
draw) hides pixels visually but the node is still hit-detected as if
it were drawn normally. VRC does not currently use composite ops; if
eraser-style features are ever added, plan for separate
`listening: false` handling.

---

## Quick checklist before editing Konva code

- [ ] Am I about to write a CSS-style selector? → Re-read trap #1.
- [ ] Am I assigning to `node.x` / `node.fill` / etc. directly? → Use the function form (trap #6).
- [ ] Am I adding a new `data_*` field? → Update all FOUR sites listed in `CLAUDE.md` → "Critical Data Flow" (and remember it is a JS-object slot, not a Konva attr — trap #6).
- [ ] Am I reading a node's pixel-derived state right after `batchDraw()`? → Use `draw()` instead, or defer (trap #12).
- [ ] Am I calling `e.stopPropagation()` inside a Konva listener? → It is `e.evt.stopPropagation()` for DOM, or `e.cancelBubble = true` for Konva (trap #11).
- [ ] Am I caching a node? → Remember `clearCache()` after every mutation (trap #14).
- [ ] Am I about to write `stage.toJSON()` for persistence? → Don't. Use `roomObj` (trap #23).
