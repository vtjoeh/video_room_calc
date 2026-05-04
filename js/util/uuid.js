/* UUID helper: createUuid
 *
 * Pure leaf utility — no DOM, no Konva, no roomObj. Wraps
 * `crypto.randomUUID()` so call sites have a single named seam if we
 * ever need to fall back to a polyfill on older browsers (we used to,
 * see the commented-out replace() implementation in the repo history).
 *
 * Attached to `window.VRC.util.createUuid` (per the namespace
 * convention in TECH_NOTES.md) and `roomcalc.js` aliases it back as a
 * top-level `const createUuid = VRC.util.createUuid;` so the call sites
 * scattered through that file stay unchanged.
 *
 * Loaded BEFORE roomcalc.js. See `<script>` tag order in
 * RoomCalculator.html.
 *
 * The IIFE wrapper mirrors `js/data/workspaceKey.js`: it scopes the
 * local `util` alias to this file so two top-level `const` declarations
 * across classic <script> tags can't collide on the shared script-level
 * lexical environment.
 */

window.VRC = window.VRC || {};
window.VRC.util = window.VRC.util || {};

(function () {
    const util = window.VRC.util;

    /* Each shape and session uses a UUID for its unique id. crypto.randomUUID()
     * is available in every browser VRC currently supports; if that ever needs
     * to widen, swap to the commented-out fallback that's preserved in git. */
    util.createUuid = function createUuid() {
        return crypto.randomUUID();
    };
})();
