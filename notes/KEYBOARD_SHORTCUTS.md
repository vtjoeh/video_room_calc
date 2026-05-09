# Keyboard Shortcuts

Canonical list of every keyboard shortcut bound in `js/roomcalc.js`.
This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when adding,
renaming, or debugging a shortcut.

The current bindings live in the keyboard handler near `onkeydown` /
`addEventListener('keydown', …)` in `js/roomcalc.js`.

| Shortcut | Action |
|----------|--------|
| `Space` | Quick add menu |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Shift+Ctrl+Z` | Redo |
| `Ctrl+R` | Rotate 90° |
| `Ctrl+G` | Group selected items (≥2 items required) |
| `Ctrl+Shift+G` | Ungroup (dissolve, keep items) |
| `Ctrl+S` | Save/Download JSON |
| `Ctrl+E` | Export to Workspace Designer |
| `Ctrl+Shift+E` | Export to Cisco xConfiguration .txt |
| `Ctrl+Shift+D` | Export to AutoCAD R12 DXF |
| `Ctrl+I` | Import file |
| `Delete` / `Backspace` | Delete selected |
| `Esc` | Deselect all |
| `C` | Toggle camera coverage |
| `M` | Toggle microphone coverage |
| `D` | Toggle display coverage |
| `Arrow keys` | Move selected items |

`Cmd` is accepted in place of `Ctrl` on macOS for every shortcut above.
