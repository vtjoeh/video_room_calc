# Color / Opacity Picker

Custom fill color + opacity control. Replaces the native `<input type="color">`,
which misbehaved across browsers and obscured the canvas.

## Where it appears

- **Details -> Items** (`#fillDiv`): inputs `#itemFill` / `#itemOpacity`, swatch `#itemFillSwatch`.
- **Wall Builder** (`#fillDiv2`): inputs `#itemFill2` / `#itemOpacity2`, swatch `#itemFillSwatch2`.

Each row is a single line: a `Color:` label + a clickable swatch button. The
hex and opacity stay **separate values**.

## Source of truth

`#itemFill*` (hex, e.g. `#FFFFFF`) and `#itemOpacity*` (blank = no override,
defaults to 1) are `type="hidden"` inputs. Every existing read in `roomcalc.js`
(`updateFormatDetails`, the save pipeline, the Wall Builder insert) keeps using
`.value` unchanged. `#FFFFFF` is the "no color override" sentinel; an explicit
white needs e.g. `#FEFEFE`.

## Inline swatch

`updateFillSwatch(fillId, opacityId, swatchId)` in `roomcalc.js` paints the
swatch: the chosen hex shown at the chosen opacity over a CSS checkerboard. It
lives in `roomcalc.js` (not the lazy picker) so swatches render on item-select
before the picker is ever loaded. Exposed on `window` so the picker can refresh
it live.

## Popover (`js/colorPicker.js`)

- **Lazy-loaded** by `openFillPicker(which)` via `loadScriptOnce(SCRIPT_COLOR_PICKER)`
  on the first swatch click only.
- A **CSS popover** (not a modal) anchored above-left of the swatch and clamped
  to the viewport. No dimming backdrop, so the canvas stays visible. Closes on
  Done, Esc, or an outside pointerdown.
- Contents: saturation/value box + hue slider, an editable/paste-able **HEX**
  field with a copy button, an **opacity** slider + number (%), a live preview,
  and **Reset to default**.
- Writes back to the hidden inputs + swatch on every change and fires the
  optional `onApply` callback (debounced 250 ms). Details mode passes
  `onApply = updateItem`; Wall Builder passes `null` (values are read at insert
  time).
- `data-show-color` / `data-show-opacity` on the swatch (set in
  `updateFormatDetails` from the device-def `configurableColor` / `wdOpacity`
  flags) tell the picker which sections to display.

## Public API

```js
window.VRC_openColorPicker({ fillId, opacityId, swatchId, showColor, showOpacity, onApply });
```
