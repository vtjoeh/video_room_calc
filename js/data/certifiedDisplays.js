/* Certified Displays catalogue: certifiedDisplays (pure data).
 *
 * Cisco-certified displays for the `certifiedDisplay` item picker. Attached to
 * window.VRC.certifiedDisplays; roomCalc.js reads it as a top-level const.
 * Loaded BEFORE roomCalc.js (see <script> order in RoomCalculator.html).
 * APPEND-ONLY: each entry's `index` = its array position, referenced by
 * data_certifiedDisplayIndex (URL `cd<index>`); never reorder/remove entries.
 * Per-entry: index, size (diagonal in), model (WD id), aspect, name.
 * See notes/COMMENT_NOTES.md "Certified Displays catalogue".
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
