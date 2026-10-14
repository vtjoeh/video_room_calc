# Codex instructions

## Context and precedence

Read [.codex/CONTEXT.md](.codex/CONTEXT.md) before starting work. It adapts
the existing Claude context for Codex and points to the relevant references.
Read the Development Notes in [CLAUDE.md](CLAUDE.md) and the sections relevant
to the task. Its engineering guidance and the `notes/` references still apply.
Keep `CLAUDE.md` and `.claude/` intact when maintaining this adapter.

The Codex Git policy below explicitly replaces the instructions in
`CLAUDE.md` and `notes/GIT_WORKFLOW.md` that reserve Git mutations for the
user and default day-to-day work to `main`. All other shared guidance applies
unless the user explicitly overrides it.

## Git policy

- Check `git status --short --branch` and `git branch --show-current` before
  editing and before any state-changing Git command.
- Use the user-created `codex/bomcgoni` branch for this contribution. Continue
  on another contribution branch only when the user requests it.
- Never work directly on `main` unless the user explicitly asks. If on `main`
  or a detached HEAD, switch to the authorized contribution branch before
  editing, provided doing so preserves existing work. Ask if the branch or
  existing changes make that unsafe.
- Commit each completed logical change after reviewing its diff and running
  the checks appropriate to it. Do this before starting the next independent
  change or ending the task. A logical change can span several files; it does
  not mean committing every individual file save.
- Stage only files belonging to that change, with explicit paths. Preserve
  unrelated user changes and existing staged work. Use a concise commit
  message describing the result, and report the commit hash and validation.
- Local staging and commits are authorized by this policy. Pushing, merging
  into `main`, deploying, rewriting history, and deleting branches require
  an explicit user request.

## Development conventions

- Keep the existing vanilla JavaScript, Konva, and CSS architecture. There is
  no build step or package-manager test script to run.
- Read `notes/TECH_NOTES.md` before structural changes and
  `notes/TECH_NOTES_KONVA.md` before changing Konva behavior.
- Keep inline comments minimal. Document non-obvious intent rather than
  narrating code. Use periods or commas instead of em dashes or hyphens to
  break up sentences in project text, comments, and documentation.
- Bump `BUILD_VERSION` in `js/version.js` for every completed project change,
  including documentation and adapter changes, following the shared rule
  (`ag` becomes `ah`; `z` becomes `aa`). Keep `APP_VERSION` unless the task
  calls for a visible version change.
- Verify behavior in the browser for application changes, checking the
  console and relevant responsive layouts. Exercise persistence, undo/redo,
  and import/export paths when affected. For documentation changes, check
  links, configuration syntax, and the diff instead.
- Format code examples so literal backticks render correctly in chat. Escape
  them or use a longer surrounding code fence when an example contains them.

## Skills

The repository's Codex skill adapter is
[floorplan-to-vrc](.agents/skills/floorplan-to-vrc/SKILL.md). Use it when a
floor-plan image or PDF should become a `.vrc.json` design.

When clarification is needed, use the user's `grill-with-docs` skill if it is
available in the session. Its personal installation path is not a repository
dependency. Resolve facts from the code and references before asking the user.
