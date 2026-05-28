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
    SCRIPT_QRCODE:                 './js/qrcode.js',
    SCRIPT_DRPDOWN_OVERRIDE:       './js/drpDownOverride.js',
    SCRIPT_DXF_WRITER:             './js/dxfWriter.js',
    SCRIPT_DXF_BLOCK_LIB:          './js/dxfBlockLibrary.js',
    SCRIPT_MIGRATE_LEGACY_ITEMS:   './js/migrateLegacyItemsShape.js',

    /* Debug overlay (?debug=1). Refresh interval for the item / node
     * count display in milliseconds. The FPS readout updates once per
     * second from a requestAnimationFrame loop, independent of this. */
    DEBUG_OVERLAY_REFRESH_MS: 1000,

    /* Query-string flag names. Centralizing these makes it harder to
     * accidentally check `urlParams.has('Debug')` somewhere. */
    QS_DEBUG: 'debug',
    QS_TEST_LOGIN: 'testLogin',

    /* Webex cloud-storage proof of concept (js/pocLoginCloud.js).
     * Only used when the page is loaded with `?testLogin=1`. */
    WEBEX_API_BASE: 'https://webexapis.com/v1',
    WEBEX_OAUTH_AUTHORIZE_URL: 'https://webexapis.com/v1/authorize',
    /* UMD bundle for the Webex JavaScript SDK. webexapis.com refuses
     * direct browser fetch() (no CORS on /v1/people/me, /v1/contents/*,
     * etc.), so the PoC routes every Webex call through this SDK's
     * own transport. Loaded lazily by pocLoginCloud.js on the first
     * sign-in attempt, NOT eagerly from RoomCalculator.html. */
    WEBEX_SDK_URL: 'https://unpkg.com/webex@3/umd/webex.min.js',
    /* Override for the SDK's hydra (REST API gateway) service URL.
     * The SDK's built-in default `https://api.ciscospark.com/v1` and
     * its public alias `https://webexapis.com/v1` BOTH refuse CORS
     * preflights from arbitrary origins (preflight returns 401 with
     * no Access-Control-Allow-Origin header). hydra-a.wbx2.com is
     * the same API behind a CORS-friendly internal host — its
     * preflight echoes the page origin in Access-Control-Allow-Origin,
     * so browser fetch() works. Wired into Webex.init() under
     * config.services.discovery.hydra by pocLoginCloud.js. */
    WEBEX_HYDRA_URL: 'https://hydra-a.wbx2.com/v1',
    WEBEX_SPACE_TITLE: 'Video Room Calc Rooms',
    WEBEX_ROOMMAP_FILENAME: 'RoomMap.json',
    WEBEX_OAUTH_STORAGE_PREFIX: 'vrc_poc_webex',
});
