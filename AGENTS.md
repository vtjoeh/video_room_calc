# Video Room Calculator: shared instructions for AI tools

This is the one file every AI tool starts from. Codex reads it on its own,
and Claude loads it through the `@AGENTS.md` line at the top of `CLAUDE.md`.
Keep it short: Codex only reads the first 32 KB, so detail belongs in the
files it points to.

## What this is

A browser app for laying out Cisco video meeting rooms on a 2D canvas, with a
round trip to Cisco's Workspace Designer for 3D. Vanilla JavaScript and
Konva.js, every library vendored in `js/`, no build step. To run it, serve this
folder with any local web server bound to 127.0.0.1 and open
`RoomCalculator.html`.

| Where | What |
|-------|------|
| `RoomCalculator.html`, `style.css` | Page structure and styles |
| `js/roomcalc.js` | Almost all app logic, one very large file |
| `js/version.js` | `APP_VERSION` and `BUILD_VERSION`, read by the page and by `sw.js` |
| `js/data/`, `js/util/` | Device and Workspace Designer data, unit helpers |
| `sw.js` | Service worker, cache first. Why the version rule below matters |
| `notes/` | Detailed references, one topic per file |
| `scripts/` | Optional helper tools. The app does not depend on them and they are never deployed |
| `CLAUDE.md` | The full developer reference, 4,500 lines (see below) |

## Where the detail is

`CLAUDE.md` is the full reference: data model, every feature's rules and the
traps found the hard way. Claude has it loaded already. Other tools should
search it for the feature being changed and read that section before editing.
It is being moved into `notes/` a section at a time; until then both places
count.

| Working on | Read first |
|------------|-----------|
| Architecture, persistence, refactor direction | `notes/TECH_NOTES.md` |
| Anything Konva | `notes/TECH_NOTES_KONVA.md`, then `notes/KONVA.md` |
| Shareable links (`?x=`) | `notes/URL_ENCODING.md` |
| Workspace Designer import and export | `notes/WORKSPACE_DESIGNER.md` |
| RoomOS xConfiguration import and export | `notes/XCONFIG.md` |
| CAD DXF export | `notes/DXF_EXPORT.md` |
| Room Parts, multi room floor plans | `notes/MULTI_ROOM_FLOOR_PLAN.md` |
| Page layout, keyboard shortcuts | `notes/UI_LAYOUT.md`, `notes/KEYBOARD_SHORTCUTS.md` |
| Templates | `notes/TEMPLATES.md` |
| Color picker | `notes/COLOR_PICKER.md` |
| Vendored libraries, service worker cache | `notes/DEPENDENCIES_AND_ISSUES.md` |
| Converting a floor plan image or PDF | `notes/FLOORPLAN_TO_VRC.md` |
| Branches and the review commands | `notes/GIT_WORKFLOW.md` |

The table is a starting point, not a full list. Search `notes/` by feature
name or function name. Extend an existing note before starting a new one, and
when a note is added, renamed or moved, update this table.

**Live code wins.** Where a doc and the code disagree, the code is right and
the doc gets fixed. Read the current version from `js/version.js`, never from
a doc.

## Rules that are easy to break

- **`roomObj.items` is a flat array.** An item's category comes from
  `allDeviceTypes[item.data_deviceid].parentGroup`. Old files with the bucketed
  shape are migrated on load and must keep loading.
- **A new `data_*` attribute goes in four places**: `insertTable()`,
  `insertShapeItem()` (`updateNodeAttributes()`), both branches of
  `updateRoomObjFromTrNode()`, and `copyToCanvasClipBoard()`. Miss one and it
  vanishes after a click, or only after a paste. See "Critical Data Flow" in
  `CLAUDE.md`.
- **`data_*` values are plain JS properties on the Konva node**, not Konva
  attributes. Never `setAttr` them.
- **VRC layers are not Konva layers.** `roomObj.layers` is the user's grouping;
  Konva layers are rendering.
- **The certified display catalogue is append only.** Saved links reference
  entries by index.
- **Saved rooms and shareable links must keep loading.** URL codes and stored
  values never change meaning; add new ones instead.
- **The Workspace Designer is meters only.** VRC x is WD x, VRC y is WD z, VRC
  height (`data_zPosition`) is WD y, and a WD rotation is the VRC angle in
  radians with its sign flipped.

## Every change

1. **Bump `BUILD_VERSION`** in `js/version.js` to the current UTC time,
   `YYYYMMDD-HHMM` (`date -u +%Y%m%d-%H%M`). The service worker serves from its
   cache until that string changes, so a missed bump means nobody sees the
   change. A timestamp means two people never pick the same value.
2. **Comments to a minimum.** Only for intent the code cannot show: a trade
   off, a workaround, a trap. Never narrate the code or the edit. Reasoning
   belongs in the docs.
3. **No em dashes or hyphens to break up sentences**, in user facing strings,
   comments or docs. Use a full stop or a comma.
4. **Check it in the browser**, with the service worker and its caches
   cleared, not only by reading the code.

## Git

**An AI tool may stage and commit. It may not publish.**

- Commit each finished change once it has been checked. A failed check means
  no commit, and so does being told not to change anything.
- Stage only the files you changed, by name. Never `git add -A` or `git add .`.
  If a file you changed also holds somebody else's unrelated edits, ask first.
- Say what was committed in the reply, with the short hash.
- Commit messages: a short summary line, a body only when it helps. **No AI
  co author trailer**, whatever a tool's own default says.
- `main` is the maintainer's working branch. A contributor works on a branch
  of their own, named `<tool>/<username>/<topic>` (for example
  `codex/bomcgoni/floorplan-import`), and the maintainer merges it.
- Never push, pull, merge, rebase, reset, amend a pushed commit, switch
  branches, stash, or create or delete a branch or tag without being asked.
  Flag the risk first on anything destructive.

Review happens before a push, not before a commit. A local commit is undone
with `git reset --soft HEAD~1`.

## Public repository

Everything here is public the moment it is pushed.

- No secrets, no server or hosting details, no personal file paths.
- **Personal preferences stay out of the repo**: a preferred model, a
  reasoning level, a branch name, a working style. They go in your own
  `~/.codex/AGENTS.md` or `~/.claude/CLAUDE.md`, which each tool also reads.
- Code belongs in code files, not in these docs, unless the docs need it to
  make sense.

## Skills

A shared workflow lives once, in `notes/`. Each tool gets a thin wrapper in its
own skills folder (`.claude/skills/`, `.agents/skills/`) that names it and
points to the note. Change the note, not the wrappers.
