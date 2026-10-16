# Shared AI Context Menu

This directory is the canonical home for project-specific context shared by all AI tools working on Video Room Calculator. Start here, read the project context, and follow the relevant reference before changing the application. Contribute durable project facts and decisions here so each tool can use the same source. Tool setup, model behavior, and environment operation belong in the corresponding tool context. If classification is unclear, ask the user.

## Core context

- [Project context](PROJECT_CONTEXT.md): product, architecture, domain rules, implementation constraints, and shared contribution policy.
- [Shared workflows](workflows/): reusable procedures, including [floor plan to VRC](workflows/floorplan-to-vrc.md).

## Detailed references

These existing notes remain authoritative for specialized topics. Read them when relevant instead of copying their detail into this menu.

- Architecture and persistence: `notes/TECH_NOTES.md`
- Konva behavior: `notes/TECH_NOTES_KONVA.md`, `notes/KONVA.md`
- URL format: `notes/URL_ENCODING.md`
- Workspace Designer: `notes/WORKSPACE_DESIGNER.md`
- RoomOS configuration: `notes/XCONFIG.md`
- CAD export: `notes/DXF_EXPORT.md`
- Layout and shortcuts: `notes/UI_LAYOUT.md`, `notes/KEYBOARD_SHORTCUTS.md`
- Templates and multi-room plans: `notes/TEMPLATES.md`, `notes/MULTI_ROOM_FLOOR_PLAN.md`
- Dependencies and cache behavior: `notes/DEPENDENCIES_AND_ISSUES.md`
- Branching and versioning: `notes/GIT_WORKFLOW.md`

## Tool entry points

- Codex: `AGENTS.md` → `.codex/CONTEXT.md`
- Claude: `CLAUDE.md` → `.claude/CONTEXT.md`

Both tool contexts point back here. Keep project facts out of tool contexts.

## Adding an AI tool

Add a root entry file and a tool-specific context file using that tool's
supported discovery paths. Have both direct to this menu and keep their
contents limited to tool operation, environment setup, and tool-only
configuration. Link tool adapters to shared workflows instead of copying
them. Add project facts to the shared context and references, so a new model
can join by reading the same sources without depending on another model's
conversation history.
