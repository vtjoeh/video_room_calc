/* Certified Displays catalogue: certifiedDisplays
 *
 * Pure data — the list of Cisco-certified displays the user can pick
 * from when inserting a `certifiedDisplay` item. Attached to
 * `window.VRC.certifiedDisplays` (per the namespace convention in
 * notes/TECH_NOTES.md); roomcalc.js pulls it back in as a top-level
 * `certifiedDisplays` const.
 *
 * Loaded BEFORE roomcalc.js. See the <script> tag order in
 * RoomCalculator.html.
 *
 * APPEND-ONLY: each entry's `index` equals its position in this array,
 * and the per-item attribute `data_certifiedDisplayIndex` (stored in the
 * shareable URL as `cd<index>`) references it by position. Never reorder
 * or remove entries — doing so would resolve previously-saved URLs / JSON
 * to the wrong (or a missing) display. Only append new entries at the end.
 *
 * Per-entry attributes:
 *   index:  array position (append-only, see above).
 *   size:   display diagonal in inches (locks the on-canvas size).
 *   model:  Workspace Designer model id (round-tripped via WD JSON).
 *   aspect: aspect ratio string, e.g. "16:9".
 *   name:   user-facing label; the picker falls back to `model` when absent.
 */

window.VRC = window.VRC || {};

window.VRC.certifiedDisplays = [
  { index: 0, size: 43, model: 'samsung-qmc-43', aspect: '16:9', name: 'Samsung QMC 43"' },
  { index: 1, size: 50, model: 'samsung-qmc-50', aspect: '16:9', name: 'Samsung QMC 50"' },
  { index: 2, size: 55, model: 'samsung-qmc-55', aspect: '16:9', name: 'Samsung QMC 55"' },
  { index: 3, size: 65, model: 'samsung-qmc-65', aspect: '16:9', name: 'Samsung QMC 65"' },
  { index: 4, size: 75, model: 'samsung-qmc-75', aspect: '16:9', name: 'Samsung QMC 75"' },
  { index: 5, size: 85, model: 'samsung-qmc-85', aspect: '16:9', name: 'Samsung QMC 85"' },
  { index: 6, size: 98, model: 'samsung-qmc-98', aspect: '16:9', name: 'Samsung QMC 98"' },
  { index: 7, size: 115, model: 'samsung-qhfx-115', aspect: '16:9', name: 'Samsung QHFX 115"' },
  { index: 8, size: 146, model: 'samsung-wall-146', aspect: '16:9', name: 'Samsung Wall 146"' },
  { index: 9, size: 105, model: 'samsung-qpdx-105', aspect: '21:9', name: 'Samsung QPDX 105"' }
];
