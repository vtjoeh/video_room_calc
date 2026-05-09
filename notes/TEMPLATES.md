# Templates System

Pre-built room templates surfaced in the **Templates** tab of the
"New room" dialog (`#newRoomDialog`). Each template is a single
encoded `?x=…` URL that `loadTemplate(url)` decodes into a fresh
`roomObj`.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when adding a
new template, changing the templates dialog, or reasoning about the
loading-placeholder dance in `populateTemplates()`.

---

Templates are defined in `js/templates.js`:

```javascript
const templates = [
  {
    id: 'round-angle',
    name: 'Round corner table at angle',
    image: 'round-angle.png',
    url: 'A1v0.1.608b2402c2300...',  // Encoded room state
    note: 'Optional note',
    noteUrl: 'https://...'  // Optional link
  },
  // ...
]
```

Templates are loaded via the `loadTemplate(url)` function. The
`templates` array is lazy-loaded from `js/templates.js` on the first
open of `newRoomDialog` (single-flight via
`ensureTemplatesPopulated()`); see `populateTemplates()` in
`js/roomcalc.js` for the placeholder-swap and "Reload last design"
tile insertion details.

Template thumbnail images live under
`assets/images/templates/<image>` and are sized to fit a fixed 120 px
height in `.room-template img` (width follows aspect ratio after
load — see the loading-state width pin in `style.css` and the
`.loaded` class transition in `createTemplateButton()`).
