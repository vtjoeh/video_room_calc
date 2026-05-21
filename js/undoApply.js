/* undoApply: pure-data diff helpers for incremental undo / redo restore.
 *
 * The diff functions here classify the differences between two roomObj
 * snapshots so that `btnUndoClicked()` / `btnRedoClicked()` in
 * roomcalc.js can apply only the changed Konva nodes instead of running
 * a full `drawRoom(true, true, true)`. The orchestrator that actually
 * touches Konva (`applyRoomObjDelta`) lives in roomcalc.js next to
 * `roomObjToCanvas()` — this file is intentionally Konva-free so it
 * stays testable in isolation and forms a clean primitive for a future
 * delta-storage refactor (notes/TECH_NOTES.md "Phase 5").
 *
 * Loaded BEFORE roomcalc.js via a <script> tag in RoomCalculator.html
 * and attached to `window.VRC.undoApply` per the namespace convention
 * documented in notes/TECH_NOTES.md and CLAUDE.md.
 *
 * Contract (consumed by the orchestrator in roomcalc.js):
 *
 *   VRC.undoApply.requiresFullRedraw(prev, next) -> boolean
 *     true  => fall back to drawRoom(true, true, true)
 *     false => safe to apply incrementally
 *
 *   VRC.undoApply.diffItems(prev, next) -> {
 *     removedIds:  Set<string>,
 *     addedIds:    Set<string>,
 *     changedIds:  Set<string>,
 *   }
 *
 *   VRC.undoApply.diffGroups(prev, next) -> {
 *     removedIds, addedIds, changedIds  (keyed by groupid)
 *   }
 *
 *   VRC.undoApply.diffCustomItems(prev, next) -> {
 *     removedIds, addedIds, changedIds  (keyed by customitemid)
 *   }
 *
 *   VRC.undoApply.diffLayers(prev, next) -> boolean
 *     true => the layers list (membership / visibility / locked / name)
 *             changed between snapshots; orchestrator must re-apply layer
 *             state to all nodes and re-render the Layers tab.
 *
 *   VRC.undoApply.diffOverlays(prev, next) -> Array<string>
 *     List of keys under roomObj.overlaysVisible whose values differ.
 *     Empty array means the overlay flags are identical.
 *
 * Conservative-classifier rule: anything that would require rebuilding
 * the grid, walls, scale, offsets, or background image bytes triggers a
 * full-redraw fallback. Anything else is fair game for the fast path.
 */

window.VRC = window.VRC || {};

