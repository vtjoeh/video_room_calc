---
name: floorplan-to-vrc
description: Convert a floor-plan image (PNG/JPEG) or PDF into a Video Room Calculator .vrc.json design with traced walls, doors, furniture, named Room Parts, and an embedded background image.
---

# Floor plan to VRC for Codex

Read and follow the shared
[original workflow](../../../.claude/skills/floorplan-to-vrc/SKILL.md)
before converting a supplied floor plan. It contains the coordinate and
anchor rules, tracing steps, JSON example, and delivery checklist. Keep the
original Claude skill intact; this wrapper adds only Codex adaptations.

- Use the configured Codex model. The original Recommended AI section is
  historical guidance for other hosts, not a requirement to switch to
  Claude or another provider.
- Resolve source and output paths from the current workspace. Use available
  image-inspection, PDF-rendering, and scripting tools to measure geometry
  and validate output.
- Read `js/version.js` for the current application version instead of
  copying the original workflow's sample version. Check identifiers and
  dimensions against the live catalogue in `js/roomcalc.js`.
- Preserve the original workflow's meters, anchor, flat-item-array, UUID,
  complete wall-surface, background-alignment, and Room Part validation
  requirements. Validate the JSON and verify it opens in VRC before delivery.
- Follow the root `AGENTS.md` contribution policy when changing repository
  files, including its branch, build-version, and commit requirements.
