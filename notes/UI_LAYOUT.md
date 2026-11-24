# HTML Structure & CSS Organization

A reference for the page structure of `RoomCalculator.html` and the
layout / styling conventions in `style.css`.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when working on
the dialog/sidebar/canvas layout, adding a new dialog, or changing
responsive behavior.

The HTML and CSS rarely change shape; when you do touch them, prefer
reading the actual source files (`RoomCalculator.html`, `style.css`)
which are always the source of truth — this file is just a quick map.

---

## Main Layout (Three-Column)

```
┌─────────────────────────────────────────────────────────┐
│                    ContainerHeader                       │  <- Fixed top bar
├──────────────┬─────────────────────────┬────────────────┤
│   sidebar    │   ContainerRoomSvg      │                │
│              │   ┌─controlButtons─┐    │                │
│  Room Tab    │   │ [cam][mic][dsp]│    │                │
│  Equipment   │   └────────────────┘    │                │
│  Details     │   ┌─scroll-container─┐  │                │
│              │   │                   │  │                │
│              │   │   Canvas (Konva) │  │                │
│              │   │                   │  │                │
│              │   └───────────────────┘  │                │
└──────────────┴─────────────────────────┴────────────────┘
```

## Key HTML Element IDs

| ID | Purpose |
|----|---------|
| `ContainerHeader` | Top navigation bar |
| `sidebar` | Left panel with tabs |
| `ContainerRoomSvg` | Canvas container |
| `canvasDiv` | Konva stage mount point |
| `scroll-container` | Scrollable canvas wrapper |
| `controlButtons` | Toolbar above canvas (incl. `btnWallBuilder` — Wall Builder toggle, `icon-pen-bold`) |

## Sidebar Tabs (2026-07 redesign)

Main tabs (`openTab()`): **Room** (`defaultOpenTab` → `#Room`),
**Equipment** (`tabEquipment` → `#Insert`), **Layers** (`tabLayers` →
`#Layers`), **Details** (`tabItem` → `#Item`).

**Room** carries the room-level sub-tabs (`openSubTab2()`, scoped to the
clicked bar's `.tabcontent`):

| Button id | Panel id | Contents |
|-----------|----------|----------|
| `subTabRoomSetup` | `RoomSetup` | name / unit / W×L×H / software / rotate / version / `#quickSetup` |
| `subTabDefaultWalls` | `DefaultWalls` | wall picker, material, acoustic, door location |
| `subTabRoomFloorPlan` | `BackgroundImage` | floor-plan upload, 2-point scale, opacity, move/delete |
| `detailsSettings` | `SettingDetails` | app settings, WD site, Custom Item export, storage |

**Details** (`#Item`) is a pure item inspector — NO sub-tab bar.
`#ItemDetails` keeps class `subtabcontent2` (styling + scroll hints)
and stays permanently `display:block`; `openSubTab2()` is scoped via
`closest('.tabcontent')` so Room sub-tab switching can never hide it.
Programmatic navigation: `tabItem.click()` alone opens the inspector;
room-level panels need `defaultOpenTab.click()` + the sub-tab button's
`.click()`. (`subTabItemDetails` no longer exists — do not reference.)

## Dialog Modals

| ID | Purpose |
|----|---------|
| `newRoomDialog` | New room / templates dialog |
| `dialogSave` | Save/export options |
| `dialogQuestions` | Help and documentation |
| `modalWorkspace` | Workspace Designer preview |
| `dialogQuickAdd` | Quick add search (spacebar) |

---

## Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.ContainerHeader` | Fixed header bar |
| `.ContainerInputsFeedback` | Sidebar panel containers |
| `.tabcontent` | Tab panel content |
| `.subtabcontent` | Nested tab content |
| `.inputField` | Form field wrapper |
| `.button` | Primary button style |
| `.btn` | Icon button in toolbar |
| `.button-group` | Grouped toolbar buttons |
| `.flexItems` | Equipment menu items |
| `.dialog` | Modal dialog base |
| `.tooltip` | Hover tooltip |

## Momentum Design

The main page, FAQ, release notes and both editors use the stable Webex theme
tokens and typography from `assets/momentum-tokens.css`. The header's Theme
selector defaults to System and remembers the user's choice on this browser.
It uses Momentum's select pattern with an in-page listbox below the trigger.
`js/theme.js` applies the saved preference before the page paints and follows
`prefers-color-scheme` changes in System mode. The appearance preference is
stored separately from room files and survives the app's local data reset.
The room canvas, editor canvases and equipment thumbnails use light surfaces
to keep drawing colors and dark equipment artwork readable in either theme.
[Momentum color and theming](https://momentum.design/en/foundations/color/)

The app loads a local copy of Inter and the Momentum icon font. When updating
the icon package, copy the glyph mappings used by the HTML and JavaScript from
the same package version as `MomentumFontIcon.woff2`. Use `currentColor` for
monochrome interface icons so the surrounding control sets their color.
[Momentum icon catalog](https://momentum.design/en/tokens/icons/)

## Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| `max-width: 900px` | Sidebar overlays canvas and main header actions switch to icons |
| `max-width: 783px` | Full-screen dialogs |
| `max-width: 650px` | Hide the header title and compact the Theme and 3D View controls |
| `max-width: 405px` | iPhone SE specific adjustments |