(function () {

    /* If more than this many items differ between snapshots, fall back
     * to drawRoom(). The fast path's destroy+rebuild per changed item
     * is still much faster than the global teardown for moderate
     * counts, but at some point the per-node bookkeeping cost catches
     * up. 50 is a safe starting heuristic (median undo touches 1-5
     * items); tune in roomcalc.js if real-world rooms exceed it. */
    var MAX_PATCHABLE_ITEM_DELTAS = 50;

    /* Stable JSON-string compare. Property-order differences could
     * produce false positives, but every snapshot path in this app
     * comes from `structuredClone(roomObj)` so the key order is the
     * same insertion order on both sides. Cheap and sufficient. */
    function jsonEq(a, b) {
        if (a === b) return true;
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch (e) {
            return false;
        }
    }

    function safeArr(x) {
        return Array.isArray(x) ? x : [];
    }

    function safeObj(x) {
        return (x && typeof x === 'object') ? x : {};
    }

    /* ---- diff classifier ---- */

    function requiresFullRedraw(prev, next) {
        if (!prev || !next) return true;

        /* Unit change reflows every coordinate in the room. */
        if (prev.unit !== next.unit) return true;

        /* Room dimensions drive scale + pxOffset + walls + grid. */
        var prevRoom = safeObj(prev.room);
        var nextRoom = safeObj(next.room);
        if (prevRoom.roomWidth  !== nextRoom.roomWidth)  return true;
        if (prevRoom.roomLength !== nextRoom.roomLength) return true;
        if (prevRoom.roomHeight !== nextRoom.roomHeight) return true;

        /* Wall types / acoustic treatment redraw the room outline. */
        if (!jsonEq(prev.roomSurfaces, next.roomSurfaces)) return true;

        /* Workspace flags touch ceiling, default walls, theme — all of
         * which are part of the grid/wall draw path. */
        var prevWs = safeObj(prev.workspace);
        var nextWs = safeObj(next.workspace);
        if (prevWs.removeDefaultWalls !== nextWs.removeDefaultWalls) return true;
        if (prevWs.addCeiling         !== nextWs.addCeiling)         return true;
        if (prevWs.theme              !== nextWs.theme)              return true;

        /* Software (mtr / webex) influences device wiring on insert. */
        if (prev.software !== next.software) return true;

        /* Background image library reference change — let the existing
         * rehydrate-from-IDB path handle it via drawRoom. Position /
         * size / opacity only changes still go through the fast path
         * because they don't replace pixel data. */
        var prevBg = safeObj(prev.backgroundImage);
        var nextBg = safeObj(next.backgroundImage);
        if (prevBg.bgImageId !== nextBg.bgImageId) return true;

        /* Authored-version edits don't change canvas, but if the room
         * name changes we still want it reflected in document.title;
         * that's handled by the orchestrator. Not a full-redraw trigger. */

        /* Item count delta budget. */
        var diff = diffItems(prev, next);
        var totalChanged = diff.removedIds.size + diff.addedIds.size + diff.changedIds.size;
        if (totalChanged > MAX_PATCHABLE_ITEM_DELTAS) return true;

        return false;
    }

    /* ---- generic id-keyed diff ---- */

    function diffByKey(prevArr, nextArr, keyName) {
        var prevList = safeArr(prevArr);
        var nextList = safeArr(nextArr);
        var prevMap = new Map();
        var nextMap = new Map();
        var i;
        for (i = 0; i < prevList.length; i++) {
            var pk = prevList[i] && prevList[i][keyName];
            if (pk) prevMap.set(pk, prevList[i]);
        }
        for (i = 0; i < nextList.length; i++) {
            var nk = nextList[i] && nextList[i][keyName];
            if (nk) nextMap.set(nk, nextList[i]);
        }

        var removedIds = new Set();
        var addedIds   = new Set();
        var changedIds = new Set();

        prevMap.forEach(function (entry, key) {
            if (!nextMap.has(key)) {
                removedIds.add(key);
            } else if (!jsonEq(entry, nextMap.get(key))) {
                changedIds.add(key);
            }
        });
        nextMap.forEach(function (entry, key) {
            if (!prevMap.has(key)) addedIds.add(key);
        });

        return { removedIds: removedIds, addedIds: addedIds, changedIds: changedIds };
    }

    function diffItems(prev, next) {
        return diffByKey(prev && prev.items, next && next.items, 'id');
    }

    function diffGroups(prev, next) {
        return diffByKey(prev && prev.groups, next && next.groups, 'groupid');
    }

    function diffCustomItems(prev, next) {
        return diffByKey(prev && prev.customItems, next && next.customItems, 'customitemid');
    }

    /* ---- layer / overlay diffs ----
     *
     * diffLayers returns a single boolean because the orchestrator's
     * response to any layer change (add / remove / rename / visibility
     * / locked) is the same: re-render the Layers tab DOM + call
     * applyAllLayerStates() to push state onto every node. There's no
     * win in returning the granular delta yet. */

    function diffLayers(prev, next) {
        return !jsonEq(safeArr(prev && prev.layers), safeArr(next && next.layers));
    }

    function diffOverlays(prev, next) {
        var prevOv = safeObj(prev && prev.overlaysVisible);
        var nextOv = safeObj(next && next.overlaysVisible);
        var changed = [];
        var keys = new Set();
        Object.keys(prevOv).forEach(function (k) { keys.add(k); });
        Object.keys(nextOv).forEach(function (k) { keys.add(k); });
        keys.forEach(function (k) {
            if (prevOv[k] !== nextOv[k]) changed.push(k);
        });
        return changed;
    }

    window.VRC.undoApply = {
        MAX_PATCHABLE_ITEM_DELTAS: MAX_PATCHABLE_ITEM_DELTAS,
        requiresFullRedraw:        requiresFullRedraw,
        diffItems:                 diffItems,
        diffGroups:                diffGroups,
        diffCustomItems:           diffCustomItems,
        diffLayers:                diffLayers,
        diffOverlays:              diffOverlays,
    };
})();
