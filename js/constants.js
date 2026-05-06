/* Constants and the global namespace for the Video Room Calculator.
 *
 * Loaded BEFORE roomcalc.js so that everything else can read from
 * `window.VRC` (and its sub-namespaces) without needing to set up
 * defaults first.
 *
 * Keep this file pure data only. No DOM access, no Konva calls, no
 * functions that act on state. Anything that touches state belongs in
 * a sibling module (e.g. js/util/, js/state/, js/render/).
 *
 * Convention: every other VRC module attaches to `window.VRC.<name>`
 * and is loaded by a <script> tag in RoomCalculator.html. See
 * notes/TECH_NOTES.md for the long-term modularization plan.
 */

window.VRC = window.VRC || {};

window.VRC.constants = Object.freeze({

    /* Paths to lazy-loaded scripts. Centralized so the loader and the
     * HTML never disagree on filename casing or relative path. */
    SCRIPT_QRCODE:           './js/qrcode.js',
    SCRIPT_DRPDOWN_OVERRIDE: './js/drpDownOverride.js',
    SCRIPT_DXF_WRITER:       './js/dxfWriter.js',
    SCRIPT_DXF_BLOCK_LIB:    './js/dxfBlockLibrary.js',
    SCRIPT_TEMPLATES:        './js/templates.js',

    /* Debug overlay (?debug=1). Refresh interval for the item / node
     * count display in milliseconds. The FPS readout updates once per
     * second from a requestAnimationFrame loop, independent of this. */
    DEBUG_OVERLAY_REFRESH_MS: 1000,

    /* Query-string flag names. Centralizing these makes it harder to
     * accidentally check `urlParams.has('Debug')` somewhere. */
    QS_DEBUG: 'debug',
});
