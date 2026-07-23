/* VRC SVG Path Editor — lazy-loaded, self-contained pathShape editor.
 *
 * Attaches window.VRC.pathEditor = { open(opts) }. Everything the editor
 * needs comes in through opts; nothing in this file reads VRC globals
 * (roomObj, stage, scale, ...) so the module stays separable. Konva is
 * the only external dependency (already loaded globally by VRC).
 *
 * Coordinate model: ITEM-LOCAL METERS, y-down — the path is centered
 * around the origin (the item anchor), exactly as stored in the
 * labelField JSON. The background image and the room wall outline are
 * translated by minus the item anchor so everything sits at its true
 * relative position. 1 editor unit = 1 m; the caller converts feet.
 *
 * opts = {
 *   path:            SVG path string (pathShape convention: meters, (0,0) at the item anchor)
 *   scaleX, scaleY:  labelField JSON scale multipliers to bake into coords (default 1)
 *   rotationDeg:     item rotation to bake into coords (default 0)
 *   anchorXM, anchorYM: item anchor in floor meters (translates background/walls; returned center is floor coords)
 *   background:      null | { image: HTMLImageElement, xM, yM, wM, hM, rotationDeg, opacity }  (floor meters)
 *   roomWM, roomLM:  room size in meters (wall outline + view fallback)
 *   onClose(result): result = { path, centerXM, centerYM } — path re-centered on its anchor
 *                    bbox center, centerXM/YM in FLOOR meters (anchor + local center).
 *                    null when the path is empty/degenerate.
 * }
 *
 * Two modes (Draw / Edit toolbar buttons):
 *   DRAW — mirrors the Draw Simple Path builder: click to place points
 *   sequentially (Line or Curve segment per the Line/Curve buttons, dashed
 *   rubber band to the pointer), click the first point (enlarged, yellow on
 *   hover) to close — closing switches to Edit. Clicking the Draw Mode
 *   button DELETES the current path and starts over. Fresh inserts open in
 *   Draw mode (opts.startMode); reopening an existing shape opens in Edit.
 *   EDIT — drag points (hover = baby blue + slightly larger), click a point
 *   to select (point + its segment draw purple), click a segment to insert
 *   a point at that spot, Line↔Curve conversion / Delete Point on the
 *   selection.
 *   Both: pan with the hand tool (toolbar toggle, same icon as the room
 *   canvas — the stage only drags while it's active); zoom with the +/−
 *   toolbar buttons only (no wheel zoom, mirroring the room canvas).
 *
 * Supported path commands: M L H V C S Q T A Z, absolute and relative.
 * H/V normalize to L, S to C, T to Q on parse; output uses M L C Q A Z only.
 * Numbers must be whitespace/comma separated (SVG's packed arc-flag
 * shorthand like "a1 1 0 011 0" is not tokenized).
 */

