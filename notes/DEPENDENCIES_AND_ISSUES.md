# External Dependencies & Common Issues

A short reference for runtime third-party dependencies and a quick
troubleshooting cheat sheet.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when wiring up
a new CDN dependency or diagnosing a reported runtime issue.

---

## External Dependencies (CDN)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

All other dependencies are local in the `js/` folder. There is **no**
build step — every JS file under `js/` is loaded directly from disk.
The eager-loaded `<script>` order is `konva.min.js` → `constants.js` →
`data/workspaceKey.js` → `util/uuid.js` → `util/units.js` →
`undoApply.js` → `idbStorage.js` → `templates.js` → `roomcalc.js`.
Lazy-loaded modules (`qrcode.js`, `drpDownOverride.js`, `dxfWriter.js`,
`dxfBlockLibrary.js`, `migrateLegacyItemsShape.js`) are pulled in on
demand by `loadScriptOnce()`.

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Canvas not rendering | Check browser console for Konva errors |
| Images not loading | Verify paths in `assets/images/` |
| URL too long | Room has too many objects (>500), use JSON file instead |
| Workspace Designer export fails | Check `workspaceKey` mapping exists |
