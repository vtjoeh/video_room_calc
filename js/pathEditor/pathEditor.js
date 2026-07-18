/* VRC SVG Path Editor — lazy-loaded, self-contained pathShape editor.
 *
 * Attaches window.VRC.pathEditor = { open(opts) }. Everything the editor
 * needs comes in through opts; nothing in this file reads VRC globals
 * (roomObj, stage, scale, ...) so the module stays separable. Konva is
 * the only external dependency (already loaded globally by VRC).
 *
 * Coordinate model: the editor canvas is the room floor plan in METERS
 * (1 editor unit = 1 m, y-down like both SVG and the VRC canvas). The
 * caller converts feet to meters before open() and back after onClose.
 *
 * opts = {
 *   path:            SVG path string (pathShape convention: meters, (0,0) at the item anchor)
 *   scaleX, scaleY:  labelField JSON scale multipliers to bake into coords (default 1)
 *   rotationDeg:     item rotation to bake into coords (default 0)
 *   anchorXM, anchorYM: floor position in meters where path (0,0) lands
 *   fillColor, fillOpacity: preview fill when the Fill checkbox is on
 *   background:      null | { image: HTMLImageElement, xM, yM, wM, hM, rotationDeg, opacity }
 *   roomWM, roomLM:  room size in meters (view fallback when there is no path/background)
 *   onClose(result): result = { path, centerXM, centerYM } — path is re-centered on its
 *                    bounding-box center (matching the Draw Simple Path convention), always
 *                    absolute commands in meters, rotation baked in (caller writes rotation 0).
 *                    null when the path is empty/degenerate.
 * }
 *
 * Supported path commands: M L H V C S Q T A Z, absolute and relative.
 * H/V normalize to L, S to C, T to Q on parse; output uses M L C Q A Z only.
 * Numbers must be whitespace/comma separated (SVG's packed arc-flag
 * shorthand like "a1 1 0 011 0" is not tokenized).
 */