(function () {
    'use strict';

    window.VRC = window.VRC || {};

    const MIN_PX_PER_M = 2;
    const MAX_PX_PER_M = 2000;
    const SELECT_COLOR = '#8000c8';   /* purple — selected segment + anchor */
    const PATH_COLOR = '#0352a6';
    const HOVER_COLOR = '#89CFF0';    /* baby blue — edit-mode point hover */

    let dlg = null;
    let ui = {};
    let konvaStage = null;
    let gridLayer, bgLayer, pathLayer, handleLayer;
    let previewPath = null;
    let selectedOverlay = null;      /* purple Konva.Path over the selected segment */
    let segs = [];
    let selIndex = -1;
    let drawMode = 'L';              /* 'L' or 'C' — segment type placed while drawing */
    let editorMode = 'edit';         /* 'draw' or 'edit' */
    let drawingHole = false;         /* Draw Mode → "Add a Hole": the subpath being drawn is a cut-out */
    let panModeOn = false;           /* hand tool: stage drags only while active (mirrors the room canvas pan toggle) */
    let rubberBand = null;           /* dashed preview line, draw mode only */
    let anchorNodes = [];            /* [{ segIndex, node }] for in-place restyle (no rebuild on select — a rebuild mid-mousedown destroys the node being dragged) */
    let activeOpts = null;
    let rafPending = false;
    let cssReady = null;

    /* ---------------- undo / redo (model snapshots) ---------------- */

    const UNDO_MAX = 100;
    let undoStack = [];              /* JSON snapshots of segs, pre-mutation */
    let redoStack = [];
    let _lastTextUndoPush = 0;       /* coalesces per-keystroke textarea edits into one undo entry */
    let _progSelRange = null;        /* textarea range set by highlightSelectedSegmentText — lets Delete still mean "delete point" */

    function syncUndoButtons() {
        if (!ui.undo) return;
        ui.undo.disabled = !undoStack.length;
        ui.redo.disabled = !redoStack.length;
    }

    /* Call BEFORE a mutation: captures the pre-change state. A new edit clears redo. */
    function pushUndo() {
        const snap = JSON.stringify(segs);
        if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
        undoStack.push(snap);
        if (undoStack.length > UNDO_MAX) undoStack.shift();
        redoStack = [];
        syncUndoButtons();
    }

    function doUndo() {
        if (!undoStack.length) return;
        redoStack.push(JSON.stringify(segs));
        segs = JSON.parse(undoStack.pop());
        selIndex = -1;
        hideRubberBand();
        refreshAll();
        syncUndoButtons();
    }

    function doRedo() {
        if (!redoStack.length) return;
        undoStack.push(JSON.stringify(segs));
        segs = JSON.parse(redoStack.pop());
        selIndex = -1;
        hideRubberBand();
        refreshAll();
        syncUndoButtons();
    }

    /* Toolbar +/- zoom (mirrors the main VRC zoom buttons): step about the canvas center. */
    function zoomBy(factor) {
        if (!konvaStage) return;
        const oldScale = konvaStage.scaleX();
        const newScale = Math.max(MIN_PX_PER_M, Math.min(MAX_PX_PER_M, oldScale * factor));
        const cx = konvaStage.width() / 2, cy = konvaStage.height() / 2;
        const worldC = { x: (cx - konvaStage.x()) / oldScale, y: (cy - konvaStage.y()) / oldScale };
        konvaStage.scale({ x: newScale, y: newScale });
        konvaStage.position({ x: cx - worldC.x * newScale, y: cy - worldC.y * newScale });
        scheduleRedraw(true);
    }

    /* ---------------- path parsing / serializing ---------------- */

    function tokenizePathD(d) {
        return String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
    }

    function parsePathD(d) {
        const t = tokenizePathD(d);
        if (!t.length) throw new Error('empty path');
        const out = [];
        let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
        let cmd = null;
        let prevC = null, prevQ = null;

        const num = () => {
            const v = parseFloat(t[i++]);
            if (!isFinite(v)) throw new Error('bad number');
            return v;
        };

        while (i < t.length) {
            const tok = t[i];
            if (/[A-Za-z]/.test(tok)) { cmd = tok; i++; }
            else if (cmd === null) throw new Error('path must start with M');
            else if (cmd === 'M') cmd = 'L';
            else if (cmd === 'm') cmd = 'l';

            const rel = (cmd === cmd.toLowerCase() && cmd !== 'z');
            const C = cmd.toUpperCase();
            let x, y, x1, y1, x2, y2;

            switch (C) {
                case 'M':
                    x = num(); y = num();
                    if (rel) { x += cx; y += cy; }
                    out.push({ c: 'M', x, y });
                    cx = sx = x; cy = sy = y; prevC = prevQ = null;
                    break;
                case 'L':
                    x = num(); y = num();
                    if (rel) { x += cx; y += cy; }
                    out.push({ c: 'L', x, y });
                    cx = x; cy = y; prevC = prevQ = null;
                    break;
                case 'H':
                    x = num(); if (rel) x += cx;
                    out.push({ c: 'L', x, y: cy });
                    cx = x; prevC = prevQ = null;
                    break;
                case 'V':
                    y = num(); if (rel) y += cy;
                    out.push({ c: 'L', x: cx, y });
                    cy = y; prevC = prevQ = null;
                    break;
                case 'C':
                    x1 = num(); y1 = num(); x2 = num(); y2 = num(); x = num(); y = num();
                    if (rel) { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
                    out.push({ c: 'C', x1, y1, x2, y2, x, y });
                    prevC = { x: x2, y: y2 }; prevQ = null;
                    cx = x; cy = y;
                    break;
                case 'S':
                    x2 = num(); y2 = num(); x = num(); y = num();
                    if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
                    x1 = prevC ? 2 * cx - prevC.x : cx;
                    y1 = prevC ? 2 * cy - prevC.y : cy;
                    out.push({ c: 'C', x1, y1, x2, y2, x, y });
                    prevC = { x: x2, y: y2 }; prevQ = null;
                    cx = x; cy = y;
                    break;
                case 'Q':
                    x1 = num(); y1 = num(); x = num(); y = num();
                    if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; }
                    out.push({ c: 'Q', x1, y1, x, y });
                    prevQ = { x: x1, y: y1 }; prevC = null;
                    cx = x; cy = y;
                    break;
                case 'T':
                    x = num(); y = num();
                    if (rel) { x += cx; y += cy; }
                    x1 = prevQ ? 2 * cx - prevQ.x : cx;
                    y1 = prevQ ? 2 * cy - prevQ.y : cy;
                    out.push({ c: 'Q', x1, y1, x, y });
                    prevQ = { x: x1, y: y1 }; prevC = null;
                    cx = x; cy = y;
                    break;
                case 'A': {
                    const rx = num(), ry = num(), rot = num(), laf = num(), sf = num();
                    x = num(); y = num();
                    if (rel) { x += cx; y += cy; }
                    out.push({ c: 'A', rx, ry, rot, laf, sf, x, y });
                    cx = x; cy = y; prevC = prevQ = null;
                    break;
                }
                case 'Z':
                    out.push({ c: 'Z' });
                    cx = sx; cy = sy; prevC = prevQ = null;
                    break;
                default:
                    throw new Error('unsupported command ' + cmd);
            }
        }
        if (!out.length || out[0].c !== 'M') throw new Error('path must start with M');
        return out;
    }

    const fmt = (n) => String(Math.round(n * 1000) / 1000);

    function serializeSegs(list, dx, dy) {
        dx = dx || 0; dy = dy || 0;
        const parts = [];
        list.forEach(s => {
            switch (s.c) {
                case 'M': parts.push('M ' + fmt(s.x + dx) + ' ' + fmt(s.y + dy)); break;
                case 'L': parts.push('L ' + fmt(s.x + dx) + ' ' + fmt(s.y + dy)); break;
                case 'C': parts.push('C ' + fmt(s.x1 + dx) + ' ' + fmt(s.y1 + dy) + ' ' + fmt(s.x2 + dx) + ' ' + fmt(s.y2 + dy) + ' ' + fmt(s.x + dx) + ' ' + fmt(s.y + dy)); break;
                case 'Q': parts.push('Q ' + fmt(s.x1 + dx) + ' ' + fmt(s.y1 + dy) + ' ' + fmt(s.x + dx) + ' ' + fmt(s.y + dy)); break;
                case 'A': parts.push('A ' + fmt(s.rx) + ' ' + fmt(s.ry) + ' ' + fmt(s.rot) + ' ' + (s.laf ? 1 : 0) + ' ' + (s.sf ? 1 : 0) + ' ' + fmt(s.x + dx) + ' ' + fmt(s.y + dy)); break;
                case 'Z': parts.push('Z'); break;
            }
        });
        return parts.join(' ');
    }

    /* Bake labelField scale + item rotation into the local coords (origin stays at the item anchor). */
    function bakeScaleRotation(list, scaleX, scaleY, rotationDeg) {
        const rad = (rotationDeg || 0) * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const tp = (x, y) => {
            const px = x * scaleX, py = y * scaleY;
            return { x: px * cos - py * sin, y: px * sin + py * cos };
        };
        list.forEach(s => {
            if (s.c === 'Z') return;
            if ('x1' in s) { const p = tp(s.x1, s.y1); s.x1 = p.x; s.y1 = p.y; }
            if ('x2' in s) { const p = tp(s.x2, s.y2); s.x2 = p.x; s.y2 = p.y; }
            const p = tp(s.x, s.y); s.x = p.x; s.y = p.y;
            if (s.c === 'A') {
                s.rx *= Math.abs(scaleX); s.ry *= Math.abs(scaleY);
                s.rot = (s.rot || 0) + (rotationDeg || 0);
            }
        });
    }

    /* ---------------- geometry helpers ---------------- */

    /* Drawing works on the LAST subpath so a closed shape can be followed by another M
     * (Draw Mode → "Add New Sub-Path"). Open = the segment list doesn't end with Z. */
    function lastSubpathOpen() {
        return segs.length > 0 && segs[segs.length - 1].c !== 'Z';
    }

    function currentSubpathStart() {
        for (let i = segs.length - 1; i >= 0; i--) if (segs[i].c === 'M') return i;
        return -1;
    }

    function currentSubpathAnchorCount() {
        const m = currentSubpathStart();
        return m < 0 ? 0 : segs.length - m;
    }

    function segStartPoint(index) {
        for (let i = index - 1; i >= 0; i--) {
            const s = segs[i];
            if (s.c === 'Z') {
                for (let j = i - 1; j >= 0; j--) if (segs[j].c === 'M') return { x: segs[j].x, y: segs[j].y };
                return null;
            }
            if ('x' in s) return { x: s.x, y: s.y };
        }
        return null;
    }

    function pointOnSeg(s, p0, t) {
        const u = 1 - t;
        if (s.c === 'L' || s.c === 'A' || s.c === 'M') {
            return { x: p0.x + (s.x - p0.x) * t, y: p0.y + (s.y - p0.y) * t };
        }
        if (s.c === 'Q') {
            return {
                x: u * u * p0.x + 2 * u * t * s.x1 + t * t * s.x,
                y: u * u * p0.y + 2 * u * t * s.y1 + t * t * s.y,
            };
        }
        return {
            x: u * u * u * p0.x + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x,
            y: u * u * u * p0.y + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y,
        };
    }

    function nearestSegment(wp) {
        let best = null;
        segs.forEach((s, i) => {
            if (s.c === 'Z' || s.c === 'M') return;
            const p0 = segStartPoint(i);
            if (!p0) return;
            for (let k = 0; k <= 40; k++) {
                const t = k / 40;
                const p = pointOnSeg(s, p0, t);
                const d = (p.x - wp.x) ** 2 + (p.y - wp.y) ** 2;
                if (!best || d < best.d) best = { d, i, t, p };
            }
        });
        return best;
    }

    function modelBBox() {
        if (!previewPath) return null;
        const r = previewPath.getSelfRect();
        if (!r || !isFinite(r.width) || !isFinite(r.height)) return null;
        return r;
    }

    /* ---------------- dialog DOM ---------------- */

    function buildDialog() {
        if (dlg) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './js/pathEditor/pathEditor.css';
        cssReady = new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; });
        document.head.appendChild(link);

        dlg = document.createElement('dialog');
        dlg.id = 'vrcPathEditorDialog';
        dlg.innerHTML = `
            <div class="vrcpe-toolbar">
                <span class="vrcpe-title">Path Editor</span>
                <button id="vrcpeDrawMode" title="Draw a new path or add points by clicking">Draw Mode</button>
                <button id="vrcpeEditMode" title="Drag, select, and refine points">Edit Mode</button>
                <span class="vrcpe-sep"></span>
                <button id="vrcpeModeLine" class="vrcpe-mode-active" title="Place straight line segments while drawing (shortcut: L)">Line</button>
                <button id="vrcpeModeCurve" title="Place curved segments while drawing (shortcut: C)">Curve</button>
                <span class="vrcpe-sep"></span>
                <button id="vrcpeToCurve" disabled title="Convert the selected segment to a curve">Line &rarr; Curve</button>
                <button id="vrcpeToLine" disabled title="Convert the selected segment to a line">Curve &rarr; Line</button>
                <button id="vrcpeDeletePt" disabled title="Delete the selected point (shortcut: Delete)">Delete Point</button>
                <span class="vrcpe-sep"></span>
                <button id="vrcpeUndo" disabled title="Undo (Ctrl+Z)"><i class="icon icon-undo-regular"></i></button>
                <button id="vrcpeRedo" disabled title="Redo (Shift+Ctrl+Z)"><i class="icon icon-redo-regular"></i></button>
                <span class="vrcpe-sep"></span>
                <button id="vrcpePan" title="Toggle Pan — drag to move the view"><i class="icon icon-raise-hand-bold"></i></button>
                <button id="vrcpeZoomOut" class="vrcpe-zoom" title="Zoom out">&#8722;</button>
                <button id="vrcpeZoomIn" class="vrcpe-zoom" title="Zoom in">+</button>
                <span class="vrcpe-hint" id="vrcpeHint"></span>
                <button id="vrcpeClose" class="vrcpe-close" title="Apply the path and close the editor (shortcut: Esc)">Close</button>
            </div>
            <div class="vrcpe-body">
                <div class="vrcpe-sidepane">
                    <label>Path (meters):</label>
                    <textarea id="vrcpePathText" spellcheck="false" autocomplete="off"></textarea>
                </div>
                <div class="vrcpe-canvas" id="vrcpeCanvas"></div>
            </div>`;
        document.body.appendChild(dlg);

        /* nested choice dialog for the Draw Mode button — appended to body (NOT inside
         * dlg) so its keystrokes don't hit dlg's keydown handler (Esc = apply there) */
        const drawChoice = document.createElement('dialog');
        drawChoice.id = 'vrcpeDrawChoice';
        drawChoice.className = 'vrcpe-choice';
        drawChoice.innerHTML = `
            <div class="vrcpe-choice-title">Draw Mode</div>
            <button id="vrcpeDrawAddShape">Add New Sub-Path</button>
            <button id="vrcpeDrawAddHole">Add a Hole</button>
            <button id="vrcpeDrawEraseAll">Erase &amp; Start Over</button>
            <button id="vrcpeDrawCancel">Cancel</button>`;
        document.body.appendChild(drawChoice);

        /* Hole instructions — shown on every "Add a Hole" click, before drawing starts. */
        const holeInfo = document.createElement('dialog');
        holeInfo.id = 'vrcpeHoleInfo';
        holeInfo.className = 'vrcpe-choice';
        holeInfo.innerHTML = `
            <div class="vrcpe-choice-title">Add a Hole</div>
            <div class="vrcpe-choice-body">Draw the hole fully inside your existing shape. When you close the hole, that area is cut out of the shape.</div>
            <button id="vrcpeHoleInfoStart">Start Drawing</button>
            <button id="vrcpeHoleInfoCancel">Cancel</button>`;
        document.body.appendChild(holeInfo);

        /* Shown when a just-closed hole isn't fully inside another closed subpath. */
        const holeFail = document.createElement('dialog');
        holeFail.id = 'vrcpeHoleFail';
        holeFail.className = 'vrcpe-choice';
        holeFail.innerHTML = `
            <div class="vrcpe-choice-title">Hole Outside the Shape</div>
            <div class="vrcpe-choice-body">A hole has to stay fully inside the shape, so the one you drew was removed. To add a hole, draw it again keeping every point inside the shape.</div>
            <button id="vrcpeHoleFailOk">OK</button>`;
        document.body.appendChild(holeFail);

        ui = {
            drawChoice: drawChoice,
            drawAddShape: drawChoice.querySelector('#vrcpeDrawAddShape'),
            drawAddHole: drawChoice.querySelector('#vrcpeDrawAddHole'),
            drawEraseAll: drawChoice.querySelector('#vrcpeDrawEraseAll'),
            drawCancel: drawChoice.querySelector('#vrcpeDrawCancel'),
            holeInfo: holeInfo,
            holeInfoStart: holeInfo.querySelector('#vrcpeHoleInfoStart'),
            holeInfoCancel: holeInfo.querySelector('#vrcpeHoleInfoCancel'),
            holeFail: holeFail,
            holeFailOk: holeFail.querySelector('#vrcpeHoleFailOk'),
            drawModeBtn: dlg.querySelector('#vrcpeDrawMode'),
            editModeBtn: dlg.querySelector('#vrcpeEditMode'),
            modeLine: dlg.querySelector('#vrcpeModeLine'),
            modeCurve: dlg.querySelector('#vrcpeModeCurve'),
            toCurve: dlg.querySelector('#vrcpeToCurve'),
            toLine: dlg.querySelector('#vrcpeToLine'),
            deletePt: dlg.querySelector('#vrcpeDeletePt'),
            undo: dlg.querySelector('#vrcpeUndo'),
            redo: dlg.querySelector('#vrcpeRedo'),
            pan: dlg.querySelector('#vrcpePan'),
            zoomIn: dlg.querySelector('#vrcpeZoomIn'),
            zoomOut: dlg.querySelector('#vrcpeZoomOut'),
            close: dlg.querySelector('#vrcpeClose'),
            canvas: dlg.querySelector('#vrcpeCanvas'),
            pathText: dlg.querySelector('#vrcpePathText'),
            hint: dlg.querySelector('#vrcpeHint'),
        };

        ui.close.onclick = () => { finishAndApply(); dlg.close(); };
        ui.undo.onclick = () => doUndo();
        ui.redo.onclick = () => doRedo();
        ui.pan.onclick = () => setPanMode(!panModeOn);
        ui.zoomIn.onclick = () => zoomBy(1.2);
        ui.zoomOut.onclick = () => zoomBy(1 / 1.2);
        /* Draw Mode with an existing path: choose between adding another shape (new M
         * subpath) and erasing everything. Empty canvas skips straight to drawing. */
        ui.drawModeBtn.onclick = () => {
            if (!segs.length) {
                selIndex = -1;
                setEditorMode('draw');
                refreshAll();
                return;
            }
            /* a hole needs a closed subpath to live inside */
            ui.drawAddHole.disabled = !segs.some(s => s.c === 'Z');
            ui.drawChoice.showModal();
        };
        ui.editModeBtn.onclick = () => {
            closeOpenSubpath();
            setEditorMode('edit');
            refreshAll();
        };
        ui.drawAddShape.onclick = () => {
            ui.drawChoice.close();
            drawingHole = false;
            selIndex = -1;
            setEditorMode('draw'); /* path kept closed — the next click starts a new M */
            refreshAll();
        };
        ui.drawAddHole.onclick = () => {
            ui.drawChoice.close();
            ui.holeInfo.showModal();
        };
        ui.holeInfoStart.onclick = () => {
            ui.holeInfo.close();
            drawingHole = true;
            selIndex = -1;
            setEditorMode('draw');
            refreshAll();
        };
        ui.holeInfoCancel.onclick = () => ui.holeInfo.close();
        ui.holeFailOk.onclick = () => ui.holeFail.close();
        ui.drawEraseAll.onclick = () => {
            ui.drawChoice.close();
            pushUndo();
            segs = [];
            drawingHole = false;
            selIndex = -1;
            setEditorMode('draw');
            refreshAll();
        };
        ui.drawCancel.onclick = () => ui.drawChoice.close();
        ui.modeLine.onclick = () => setDrawMode('L');
        ui.modeCurve.onclick = () => setDrawMode('C');
        ui.toCurve.onclick = () => convertSelected('C');
        ui.toLine.onclick = () => convertSelected('L');
        ui.deletePt.onclick = () => deleteSelected();

        ui.pathText.addEventListener('input', () => {
            _progSelRange = null; /* user is really typing now — Delete reverts to text editing */
            try {
                const parsed = parsePathD(ui.pathText.value);
                ui.pathText.classList.remove('vrcpe-invalid');
                /* One undo entry per typing burst, not per keystroke. */
                if (Date.now() - _lastTextUndoPush > 800) pushUndo();
                _lastTextUndoPush = Date.now();
                segs = parsed;
                selIndex = -1;
                refreshAll(true);
                updateCaretHighlight(); /* keep the edited segment purple on canvas */
            } catch {
                ui.pathText.classList.add('vrcpe-invalid');
            }
        });
        /* Caret moves (click / arrows) inside the textarea select the matching segment. */
        ui.pathText.addEventListener('click', updateCaretHighlight);
        ui.pathText.addEventListener('keyup', updateCaretHighlight);

        /* Keep VRC's document-level shortcuts (Delete = delete item, space = Quick Add, ...) from firing while the editor is open. */
        dlg.addEventListener('keydown', (e) => {
            const typing = document.activeElement === ui.pathText;
            /* Model undo/redo everywhere in the editor, including the textarea (the
             * model is the source of truth; preventDefault suppresses native text undo,
             * which would desync from the model anyway). */
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey) doRedo(); else doUndo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                e.stopPropagation();
                doRedo();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                /* The point-click highlight focuses the textarea; while that programmatic
                 * selection is untouched, Delete still means "delete the selected point". */
                const progSel = typing && _progSelRange
                    && ui.pathText.selectionStart === _progSelRange.start
                    && ui.pathText.selectionEnd === _progSelRange.end;
                if ((!typing || progSel) && selIndex >= 0) {
                    deleteSelected();
                    e.preventDefault();
                }
            }
            /* draw-mode segment-type toggle: C = Curve, L = Line */
            if (!typing && editorMode === 'draw') {
                if (e.key === 'c' || e.key === 'C') setDrawMode('C');
                if (e.key === 'l' || e.key === 'L') setDrawMode('L');
            }
            if (e.key === 'Escape') finishAndApply(); /* the default Esc close follows */
            else e.stopPropagation();
        });

        /* Any close (button, Esc, programmatic) applies the path back — per spec.
         * finishAndApply() is idempotent (activeOpts nulls on first run); the button and
         * Esc paths above also invoke it directly because some embedded browsers deliver
         * dialog 'close' events unreliably — and possibly LATE, after a re-open, which is
         * why the listener ignores events that arrive while the dialog is showing. */
        dlg.addEventListener('close', () => { if (!dlg.open) finishAndApply(); });

        const syncStageSize = () => {
            if (dlg.open && konvaStage && ui.canvas.clientWidth > 0 && ui.canvas.clientHeight > 0) {
                konvaStage.size({ width: ui.canvas.clientWidth, height: ui.canvas.clientHeight });
                scheduleRedraw();
            }
        };
        window.addEventListener('resize', syncStageSize);
        new ResizeObserver(syncStageSize).observe(ui.canvas);
    }

    function setDrawMode(mode) {
        drawMode = mode;
        ui.modeLine.classList.toggle('vrcpe-mode-active', mode === 'L');
        ui.modeCurve.classList.toggle('vrcpe-mode-active', mode === 'C');
    }

    function setEditorMode(mode) {
        if (panModeOn) setPanMode(false); /* picking a mode means the user wants to edit again */
        editorMode = mode;
        ui.drawModeBtn.classList.toggle('vrcpe-mode-active', mode === 'draw');
        ui.editModeBtn.classList.toggle('vrcpe-mode-active', mode === 'edit');
        /* Line/Curve pick the segment type placed while DRAWING — meaningless in Edit
         * mode, where the Line→Curve / Curve→Line conversion buttons take over. */
        ui.modeLine.disabled = (mode === 'edit');
        ui.modeCurve.disabled = (mode === 'edit');
        ui.hint.innerHTML = (mode === 'draw')
            ? (drawingHole
                ? '<b>Drawing a hole</b> &middot; keep every point inside the shape &middot; click the first point to close and cut it out &middot; 1 unit = 1 meter'
                : 'Click to place points &middot; Line / Curve picks the segment type (keys L / C) &middot; click the first point to close &middot; hand tool to pan &middot; + / &#8722; to zoom &middot; 1 unit = 1 meter')
            : 'Drag a point to move it &middot; click a point to select &middot; click a line to insert a point &middot; hand tool to pan &middot; + / &#8722; to zoom &middot; 1 unit = 1 meter';
        if (mode === 'edit') hideRubberBand();
    }

    /* Hand tool (mirrors the room canvas pan toggle): the stage only drags while it's
     * active, and point handles stop listening so a drag anywhere pans the view. */
    function setPanMode(on) {
        panModeOn = on;
        if (ui.pan) ui.pan.classList.toggle('vrcpe-mode-active', on);
        if (konvaStage) {
            konvaStage.draggable(on);
            konvaStage.container().style.cursor = on ? 'grab' : 'default';
        }
        if (on) hideRubberBand();
        if (previewPath) previewPath.listening(editorMode === 'edit' && !on);
        rebuildHandles();
    }

    function hideRubberBand() {
        if (rubberBand) { rubberBand.destroy(); rubberBand = null; }
    }

    /* Dotted preview from the last placed point to the pointer (polyBuilder-style). */
    function updateRubberBand() {
        if (editorMode !== 'draw' || !lastSubpathOpen()) { hideRubberBand(); return; }
        const last = segs[segs.length - 1];
        if (!('x' in last)) { hideRubberBand(); return; }
        const wp = worldPointer();
        if (!wp) return;
        const s = konvaStage.scaleX();
        if (!rubberBand || !rubberBand.getLayer()) {
            /* re-create when missing OR detached — rebuildPreview()'s destroyChildren()
             * kills the node while this reference survives (the invisible-rubber-band bug) */
            rubberBand = new Konva.Line({
                stroke: 'black',
                opacity: 0.4,
                listening: false,
            });
            pathLayer.add(rubberBand);
        }
        rubberBand.points([last.x, last.y, wp.x, wp.y]);
        rubberBand.strokeWidth(1 / s);
        rubberBand.dash([10 / s, 5 / s]);
    }

    /* ---------------- Konva stage ---------------- */

    function buildStage() {
        destroyStage();
        konvaStage = new Konva.Stage({
            container: ui.canvas,
            width: ui.canvas.clientWidth,
            height: ui.canvas.clientHeight,
            /* the stage only drags while the hand tool is active (room-canvas parity;
             * zoom is +/- buttons only — no wheel handler on purpose) */
            draggable: panModeOn,
        });
        /* default dragDistance is 0 — any 1px jitter during a click starts a pan and
         * Konva then suppresses the click (the intermittent "click does nothing" bug) */
        konvaStage.dragDistance(4);
        gridLayer = new Konva.Layer({ listening: false });
        bgLayer = new Konva.Layer({ listening: false });
        pathLayer = new Konva.Layer();
        handleLayer = new Konva.Layer();
        konvaStage.add(gridLayer, bgLayer, pathLayer, handleLayer);

        konvaStage.on('dragmove', scheduleRedraw);
        konvaStage.on('dragstart', () => { if (panModeOn) konvaStage.container().style.cursor = 'grabbing'; });
        konvaStage.on('dragend', () => { if (panModeOn) konvaStage.container().style.cursor = 'grab'; });

        /* DRAW mode: click on empty canvas places the next point (Konva suppresses click
         * after a drag, so pans don't add points); a click NEAR the first point closes the
         * path instead (covers near-misses of the small circle) and switches to Edit mode.
         * EDIT mode: click on empty canvas just deselects. Hand tool: clicks do nothing. */
        konvaStage.on('click tap', (e) => {
            if (e.target !== konvaStage) return;
            if (panModeOn) return;
            if (editorMode === 'draw') {
                const wp = worldPointer();
                if (lastSubpathOpen() && currentSubpathAnchorCount() >= 3) {
                    const m0 = segs[currentSubpathStart()];
                    const r = handleRadius() * 2.5;
                    if (wp && m0 && (wp.x - m0.x) ** 2 + (wp.y - m0.y) ** 2 <= r * r) {
                        closeDrawnPath();
                        return;
                    }
                }
                appendPointAtPointer(); /* starts a new M subpath when nothing is open */
            }
            else { selIndex = -1; syncSelection(); }
        });

        konvaStage.on('pointermove', () => updateRubberBand());
    }

    function destroyStage() {
        if (konvaStage) { konvaStage.destroy(); konvaStage = null; }
        previewPath = null;
        selectedOverlay = null;
        rubberBand = null;
        anchorNodes = [];
    }

    /* Z + hand off to Edit mode — after closing, the natural next step is refining points.
     * Closing while the Curve tool is active adds an editable C segment back to the
     * subpath start (collinear controls — straight until dragged) instead of relying on
     * Z's implicit straight line, so the closing edge can be curved too. */
    function closeDrawnPath() {
        pushUndo();
        if (drawMode === 'C') {
            const m0 = segs[currentSubpathStart()];
            const last = segs[segs.length - 1];
            if (m0 && last && 'x' in last && (last.x !== m0.x || last.y !== m0.y)) {
                segs.push({
                    c: 'C',
                    x1: last.x + (m0.x - last.x) / 3, y1: last.y + (m0.y - last.y) / 3,
                    x2: last.x + 2 * (m0.x - last.x) / 3, y2: last.y + 2 * (m0.y - last.y) / 3,
                    x: m0.x, y: m0.y,
                });
            }
        }
        segs.push({ c: 'Z' });
        if (drawingHole) {
            if (!finalizeHoleSubpath()) {
                /* invalid hole removed — stay in hole-drawing mode for another attempt */
                selIndex = -1;
                hideRubberBand();
                refreshAll();
                ui.holeFail.showModal();
                return;
            }
            drawingHole = false;
        }
        selIndex = -1;
        setEditorMode('edit');
        refreshAll();
    }

    /* Leaving draw mode (Edit Mode button, Close, Esc) closes an in-progress subpath
     * with Z so the drawn shape doesn't come back open. Needs 3+ anchors — a Z on
     * fewer is a degenerate closed line. */
    function closeOpenSubpath() {
        if (editorMode === 'draw' && lastSubpathOpen() && currentSubpathAnchorCount() >= 3) {
            pushUndo();
            segs.push({ c: 'Z' });
            if (drawingHole && !finalizeHoleSubpath()) {
                ui.holeFail.showModal();
            }
        }
        drawingHole = false;
    }

    /* ---------------- hole subpaths ---------------- */

    function lastClosedSubpathRange() {
        let z = -1;
        for (let i = segs.length - 1; i >= 0; i--) if (segs[i].c === 'Z') { z = i; break; }
        if (z < 0) return null;
        for (let i = z - 1; i >= 0; i--) if (segs[i].c === 'M') return { m: i, z: z };
        return null;
    }

    function subpathAnchorPts(m, z) {
        const pts = [];
        for (let i = m; i < z; i++) { const s = segs[i]; if ('x' in s) pts.push({ x: s.x, y: s.y }); }
        return pts;
    }

    function polySignedArea(pts) {
        let a = 0;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            a += p.x * q.y - q.x * p.y;
        }
        return a / 2;
    }

    function pointInPoly(pt, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i], b = poly[j];
            if ((a.y > pt.y) !== (b.y > pt.y) &&
                pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
    }

    /* Reverse the point order of the subpath segs[m..z] in place (winding flip). Each
     * reversed segment ends at its original START anchor; C controls swap, arcs flip
     * their sweep flag. The Z close edge is direction-agnostic and carries over. */
    function reverseSubpathInPlace(m, z) {
        const body = segs.slice(m + 1, z);
        const anchors = [{ x: segs[m].x, y: segs[m].y }].concat(body.map(s => ({ x: s.x, y: s.y })));
        const out = [];
        for (let k = body.length - 1; k >= 0; k--) {
            const s = body[k];
            const ns = { c: s.c, x: anchors[k].x, y: anchors[k].y };
            if (s.c === 'C') { ns.x1 = s.x2; ns.y1 = s.y2; ns.x2 = s.x1; ns.y2 = s.y1; }
            else if (s.c === 'Q') { ns.x1 = s.x1; ns.y1 = s.y1; }
            else if (s.c === 'A') { ns.rx = s.rx; ns.ry = s.ry; ns.rot = s.rot; ns.laf = s.laf; ns.sf = s.sf ? 0 : 1; }
            out.push(ns);
        }
        const last = anchors[anchors.length - 1];
        segs.splice(m, z - m, { c: 'M', x: last.x, y: last.y }, ...out);
    }

    /* Just-closed hole subpath: must lie fully inside another closed subpath. Wind it
     * OPPOSITE its container so the fill rule (and the WD's solid/hole triangulation)
     * cuts it out. Returns false when invalid — the subpath is removed so the user can
     * try again. Containment is tested on anchor points (curve bulges are approximated). */
    function finalizeHoleSubpath() {
        const range = lastClosedSubpathRange();
        if (!range) return false;
        const holePts = subpathAnchorPts(range.m, range.z);
        let container = null;
        let mm = -1;
        for (let i = 0; i < range.m; i++) {
            if (segs[i].c === 'M') mm = i;
            if (segs[i].c === 'Z' && mm >= 0) {
                const poly = subpathAnchorPts(mm, i);
                if (poly.length >= 3 && holePts.length &&
                    holePts.every(p => pointInPoly(p, poly))) { container = poly; break; }
                mm = -1;
            }
        }
        if (!container) {
            segs.splice(range.m, range.z - range.m + 1);
            return false;
        }
        if (Math.sign(polySignedArea(holePts)) === Math.sign(polySignedArea(container))) {
            reverseSubpathInPlace(range.m, range.z);
        }
        return true;
    }

    function worldPointer() {
        const p = konvaStage.getPointerPosition();
        if (!p) return null;
        const s = konvaStage.scaleX();
        return { x: (p.x - konvaStage.x()) / s, y: (p.y - konvaStage.y()) / s };
    }

    /* ---------------- grid + axes + walls ---------------- */

    function visibleWorldRect() {
        const s = konvaStage.scaleX();
        return {
            x: -konvaStage.x() / s,
            y: -konvaStage.y() / s,
            w: konvaStage.width() / s,
            h: konvaStage.height() / s,
        };
    }

    function gridStep(pxPerM) {
        const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
        for (const c of candidates) if (c * pxPerM >= 25) return c;
        return 100;
    }

    function drawGrid() {
        gridLayer.destroyChildren();
        const s = konvaStage.scaleX();
        const r = visibleWorldRect();
        const step = gridStep(s);
        const lw = 1 / s;
        const x0 = Math.floor(r.x / step) * step;
        const y0 = Math.floor(r.y / step) * step;
        const showLabels = step * s >= 40;
        for (let x = x0; x <= r.x + r.w; x += step) {
            gridLayer.add(new Konva.Line({
                points: [x, r.y, x, r.y + r.h],
                stroke: '#ddd',
                strokeWidth: lw,
            }));
            if (showLabels) {
                gridLayer.add(new Konva.Text({
                    x: x + 3 / s, y: r.y + 4 / s,
                    text: fmt(x), fontSize: 11 / s, fill: '#999',
                }));
            }
        }
        for (let y = y0; y <= r.y + r.h; y += step) {
            gridLayer.add(new Konva.Line({
                points: [r.x, y, r.x + r.w, y],
                stroke: '#ddd',
                strokeWidth: lw,
            }));
            if (showLabels) {
                gridLayer.add(new Konva.Text({
                    x: r.x + 3 / s, y: y + 3 / s,
                    text: fmt(y), fontSize: 11 / s, fill: '#999',
                }));
            }
        }

        /* room walls, translated into the item-local frame — mirrors the main canvas
         * (drawOutsideWall): 0.115 m grey band around the room, thin outer line, room outline */
        if (activeOpts && activeOpts.roomWM > 0 && activeOpts.roomLM > 0) {
            const wx = -activeOpts.anchorXM, wy = -activeOpts.anchorYM;
            const ww = activeOpts.roomWM, wh = activeOpts.roomLM;
            const wt = 0.115;
            const band = [
                { x: wx - wt, y: wy, width: wt, height: wh },
                { x: wx + ww, y: wy, width: wt, height: wh },
                { x: wx - wt, y: wy - wt, width: ww + 2 * wt, height: wt },
                { x: wx - wt, y: wy + wh, width: ww + 2 * wt, height: wt },
            ];
            band.forEach(b => gridLayer.add(new Konva.Rect({
                x: b.x, y: b.y, width: b.width, height: b.height,
                fill: '#cccccc', opacity: 0.6,
            })));
            gridLayer.add(new Konva.Rect({
                x: wx - wt, y: wy - wt,
                width: ww + 2 * wt, height: wh + 2 * wt,
                stroke: '#888888',
                strokeWidth: 1,
                strokeScaleEnabled: false,
            }));
            gridLayer.add(new Konva.Rect({
                x: wx, y: wy,
                width: ww, height: wh,
                stroke: '#555',
                strokeWidth: 2,
                strokeScaleEnabled: false,
            }));
        }
    }

    function scheduleRedraw(withHandles) {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            if (!konvaStage) return;
            drawGrid();
            if (withHandles === true) rebuildHandles();
        });
    }

    /* ---------------- background image ---------------- */

    function addBackground(bg) {
        if (!bg || !bg.image) return;
        bgLayer.add(new Konva.Image({
            image: bg.image,
            x: bg.xM - activeOpts.anchorXM,
            y: bg.yM - activeOpts.anchorYM,
            width: bg.wM, height: bg.hM,
            rotation: bg.rotationDeg || 0,
            opacity: (bg.opacity != null) ? Number(bg.opacity) : 0.5,
        }));
    }

    /* ---------------- path preview + selection overlay + handles ---------------- */

    function rebuildPreview() {
        pathLayer.destroyChildren();
        previewPath = new Konva.Path({
            data: serializeSegs(segs),
            stroke: PATH_COLOR,
            strokeWidth: 1.5,
            strokeScaleEnabled: false,
            hitStrokeWidth: 14,
            /* Edit mode gets a light fill so solids and holes read at a glance; evenodd
             * shows any enclosed subpath as a cut-out, matching the WD's solid/hole
             * triangulation after export winding normalization. No fill while drawing —
             * an open subpath would paint as if closed. */
            fill: editorMode === 'edit' ? '#D3D3D366' : undefined,
            fillRule: 'evenodd',
            /* draw mode: the path must not eat clicks near itself (its 14px hit stroke
             * made clicks "do nothing" wherever they crossed a drawn segment).
             * hand tool: same rule — the hit stroke would block pans over segments */
            listening: editorMode === 'edit' && !panModeOn,
        });
        previewPath.on('click tap', () => {
            if (editorMode !== 'edit') return;
            const wp = worldPointer();
            const best = wp && nearestSegment(wp);
            if (best) {
                splitSegment(best.i, best.t);
                selIndex = best.i; /* the inserted point's segment */
                syncSelection();
            }
        });
        selectedOverlay = new Konva.Path({
            data: '',
            stroke: SELECT_COLOR,
            strokeWidth: 3,
            strokeScaleEnabled: false,
            listening: false,
        });
        pathLayer.add(previewPath, selectedOverlay);
        updateSelectedOverlay();
    }

    function updateSelectedOverlay() {
        if (!selectedOverlay) return;
        const s = segs[selIndex];
        const p0 = (s && s.c !== 'M' && s.c !== 'Z') ? segStartPoint(selIndex) : null;
        if (!s || !p0) { selectedOverlay.data(''); return; }
        selectedOverlay.data('M ' + fmt(p0.x) + ' ' + fmt(p0.y) + ' ' + serializeSegs([s]));
    }

    function handleRadius() { return 6 / konvaStage.scaleX(); }

    function styleAnchor(entry) {
        const isSel = entry.segIndex === selIndex;
        const isFirstOpen = editorMode === 'draw' && lastSubpathOpen() && entry.segIndex === currentSubpathStart();
        entry.node.radius(handleRadius() * (isFirstOpen ? 1.5 : 1));
        entry.node.fill(isSel ? SELECT_COLOR : (isFirstOpen ? '#fffbe0' : '#fff'));
        entry.node.stroke(isSel ? SELECT_COLOR : PATH_COLOR);
    }

    function makeAnchor(i, s) {
        const a = new Konva.Circle({
            x: s.x, y: s.y,
            radius: handleRadius(),
            strokeWidth: 1.5 / konvaStage.scaleX(),
            draggable: editorMode === 'edit' && !panModeOn,
            /* draw mode: only the closable first point may take clicks — other anchors
             * eating them left dead zones where clicking placed nothing.
             * hand tool: nothing listens, so a drag anywhere pans the view */
            listening: !panModeOn && (editorMode === 'edit' || (lastSubpathOpen() && i === currentSubpathStart())),
        });
        const entry = { segIndex: i, node: a };
        anchorNodes.push(entry);
        styleAnchor(entry);

        /* select WITHOUT rebuilding handles — a rebuild here destroys this node mid-mousedown and kills the drag */
        a.on('mousedown touchstart', (e) => {
            if (editorMode !== 'edit') return;
            selIndex = i;
            syncSelection();
            /* highlight on press so it's already showing when a drag starts; skipped on
             * touch — focusing the textarea would pop the on-screen keyboard */
            if (!(e.evt && String(e.evt.type).startsWith('touch'))) {
                highlightSelectedSegmentText();
            }
        });

        /* click the enlarged first point while drawing → close the current subpath (mirrors the simple builder) */
        a.on('click tap', () => {
            if (editorMode === 'draw' && lastSubpathOpen() && i === currentSubpathStart() && currentSubpathAnchorCount() >= 3) {
                closeDrawnPath();
            }
        });

        a.on('mouseover', () => {
            if (editorMode === 'draw') {
                if (lastSubpathOpen() && i === currentSubpathStart()) { a.fill('yellow'); a.radius(handleRadius() * 2); }
            } else {
                /* edit-mode hover affordance: a little larger + baby blue */
                a.fill(HOVER_COLOR);
                a.radius(handleRadius() * 1.4);
            }
        });
        a.on('mouseleave', () => styleAnchor(entry));

        a.on('dragstart', () => pushUndo());
        a.on('dragmove', () => {
            const nx = a.x(), ny = a.y();
            const dx = nx - s.x, dy = ny - s.y;
            const next = segs[i + 1];
            if (next && (next.c === 'C' || next.c === 'Q')) { next.x1 += dx; next.y1 += dy; }
            if (s.c === 'C') { s.x2 += dx; s.y2 += dy; }
            s.x = nx; s.y = ny;
            refreshPathOnly();
        });
        a.on('dragend', () => rebuildHandles());
        handleLayer.add(a);
    }

    function makeControl(s, keyX, keyY, anchorPt) {
        const c = new Konva.Circle({
            x: s[keyX], y: s[keyY],
            radius: handleRadius() * 0.75,
            fill: '#f5a623',
            stroke: '#a06800',
            strokeWidth: 1 / konvaStage.scaleX(),
            draggable: editorMode === 'edit' && !panModeOn,
            listening: !panModeOn,
        });
        const tether = new Konva.Line({
            points: [anchorPt.x, anchorPt.y, s[keyX], s[keyY]],
            stroke: '#f5a623',
            strokeWidth: 1 / konvaStage.scaleX(),
            dash: [4 / konvaStage.scaleX(), 4 / konvaStage.scaleX()],
            listening: false,
        });
        /* hover affordance to match the anchors: grow to near the anchor hover size */
        c.on('mouseover', () => c.radius(handleRadius() * 1.3));
        c.on('mouseleave', () => c.radius(handleRadius() * 0.75));
        c.on('dragstart', () => pushUndo());
        c.on('dragmove', () => {
            s[keyX] = c.x(); s[keyY] = c.y();
            tether.points([anchorPt.x, anchorPt.y, c.x(), c.y()]);
            refreshPathOnly();
        });
        handleLayer.add(tether, c);
    }

    function rebuildHandles() {
        if (!konvaStage) return;
        handleLayer.destroyChildren();
        anchorNodes = [];
        segs.forEach((s, i) => {
            if (s.c === 'Z') return;
            /* control handles are edit-mode only — while drawing they'd just be clutter */
            if (editorMode === 'edit') {
                const p0 = segStartPoint(i);
                if (s.c === 'C' && p0) {
                    makeControl(s, 'x1', 'y1', p0);
                    makeControl(s, 'x2', 'y2', { x: s.x, y: s.y });
                }
                if (s.c === 'Q' && p0) {
                    makeControl(s, 'x1', 'y1', p0);
                }
            }
            makeAnchor(i, s);
        });
    }

    /* Runs every dragmove frame. One serialization pass: the per-seg strings feed the
     * Konva path, the textarea, AND the highlight offsets (the old code serialized the
     * whole path twice per frame, so this is a net reduction). */
    function refreshPathOnly() {
        const parts = segs.map(s => serializeSegs([s]));
        const str = parts.join(' ');
        previewPath.data(str);
        updateSelectedOverlay();
        ui.pathText.value = str;
        ui.pathText.classList.remove('vrcpe-invalid');
        /* Assigning .value collapses the textarea selection — re-apply the point-click
         * highlight so it tracks the numbers while a point is dragged. */
        if (_progSelRange && selIndex >= 0 && segs[selIndex] && document.activeElement === ui.pathText) {
            let start = 0;
            for (let k = 0; k < selIndex; k++) start += parts[k].length + 1;
            const r = { start, end: start + parts[selIndex].length };
            ui.pathText.setSelectionRange(r.start, r.end);
            _progSelRange = r;
        }
    }

    function refreshAll(skipText) {
        rebuildPreview();
        rebuildHandles();
        if (!skipText) {
            ui.pathText.value = serializeSegs(segs);
            ui.pathText.classList.remove('vrcpe-invalid');
        }
        syncSelection();
    }

    /* Character range of segs[index] inside the serialized textarea string (segments join with ' '). */
    function segTextRange(index) {
        let start = 0;
        for (let k = 0; k < index; k++) start += serializeSegs([segs[k]]).length + 1;
        return { start, end: start + serializeSegs([segs[index]]).length };
    }

    /* Clicking an anchor highlights its segment's numbers in the side-pane textarea.
     * Selection is only visible in a FOCUSED textarea, and focusing during the native
     * click dispatch gets undone by the canvas click's default focus handling — hence
     * the deferred focus. The dlg keydown handler keeps Delete meaning "delete point"
     * while this programmatic selection is intact (_progSelRange). */
    function highlightSelectedSegmentText() {
        if (selIndex < 0 || !segs[selIndex]) return;
        if (ui.pathText.value !== serializeSegs(segs)) return;
        const r = segTextRange(selIndex);
        setTimeout(() => {
            if (selIndex < 0) return;
            ui.pathText.focus({ preventScroll: true });
            ui.pathText.setSelectionRange(r.start, r.end);
            _progSelRange = r;
            const frac = r.start / Math.max(1, ui.pathText.value.length);
            ui.pathText.scrollTop = Math.max(0, frac * ui.pathText.scrollHeight - ui.pathText.clientHeight / 2);
        }, 0);
    }

    /* Editing in the textarea highlights the matching segment purple on canvas: the
     * caret's segment = count of command letters up to the caret, mapped into segs
     * (1:1 because this editor always serializes with explicit command letters). A
     * caret sitting on the untouched point-click highlight is left alone. */
    function updateCaretHighlight() {
        if (document.activeElement !== ui.pathText) return;
        if (_progSelRange
            && ui.pathText.selectionStart === _progSelRange.start
            && ui.pathText.selectionEnd === _progSelRange.end) return;
        _progSelRange = null; /* the user took over the caret — Delete reverts to text editing */
        const text = ui.pathText.value;
        const pos = ui.pathText.selectionStart;
        let count = 0;
        for (let k = 0; k < pos && k < text.length; k++) {
            if (/[MLHVCSQTAZ]/i.test(text[k])) count++;
        }
        const idx = count - 1;
        const next = (idx >= 0 && idx < segs.length) ? idx : -1;
        if (next !== selIndex) {
            selIndex = next;
            syncSelection();
        }
    }

    /* selection changed: restyle anchors in place, redraw purple overlay, sync toolbar — NO handle rebuild */
    function syncSelection() {
        anchorNodes.forEach(styleAnchor);
        updateSelectedOverlay();
        const s = (editorMode === 'edit') ? segs[selIndex] : null;
        ui.toCurve.disabled = !(s && s.c === 'L');
        ui.toLine.disabled = !(s && (s.c === 'C' || s.c === 'Q'));
        ui.deletePt.disabled = !(s && s.c !== 'Z');
    }

    /* ---------------- edit operations ---------------- */

    function convertSelected(target) {
        const s = segs[selIndex];
        if (!s) return;
        const p0 = segStartPoint(selIndex);
        if (!p0) return;
        pushUndo();
        if (target === 'C' && s.c === 'L') {
            segs[selIndex] = {
                c: 'C',
                x1: p0.x + (s.x - p0.x) / 3, y1: p0.y + (s.y - p0.y) / 3,
                x2: p0.x + 2 * (s.x - p0.x) / 3, y2: p0.y + 2 * (s.y - p0.y) / 3,
                x: s.x, y: s.y,
            };
        } else if (target === 'L' && (s.c === 'C' || s.c === 'Q')) {
            segs[selIndex] = { c: 'L', x: s.x, y: s.y };
        }
        refreshAll();
    }

    function deleteSelected() {
        const s = segs[selIndex];
        if (!s || s.c === 'Z') return;
        const anchorCount = segs.filter(g => g.c !== 'Z').length;
        if (anchorCount <= 3) return;
        if (s.c === 'M' && (!segs[selIndex + 1] || segs[selIndex + 1].c === 'Z')) return;
        pushUndo();
        if (s.c === 'M') {
            const next = segs[selIndex + 1];
            segs[selIndex + 1] = { c: 'M', x: next.x, y: next.y };
        }
        segs.splice(selIndex, 1);
        selIndex = -1;
        refreshAll();
    }

    function splitSegment(i, t) {
        const s = segs[i];
        const p0 = segStartPoint(i);
        if (!s || !p0 || s.c === 'M' || s.c === 'Z') return;
        pushUndo();
        const mid = pointOnSeg(s, p0, t);
        if (s.c === 'L' || s.c === 'A') {
            segs.splice(i, 0, { c: 'L', x: mid.x, y: mid.y });
        } else if (s.c === 'Q') {
            const q0 = { x: p0.x + (s.x1 - p0.x) * t, y: p0.y + (s.y1 - p0.y) * t };
            const q1 = { x: s.x1 + (s.x - s.x1) * t, y: s.y1 + (s.y - s.y1) * t };
            segs.splice(i, 1,
                { c: 'Q', x1: q0.x, y1: q0.y, x: mid.x, y: mid.y },
                { c: 'Q', x1: q1.x, y1: q1.y, x: s.x, y: s.y });
        } else if (s.c === 'C') {
            const l1 = { x: p0.x + (s.x1 - p0.x) * t, y: p0.y + (s.y1 - p0.y) * t };
            const m = { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
            const l2 = { x: s.x2 + (s.x - s.x2) * t, y: s.y2 + (s.y - s.y2) * t };
            const l12 = { x: l1.x + (m.x - l1.x) * t, y: l1.y + (m.y - l1.y) * t };
            const l21 = { x: m.x + (l2.x - m.x) * t, y: m.y + (l2.y - m.y) * t };
            segs.splice(i, 1,
                { c: 'C', x1: l1.x, y1: l1.y, x2: l12.x, y2: l12.y, x: mid.x, y: mid.y },
                { c: 'C', x1: l21.x, y1: l21.y, x2: l2.x, y2: l2.y, x: s.x, y: s.y });
        }
        refreshAll();
    }

    function appendPointAtPointer() {
        const wp = worldPointer();
        if (!wp) return;
        pushUndo();
        if (!lastSubpathOpen()) {
            /* first click of a fresh drawing (or after a closed shape) starts a subpath */
            segs.push({ c: 'M', x: wp.x, y: wp.y });
            refreshAll();
            return;
        }
        const last = segs[segs.length - 1];
        const lastPt = ('x' in last) ? { x: last.x, y: last.y } : { x: 0, y: 0 };
        let np;
        if (drawMode === 'C') {
            np = {
                c: 'C',
                x1: lastPt.x + (wp.x - lastPt.x) / 3, y1: lastPt.y + (wp.y - lastPt.y) / 3,
                x2: lastPt.x + 2 * (wp.x - lastPt.x) / 3, y2: lastPt.y + 2 * (wp.y - lastPt.y) / 3,
                x: wp.x, y: wp.y,
            };
        } else {
            np = { c: 'L', x: wp.x, y: wp.y };
        }
        segs.push(np);
        refreshAll();
    }

    /* ---------------- view fit ---------------- */

    function fitView() {
        const cw = konvaStage.width(), ch = konvaStage.height();
        /* fit the union of the path bbox and the room wall outline so the room context is visible on open */
        const walls = { x: -activeOpts.anchorXM, y: -activeOpts.anchorYM, width: activeOpts.roomWM || 8, height: activeOpts.roomLM || 6 };
        let b = modelBBox();
        if (!b || !isFinite(b.width)) b = walls;
        else {
            const minX = Math.min(b.x, walls.x), minY = Math.min(b.y, walls.y);
            const maxX = Math.max(b.x + b.width, walls.x + walls.width);
            const maxY = Math.max(b.y + b.height, walls.y + walls.height);
            b = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        const pad = 0.08;
        const sFit = Math.min(cw / (b.width * (1 + 2 * pad)), ch / (b.height * (1 + 2 * pad)));
        const s = Math.max(MIN_PX_PER_M, Math.min(MAX_PX_PER_M, sFit));
        konvaStage.scale({ x: s, y: s });
        konvaStage.position({
            x: cw / 2 - (b.x + b.width / 2) * s,
            y: ch / 2 - (b.y + b.height / 2) * s,
        });
    }

    /* ---------------- open / close ---------------- */

    function finishAndApply() {
        const opts = activeOpts;
        activeOpts = null;
        closeOpenSubpath();
        destroyStage();
        if (!opts || typeof opts.onClose !== 'function') return;

        const drawable = segs.filter(s => s.c !== 'Z' && s.c !== 'M');
        if (!drawable.length) { opts.onClose(null); return; }

        /* re-center on the anchor bbox center (Draw Simple Path convention: item x/y = center) */
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        segs.forEach(s => {
            if (!('x' in s)) return;
            minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
            minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
        });
        if (!isFinite(minX)) { opts.onClose(null); return; }
        const cx = Math.round(((minX + maxX) / 2) * 1000) / 1000;
        const cy = Math.round(((minY + maxY) / 2) * 1000) / 1000;

        opts.onClose({
            path: serializeSegs(segs, -cx, -cy),
            centerXM: (Number(opts.anchorXM) || 0) + cx,
            centerYM: (Number(opts.anchorYM) || 0) + cy,
        });
    }

    async function open(opts) {
        buildDialog();
        await cssReady; /* stage sizing reads the flex layout, which needs the stylesheet */
        activeOpts = opts;

        try {
            segs = parsePathD(opts.path);
        } catch (err) {
            console.warn('[VRC pathEditor] could not parse path, starting from a default square:', err && err.message);
            segs = parsePathD('M -0.5 -0.5 L 0.5 -0.5 L 0.5 0.5 L -0.5 0.5 Z');
        }
        bakeScaleRotation(segs,
            (Number(opts.scaleX) || 1), (Number(opts.scaleY) || 1),
            (Number(opts.rotationDeg) || 0));
        selIndex = -1;
        drawingHole = false;
        setPanMode(false);
        undoStack = [];
        redoStack = [];
        _lastTextUndoPush = 0;
        syncUndoButtons();
        setDrawMode('L');

        /* Fresh inserts open in Draw mode with a clean canvas (the placeholder shape is
         * ignored; closing without drawing keeps the item unchanged since finishAndApply
         * returns null for an empty path). Reopening an existing shape opens in Edit. */
        setEditorMode(opts.startMode === 'draw' ? 'draw' : 'edit');
        if (editorMode === 'draw') segs = [];

        dlg.showModal();
        buildStage();
        addBackground(opts.background);
        rebuildPreview();
        fitView();          /* fitView reads the preview's bbox, so build preview first */
        rebuildHandles();
        drawGrid();
        ui.pathText.value = serializeSegs(segs);
        ui.pathText.classList.remove('vrcpe-invalid');
        syncSelection();
    }

    window.VRC.pathEditor = { open };
})();
