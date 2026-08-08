/* VRC Window Editor — lazy-loaded, self-contained editor for a wallCustomWindow's
 * data_customWindows array. Attaches window.VRC.windowEditor = { open(opts) }.
 * Everything the editor needs comes in through opts; nothing in this file reads
 * VRC globals (roomObj, stage, scale, ...) so the module stays separable, mirroring
 * js/pathEditor/pathEditor.js. Konva is the only external dependency (the shared
 * js/colorPicker.js is lazy-loaded on demand for the color swatch — see below).
 *
 * Coordinate model: an ELEVATION view of the wall, internally always in METERS
 * regardless of the room's display unit. X = distance along the wall's run (0 at the
 * left end, opts.wallLengthM at the right end). Y is Z-elevation but measured DOWN
 * FROM THE CEILING so it matches Konva's y-down canvas convention (canvasY =
 * wallHeightM - elevationZ): the floor is the bottom edge of the wall outline, the
 * ceiling is the top edge. Every window/frame record keeps the same field names as
 * the roomObj wire shape (distFromLeft, width, height, baseZ) in METERS internally;
 * only the five sidebar text fields convert to/from opts.unit ('feet'|'meters') for
 * display, so the underlying drag/resize/clamp geometry never has to care what unit
 * the room is in.
 *
 * opts = {
 *   wallLengthM, wallHeightM: number (meters)
 *   unit: 'feet' | 'meters'  (room's current display unit; sidebar fields only)
 *   windows: [{ id, type: 'window'|'windowFrame'|'doorFrame', distFromLeft, width,
 *               height, baseZ, data_fill?, data_opacity? }]  (meters; caller converts unit)
 *   onClose(result): result = { wallHeightM, windows } — always called on close
 *     (there is no cancel; matches Path Editor's "any close applies" convention).
 *   onChange(result): optional, same payload, fired on each settled edit (insert, delete,
 *     drag end, resize end, field apply, undo/redo) so a live 3D view can follow along.
 * }
 *
 * Each record occupies an EXCLUSIVE horizontal slice of the wall (dotted guide lines
 * mark every derived WD-export segment boundary). Dragging/resizing a window or frame
 * is clamped so it can't cross into a neighboring record — enforced via Konva's
 * dragBoundFunc for drag and a Transformer boundBoxFunc for resize. Vertical position/
 * size is unconstrained apart from staying within [0, wallHeightM], EXCEPT an Open
 * Doorway (type: 'doorFrame'), whose bottom is always pinned to the floor (baseZ=0) —
 * it has no bottom-resize anchors and cannot be dragged vertically at all. No rotation.
 *
 * Snap to Objects (on by default, toolbar checkbox) snaps a dragged/resized edge to
 * the wall ends and to any other record's edges within a small pixel threshold,
 * drawing a magenta guide line on a dedicated top-most snapLayer while active.
 */