(function () {
    'use strict';

    window.VRC = window.VRC || {};

    const SNAP_STEP = 0.1;           /* meters */
    const MIN_PX_PER_M = 2;
    const MAX_PX_PER_M = 2000;

    let dlg = null;
    let ui = {};                     /* toolbar/input elements, filled by buildDialog() */
    let konvaStage = null;
    let gridLayer, bgLayer, pathLayer, handleLayer;
    let previewPath = null;
    let segs = [];                   /* parsed absolute segments */
    let initialSegs = null;          /* deep copy for Revert */
    let selIndex = -1;               /* selected segment index (its endpoint is the anchor) */
    let activeOpts = null;
    let rafPending = false;
    let cssReady = null;             /* stylesheet load promise — stage layout depends on it */

    /* ---------------- path parsing / serializing ---------------- */

    function tokenizePathD(d) {
        return String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
    }

    /* Parse to absolute segments: {c:'M'|'L',x,y} {c:'C',x1,y1,x2,y2,x,y} {c:'Q',x1,y1,x,y} {c:'A',rx,ry,rot,laf,sf,x,y} {c:'Z'}. Throws on malformed input. */
    function parsePathD(d) {
        const t = tokenizePathD(d);
        if (!t.length) throw new Error('empty path');
        const out = [];
        let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
        let cmd = null;
        let prevC = null, prevQ = null; /* previous control points for S/T reflection */

        const num = () => {
            const v = parseFloat(t[i++]);
            if (!isFinite(v)) throw new Error('bad number');
            return v;
        };

        while (i < t.length) {
            const tok = t[i];
            if (/[A-Za-z]/.test(tok)) { cmd = tok; i++; }
            else if (cmd === null) throw new Error('path must start with M');
            /* implicit repeat: M repeats as L (m as l) */
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

    /* Bake labelField scale + item rotation + anchor into absolute floor-meter coords. */
    function transformSegsIntoFloor(list, scaleX, scaleY, rotationDeg, anchorXM, anchorYM) {
        const rad = (rotationDeg || 0) * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const tp = (x, y) => {
            const px = x * scaleX, py = y * scaleY;
            return { x: anchorXM + px * cos - py * sin, y: anchorYM + px * sin + py * cos };
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

    function segStartPoint(index) {
        /* start point of segment = endpoint of the previous drawable segment (or subpath M for the segment after Z) */
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
        /* C */
        return {
            x: u * u * u * p0.x + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x,
            y: u * u * u * p0.y + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y,
        };
    }

    /* Nearest drawable segment + parameter t to a world point (sampled). */
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
                <span class="vrcpe-title">SVG Path Editor</span>
                <label class="vrcpe-check"><input type="checkbox" id="vrcpeSnap"> Snap to Grid</label>
                <label class="vrcpe-check"><input type="checkbox" id="vrcpeFill"> Fill</label>
                <span class="vrcpe-sep"></span>
                <button id="vrcpeToCurve" disabled>Line &rarr; Curve</button>
                <button id="vrcpeToLine" disabled>Curve &rarr; Line</button>
                <button id="vrcpeDeletePt" disabled>Delete Point</button>
                <button id="vrcpeRevert">Revert</button>
                <span class="vrcpe-hint">Double-click a segment to add a point &middot; double-click empty space to append &middot; drag to pan &middot; scroll to zoom &middot; 1 unit = 1 meter</span>
                <button id="vrcpeClose" class="vrcpe-close">Close</button>
            </div>
            <div class="vrcpe-canvas" id="vrcpeCanvas"></div>
            <div class="vrcpe-pathbar">
                <label>Path (meters):</label>
                <input type="text" id="vrcpePathText" spellcheck="false" autocomplete="off">
            </div>`;
        document.body.appendChild(dlg);

        ui = {
            snap: dlg.querySelector('#vrcpeSnap'),
            fill: dlg.querySelector('#vrcpeFill'),
            toCurve: dlg.querySelector('#vrcpeToCurve'),
            toLine: dlg.querySelector('#vrcpeToLine'),
            deletePt: dlg.querySelector('#vrcpeDeletePt'),
            revert: dlg.querySelector('#vrcpeRevert'),
            close: dlg.querySelector('#vrcpeClose'),
            canvas: dlg.querySelector('#vrcpeCanvas'),
            pathText: dlg.querySelector('#vrcpePathText'),
        };

        ui.close.onclick = () => { finishAndApply(); dlg.close(); };
        ui.revert.onclick = () => {
            segs = structuredClone(initialSegs);
            selIndex = -1;
            refreshAll();
        };
        ui.fill.onchange = () => applyFill();
        ui.toCurve.onclick = () => convertSelected('C');
        ui.toLine.onclick = () => convertSelected('L');
        ui.deletePt.onclick = () => deleteSelected();

        ui.pathText.addEventListener('input', () => {
            try {
                const parsed = parsePathD(ui.pathText.value);
                ui.pathText.classList.remove('vrcpe-invalid');
                segs = parsed;
                selIndex = -1;
                refreshAll(true); /* skip text rewrite while the user is typing */
            } catch {
                ui.pathText.classList.add('vrcpe-invalid');
            }
        });

        /* Keep VRC's document-level shortcuts (Delete = delete item, space = Quick Add, ...) from firing while the editor is open. */
        dlg.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement !== ui.pathText && selIndex >= 0) {
                    deleteSelected();
                    e.preventDefault();
                }
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

    /* ---------------- Konva stage ---------------- */

    function buildStage() {
        destroyStage();
        konvaStage = new Konva.Stage({
            container: ui.canvas,
            width: ui.canvas.clientWidth,
            height: ui.canvas.clientHeight,
            draggable: true,
        });
        gridLayer = new Konva.Layer({ listening: false });
        bgLayer = new Konva.Layer({ listening: false });
        pathLayer = new Konva.Layer();
        handleLayer = new Konva.Layer();
        konvaStage.add(gridLayer, bgLayer, pathLayer, handleLayer);

        konvaStage.on('dragmove', scheduleRedraw);

        konvaStage.on('wheel', (e) => {
            e.evt.preventDefault();
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
            scheduleRedraw(true);
        });

        konvaStage.on('dblclick dbltap', (e) => {
            if (e.target !== konvaStage) return;
            appendPointAtPointer();
        });

        konvaStage.on('mousedown touchstart', (e) => {
            if (e.target === konvaStage) { selIndex = -1; syncSelectionUi(); rebuildHandles(); }
        });
    }

    function destroyStage() {
        if (konvaStage) { konvaStage.destroy(); konvaStage = null; }
        previewPath = null;
    }

    function worldPointer() {
        const p = konvaStage.getPointerPosition();
        const s = konvaStage.scaleX();
        return { x: (p.x - konvaStage.x()) / s, y: (p.y - konvaStage.y()) / s };
    }

    const snapVal = (v) => ui.snap.checked ? Math.round(v / SNAP_STEP) * SNAP_STEP : v;

    /* ---------------- grid ---------------- */

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
            const onAxis = Math.abs(x) < step / 2000;
            gridLayer.add(new Konva.Line({
                points: [x, r.y, x, r.y + r.h],
                stroke: onAxis ? '#7aa7d4' : '#ddd',
                strokeWidth: onAxis ? 2 * lw : lw,
            }));
            if (showLabels) {
                gridLayer.add(new Konva.Text({
                    x: x + 3 / s, y: r.y + 4 / s,
                    text: fmt(x), fontSize: 11 / s, fill: '#999',
                }));
            }
        }
        for (let y = y0; y <= r.y + r.h; y += step) {
            const onAxis = Math.abs(y) < step / 2000;
            gridLayer.add(new Konva.Line({
                points: [r.x, y, r.x + r.w, y],
                stroke: onAxis ? '#7aa7d4' : '#ddd',
                strokeWidth: onAxis ? 2 * lw : lw,
            }));
            if (showLabels && Math.abs(y) > step / 2000) {
                gridLayer.add(new Konva.Text({
                    x: r.x + 3 / s, y: y + 3 / s,
                    text: fmt(y), fontSize: 11 / s, fill: '#999',
                }));
            }
        }
    }

    function scheduleRedraw(withHandles) {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            drawGrid();
            if (withHandles === true) rebuildHandles();
        });
    }

    /* ---------------- background image ---------------- */

    function addBackground(bg) {
        if (!bg || !bg.image) return;
        bgLayer.add(new Konva.Image({
            image: bg.image,
            x: bg.xM, y: bg.yM,
            width: bg.wM, height: bg.hM,
            rotation: bg.rotationDeg || 0,
            opacity: (bg.opacity != null) ? Number(bg.opacity) : 0.5,
        }));
    }

    /* ---------------- path preview + handles ---------------- */

    function applyFill() {
        if (!previewPath) return;
        previewPath.fill(ui.fill.checked ? (activeOpts.fillColor || '#D3D3D3') : null);
        previewPath.opacity(ui.fill.checked ? ((activeOpts.fillOpacity != null) ? Number(activeOpts.fillOpacity) : 0.4) : 1);
    }

    function rebuildPreview() {
        pathLayer.destroyChildren();
        previewPath = new Konva.Path({
            data: serializeSegs(segs),
            stroke: '#0352a6',
            strokeWidth: 1.5,
            strokeScaleEnabled: false,
            hitStrokeWidth: 12,
        });
        previewPath.on('dblclick dbltap', () => {
            const best = nearestSegment(worldPointer());
            if (best) splitSegment(best.i, best.t);
        });
        pathLayer.add(previewPath);
        applyFill();
    }

    function handleRadius() { return 6 / konvaStage.scaleX(); }

    function makeAnchor(i, s) {
        const a = new Konva.Circle({
            x: s.x, y: s.y,
            radius: handleRadius(),
            fill: (i === selIndex) ? '#0352a6' : '#fff',
            stroke: '#0352a6',
            strokeWidth: 1.5 / konvaStage.scaleX(),
            draggable: true,
        });
        a.on('mousedown touchstart', () => { selIndex = i; syncSelectionUi(); rebuildHandles(); });
        a.on('dragmove', () => {
            const nx = snapVal(a.x()), ny = snapVal(a.y());
            a.position({ x: nx, y: ny });
            const dx = nx - s.x, dy = ny - s.y;
            /* carry the outgoing segment's leading control with the anchor */
            const next = segs[i + 1];
            if (next && next.c === 'C') { next.x1 += dx; next.y1 += dy; }
            if (next && next.c === 'Q') { next.x1 += dx; next.y1 += dy; }
            /* and this segment's trailing control */
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
            draggable: true,
        });
        const tether = new Konva.Line({
            points: [anchorPt.x, anchorPt.y, s[keyX], s[keyY]],
            stroke: '#f5a623',
            strokeWidth: 1 / konvaStage.scaleX(),
            dash: [4 / konvaStage.scaleX(), 4 / konvaStage.scaleX()],
            listening: false,
        });
        c.on('dragmove', () => {
            const nx = snapVal(c.x()), ny = snapVal(c.y());
            c.position({ x: nx, y: ny });
            s[keyX] = nx; s[keyY] = ny;
            tether.points([anchorPt.x, anchorPt.y, nx, ny]);
            refreshPathOnly();
        });
        handleLayer.add(tether, c);
    }

    function rebuildHandles() {
        handleLayer.destroyChildren();
        segs.forEach((s, i) => {
            if (s.c === 'Z') return;
            const p0 = segStartPoint(i);
            if (s.c === 'C' && p0) {
                makeControl(s, 'x1', 'y1', p0);
                makeControl(s, 'x2', 'y2', { x: s.x, y: s.y });
            }
            if (s.c === 'Q' && p0) {
                makeControl(s, 'x1', 'y1', p0);
            }
            makeAnchor(i, s);
        });
    }

    function refreshPathOnly() {
        previewPath.data(serializeSegs(segs));
        ui.pathText.value = serializeSegs(segs);
        ui.pathText.classList.remove('vrcpe-invalid');
    }

    function refreshAll(skipText) {
        rebuildPreview();
        rebuildHandles();
        if (!skipText) {
            ui.pathText.value = serializeSegs(segs);
            ui.pathText.classList.remove('vrcpe-invalid');
        }
        syncSelectionUi();
    }

    function syncSelectionUi() {
        const s = segs[selIndex];
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
        if (anchorCount <= 3) return; /* keep at least a triangle */
        if (s.c === 'M') {
            const next = segs[selIndex + 1];
            if (!next || next.c === 'Z') return;
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
        const mid = pointOnSeg(s, p0, t);
        mid.x = snapVal(mid.x); mid.y = snapVal(mid.y);
        if (s.c === 'L' || s.c === 'A') {
            segs.splice(i, 0, { c: 'L', x: mid.x, y: mid.y });
            if (s.c === 'A') { /* keep the arc as the second half; radii unchanged is an approximation */ }
        } else if (s.c === 'Q') {
            /* de Casteljau */
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
        const np = { c: 'L', x: snapVal(wp.x), y: snapVal(wp.y) };
        /* insert before a trailing Z of the last subpath so closed paths stay closed */
        if (segs.length && segs[segs.length - 1].c === 'Z') segs.splice(segs.length - 1, 0, np);
        else segs.push(np);
        selIndex = segs[segs.length - 1].c === 'Z' ? segs.length - 2 : segs.length - 1;
        refreshAll();
    }

    /* ---------------- view fit ---------------- */

    function fitView() {
        const cw = konvaStage.width(), ch = konvaStage.height();
        let b = modelBBox();
        if (!b || b.width < 0.01 || b.height < 0.01) {
            const bg = activeOpts.background;
            if (bg && bg.image) b = { x: bg.xM, y: bg.yM, width: bg.wM, height: bg.hM };
            else b = { x: 0, y: 0, width: activeOpts.roomWM || 8, height: activeOpts.roomLM || 6 };
        }
        const pad = 0.25;
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
        destroyStage();
        if (!opts || typeof opts.onClose !== 'function') return;

        const drawable = segs.filter(s => s.c !== 'Z' && s.c !== 'M');
        if (!drawable.length) { opts.onClose(null); return; }

        /* re-center on the bbox center (Draw Simple Path convention: item x/y = center) */
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        segs.forEach(s => {
            if (!('x' in s)) return;
            minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
            minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
            /* control points intentionally excluded — bbox from anchors matches how VRC centers simple paths */
        });
        if (!isFinite(minX)) { opts.onClose(null); return; }
        const cx = Math.round(((minX + maxX) / 2) * 1000) / 1000;
        const cy = Math.round(((minY + maxY) / 2) * 1000) / 1000;

        opts.onClose({
            path: serializeSegs(segs, -cx, -cy),
            centerXM: cx,
            centerYM: cy,
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
        transformSegsIntoFloor(segs,
            (Number(opts.scaleX) || 1), (Number(opts.scaleY) || 1),
            (Number(opts.rotationDeg) || 0),
            (Number(opts.anchorXM) || 0), (Number(opts.anchorYM) || 0));
        initialSegs = structuredClone(segs);
        selIndex = -1;

        /* defaults every open, per spec */
        ui.snap.checked = false;
        ui.fill.checked = false;

        dlg.showModal();
        buildStage();
        addBackground(opts.background);
        rebuildPreview();
        fitView();          /* fitView reads the preview's bbox, so build preview first */
        rebuildHandles();
        drawGrid();
        ui.pathText.value = serializeSegs(segs);
        ui.pathText.classList.remove('vrcpe-invalid');
        syncSelectionUi();
    }

    window.VRC.pathEditor = { open };
})();
