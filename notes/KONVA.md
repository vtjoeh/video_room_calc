# Konva.js Reference (VRC-specific)

A short reference for the Konva.js API conventions used throughout
`js/roomcalc.js`. The deep-dive on Konva footguns lives in
`TECH_NOTES_KONVA.md` — read that **first** before changing anything
that uses `Konva.*`.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
Konva-touching code.

Companion files:
- `../CLAUDE.md` — user-facing dev reference (has a short stub linking
  here for the deep dive).
- `TECH_NOTES_KONVA.md` — the catalogue of Konva.js footguns specific
  to this codebase (selectors, the `data_*` JS-property convention,
  Transformer scale-not-size, why `stage.toJSON()` is NOT viable here,
  the `tr.nodes([])`-detach-before-bulk-mutate speed pattern, etc.).

---

**IMPORTANT:** Konva.js uses CSS-like property names in JavaScript
objects, but these are NOT CSS properties. Do not confuse them.

## Konva Properties vs CSS

```javascript
// This is KONVA (JavaScript object), NOT CSS:
new Konva.Rect({
  x: 100,
  y: 200,
  width: 50,
  height: 30,
  fill: 'blue',           // Konva property, not CSS
  stroke: '#ccc',         // Konva property, not CSS
  strokeWidth: 2,         // Konva property (camelCase, not stroke-width)
  cornerRadius: 5,        // Konva property
  opacity: 0.5,           // Konva property
  rotation: 45,           // Konva property (degrees, not CSS transform)
  draggable: true         // Konva property
});
```

## Key Differences from CSS

| Konva | CSS Equivalent | Notes |
|-------|----------------|-------|
| `fill` | `background-color` | Konva uses `fill` for shapes |
| `stroke` | `border-color` | Konva uses `stroke` for outline |
| `strokeWidth` | `border-width` | camelCase in Konva |
| `cornerRadius` | `border-radius` | camelCase in Konva |
| `rotation` | `transform: rotate()` | Degrees as number, not string |
| `x`, `y` | `left`, `top` | Direct coordinates |
| `listening` | - | Whether shape receives events |
| `visible` | `display`/`visibility` | Boolean in Konva |

## Common Konva Methods Used in VRC

```javascript
// Creating shapes
new Konva.Line({ points: [x1,y1,x2,y2], stroke: '#000' })
new Konva.Rect({ x, y, width, height, fill })
new Konva.Circle({ x, y, radius, fill })
new Konva.Image({ x, y, image, width, height })
new Konva.Group({ x, y, rotation })
new Konva.Text({ x, y, text, fontSize, fill })

// Transformations
shape.x()           // Get x position
shape.x(100)        // Set x position
shape.rotation()    // Get rotation in degrees
shape.rotation(45)  // Set rotation
shape.scale({ x: 2, y: 2 })

// Layer management
layer.add(shape)
layer.draw()
layer.batchDraw()

// Events
shape.on('click', handler)
shape.on('dragend', handler)

// Attributes
shape.setAttrs({ fill: 'red', opacity: 0.5 })
shape.getAttr('fill')
shape.attrs  // All attributes object
```

## VRC-Specific Konva Patterns

```javascript
// Items store data in Konva node attributes
node.data_deviceid = 'roomBar';
node.data_zPosition = 0.9;
node.data_labelField = 'My Label';

// Access via attrs
const deviceId = node.attrs.data_deviceid;

// The transformer for selection
const tr = new Konva.Transformer({
  nodes: [selectedShape],
  rotationSnaps: [0, 90, 180, 270]
});
```
