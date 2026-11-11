/* Single source of truth for the app version.  The browser's service-worker update check does a
 * byte-for-byte comparison of the SW's main script PLUS every importScripts(). Change either for updates. 
* See notes/DEPENDENCIES_AND_ISSUES.md.
 * Format example "v0.1" or "v0.2.3" */
const APP_VERSION = "v0.1.672";

/* Build tag: bump this INSTEAD of APP_VERSION for small pushes. Set it to the current UTC
 * time, YYYYMMDD-HHMM (date -u +%Y%m%d-%H%M), so two people can never pick the same value. */
const BUILD_VERSION = "20261111-1540";
    