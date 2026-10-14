# Video Room Calculator context for Codex

This is the Codex adapter for the existing Claude developer context.
[AGENTS.md](../AGENTS.md) is the repository instruction entry point. Read it
first. In particular, commit each completed logical change after validation,
work on `codex/bomcgoni`, and never work directly on `main` unless explicitly
asked. These contribution rules override the Git policy in the shared
Claude references.

## Shared sources

[CLAUDE.md](../CLAUDE.md) remains the detailed developer reference. Read its
Development Notes and relevant feature sections before editing. Search its
headings to locate a feature rather than duplicating the full reference here.
Preserve both that file and [.claude/](../.claude/).

The adapter consists of:

| File | Purpose |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Automatically discovered repository instructions and Codex contribution policy |
| [CONTEXT.md](CONTEXT.md) | This context and reference map, read through AGENTS.md |
| [config.toml](config.toml) | Project defaults: `gpt-6.1-sol` with `medium` reasoning effort |
| [floorplan-to-vrc/SKILL.md](../.agents/skills/floorplan-to-vrc/SKILL.md) | Discoverable Codex wrapper around the existing Claude floor-plan workflow |

Codex discovers repository skills in `.agents/skills`. The wrapper reads the
original skill in `.claude/skills`, so fixes to that workflow are shared.
Project `.codex/config.toml` settings load for trusted projects; session or
CLI overrides can take precedence. See the official documentation for
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[skills](https://learn.chatgpt.com/docs/build-skills), and
[configuration](https://learn.chatgpt.com/docs/config-file/config-basic).

## Project orientation

Video Room Calculator designs Cisco collaboration rooms on a 2D Konva canvas
and exchanges designs with Cisco Workspace Designer for 3D visualization.
The application uses vanilla JavaScript and CSS with vendored Konva and
DOMPurify. There is no build step.

| Concern | Files |
| --- | --- |
| Entry point, layout, styling | `RoomCalculator.html`, `style.css` |
| Room state, interactions, rendering, import/export | `js/roomcalc.js` |
| Application and cache versions | `js/version.js` |
| Shared constants and namespace | `js/constants.js`, `window.VRC` |
| Workspace mappings and catalogues | `js/data/` |
| Unit conversion | `js/util/units.js` |
| Undo restore and local storage | `js/undoApply.js`, `js/idbStorage.js` |
| Templates | `js/templates.js` |
| Specialized editors | `js/pathEditor/`, `js/windowEditor/` |
| Device and furniture images | `assets/images/` |

Treat the live code as authoritative for current versions, script order, and
file locations. Some historical examples in the shared docs predate it.

## Essential data conventions

- `roomObj` holds the room design. `roomObj.items` is a flat array; derive an
  item's category from `allDeviceTypes[item.data_deviceid].parentGroup`.
  Preserve compatibility with legacy category-bucket imports.
- Use `roomObjItemsMap.get(id)` for individual lookups. Bucket once with
  `bucketItemsByParentGroup()` when reading multiple categories.
- VRC item properties such as `data_deviceid` and `data_zPosition` are plain
  JavaScript properties on Konva nodes, not Konva `setAttr()` attributes.
- A new persisted `data_*` field must survive item construction in
  `insertShapeItem()` and `insertTable()`, both branches of
  `updateRoomObjFromTrNode()`, and `copyToCanvasClipBoard()`. Check URL,
  unit conversion, import/export, and undo paths when applicable.
- VRC organizational layers differ from Konva rendering layers. Coverage
  overlays are Konva Groups controlled by `roomObj.overlaysVisible`.
- Certified-display catalogue indexes are persistent identifiers. Append
  entries; never reorder or remove existing entries.
- Workspace Designer exports use meters. Preserve the existing conversion
  and anchor conventions for each item type.

## Read references when relevant

| Task | Reference |
| --- | --- |
| Architecture or refactoring | [TECH_NOTES.md](../notes/TECH_NOTES.md) |
| Konva rendering or transforms | [TECH_NOTES_KONVA.md](../notes/TECH_NOTES_KONVA.md), [KONVA.md](../notes/KONVA.md) |
| Shareable links | [URL_ENCODING.md](../notes/URL_ENCODING.md) |
| Workspace Designer round trips | [WORKSPACE_DESIGNER.md](../notes/WORKSPACE_DESIGNER.md) |
| RoomOS configuration import/export | [XCONFIG.md](../notes/XCONFIG.md) |
| CAD exports | [DXF_EXPORT.md](../notes/DXF_EXPORT.md) |
| Layout and keyboard behavior | [UI_LAYOUT.md](../notes/UI_LAYOUT.md), [KEYBOARD_SHORTCUTS.md](../notes/KEYBOARD_SHORTCUTS.md) |
| Templates | [TEMPLATES.md](../notes/TEMPLATES.md) |
| Multi-room floor plans | [MULTI_ROOM_FLOOR_PLAN.md](../notes/MULTI_ROOM_FLOOR_PLAN.md) |
| Dependencies and PWA cache behavior | [DEPENDENCIES_AND_ISSUES.md](../notes/DEPENDENCIES_AND_ISSUES.md) |
| Upstream branch/release conventions | [GIT_WORKFLOW.md](../notes/GIT_WORKFLOW.md), subject to AGENTS.md's Codex Git policy |

## Local preview and validation

Open `RoomCalculator.html` directly, or run this from the repository root:

```sh
python3 -m http.server 8777 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8777/RoomCalculator.html`. This replaces the
machine-specific `vrc-static` path in `.claude/launch.json` for Codex use.
The other Claude launch entry (`collabapp`) points to an external Python
environment and scratch script absent from this repository. Use that
companion app only if its runtime is supplied for the task.

For application changes, check the console and the affected interactions in
a browser. Check responsive layouts for UI changes and save/load,
copy/paste, undo/redo, units, and relevant export round trips for state
changes. Follow AGENTS.md's build-version rule, review the diff, and commit
the completed logical change before moving on.
