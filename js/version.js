/* Single source of truth for the app version. Loaded by RoomCalculator.html
 * (before roomcalc.js, which reads it into its own `version` constant) AND by
 * sw.js (via importScripts). The browser's service-worker update check does a
 * byte-for-byte comparison of the SW's main script PLUS every importScripts()
 * file, so bumping EITHER string below is what makes the browser detect a new
 * service worker on the next check and refresh the PWA cache -- no separate
 * "remember to edit sw.js too" step. See notes/DEPENDENCIES_AND_ISSUES.md.
 * Format example "v0.1" or "v0.2.3" */
const APP_VERSION = "v0.1.664";

/* Build tag: bump this INSTEAD of APP_VERSION for small pushes that shouldn't
 * change the user-visible version number. Any short string works ("a", "b2",
 * "0722"); empty string = no build. sw.js keys its cache on APP_VERSION +
 * BUILD_VERSION, so changing either one forces clients to update. */
const BUILD_VERSION = "a";
