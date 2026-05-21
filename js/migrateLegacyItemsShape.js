/* migrateLegacyItemsShape
 *
 * One-shot, idempotent migration from the legacy bucketed `items` shape
 *
 *   roomObj.items = { videoDevices: [], chairs: [], tables: [], ... }
 *
 * to the flat-array shape used by the current code
 *
 *   roomObj.items = [item, item, item, ...]
 *
 * The legacy shape was a "groupBy parentGroup" cache that no code
 * logically required — every read site that mattered already derived
 * the category via `allDeviceTypes[item.data_deviceid].parentGroup`.
 * The flat array is cleaner in saved .vrc.json files and removes the
 * special-casing that grew up around the bucket keys.
 *
 * Called from three places:
 *   1. importJson()  — VRC .vrc.json file import
 *   2. boot IIFE     — every undo/redo entry hydrated from IDB
 *   3. parseShortenedXYUrl() — defensive (the parser already builds
 *                              the flat array, but a hand-edited URL
 *                              could conceivably hit this path)
 *
 * Lazy-loaded via loadScriptOnce() the FIRST time any of the above
 * detects a legacy entry. Once a session has migrated, subsequent
 * legacy entries hit the in-memory helper directly. Pure data
 * transformation — no DOM, no Konva, no side effects beyond the
 * in-place mutation of obj.items and a single console.info on the
 * first migration per session (gated by a module-local flag).
 *
 * Idempotent: if obj.items is already an Array, returns obj unchanged.
 * Safe to call on a partially-migrated object (a fresh flat array
 * coexisting with a stale bucket key is collapsed cleanly).
 */

window.VRC = window.VRC || {};

(function () {
    let loggedThisSession = false;

    window.VRC.migrateLegacyItemsShape = function migrateLegacyItemsShape(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (!obj.items) return obj;
        if (Array.isArray(obj.items)) return obj;

        const flat = [];
        for (const cat in obj.items) {
            const arr = obj.items[cat];
            if (Array.isArray(arr)) {
                for (let i = 0; i < arr.length; i++) flat.push(arr[i]);
            }
        }
        obj.items = flat;

        if (!loggedThisSession) {
            console.info('[VRC] Migrating legacy items shape (object-of-arrays → flat array)');
            loggedThisSession = true;
        }
        return obj;
    };
})();
