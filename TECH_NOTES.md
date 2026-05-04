# Technical Notes & Refactor Targets

A running log of architectural debt, known workarounds, and refactor goals.
Future Claude sessions and the human author can use this to remember WHY
certain code looks the way it does and what the long-term direction is.

This file is **not** end-user documentation. It is engineering notes only.

For the catalogue of Konva.js footguns specific to this codebase
(selectors, `data_*` properties, Transformer behaviour, why
`stage.toJSON()` is not viable here, etc.), see `TECH_NOTES_KONVA.md`.
That file is lazy-loaded — open it on demand when touching Konva code.

---

## 1. setTimeout-based synchronization between roomObj and Konva

### Symptom

There are many `setTimeout(...)` calls scattered throughout `roomcalc.js`
that exist purely to delay an operation until "the canvas catches up".
Examples (non-exhaustive):

- `setTimeout(() => { canvasToJson(); }, 1000)` at the end of
  `getQueryString()` to let initial drawing complete before reading state.
- The undo flow zooms out before applying an undo (rather than just
  applying it in place), to avoid items disappearing when zoomed in.

### Root cause

`roomObj` (the in-memory state) and the Konva node graph (the canvas
representation) are two separate sources of truth that have drifted apart
in subtle ways:

- Mutations sometimes happen on Konva nodes first, sometimes on `roomObj`
  first. `canvasToJson()` is the reconciler.
- `drawRoom(true)` rebuilds the entire Konva graph from `roomObj`. This is
  the heavy hammer used after most state changes.
- Konva's own batching (`batchDraw()` uses `requestAnimationFrame`) means
  changes are not visible synchronously. Code that reads pixel positions
  immediately after a mutation gets stale data.
- Active room "zoom" mode (`isActiveRoomPart`) maintains a *transformed*
  view of the canvas; reapplying state while in this mode triggers
  ordering bugs because nodes are deleted before their replacements exist.

### Long-term direction (Phase 4 + 5)

1. **Single source of truth.** `roomObj` is canonical; Konva nodes are
   derived. Every user action mutates `roomObj` first, then a single
   `requestRedraw()` call reconciles Konva to match.
2. **Centralize redraws.** Replace ad-hoc `layer.batchDraw()` and
   `setTimeout(..., n)` calls with a debounced `requestRedraw()` queue
   that runs once per animation frame.
3. **Delta-based undo / redo (Phase 5).** Instead of snapshotting the
   entire `roomObj`, undo / redo records the *change*: which item, which
   field, before / after value. Applying an undo mutates the specific
   Konva nodes that changed instead of rebuilding the world. This:
   - Removes the need to zoom out before undo.
   - Makes undo / redo near-instant even on large rooms.
   - Reduces memory pressure (currently each snapshot is a full
     `structuredClone(roomObj)`).
4. **Audit and remove every `setTimeout(..., n)` that exists for sync
   reasons.** They are guesses, not guarantees. Replace each with either:
   - A `requestRedraw()` call followed by a microtask, OR
   - A direct, deterministic call after a Konva `batchDraw()`.

### Constraint

The user (and end users) must NOT see any UX change from this work. A bug
fix is the only justification for a behavior change.

---

## 2. Single-file architecture

### Current state

`roomcalc.js` is one ~26,000-line file containing every concern:
state, rendering, input handling, URL encoding, file I/O, exporters,
importers, layer system, etc.

### Direction (Phases 2 + 3)

Split into focused modules under `js/` using a `window.VRC` namespace
(no build step required). Suggested order:

1. Pure data: `js/data/workspaceKey.js`
2. Self-contained leaves: `js/util/uuid.js`, `js/util/geometry.js`,
   `js/util/units.js`
3. State + I/O: `js/state/layers.js`, `js/state/url.js`,
   `js/io/dxfExport.js`, `js/io/workspaceExport.js`,
   `js/io/workspaceImport.js`, `js/io/xconfig.js`
4. Rendering: `js/render/itemRender.js`, `js/render/wallBuilder.js`
5. Glue: a slim `js/main.js` that wires everything together.

### Convention

```javascript
window.VRC = window.VRC || {};
window.VRC.<module> = (function () {
    function publicFn() { /* ... */ }
    function privateFn() { /* ... */ }
    return { publicFn };
})();
```

Inside `roomcalc.js` (or its successor), bring locals back via aliasing so
the rest of the body barely changes:

```javascript
const layers = VRC.layers;
```

This keeps the diff per extraction small and reviewable.

---

## 3. Lazy loading

### Current

`qrcode.js` and `drpDownOverride.js` are lazy-loaded via
`setExternalScripts()` in `roomcalc.js`. Other large optional code
(`dxfWriter.js`, `dxfBlockLibrary.js`, `templates.js`) is eager-loaded
even though most users never use those features.

### Direction (Phase 1)

Lazy-load:
- `dxfWriter.js` + `dxfBlockLibrary.js` → only when the user clicks
  Export DXF.
- `templates.js` → only when the new-room dialog opens.

Use the improved `loadScriptOnce()` helper (added in Phase 0) which has
double-load protection and error handling.

---

## 4. Future feature impact on the refactor

These features are NOT to be built yet, but the refactor should make them
feasible without another big rewrite:

### Group functionality (PowerPoint-style)

- New top-level array `roomObj.groups: [{id, name, memberIds, transform}]`.
- Selection model becomes `{type: 'item' | 'group', id}`. Most current
  code assumes selection = list of leaf items.
- Render each group inside a `Konva.Group` so transforms cascade.
- Undo / redo must record group operations as a single user action.
- URL encoding gets a new uppercase prefix (`G` is taken by back wall;
  pick a free letter).

Refactor implication: centralize selection and "iterate all items"
operations so they can be made group-aware in one place.

### Improved zoom (native Konva pan + zoom)

- Replace `zoomInOut()` math with `stage.scale({x: z, y: z})` plus
  `stage.position()` for pan.
- Wheel + pinch handlers compute zoom around the pointer.
- Every coordinate conversion (mouse → world, world → label position,
  etc.) must go through a single helper that knows the current scale and
  pan offset.

Refactor implication: hunt down and centralize all `pxOffset`-based math
during Phase 3 so the zoom rewrite touches one place, not 200.

### Performance for large rooms

- Profile first.
- Likely wins: Konva `node.cache()` on static items, fewer Konva layers,
  throttled label updates, spatial index for hit testing, virtualized
  rendering of off-screen items.
- The delta-based undo / redo from item 1 above is also a perf win.

---

## 5. Logging conventions (for future modules)

- `console.error(...)` for actual bugs and unexpected failures.
- `console.warn(...)` for recoverable problems users may want to know about.
- `console.info(...)` for high-level lifecycle events (load, save, import,
  export).
- `console.debug(...)` for detail useful only when investigating an issue.
- Never log secrets, raw session IDs, or full unsanitized user input.

---

## 6. Things deliberately left as-is

These are NOT bugs and should not be "fixed":

- The IDs `'theCanvas'` and `'theId'` on the Konva stage are placeholders
  but harmless. Leave them.
- `layerBackgroundImageFloor` is a `Konva.Group` despite its name. The
  comment block above the declaration explains the history. Renaming it
  would touch many call sites for no functional gain. Defer until the
  rendering module is extracted (Phase 3).