(function () {
    'use strict';

    window.VRC = window.VRC || {};

    const MIN_PX_PER_M = 20;
    const MAX_PX_PER_M = 4000;
    const MIN_DIM_M = 0.05;
    const SELECT_COLOR = '#8000c8';
    const DEFAULT_WINDOW_FILL = '#2FA6C0';
    const DEFAULT_WINDOW_OPACITY = 0.15;
    const SNAP_PX = 8;
    const NARROW_CONFIRM_THRESHOLD_M = 0.5;
    const DOOR_TYPE = 'doorFrame';

    let dlg = null;
    let confirmDlg = null;
    let ui = {};
    let konvaStage = null;
    let gridLayer, wallLayer, itemLayer, snapLayer;
    let tr = null;
    let cssReady = null;
    let activeOpts = null;

    let wallLengthM = 6;
    let wallHeightM = 3;
    let windowsList = [];          /* [{ id, type, distFromLeft, width, height, baseZ, data_fill?, data_opacity? }] */
    let rectNodes = {};            /* id -> Konva.Rect */
    let selId = null;
    let clipboard = null;
    let snapEnabled = true;

    let unitLabel = 'm';           /* display-only; internal model is always meters */
    let toMeters = 1;              /* meters per 1 display unit: 1 for meters, 1/3.28084 for feet */

    /* ---------------- unit display helpers ---------------- */

    function mToDisplay(m) { return m / toMeters; }
    function displayToM(u) { return u * toMeters; }

    function roundDisplay(m) {
        const v = mToDisplay(m);
        const f = (unitLabel === 'ft') ? 100 : 1000;
        return Math.round(v * f) / f;
    }

    function formatLenForMsg(m) {
        return roundDisplay(m) + ' ' + unitLabel;
    }

    function updateUnitLabels() {
        [ui.unitWallHeight, ui.unitWidth, ui.unitHeight, ui.unitBaseZ, ui.unitDistLeft].forEach(el => {
            if (el) el.textContent = unitLabel;
        });
    }

    /* ---------------- undo / redo (model snapshots) ---------------- */

    const UNDO_MAX = 100;
    let undoStack = [];
    let redoStack = [];

    function snapshot() {
        return JSON.stringify({ wallHeightM: wallHeightM, windowsList: windowsList });
    }

    function syncUndoButtons() {
        if (!ui.undo) return;
        ui.undo.disabled = !undoStack.length;
        ui.redo.disabled = !redoStack.length;
    }

    function pushUndo() {
        const snap = snapshot();
        if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
        undoStack.push(snap);
        if (undoStack.length > UNDO_MAX) undoStack.shift();
        redoStack = [];
        syncUndoButtons();
    }

    function restoreSnapshot(snap) {
        const obj = JSON.parse(snap);
        wallHeightM = obj.wallHeightM;
        windowsList = obj.windowsList;
        selId = null;
    }

    function doUndo() {
        if (!undoStack.length) return;
        redoStack.push(snapshot());
        restoreSnapshot(undoStack.pop());
        commitChange();
        syncUndoButtons();
    }

    function doRedo() {
        if (!redoStack.length) return;
        undoStack.push(snapshot());
        restoreSnapshot(redoStack.pop());
        commitChange();
        syncUndoButtons();
    }

    /* ---------------- geometry helpers ---------------- */

    function zToCanvasY(z) { return wallHeightM - z; }
    function canvasYToZ(y) { return wallHeightM - y; }

    function sortedWindows() {
        return windowsList.slice().sort((a, b) => a.distFromLeft - b.distFromLeft);
    }

    /* The open horizontal gap a record (or a not-yet-placed new record) may occupy:
     * bounded by its immediate neighbors' edges, or the wall ends. */
    function neighborBounds(id) {
        const sorted = sortedWindows();
        const idx = sorted.findIndex(w => w.id === id);
        const leftEdge = idx > 0 ? sorted[idx - 1].distFromLeft + sorted[idx - 1].width : 0;
        const rightEdge = (idx >= 0 && idx < sorted.length - 1) ? sorted[idx + 1].distFromLeft : wallLengthM;
        return { leftEdge: leftEdge, rightEdge: rightEdge };
    }

    /* First gap (in wall order) at least minWidth wide; null if none. */
    function firstAvailableGap(minWidth) {
        const sorted = sortedWindows();
        let cursor = 0;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].distFromLeft - cursor >= minWidth) return { start: cursor, end: sorted[i].distFromLeft };
            cursor = Math.max(cursor, sorted[i].distFromLeft + sorted[i].width);
        }
        if (wallLengthM - cursor >= minWidth) return { start: cursor, end: wallLengthM };
        return null;
    }

    /* Widest gap on the wall (any size); null only if the wall has zero-width space
     * left anywhere (fully occupied edge-to-edge). Used to narrow a new/pasted/
     * duplicated item to fit when nothing is wide enough for its natural size. */
    function largestAvailableGap() {
        const sorted = sortedWindows();
        let cursor = 0;
        let best = null;
        const consider = (start, end) => {
            if (end - start > 1e-9 && (!best || (end - start) > (best.end - best.start))) best = { start: start, end: end };
        };
        for (let i = 0; i < sorted.length; i++) {
            consider(cursor, sorted[i].distFromLeft);
            cursor = Math.max(cursor, sorted[i].distFromLeft + sorted[i].width);
        }
        consider(cursor, wallLengthM);
        return best;
    }

    /* Every derived segment boundary (window/frame spans AND the solid gaps between them) —
     * drawn as dotted guide lines, same divisions the WD export cuts the wall into. */
    function segmentBoundaries() {
        const sorted = sortedWindows();
        const xs = new Set([0, wallLengthM]);
        sorted.forEach(w => {
            xs.add(Math.max(0, Math.min(wallLengthM, w.distFromLeft)));
            xs.add(Math.max(0, Math.min(wallLengthM, w.distFromLeft + w.width)));
        });
        return Array.from(xs).sort((a, b) => a - b);
    }

    function fillForType(w) {
        if (w.type === 'window') return w.data_fill || DEFAULT_WINDOW_FILL;
        if (w.type === DOOR_TYPE) return '#b5895a';
        return '#cccccc'; /* windowFrame */
    }

    function opacityForType(w) {
        if (w.type === 'window') return (w.data_opacity != null) ? w.data_opacity : DEFAULT_WINDOW_OPACITY;
        return 0.35;
    }

    function typeLabel(type) {
        if (type === 'window') return 'Window';
        if (type === DOOR_TYPE) return 'Open Doorway';
        return 'Open Window'; /* display name only — wire-format type stays 'windowFrame' */
    }

    /* ---------------- snap to objects ---------------- */

    function collectSnapCandidatesX(excludeId) {
        const xs = new Set([0, wallLengthM]);
        windowsList.forEach(w => {
            if (w.id === excludeId) return;
            xs.add(round3(w.distFromLeft));
            xs.add(round3(w.distFromLeft + w.width));
        });
        return Array.from(xs);
    }

    function collectSnapCandidatesY(excludeId) {
        const ys = new Set([0, wallHeightM]);
        windowsList.forEach(w => {
            if (w.id === excludeId) return;
            ys.add(round3(zToCanvasY(w.baseZ)));
            ys.add(round3(zToCanvasY(w.baseZ + w.height)));
        });
        return Array.from(ys);
    }

    function nearestSnap(value, candidates, thresholdM) {
        let best = null, bestD = thresholdM;
        candidates.forEach(c => {
            const d = Math.abs(c - value);
            if (d <= bestD) { bestD = d; best = c; }
        });
        return best;
    }

    function drawSnapGuides(x, y) {
        if (!snapLayer || !konvaStage) return;
        snapLayer.destroyChildren();
        if (x == null && y == null) { snapLayer.batchDraw(); return; }
        const scale = konvaStage.scaleX();
        const margin = 50;
        if (x != null) {
            snapLayer.add(new Konva.Line({
                points: [x, -margin, x, wallHeightM + margin],
                stroke: '#ff00ff', strokeWidth: 1 / scale, dash: [4 / scale, 3 / scale],
            }));
        }
        if (y != null) {
            snapLayer.add(new Konva.Line({
                points: [-margin, y, wallLengthM + margin, y],
                stroke: '#ff00ff', strokeWidth: 1 / scale, dash: [4 / scale, 3 / scale],
            }));
        }
        snapLayer.batchDraw();
    }

    /* ---------------- dialog ---------------- */

    function buildDialog() {
        if (dlg) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './js/windowEditor/windowEditor.css';
        cssReady = new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; });
        document.head.appendChild(link);

        dlg = document.createElement('dialog');
        dlg.id = 'vrcWindowEditorDialog';
        dlg.innerHTML = `
            <div class="vrcwe-toolbar">
                <span class="vrcwe-title">Window Editor</span>
                <button id="vrcweInsertWindow" title="Add a window (glass) at the first open gap">Insert Window</button>
                <button id="vrcweInsertFrame" title="Add an open window (no glass, no wall below removed) at the first open gap">Insert Open Window</button>
                <button id="vrcweInsertDoor" title="Add an open doorway (open to the floor) at the first open gap">Insert Open Doorway</button>
                <span class="vrcwe-sep"></span>
                <button id="vrcweCopy" disabled title="Copy the selected window/frame (Ctrl+C)">Copy</button>
                <button id="vrcwePaste" disabled title="Paste (Ctrl+V)">Paste</button>
                <button id="vrcweDuplicate" disabled title="Duplicate the selected window/frame, repeating its left-side spacing (Ctrl+D)">Duplicate</button>
                <button id="vrcweDelete" disabled title="Delete the selected window/frame (Delete)"><i class="icon icon-delete-regular"></i></button>
                <span class="vrcwe-sep"></span>
                <button id="vrcweUndo" disabled title="Undo (Ctrl+Z)"><i class="icon icon-undo-regular"></i></button>
                <button id="vrcweRedo" disabled title="Redo (Shift+Ctrl+Z)"><i class="icon icon-redo-regular"></i></button>
                <span class="vrcwe-sep"></span>
                <button id="vrcweZoomOut" class="vrcwe-zoom" title="Zoom out">&#8722;</button>
                <button id="vrcweZoomIn" class="vrcwe-zoom" title="Zoom in">+</button>
                <span class="vrcwe-sep"></span>
                <label class="vrcwe-snap-toggle" title="Snap edges to nearby windows/frames and wall ends while dragging or resizing">
                    <input type="checkbox" id="vrcweSnapToggle" checked> Snap to Objects
                </label>
                <span class="vrcwe-hint">Drag to pan &middot; scroll to zoom</span>
                <button id="vrcweClose" class="vrcwe-close" title="Apply and close the editor (shortcut: Esc)">Close</button>
            </div>
            <div class="vrcwe-body">
                <div class="vrcwe-sidepane">
                    <label>Wall Height:</label>
                    <div class="vrcwe-field-row">
                        <input type="text" id="vrcweWallHeight" class="vrcwe-num">
                        <span class="vrcwe-unit" id="vrcweUnitWallHeight">m</span>
                    </div>

                    <div id="vrcweSelDiv" class="vrcwe-selection-panel" style="display:none">
                        <hr>
                        <label id="vrcweSelLabel">Window:</label>

                        <label class="vrcwe-sublabel">Width:</label>
                        <div class="vrcwe-field-row">
                            <input type="text" id="vrcweWidth" class="vrcwe-num">
                            <span class="vrcwe-unit" id="vrcweUnitWidth">m</span>
                        </div>

                        <label class="vrcwe-sublabel">Height:</label>
                        <div class="vrcwe-field-row">
                            <input type="text" id="vrcweHeight" class="vrcwe-num">
                            <span class="vrcwe-unit" id="vrcweUnitHeight">m</span>
                        </div>

                        <label class="vrcwe-sublabel" id="vrcweBaseZLabel">Base Elevation:</label>
                        <div class="vrcwe-field-row">
                            <input type="text" id="vrcweBaseZ" class="vrcwe-num">
                            <span class="vrcwe-unit" id="vrcweUnitBaseZ">m</span>
                        </div>

                        <label class="vrcwe-sublabel">Distance to Left:</label>
                        <div class="vrcwe-field-row">
                            <input type="text" id="vrcweDistLeft" class="vrcwe-num">
                            <span class="vrcwe-unit" id="vrcweUnitDistLeft">m</span>
                        </div>

                        <div id="vrcweColorRow" class="vrcwe-field-row" style="display:none">
                            <label class="vrcwe-sublabel" style="margin:0">Color:</label>
                            <button type="button" id="vrcweColorSwatch" class="fillSwatchBtn" title="Choose color and opacity"><span class="fillSwatchColor"></span></button>
                            <input type="hidden" id="vrcweColorFill" value="${DEFAULT_WINDOW_FILL}">
                            <input type="hidden" id="vrcweColorOpacity" value="${DEFAULT_WINDOW_OPACITY}">
                        </div>
                    </div>
                </div>
                <div class="vrcwe-canvas" id="vrcweCanvas"></div>
            </div>
            <div class="vrcwe-ctxmenu" id="vrcweCtxMenu" style="display:none">
                <button type="button" data-vrcwe-act="copy">Copy</button>
                <button type="button" data-vrcwe-act="paste">Paste</button>
                <hr>
                <button type="button" data-vrcwe-act="window">Insert Window</button>
                <button type="button" data-vrcwe-act="windowFrame">Insert Open Window</button>
                <button type="button" data-vrcwe-act="doorFrame">Insert Open Doorway</button>
            </div>`;
        document.body.appendChild(dlg);

        ui = {
            insertWindow: dlg.querySelector('#vrcweInsertWindow'),
            insertFrame: dlg.querySelector('#vrcweInsertFrame'),
            insertDoor: dlg.querySelector('#vrcweInsertDoor'),
            copy: dlg.querySelector('#vrcweCopy'),
            paste: dlg.querySelector('#vrcwePaste'),
            duplicate: dlg.querySelector('#vrcweDuplicate'),
            del: dlg.querySelector('#vrcweDelete'),
            undo: dlg.querySelector('#vrcweUndo'),
            redo: dlg.querySelector('#vrcweRedo'),
            zoomIn: dlg.querySelector('#vrcweZoomIn'),
            zoomOut: dlg.querySelector('#vrcweZoomOut'),
            snapToggle: dlg.querySelector('#vrcweSnapToggle'),
            hint: dlg.querySelector('.vrcwe-hint'),
            close: dlg.querySelector('#vrcweClose'),
            canvas: dlg.querySelector('#vrcweCanvas'),
            wallHeight: dlg.querySelector('#vrcweWallHeight'),
            unitWallHeight: dlg.querySelector('#vrcweUnitWallHeight'),
            selDiv: dlg.querySelector('#vrcweSelDiv'),
            selLabel: dlg.querySelector('#vrcweSelLabel'),
            width: dlg.querySelector('#vrcweWidth'),
            unitWidth: dlg.querySelector('#vrcweUnitWidth'),
            height: dlg.querySelector('#vrcweHeight'),
            unitHeight: dlg.querySelector('#vrcweUnitHeight'),
            baseZ: dlg.querySelector('#vrcweBaseZ'),
            unitBaseZ: dlg.querySelector('#vrcweUnitBaseZ'),
            baseZLabel: dlg.querySelector('#vrcweBaseZLabel'),
            distLeft: dlg.querySelector('#vrcweDistLeft'),
            unitDistLeft: dlg.querySelector('#vrcweUnitDistLeft'),
            colorRow: dlg.querySelector('#vrcweColorRow'),
            colorSwatch: dlg.querySelector('#vrcweColorSwatch'),
            colorFill: dlg.querySelector('#vrcweColorFill'),
            colorOpacity: dlg.querySelector('#vrcweColorOpacity'),
            ctxMenu: dlg.querySelector('#vrcweCtxMenu'),
        };

        ui.close.onclick = () => { finishAndApply(); dlg.close(); };
        ui.undo.onclick = () => doUndo();
        ui.redo.onclick = () => doRedo();
        ui.zoomIn.onclick = () => zoomBy(1.2);
        ui.zoomOut.onclick = () => zoomBy(1 / 1.2);
        ui.insertWindow.onclick = () => insertNewWindow('window');
        ui.insertFrame.onclick = () => insertNewWindow('windowFrame');
        ui.insertDoor.onclick = () => insertNewWindow(DOOR_TYPE);
        ui.copy.onclick = () => copySelected();
        ui.paste.onclick = () => pasteClipboard();
        ui.duplicate.onclick = () => duplicateSelected();
        ui.del.onclick = () => deleteSelected();
        ui.snapToggle.onclick = () => { snapEnabled = ui.snapToggle.checked; };
        ui.colorSwatch.onclick = () => openColorPickerForSelection();

        ui.ctxMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-vrcwe-act]');
            if (!btn || btn.disabled) return;
            const act = btn.dataset.vrcweAct;
            const atX = ctxMenuX;
            hideCtxMenu();
            if (act === 'copy') copySelected();
            else if (act === 'paste') pasteClipboard(atX);
            else insertNewWindow(act, atX);
        });
        /* Capture, so a press that lands on the canvas closes the menu before the stage's
         * own handlers see it and start a pan or a selection under an open menu. */
        document.addEventListener('pointerdown', (e) => {
            if (!ctxMenuOpen()) return;
            if (ui.ctxMenu.contains(e.target)) return;
            hideCtxMenu();
        }, true);

        ui.wallHeight.addEventListener('change', () => {
            const v = displayToM(Number(ui.wallHeight.value));
            if (isFinite(v) && v > 0) {
                pushUndo();
                wallHeightM = v;
                commitChange();
            } else {
                ui.wallHeight.value = roundDisplay(wallHeightM);
            }
        });

        [ui.width, ui.height, ui.baseZ, ui.distLeft].forEach(inp => {
            inp.addEventListener('change', () => applyFieldsToSelection());
        });

        /* Footgun (found and fixed) — a bubble-phase listener on `dlg` only ever sees a
         * keydown whose TARGET is a descendant of `dlg`. A native modal <dialog> is
         * supposed to trap focus inside itself, but that didn't hold reliably here: a
         * click on the plain (non-focusable) Konva <canvas> could leave
         * document.activeElement as document.body — NOT a descendant of `dlg` — and a
         * keydown dispatched there bubbles straight from body to document, completely
         * bypassing this listener. The main app's OWN document-level keydown handler
         * (`onKeyDown` in roomcalc.js) is still listening at that point, and — since
         * `tr.nodes()` on the MAIN canvas still holds the wall the whole time this
         * editor is open — a bare Delete/Backspace press deleted the wall itself.
         * Confirmed live: insert 2 windows, click the 2nd to select it, press Delete —
         * the wall vanishes from the main canvas immediately, before Close is even
         * clicked. Fixed by listening on `document` in the CAPTURE phase instead: a
         * capture-phase document listener sees every keydown, everywhere, before ANY
         * bubble-phase listener (including onKeyDown) gets a chance — and calling
         * stopPropagation() here halts that event's propagation entirely, so nothing
         * downstream ever sees it. Gated on dlg.open so it's fully inert whenever the
         * editor isn't showing. The one branch that used to skip stopPropagation()
         * (Delete/Backspace) was the other half of this bug even when the event DID
         * reach `dlg`'s old bubble listener — it's included in the blanket
         * stopPropagation() below now, along with every other key. */
        function handleEditorKeydown(e) {
            if (!dlg || !dlg.open) return;
            if (confirmDlg && confirmDlg.open) {
                /* Handle Escape ourselves (closing just the confirm, as Cancel would)
                 * rather than leaving it alone for the browser's native cancel-on-Escape
                 * dialog behavior — that native behavior turned out to be NOT reliable
                 * here: main app's own onKeyDown Escape branch (roomcalc.js) also
                 * receives it if it's left to bubble/reach the default-action stage
                 * (confirmed live), and that branch calls e.preventDefault() among other
                 * disruptive things (closeAllDialogModals(), clearing tr.nodes()) — that
                 * preventDefault() silently cancels the native dialog-close default
                 * action too, so the confirm was staying stuck open with Escape doing
                 * nothing. Explicitly closing it here removes the dependency entirely. */
                e.stopPropagation();
                if (e.key === 'Escape') { e.preventDefault(); confirmDlg.close(); }
                return;
            }
            if (ctxMenuOpen()) {
                /* Escape dismisses just the menu; anything else closes it and carries on,
                 * so a shortcut is never swallowed by a menu the user has moved on from. */
                hideCtxMenu();
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
            }
            const typing = document.activeElement && (document.activeElement.tagName === 'INPUT');
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault(); e.stopPropagation();
                if (e.shiftKey) doRedo(); else doUndo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault(); e.stopPropagation();
                doRedo();
                return;
            }
            if (!typing && (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault(); e.stopPropagation();
                copySelected();
                return;
            }
            if (!typing && (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                e.preventDefault(); e.stopPropagation();
                /* Aim at the pointer, but fall back to the ordinary gap search when the spot it
                 * is resting on cannot take the item: a shortcut that refuses to do anything is
                 * worse than one that places it somewhere sensible. */
                if (hoverX != null) pasteClipboard(hoverX, () => pasteClipboard());
                else pasteClipboard();
                return;
            }
            if (!typing && selId != null && ARROW_KEYS[e.key]) {
                e.preventDefault(); e.stopPropagation();
                const step = displayToM((unitLabel === 'ft' ? 0.1 : 0.05) * (e.shiftKey ? 10 : 1));
                const dir = ARROW_KEYS[e.key];
                nudgeSelection(dir.x * step, dir.z * step);
                return;
            }
            if (!typing && (e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault(); e.stopPropagation();
                duplicateSelected();
                return;
            }
            if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selId != null) {
                e.preventDefault(); e.stopPropagation();
                deleteSelected();
                return;
            }
            if (e.key === 'Escape') {
                /* Explicit dlg.close() rather than relying on the browser's native
                 * cancel-on-Escape default action for dlg itself — that turned out to be
                 * order-dependent/unreliable in this embedding (the same class of issue
                 * just worked around for the confirm dialog above), so match the Close
                 * button's own explicit finishAndApply() + dlg.close() pairing instead. */
                e.preventDefault(); e.stopPropagation();
                finishAndApply();
                dlg.close();
            }
            else e.stopPropagation();
        }
        document.addEventListener('keydown', handleEditorKeydown, true);

        /* Same footgun as pathEditor: the dialog 'close' event can be delivered
         * unreliably (or late) in some embedded browsers — finishAndApply() is
         * idempotent (activeOpts nulls on first run) and the button/Esc paths above
         * also call it directly. */
        dlg.addEventListener('close', () => { if (!dlg.open) finishAndApply(); });

        const syncStageSize = () => {
            if (dlg.open && konvaStage && ui.canvas.clientWidth > 0 && ui.canvas.clientHeight > 0) {
                konvaStage.size({ width: ui.canvas.clientWidth, height: ui.canvas.clientHeight });
                refreshAll();
            }
        };
        window.addEventListener('resize', syncStageSize);
        new ResizeObserver(syncStageSize).observe(ui.canvas);
    }

    /* Small Cancel/Continue confirm modal for the "resulting width is under 0.5" case.
     * Appended to document.body (a SIBLING of dlg, never a child) — mirroring Path
     * Editor's #vrcpeDrawChoice precedent: dlg's own keydown handler treats Escape as
     * "apply and close the whole editor", and that handler fires on bubble regardless
     * of which <dialog> is topmost in the modal stack. Nesting this dialog inside dlg
     * would let an Escape meant only to cancel this confirm also close the editor. */
    function buildConfirmDialog() {
        if (confirmDlg) return;
        confirmDlg = document.createElement('dialog');
        confirmDlg.className = 'vrcwe-confirm-dialog';
        confirmDlg.innerHTML = `
            <div class="vrcwe-confirm-msg" id="vrcweConfirmMsg"></div>
            <div class="vrcwe-confirm-btns">
                <button type="button" id="vrcweConfirmCancel">Cancel</button>
                <button type="button" id="vrcweConfirmContinue" class="vrcwe-confirm-primary">Continue</button>
            </div>`;
        document.body.appendChild(confirmDlg);
        ui.confirmMsg = confirmDlg.querySelector('#vrcweConfirmMsg');
        ui.confirmCancel = confirmDlg.querySelector('#vrcweConfirmCancel');
        ui.confirmContinue = confirmDlg.querySelector('#vrcweConfirmContinue');
    }

    function showConfirmDialog(message, onContinue) {
        buildConfirmDialog();
        ui.confirmMsg.textContent = message;
        ui.confirmCancel.style.display = '';
        ui.confirmContinue.textContent = 'Continue';
        ui.confirmContinue.onclick = () => { confirmDlg.close(); onContinue(); };
        ui.confirmCancel.onclick = () => confirmDlg.close();
        confirmDlg.showModal();
    }

    /* Same dialog with nothing to decide. The toolbar hint bar is easy to miss when the
     * answer is about the spot the user just right-clicked on, so a refusal there says so
     * where they are looking. */
    function showMessageDialog(message) {
        buildConfirmDialog();
        ui.confirmMsg.textContent = message;
        ui.confirmCancel.style.display = 'none';
        ui.confirmContinue.textContent = 'OK';
        ui.confirmContinue.onclick = () => confirmDlg.close();
        confirmDlg.showModal();
    }

    function round3(n) { return Math.round(n * 1000) / 1000; }

    /* ---------------- right-click menu ---------------- */

    let ctxMenuX = 0;      /* wall-run position (meters) the menu was opened at */
    let hoverX = null;     /* wall-run position under the pointer, null once it leaves the stage */

    function pointerWallX() {
        if (!konvaStage) return null;
        const p = konvaStage.getPointerPosition();
        if (!p) return null;
        return konvaStage.getAbsoluteTransform().copy().invert().point(p).x;
    }

    function ctxMenuOpen() { return !!(ui.ctxMenu && ui.ctxMenu.style.display !== 'none'); }

    function hideCtxMenu() {
        if (ui.ctxMenu) ui.ctxMenu.style.display = 'none';
    }

    /* The record occupying the wall-run position x. A column test rather than a hit test,
     * which is what makes "above or below a window" count as being on it: the wall is
     * sliced exclusively along its run, so that whole column is spoken for. */
    function recordAtX(x) {
        return windowsList.find(w => x >= w.distFromLeft && x < w.distFromLeft + w.width) || null;
    }

    /* The open span containing x, bounded by the nearest record on each side or the wall
     * ends. Only meaningful when recordAtX(x) is null. */
    function gapAtX(x) {
        let start = 0, end = wallLengthM;
        sortedWindows().forEach(w => {
            const s = w.distFromLeft, e = w.distFromLeft + w.width;
            if (e <= x + 1e-9) start = Math.max(start, e);
            if (s >= x - 1e-9) end = Math.min(end, s);
        });
        return { start: start, end: end };
    }

    /* Centres desiredWidth on x, clamped into the gap x sits in, narrowing to the gap when it
     * has to. With nothing worth placing there it runs onNoRoom, which the right-click menu
     * answers with a message (the user aimed at that spot) and the keyboard paste answers by
     * falling back to the ordinary gap search. */
    function placeAtPointer(x, desiredWidth, place, onNoRoom) {
        const gap = recordAtX(x) ? null : gapAtX(x);
        const available = gap ? round3(gap.end - gap.start) : 0;
        if (available <= MIN_DIM_M) {
            if (onNoRoom) onNoRoom();
            else showMessageDialog('There is no open space at that point on the wall. Move a window or frame out of the way, or right click somewhere with a gap in it.');
            return;
        }
        const width = Math.min(desiredWidth, available);
        const start = Math.min(Math.max(x - width / 2, gap.start), gap.end - width);
        placeWithNarrowConfirm(round3(start), round3(width), place, desiredWidth);
    }

    function showCtxMenu(clientX, clientY, worldX) {
        ctxMenuX = Math.max(0, Math.min(wallLengthM, worldX));
        const onRecord = recordAtX(ctxMenuX);
        if (onRecord) selectWindow(onRecord.id);

        ui.ctxMenu.querySelectorAll('button[data-vrcwe-act]').forEach(btn => {
            const act = btn.dataset.vrcweAct;
            if (act === 'copy') btn.disabled = !onRecord;
            else if (act === 'paste') btn.disabled = !!onRecord || !clipboard;
            else btn.disabled = !!onRecord;
        });

        ui.ctxMenu.style.display = 'block';
        ui.ctxMenu.style.left = '0px';
        ui.ctxMenu.style.top = '0px';
        const box = ui.ctxMenu.getBoundingClientRect();
        ui.ctxMenu.style.left = Math.max(2, Math.min(clientX, window.innerWidth - box.width - 4)) + 'px';
        ui.ctxMenu.style.top = Math.max(2, Math.min(clientY, window.innerHeight - box.height - 4)) + 'px';
    }

    /* ---------------- shared color picker (js/colorPicker.js) ---------------- */

    let colorPickerLoadPromise = null;

    function ensureColorPickerLoaded() {
        if (window.VRC_openColorPicker) return Promise.resolve();
        if (colorPickerLoadPromise) return colorPickerLoadPromise;
        colorPickerLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = './js/colorPicker.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return colorPickerLoadPromise;
    }

    function openColorPickerForSelection() {
        ensureColorPickerLoaded().then(() => {
            window.VRC_openColorPicker({
                fillId: 'vrcweColorFill',
                opacityId: 'vrcweColorOpacity',
                swatchId: 'vrcweColorSwatch',
                showColor: true,
                showOpacity: true,
                /* Reparents the shared popover into our own modal <dialog> so it renders in
                 * the SAME top-layer entry — otherwise the dialog's top-layer stacking beats
                 * the popover's z-index and it draws behind the editor. See colorPicker.js. */
                container: dlg,
                /* The window glass's "no override" default is #2FA6C0/0.15, not white/100%
                 * — Reset must land there, and 100% opacity must be written as a real '1'
                 * (not the app-wide '' sentinel, which this module's own opacity parsing
                 * would silently misread as 0 via Number('')). See colorPicker.js commit(). */
                omitOpacityAtFull: false,
                resetHex: DEFAULT_WINDOW_FILL,
                resetAlpha: DEFAULT_WINDOW_OPACITY,
                onApply: () => applyFieldsToSelection(),
            });
        });
    }

    /* ---------------- Konva stage ---------------- */

    function buildStage() {
        destroyStage();
        konvaStage = new Konva.Stage({
            container: ui.canvas,
            width: ui.canvas.clientWidth,
            height: ui.canvas.clientHeight,
            draggable: true,
        });
        konvaStage.dragDistance(4);
        wallLayer = new Konva.Layer({ listening: false });
        gridLayer = new Konva.Layer({ listening: false });
        itemLayer = new Konva.Layer();
        snapLayer = new Konva.Layer({ listening: false });
        /* Order matters: wallLayer's opaque fill must be added BEFORE gridLayer or it
         * paints over the 1m grid and the dotted segment-boundary guides. */
        konvaStage.add(wallLayer, gridLayer, itemLayer, snapLayer);

        tr = new Konva.Transformer({
            rotateEnabled: false,
            enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'],
            ignoreStroke: true,
            boundBoxFunc: transformerBoundBoxFunc,
        });
        itemLayer.add(tr);
        tr.on('transformend', () => drawSnapGuides(null, null));

        konvaStage.on('dragmove', () => { if (konvaStage.isDragging()) drawGrid(); });

        /* Bound on the stage rather than a rect, so a right click anywhere in the view is
         * answered; the pointer's own wall-run position is what decides what the menu
         * offers and where an insert lands. */
        konvaStage.on('contextmenu', (e) => {
            e.evt.preventDefault();
            const pointer = konvaStage.getPointerPosition();
            if (!pointer) return;
            const world = konvaStage.getAbsoluteTransform().copy().invert().point(pointer);
            showCtxMenu(e.evt.clientX, e.evt.clientY, world.x);
        });

        konvaStage.on('wheel', (e) => {
            e.evt.preventDefault();
            hideCtxMenu();
            const oldScale = konvaStage.scaleX();
            const pointer = konvaStage.getPointerPosition();
            const factor = Math.pow(1.06, -e.evt.deltaY / 53);
            const newScale = Math.max(MIN_PX_PER_M, Math.min(MAX_PX_PER_M, oldScale * factor));
            const mousePointTo = {
                x: (pointer.x - konvaStage.x()) / oldScale,
                y: (pointer.y - konvaStage.y()) / oldScale,
            };
            konvaStage.scale({ x: newScale, y: newScale });
            konvaStage.position({
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            });
            drawGrid();
        });

        konvaStage.on('dragstart', () => hideCtxMenu());

        /* Where Ctrl+V aims. A keyboard paste has no event of its own to read a position from,
         * so the last place the pointer was seen over the stage stands in for it. */
        konvaStage.on('mousemove', () => { hoverX = pointerWallX(); });
        konvaStage.on('mouseleave', () => { hoverX = null; });

        konvaStage.on('click tap', (e) => {
            if (e.target === konvaStage) selectWindow(null);
        });
    }

    function destroyStage() {
        if (konvaStage) { konvaStage.destroy(); konvaStage = null; }
        rectNodes = {};
        tr = null;
    }

    function zoomBy(factor) {
        if (!konvaStage) return;
        const oldScale = konvaStage.scaleX();
        const newScale = Math.max(MIN_PX_PER_M, Math.min(MAX_PX_PER_M, oldScale * factor));
        const cx = konvaStage.width() / 2, cy = konvaStage.height() / 2;
        const worldC = { x: (cx - konvaStage.x()) / oldScale, y: (cy - konvaStage.y()) / oldScale };
        konvaStage.scale({ x: newScale, y: newScale });
        konvaStage.position({ x: cx - worldC.x * newScale, y: cy - worldC.y * newScale });
        drawGrid();
    }

    function fitView() {
        const cw = konvaStage.width(), ch = konvaStage.height();
        const pad = 0.15;
        const sFit = Math.min(cw / (wallLengthM * (1 + 2 * pad)), ch / (wallHeightM * (1 + 2 * pad)));
        const s = Math.max(MIN_PX_PER_M, Math.min(MAX_PX_PER_M, sFit));
        konvaStage.scale({ x: s, y: s });
        konvaStage.position({
            x: cw / 2 - (wallLengthM / 2) * s,
            y: ch / 2 - (wallHeightM / 2) * s,
        });
    }

    /* dlg.showModal() does not guarantee a synchronous layout pass in every embedding —
     * ui.canvas.clientWidth/Height (and therefore the just-built Konva stage's size) can
     * still read 0 immediately after. Defer the initial fit until the dialog has actually
     * been laid out, re-sizing the stage each retry so it picks up the real dimensions. */
    function fitViewWhenReady() {
        if (!dlg || !dlg.open || !konvaStage) return;
        if (ui.canvas.clientWidth > 0 && ui.canvas.clientHeight > 0) {
            konvaStage.size({ width: ui.canvas.clientWidth, height: ui.canvas.clientHeight });
            fitView();
            refreshAll();
        } else {
            requestAnimationFrame(fitViewWhenReady);
        }
    }

    /* ---------------- grid / wall outline ---------------- */

    function drawGrid() {
        gridLayer.destroyChildren();
        wallLayer.destroyChildren();
        const scale = konvaStage.scaleX();

        /* Wall outline (0,0 to wallLengthM,wallHeightM) + solid ground line. */
        wallLayer.add(new Konva.Rect({
            x: 0, y: 0, width: wallLengthM, height: wallHeightM,
            stroke: '#555', strokeWidth: 2 / scale, fill: '#f2f2f2',
        }));

        /* Dotted segment-boundary guides — every derived WD-export division, aligned
         * with each item's left/right edges. */
        segmentBoundaries().forEach(x => {
            gridLayer.add(new Konva.Line({
                points: [x, 0, x, wallHeightM],
                stroke: '#aaa', strokeWidth: 1 / scale, dash: [6 / scale, 5 / scale],
            }));
        });

        gridLayer.batchDraw();
        wallLayer.batchDraw();
    }

    /* ---------------- items ---------------- */

    function rebuildItems() {
        tr.nodes([]);
        Object.keys(rectNodes).forEach(id => rectNodes[id].destroy());
        rectNodes = {};

        windowsList.forEach(w => {
            const rect = new Konva.Rect({
                x: w.distFromLeft,
                y: zToCanvasY(w.baseZ + w.height),
                width: w.width,
                height: w.height,
                fill: fillForType(w),
                opacity: opacityForType(w),
                stroke: (w.id === selId) ? SELECT_COLOR : '#333',
                strokeWidth: ((w.id === selId) ? 2 : 1) / konvaStage.scaleX(),
                strokeScaleEnabled: false,
                draggable: true,
                dragBoundFunc: makeDragBoundFunc(w.id),
            });
            rect.on('click tap', (e) => { e.cancelBubble = true; selectWindow(w.id); });
            rect.on('dragstart', () => { pushUndo(); selectWindow(w.id); });
            rect.on('dragmove', () => {
                const rec = windowsList.find(x => x.id === w.id);
                if (!rec) return;
                rec.distFromLeft = round3(rect.x());
                if (rec.type !== DOOR_TYPE) rec.baseZ = round3(canvasYToZ(rect.y() + rect.height()));
                drawGrid();
                populateSelectionFields();
            });
            rect.on('dragend', () => { drawGrid(); drawSnapGuides(null, null); notifyChange(); });
            rect.on('transformstart', () => pushUndo());
            rect.on('transformend', () => {
                const newWidth = Math.max(MIN_DIM_M, rect.width() * rect.scaleX());
                const newHeight = Math.max(MIN_DIM_M, rect.height() * rect.scaleY());
                rect.scaleX(1); rect.scaleY(1);
                rect.width(newWidth); rect.height(newHeight);
                const rec = windowsList.find(x => x.id === w.id);
                if (rec) {
                    rec.distFromLeft = round3(rect.x());
                    rec.width = round3(newWidth);
                    rec.height = round3(newHeight);
                    rec.baseZ = (rec.type === DOOR_TYPE) ? 0 : round3(canvasYToZ(rect.y() + rect.height()));
                }
                drawGrid();
                populateSelectionFields();
                notifyChange();
            });
            itemLayer.add(rect);
            rectNodes[w.id] = rect;
        });

        tr.moveToTop();
        if (selId != null && rectNodes[selId]) tr.nodes([rectNodes[selId]]);
        itemLayer.batchDraw();
    }

    /* Absolute-position (pixel) clamp so a drag can't cross into a neighboring
     * record. dragBoundFunc receives/returns the node's prospective ABSOLUTE
     * position, which already includes the stage's zoom/pan — convert the meter
     * bounds through the stage transform each call so it stays correct at any
     * zoom level. Vertical stays within [0, wallHeightM] — EXCEPT an Open Doorway,
     * whose bottom is permanently pinned to the floor (baseZ=0): it can only slide
     * horizontally. When Snap to Objects is on, a further pass tries to snap the
     * dragged edges to the wall ends / other records' edges within SNAP_PX. */
    function makeDragBoundFunc(id) {
        return function (pos) {
            const rec = windowsList.find(x => x.id === id);
            if (!rec || !konvaStage) return pos;
            const isDoor = (rec.type === DOOR_TYPE);
            const { leftEdge, rightEdge } = neighborBounds(id);
            const inv = konvaStage.getAbsoluteTransform().copy().invert();
            const m = inv.point(pos);

            let clampedX = Math.min(Math.max(m.x, leftEdge), Math.max(leftEdge, rightEdge - rec.width));
            let clampedY = isDoor
                ? (wallHeightM - rec.height)
                : Math.min(Math.max(m.y, 0), Math.max(0, wallHeightM - rec.height));

            let snappedX = null, snappedY = null;
            if (snapEnabled) {
                const scale = konvaStage.scaleX();
                const thresholdM = SNAP_PX / scale;

                const xs = collectSnapCandidatesX(id);
                const leftSnap = nearestSnap(clampedX, xs, thresholdM);
                const rightSnap = nearestSnap(clampedX + rec.width, xs, thresholdM);
                let bestX = null, bestXVal = null, bestXD = Infinity;
                if (leftSnap != null) { const d = Math.abs(leftSnap - clampedX); if (d < bestXD) { bestXD = d; bestX = leftSnap; bestXVal = leftSnap; } }
                if (rightSnap != null) { const d = Math.abs(rightSnap - (clampedX + rec.width)); if (d < bestXD) { bestXD = d; bestX = rightSnap - rec.width; bestXVal = rightSnap; } }
                if (bestX != null) {
                    const reclamped = Math.min(Math.max(bestX, leftEdge), Math.max(leftEdge, rightEdge - rec.width));
                    if (Math.abs(reclamped - bestX) < 1e-6) { clampedX = reclamped; snappedX = bestXVal; }
                }

                if (!isDoor) {
                    const ys = collectSnapCandidatesY(id);
                    const topSnap = nearestSnap(clampedY, ys, thresholdM);
                    const botSnap = nearestSnap(clampedY + rec.height, ys, thresholdM);
                    let bestY = null, bestYVal = null, bestYD = Infinity;
                    if (topSnap != null) { const d = Math.abs(topSnap - clampedY); if (d < bestYD) { bestYD = d; bestY = topSnap; bestYVal = topSnap; } }
                    if (botSnap != null) { const d = Math.abs(botSnap - (clampedY + rec.height)); if (d < bestYD) { bestYD = d; bestY = botSnap - rec.height; bestYVal = botSnap; } }
                    if (bestY != null) {
                        const reclampedY = Math.min(Math.max(bestY, 0), Math.max(0, wallHeightM - rec.height));
                        if (Math.abs(reclampedY - bestY) < 1e-6) { clampedY = reclampedY; snappedY = bestYVal; }
                    }
                }
            }
            drawSnapGuides(snappedX, snappedY);

            return konvaStage.getAbsoluteTransform().point({ x: clampedX, y: clampedY });
        };
    }

    /* Resize-time equivalent of the drag clamp: keeps the box's horizontal span
     * inside the same neighbor-bounded gap, and its vertical span inside the wall.
     * Snapping only tries to snap edges that actually moved vs oldBox — for an Open
     * Doorway the bottom-resize anchors are disabled (see selectWindow), so its
     * bottom edge never appears "moved" and is therefore never snap-eligible, with
     * no extra type-specific branching needed here. */
    function transformerBoundBoxFunc(oldBox, newBox) {
        if (!selId || !konvaStage) return newBox;
        const { leftEdge, rightEdge } = neighborBounds(selId);
        const scale = konvaStage.scaleX();
        const stagePos = konvaStage.position();
        const toMeterX = (px) => (px - stagePos.x) / scale;
        const toMeterY = (px) => (px - stagePos.y) / scale;
        const toPxX = (m) => m * scale + stagePos.x;
        const toPxY = (m) => m * scale + stagePos.y;

        let x0 = toMeterX(newBox.x), x1 = toMeterX(newBox.x + newBox.width);
        let y0 = toMeterY(newBox.y), y1 = toMeterY(newBox.y + newBox.height);
        if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
        if (y0 > y1) { const t = y0; y0 = y1; y1 = t; }

        const oldX0 = toMeterX(oldBox.x), oldX1 = toMeterX(oldBox.x + oldBox.width);
        const oldY0 = toMeterY(oldBox.y), oldY1 = toMeterY(oldBox.y + oldBox.height);

        let snapX = null, snapY = null;
        if (snapEnabled) {
            const thresholdM = SNAP_PX / scale;
            const xs = collectSnapCandidatesX(selId);
            const ys = collectSnapCandidatesY(selId);
            if (Math.abs(x0 - oldX0) > 1e-6) { const s = nearestSnap(x0, xs, thresholdM); if (s != null) { x0 = s; snapX = s; } }
            if (Math.abs(x1 - oldX1) > 1e-6) { const s = nearestSnap(x1, xs, thresholdM); if (s != null) { x1 = s; snapX = s; } }
            if (Math.abs(y0 - oldY0) > 1e-6) { const s = nearestSnap(y0, ys, thresholdM); if (s != null) { y0 = s; snapY = s; } }
            if (Math.abs(y1 - oldY1) > 1e-6) { const s = nearestSnap(y1, ys, thresholdM); if (s != null) { y1 = s; snapY = s; } }
        }
        drawSnapGuides(snapX, snapY);

        x0 = Math.max(x0, leftEdge);
        x1 = Math.min(x1, rightEdge);
        y0 = Math.max(y0, 0);
        y1 = Math.min(y1, wallHeightM);
        if (x1 - x0 < MIN_DIM_M || y1 - y0 < MIN_DIM_M) return oldBox;

        return { x: toPxX(x0), y: toPxY(y0), width: (x1 - x0) * scale, height: (y1 - y0) * scale, rotation: 0 };
    }

    /* ---------------- selection / side panel ---------------- */

    function selectWindow(id) {
        selId = id;
        const rec = windowsList.find(w => w.id === id);
        if (tr) {
            tr.nodes(id != null && rectNodes[id] ? [rectNodes[id]] : []);
            /* An Open Doorway's bottom is pinned to the floor — no bottom-resize
             * anchors, so it can never be pulled up off the floor via resize either
             * (only via the disallowed vertical drag, already blocked above). */
            tr.enabledAnchors((rec && rec.type === DOOR_TYPE)
                ? ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right']
                : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']);
        }
        Object.keys(rectNodes).forEach(k => {
            rectNodes[k].stroke(k === selId ? SELECT_COLOR : '#333');
            rectNodes[k].strokeWidth(((k === selId) ? 2 : 1) / konvaStage.scaleX());
        });
        itemLayer.batchDraw();
        ui.copy.disabled = (selId == null);
        ui.duplicate.disabled = (selId == null);
        ui.del.disabled = (selId == null);
        populateSelectionFields();
    }

    function populateSelectionFields() {
        const rec = windowsList.find(w => w.id === selId);
        if (!rec) { ui.selDiv.style.display = 'none'; return; }
        ui.selDiv.style.display = '';
        ui.selLabel.textContent = typeLabel(rec.type) + ':';
        ui.width.value = roundDisplay(rec.width);
        ui.height.value = roundDisplay(rec.height);
        ui.baseZ.value = roundDisplay(rec.baseZ);
        ui.distLeft.value = roundDisplay(rec.distFromLeft);
        const isDoor = (rec.type === DOOR_TYPE);
        ui.baseZ.disabled = isDoor;
        ui.baseZLabel.textContent = isDoor ? 'Base Elevation (fixed at floor):' : 'Base Elevation:';
        if (isDoor) ui.baseZ.value = 0;

        const isWindow = (rec.type === 'window');
        ui.colorRow.style.display = isWindow ? 'flex' : 'none';
        if (isWindow) {
            ui.colorFill.value = rec.data_fill || DEFAULT_WINDOW_FILL;
            ui.colorOpacity.value = (rec.data_opacity != null) ? rec.data_opacity : DEFAULT_WINDOW_OPACITY;
            if (typeof window.updateFillSwatch === 'function') {
                window.updateFillSwatch('vrcweColorFill', 'vrcweColorOpacity', 'vrcweColorSwatch');
            }
        }
    }

    function applyFieldsToSelection() {
        const rec = windowsList.find(w => w.id === selId);
        if (!rec) return;
        pushUndo();

        const { leftEdge, rightEdge } = neighborBounds(selId);
        const isDoor = (rec.type === DOOR_TYPE);

        let width = displayToM(Number(ui.width.value));
        if (!isFinite(width) || width <= 0) width = rec.width;
        width = Math.min(width, Math.max(MIN_DIM_M, rightEdge - leftEdge));

        let distLeft = displayToM(Number(ui.distLeft.value));
        if (!isFinite(distLeft)) distLeft = rec.distFromLeft;
        distLeft = Math.min(Math.max(distLeft, leftEdge), Math.max(leftEdge, rightEdge - width));

        let height = displayToM(Number(ui.height.value));
        if (!isFinite(height) || height <= 0) height = rec.height;
        let baseZ = isDoor ? 0 : displayToM(Number(ui.baseZ.value));
        if (!isFinite(baseZ) || baseZ < 0) baseZ = 0;
        height = Math.min(height, Math.max(MIN_DIM_M, wallHeightM - baseZ));

        rec.width = round3(width);
        rec.distFromLeft = round3(distLeft);
        rec.height = round3(height);
        rec.baseZ = round3(baseZ);

        if (rec.type === 'window') {
            rec.data_fill = ui.colorFill.value || DEFAULT_WINDOW_FILL;
            /* Number('') === 0, NOT NaN — an empty opacity value must NOT be trusted as an
             * explicit 0 (that was the 100%-opacity bug: with omitOpacityAtFull left at its
             * old default, the picker wrote '' for 100%, and this line silently turned that
             * into 0% / fully transparent). The picker call now passes
             * omitOpacityAtFull:false so it never sends '' in the first place, but this
             * still guards against a blank/invalid value falling back to a sane default
             * instead of zeroing the window out. */
            let op = (ui.colorOpacity.value === '') ? NaN : Number(ui.colorOpacity.value);
            if (!isFinite(op) || op < 0) op = DEFAULT_WINDOW_OPACITY;
            if (op > 1) op = 1;
            rec.data_opacity = op;
        }

        commitChange();
    }

    const ARROW_KEYS = {
        ArrowLeft: { x: -1, z: 0 }, ArrowRight: { x: 1, z: 0 },
        ArrowUp: { x: 0, z: 1 }, ArrowDown: { x: 0, z: -1 },
    };
    const NUDGE_UNDO_GAP_MS = 700;
    let lastNudgeAt = 0;

    /* Arrow-key move for the selected record, clamped exactly as a drag is: inside the
     * neighbouring records horizontally, inside the wall vertically, and an Open Doorway stays
     * on the floor. A run of presses coalesces into one undo entry, the same way the Path
     * Editor's typing does, or holding an arrow down would fill the stack. */
    function nudgeSelection(dx, dz) {
        const rec = windowsList.find(w => w.id === selId);
        if (!rec) return;

        const now = Date.now();
        if (now - lastNudgeAt > NUDGE_UNDO_GAP_MS) pushUndo();
        lastNudgeAt = now;

        if (dx) {
            const { leftEdge, rightEdge } = neighborBounds(rec.id);
            rec.distFromLeft = round3(Math.min(Math.max(rec.distFromLeft + dx, leftEdge), Math.max(leftEdge, rightEdge - rec.width)));
        }
        if (dz && rec.type !== DOOR_TYPE) {
            rec.baseZ = round3(Math.min(Math.max(rec.baseZ + dz, 0), Math.max(0, wallHeightM - rec.height)));
        }
        commitChange();
    }

    /* ---------------- insert / copy / paste / duplicate / delete ---------------- */

    /* Default door height (6.5 ft) and window/frame base elevation (2 ft) are always
     * expressed as their meter equivalent — the internal model is always meters
     * regardless of the room's display unit (see the "Unit-aware display" note above). */
    const DOOR_DEFAULT_HEIGHT_M = 6.5 * 0.3048;
    const WINDOW_DEFAULT_BASE_Z_M = 2 * 0.3048;

    function defaultSizeFor(type) {
        if (type === DOOR_TYPE) return { width: 0.9, height: DOOR_DEFAULT_HEIGHT_M, baseZ: 0 };
        return { width: 1, height: 1.5, baseZ: WINDOW_DEFAULT_BASE_Z_M };
    }

    /* Tries to place `desiredWidth` at the first gap it fits. When `marginM` is given,
     * first tries to also leave that much clear space to its left (a fresh Insert
     * leaves a 1 ft gap from the wall/previous neighbor when there's room); if the
     * margin doesn't fit anywhere, falls back to placing flush with no margin ("if
     * available" — never blocks the insert just to preserve the gap). If nothing is
     * wide enough for the item even without a margin, narrows to the largest
     * available gap instead of failing outright; if that narrowed width drops below
     * the "worth asking" threshold, gates the placement behind a Cancel/Continue
     * confirm. `place(start, width)` receives the final start/width in meters once
     * approved. */
    function fitAndPlace(desiredWidth, place, marginM) {
        const margin = marginM || 0;

        if (margin > 0) {
            const marginGap = firstAvailableGap(margin + desiredWidth);
            if (marginGap) { place(round3(marginGap.start + margin), desiredWidth); return; }
        }

        let gap = firstAvailableGap(desiredWidth);
        let start, width;
        if (gap) {
            start = gap.start; width = desiredWidth;
        } else {
            gap = largestAvailableGap();
            if (!gap || (gap.end - gap.start) <= MIN_DIM_M) { alertNoRoom(); return; }
            start = gap.start; width = round3(gap.end - gap.start);
        }
        placeWithNarrowConfirm(start, width, place, desiredWidth);
    }

    /* Asks ONLY when the item had to be made smaller to fit AND what is left is too small to
     * be worth placing without saying so. Gating on the final width alone was wrong: an item
     * that is NARROW BY NATURE (a copied or duplicated 0.3 m window) fits an empty wall
     * perfectly and was still asked about every single time, with a message that reported
     * its own width as the space available. */
    function placeWithNarrowConfirm(start, width, place, desiredWidth) {
        const narrowed = (desiredWidth != null) && (width < desiredWidth - 1e-6);
        if (narrowed && width < NARROW_CONFIRM_THRESHOLD_M) {
            showConfirmDialog(
                `Only ${formatLenForMsg(width)} of space is available here. Continue and insert at ${formatLenForMsg(width)} wide instead of ${formatLenForMsg(desiredWidth)}?`,
                () => place(start, width)
            );
        } else {
            place(start, width);
        }
    }

    const INSERT_LEFT_GAP_M = 0.3048; /* 1 ft, applied to fresh Insert placements only */

    /* atX (meters along the wall's run) is the right-click menu's placement: the item is
     * centred there instead of hunting for the first gap, which is the whole point of that
     * menu. The toolbar buttons pass nothing and keep the original behaviour. */
    function insertNewWindow(type, atX) {
        const def = defaultSizeFor(type);
        const desired = Math.min(def.width, wallLengthM);
        const place = (start, width) => {
            const height = Math.min(def.height, wallHeightM - def.baseZ);
            pushUndo();
            const rec = {
                id: crypto.randomUUID(),
                type: type,
                distFromLeft: round3(start),
                width: round3(width),
                height: round3(Math.max(MIN_DIM_M, height)),
                baseZ: round3(def.baseZ),
            };
            if (type === 'window') {
                rec.data_fill = DEFAULT_WINDOW_FILL;
                rec.data_opacity = DEFAULT_WINDOW_OPACITY;
            }
            windowsList.push(rec);
            selId = rec.id;
            commitChange();
        };
        if (atX != null) placeAtPointer(atX, desired, place);
        else fitAndPlace(desired, place, INSERT_LEFT_GAP_M);
    }

    function alertNoRoom() {
        if (!ui.hint) return;
        const original = ui.hint.textContent;
        ui.hint.textContent = 'No open space left on this wall for a new window/frame.';
        ui.hint.style.color = '#ff8080';
        setTimeout(() => { ui.hint.textContent = original; ui.hint.style.color = ''; }, 2500);
    }

    function copySelected() {
        const rec = windowsList.find(w => w.id === selId);
        if (!rec) return;
        clipboard = JSON.parse(JSON.stringify(rec));
        ui.paste.disabled = false;
    }

    /* atX places at a point (the right-click menu, or the pointer for Ctrl+V); onNoRoom null
     * means say so rather than look elsewhere, which is what the menu wants. */
    function pasteClipboard(atX, onNoRoom) {
        if (!clipboard) return;
        const place = (start, width) => {
            pushUndo();
            const rec = JSON.parse(JSON.stringify(clipboard));
            rec.id = crypto.randomUUID();
            rec.width = round3(width);
            rec.distFromLeft = round3(start);
            windowsList.push(rec);
            selId = rec.id;
            commitChange();
        };
        if (atX != null) placeAtPointer(atX, clipboard.width, place, onNoRoom);
        else fitAndPlace(clipboard.width, place);
    }

    /* Duplicates the selected record, placing the copy so the gap BEFORE it repeats
     * the gap the original already has to ITS left (the wall's own left end counts
     * as "the wall" when the original has no left neighbor) — the quickest way to
     * lay out an evenly-spaced row of windows. Narrows to fit (with the same < 0.5m
     * confirm) when the repeated gap doesn't leave enough room. */
    function duplicateSelected() {
        const rec = windowsList.find(w => w.id === selId);
        if (!rec) return;

        const { leftEdge: recLeftEdge } = neighborBounds(rec.id);
        const gapLeft = Math.max(0, round3(rec.distFromLeft - recLeftEdge));
        let desiredStart = round3(rec.distFromLeft + rec.width + gapLeft);

        const others = sortedWindows().filter(w => w.id !== rec.id);

        /* Push past any record the naive repeat-gap position happens to land inside
         * (only possible when a wider neighbor further down the wall overlaps it). */
        let guard = 0;
        while (guard++ < others.length) {
            const hit = others.find(w => desiredStart >= w.distFromLeft - 1e-6 && desiredStart < w.distFromLeft + w.width - 1e-6);
            if (!hit) break;
            desiredStart = round3(hit.distFromLeft + hit.width);
        }

        let leftBound = 0, rightBound = wallLengthM;
        others.forEach(w => {
            const wEnd = round3(w.distFromLeft + w.width);
            if (wEnd <= desiredStart + 1e-6 && wEnd > leftBound) leftBound = wEnd;
            if (w.distFromLeft >= desiredStart - 1e-6 && w.distFromLeft < rightBound) rightBound = w.distFromLeft;
        });
        desiredStart = Math.max(desiredStart, leftBound);
        const available = round3(rightBound - desiredStart);

        if (available <= MIN_DIM_M) { alertNoRoom(); return; }
        const width = Math.min(rec.width, available);

        placeWithNarrowConfirm(desiredStart, width, (start, w) => {
            pushUndo();
            const newRec = JSON.parse(JSON.stringify(rec));
            newRec.id = crypto.randomUUID();
            newRec.distFromLeft = round3(start);
            newRec.width = round3(w);
            windowsList.push(newRec);
            selId = newRec.id;
            commitChange();
        }, rec.width);
    }

    function deleteSelected() {
        if (selId == null) return;
        pushUndo();
        windowsList = windowsList.filter(w => w.id !== selId);
        selId = null;
        commitChange();
    }

    /* ---------------- refresh / open / close ---------------- */

    function refreshAll() {
        ui.wallHeight.value = roundDisplay(wallHeightM);
        drawGrid();
        rebuildItems();
        selectWindow((selId != null && windowsList.some(w => w.id === selId)) ? selId : null);
        syncUndoButtons();
        ui.paste.disabled = !clipboard;
    }

    /* Redraw AND tell the caller. Every mutation goes through this rather than refreshAll()
     * directly, so a resize or a first fit (which also call refreshAll) never reads as an
     * edit. */
    function commitChange() {
        refreshAll();
        notifyChange();
    }

    function buildResult() {
        return {
            wallHeightM: wallHeightM,
            windows: windowsList.map(w => {
                const out = {
                    id: w.id, type: w.type,
                    distFromLeft: w.distFromLeft, width: w.width, height: w.height, baseZ: w.baseZ,
                };
                if (w.type === 'window') {
                    out.data_fill = w.data_fill || DEFAULT_WINDOW_FILL;
                    out.data_opacity = (w.data_opacity != null) ? w.data_opacity : DEFAULT_WINDOW_OPACITY;
                }
                return out;
            }),
        };
    }

    /* Fired on a settled change, never on every frame of a drag: the caller's answer to one
     * of these is a whole Workspace Designer export, which is far too much to run per frame. */
    let notifyTimer = null;

    function notifyChange() {
        if (!activeOpts || typeof activeOpts.onChange !== 'function') return;
        clearTimeout(notifyTimer);
        notifyTimer = setTimeout(() => {
            if (!activeOpts || typeof activeOpts.onChange !== 'function') return;
            activeOpts.onChange(buildResult());
        }, 120);
    }

    function finishAndApply() {
        const opts = activeOpts;
        activeOpts = null;
        clearTimeout(notifyTimer);
        hideCtxMenu();
        const result = buildResult();
        destroyStage();
        if (!opts || typeof opts.onClose !== 'function') return;
        opts.onClose(result);
    }

    async function open(opts) {
        buildDialog();
        await cssReady;
        activeOpts = opts;

        unitLabel = (opts.unit === 'feet') ? 'ft' : 'm';
        toMeters = (opts.unit === 'feet') ? (1 / 3.28084) : 1;
        updateUnitLabels();

        wallLengthM = Math.max(0.1, Number(opts.wallLengthM) || 6);
        wallHeightM = Math.max(0.1, Number(opts.wallHeightM) || 3);
        windowsList = Array.isArray(opts.windows) ? JSON.parse(JSON.stringify(opts.windows)) : [];
        /* Defensive repair: force any Open Doorway's baseZ back to the floor, in case
         * it was saved with a stale non-zero value from before this was enforced. */
        windowsList.forEach(w => { if (w.type === DOOR_TYPE) w.baseZ = 0; });
        selId = null;
        clipboard = null;
        hoverX = null;
        lastNudgeAt = 0;
        undoStack = [];
        redoStack = [];
        syncUndoButtons();
        if (ui.snapToggle) { ui.snapToggle.checked = snapEnabled; }
        hideCtxMenu();

        dlg.showModal();
        buildStage();
        fitViewWhenReady();
    }

    window.VRC.windowEditor = { open };
})();
