/* Single source of truth for the app version. Loaded by RoomCalculator.html
 * (before roomcalc.js, which reads it into its own `version` constant) AND by
 * sw.js (via importScripts). The browser's service-worker update check does a
 * byte-for-byte comparison of the SW's main script PLUS every importScripts()
 * file, so bumping this string alone is what makes the browser detect a new
 * service worker on the next check and refresh the PWA cache -- no separate
 * "remember to edit sw.js too" step. See notes/DEPENDENCIES_AND_ISSUES.md.
 * Format example "v0.1" or "v0.2.3" - ver 0.1.1 and 0.1.2 should be compatible
 * with a Shareable Link because ver v0.1 and ver v0.2 are not compatible. */
const APP_VERSION = "v0.1.659";
