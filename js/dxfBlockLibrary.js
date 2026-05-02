/* eslint-env browser */
/* global DxfWriter */
/* exported DxfBlockLibrary */

/**
 * DxfBlockLibrary — companion to DxfWriter that owns the AIA / NCS layer
 * scheme used by the Video Room Calculator export and a starter library
 * of vector blocks for every item category.
 *
 * The layer scheme follows the US National CAD Standard (NCS) discipline
 * codes (A = Architectural, E = Electrical/AV, Z = utility/private), so
 * the resulting DXF drops cleanly into a real architectural set without
 * renaming. CAD colour numbers are AutoCAD Color Index (ACI) values.
 *
 * Block fidelity is intentionally moderate in this v1: every device gets
 * a recognizable footprint rectangle on the correct layer, with directional
 * indicators (lens dot for cameras, screen face for displays, cross-hair
 * for ceiling mics). Per-deviceid bespoke blocks live in `defineBlocks()`
 * and are added to the writer on demand the first time an item of that
 * type is exported.
 *
 * ── BLOCK FRAME CONVENTION ──────────────────────────────────────────────
 * Every block defines its geometry in a centered local frame where:
 *
 *   +Y  =  TOP of the CAD viewer at rotation 0
 *       =  TOP of the Konva canvas at rotation 0 in the VRC
 *       =  TOP of the device's `*-top.png` asset image
 *       =  the BACK / wall side of the device
 *
 *   -Y  =  BOTTOM of the CAD viewer at rotation 0
 *       =  BOTTOM of the Konva canvas at rotation 0 in the VRC
 *       =  BOTTOM of the device's `*-top.png` asset image
 *       =  the FRONT / lens / screen / face of the device
 *
 *   +X  =  RIGHT in both viewers (no flip on X).
 *
 * Why this is non-obvious: the VRC canvas uses Konva's Y-down screen
 * coordinates, while CAD viewers (AutoCAD, Autodesk Viewer, BricsCAD,
 * QCAD, FreeCAD, …) all use Y-up math coordinates. The DXF orchestrator
 * (`emitToDxfFile()` in `roomcalc.js`) flips the Y axis (and the rotation
 * sign) once at insertion time via `flipY()` / `flipRot()`, so block
 * geometry is authored in CAD-viewer space — not Konva space.
 *
 * Concretely: if the device's asset image shows the wall mount at the
 * top of the image, place the wall-mount feature at +Y in the block
 * frame. If the lens is at the bottom of the asset, place it at -Y.
 * Doing the opposite (using Konva-style "Y-down" coordinates) flips
 * every block 180° in any CAD viewer.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Author: Joe Hughes (Cisco) — Video Room Calculator
 */

'use strict';

(function (root) {
    /* ------------------------------------------------------------------
     * Layer scheme — name, AutoCAD Color Index (ACI), default linetype.
     * Names follow NCS pattern  D-MAJR-MINR[-MINR]:
     *   A = Architectural,   E = Electrical/AV,   Z = utility (private)
     *
     * Color choices favor *high contrast on a light background*. ACI 7
     * is "white/black depending on background", but several viewers
     * (notably AutoDesk Viewer) render it as a faint cream/yellow
     * instead of inverting on light backgrounds. So architectural
     * layers (walls, tables, displays, identification labels) use
     * ACI 250 — the darkest gray in the index, RGB ≈ (51,51,51) —
     * which renders as solid dark/black in every viewer we've tested.
     * Distinct accent colors (red codecs, magenta cameras, green mics,
     * blue chairs, cyan glass walls / doors) keep the equipment types
     * visually separated.
     * ------------------------------------------------------------------ */
    const C_DARK = 250;            /* near-black, reliable in all viewers */
    const LAYER = {
        WALL_EXTR: { name: 'A-WALL-EXTR', color: C_DARK },
        WALL_FULL: { name: 'A-WALL-FULL', color: C_DARK },
        WALL_GLAZ: { name: 'A-WALL-GLAZ', color: 141 },
        WALL_PATT: { name: 'A-WALL-PATT', color: 8 },
        DOOR:      { name: 'A-DOOR',      color: 4 },
        FLOR_RISR: { name: 'A-FLOR-RISR', color: 30, lineType: 'DASHED' },
        FLOR_CARP: { name: 'A-FLOR-CARP', color: 8,  lineType: 'DASHED' },
        FLOR_IDEN: { name: 'A-FLOR-IDEN', color: C_DARK },
        COLS:      { name: 'A-COLS',      color: 8 },
        FURN_CHRS: { name: 'A-FURN-CHRS', color: 5 },
        FURN_TBLS: { name: 'A-FURN-TBLS', color: C_DARK },
        FURN_PEOP: { name: 'A-FURN-PEOP', color: 8 },
        FURN_IDEN: { name: 'A-FURN-IDEN', color: C_DARK },
        EQPM:      { name: 'A-EQPM',      color: 9, lineType: 'DASHED' },
        AV_CODE:   { name: 'E-AV-CODE',   color: 1 },
        AV_CMRA:   { name: 'E-AV-CMRA',   color: 6 },
        AV_MICR:   { name: 'E-AV-MICR',   color: 3 },
        AV_DSPL:   { name: 'E-AV-DSPL',   color: C_DARK },
        AV_SPKR:   { name: 'E-AV-SPKR',   color: 211 },
        AV_CTRL:   { name: 'E-AV-CTRL',   color: 4 },
        AV_PERF:   { name: 'E-AV-PERF',   color: 8 },
        AV_IDEN:   { name: 'E-AV-IDEN',   color: C_DARK },
        ROOM_PATH: { name: 'A-ROOM-PATH', color: 9 },
    };

    /* DASHED linetype pattern in *meters* (the export unit). Pattern is
     * roughly 25 cm dash, 12 cm gap — readable on a 5–10 m wide room. */
    const LTYPE_DASHED = {
        name: 'DASHED',
        pattern: '__ __ __ __ __ __ __ __ __',
        segments: [0.25, -0.12]
    };

    /* ------------------------------------------------------------------
     * Item-category → layer mapping. Used by the orchestrator to route
     * each item onto the correct CAD layer regardless of which roomObj
     * array it lives in.
     * ------------------------------------------------------------------ */
    const DEVICE_LAYER_FOR_DEVICE_ID = {
        /* video devices = codecs / bars / boards / desks */
        roomBar: LAYER.AV_CODE, roomBarByod: LAYER.AV_CODE, roomBarPro: LAYER.AV_CODE,
        roomKitEqx: LAYER.AV_CODE, roomKitEqQuadCam: LAYER.AV_CODE,
        roomKitEqQuadCamExt: LAYER.AV_CODE, roomKitEqPtz4k: LAYER.AV_CODE,
        roomKitEqQuadPtz4k: LAYER.AV_CODE, roomKitProQuadCam: LAYER.AV_CODE,
        roomKitProG2QuadCam: LAYER.AV_CODE,
        boardPro55: LAYER.AV_CODE, boardPro75: LAYER.AV_CODE,
        brdPro55G2: LAYER.AV_CODE, brdPro75G2: LAYER.AV_CODE,
        roomKitEqxFS: LAYER.AV_CODE, brdPro55G2FS: LAYER.AV_CODE,
        brdPro75G2FS: LAYER.AV_CODE, roomKitEqxWS: LAYER.AV_CODE,
        brdPro75G2Wheel: LAYER.AV_CODE, brdPro55G2Wheel: LAYER.AV_CODE,
        brdPro55G2WS: LAYER.AV_CODE, brdPro75G2WS: LAYER.AV_CODE,
        webexDesk: LAYER.AV_CODE, webexDeskPro: LAYER.AV_CODE,
        webexDeskMini: LAYER.AV_CODE, webexDeskProG2: LAYER.AV_CODE,
        room55: LAYER.AV_CODE, rmKitMini: LAYER.AV_CODE, roomKit: LAYER.AV_CODE,
        rmBarProVirtualLens: LAYER.AV_CODE,
        unknownVideoDevice: LAYER.AV_CODE,

        /* cameras */
        cameraP60: LAYER.AV_CMRA, ptz4k: LAYER.AV_CMRA, quadCam: LAYER.AV_CMRA,
        quadCamExt: LAYER.AV_CMRA, quadPtz4kExt: LAYER.AV_CMRA,
        ptzVision: LAYER.AV_CMRA, ptz4kMount: LAYER.AV_CMRA,
        ptzVision2: LAYER.AV_CMRA, ptz4kMount2: LAYER.AV_CMRA,
        unknownCamera: LAYER.AV_CMRA,

        /* microphones */
        tableMic: LAYER.AV_MICR, tableMicPro: LAYER.AV_MICR,
        ceilingMic: LAYER.AV_MICR, ceilingMicPro: LAYER.AV_MICR,

        /* navigators / touch panels */
        navigatorTable: LAYER.AV_CTRL, navigatorWall: LAYER.AV_CTRL,

        /* speakers */
        speaker: LAYER.AV_SPKR, loudspeaker: LAYER.AV_SPKR,

        /* projectors and other ceiling AV peripherals */
        projector: LAYER.AV_PERF,
    };

    /* Group-level fallback for any device id not in DEVICE_LAYER_FOR_DEVICE_ID. */
    const DEFAULT_LAYER_FOR_GROUP = {
        videoDevices: LAYER.AV_CODE,
        microphones: LAYER.AV_PERF,    /* mics, headsets, cables, phones, etc. */
        chairs: LAYER.FURN_CHRS,
        tables: LAYER.FURN_TBLS,
        displays: LAYER.AV_DSPL,
        stageFloors: LAYER.FLOR_RISR,
        boxes: LAYER.EQPM,
        rooms: LAYER.ROOM_PATH,
    };

    /* Items that always live on the people layer, even though they're
     * stored in roomObj.items.chairs alongside actual seating. */
    const PEOPLE_DEVICE_IDS = new Set([
        'personStanding', 'personStandingMan', 'plant', 'tree', 'pouf'
    ]);

    /* Door device ids → cluster on the door layer with swing arcs. */
    const DOOR_DEVICE_IDS = new Set([
        'doorRight', 'doorLeft', 'doorDouble',
        'doorRight2', 'doorLeft2', 'doorDouble2',
        'doorDoubleRight', 'doorDoubleLeft'
    ]);

    /* Wall-builder primitives in roomObj.items.tables. */
    const WALL_DEVICE_IDS = new Set(['wallStd', 'wallGlass', 'wallWindow', 'wallChairs']);
    const COLUMN_DEVICE_IDS = new Set(['columnRect', 'cylinder']);

    /* Devices that should always carry a model-name label on the drawing,
     * matching how the VRC labels them on screen by default. Everything
     * else only shows the user's `data_labelField`, if set. */
    const ALWAYS_LABELLED_DEVICE_IDS = new Set([
        /* video devices */
        ...Object.keys(DEVICE_LAYER_FOR_DEVICE_ID).filter(
            id => DEVICE_LAYER_FOR_DEVICE_ID[id] === LAYER.AV_CODE
        ),
        /* cameras */
        ...Object.keys(DEVICE_LAYER_FOR_DEVICE_ID).filter(
            id => DEVICE_LAYER_FOR_DEVICE_ID[id] === LAYER.AV_CMRA
        ),
        /* navigator / touch panel */
        'navigatorTable', 'navigatorWall'
    ]);

    /* Items that should be skipped entirely on export (not useful in CAD
     * or duplicated by other geometry). Add to taste. */
    const SKIP_DEVICE_IDS = new Set([]);

    /* ------------------------------------------------------------------
     * DxfBlockLibrary — owner of the layer & block bookkeeping for an
     * export. One instance per call to exportDxfFile(); it lazily
     * registers blocks the first time they're referenced.
     * ------------------------------------------------------------------ */
    function DxfBlockLibrary(dxf, opts) {
        this.dxf = dxf;
        this.opts = opts || {};
        this.registeredBlocks = new Set();
        this.registeredLayers = new Set();
        this.allDeviceTypes = (opts && opts.allDeviceTypes) || {};
        this._registerStandardLayers();
    }

    DxfBlockLibrary.LAYER = LAYER;
    DxfBlockLibrary.LTYPE_DASHED = LTYPE_DASHED;
    DxfBlockLibrary.DOOR_DEVICE_IDS = DOOR_DEVICE_IDS;
    DxfBlockLibrary.WALL_DEVICE_IDS = WALL_DEVICE_IDS;
    DxfBlockLibrary.COLUMN_DEVICE_IDS = COLUMN_DEVICE_IDS;
    DxfBlockLibrary.PEOPLE_DEVICE_IDS = PEOPLE_DEVICE_IDS;
    DxfBlockLibrary.ALWAYS_LABELLED_DEVICE_IDS = ALWAYS_LABELLED_DEVICE_IDS;
    DxfBlockLibrary.SKIP_DEVICE_IDS = SKIP_DEVICE_IDS;
    DxfBlockLibrary.DEVICE_LAYER_FOR_DEVICE_ID = DEVICE_LAYER_FOR_DEVICE_ID;
    DxfBlockLibrary.DEFAULT_LAYER_FOR_GROUP = DEFAULT_LAYER_FOR_GROUP;

    /* ---------- Layer routing ----------------------------------------- */

    /**
     * Resolve the CAD layer for an item.
     * @returns {{name:string, color:number, lineType?:string}}
     */
    DxfBlockLibrary.prototype.layerForItem = function (item, group) {
        if (!item) return DEFAULT_LAYER_FOR_GROUP[group] || LAYER.EQPM;
        const id = item.data_deviceid;

        if (DOOR_DEVICE_IDS.has(id)) return LAYER.DOOR;
        if (PEOPLE_DEVICE_IDS.has(id)) return LAYER.FURN_PEOP;
        if (WALL_DEVICE_IDS.has(id)) {
            if (id === 'wallGlass') return LAYER.WALL_GLAZ;
            if (id === 'wallWindow' || id === 'wallChairs') return LAYER.WALL_PATT;
            return LAYER.WALL_FULL;
        }
        if (COLUMN_DEVICE_IDS.has(id)) return LAYER.COLS;

        if (id === 'carpet') return LAYER.FLOR_CARP;
        if (id === 'stageFloor') return LAYER.FLOR_RISR;
        if (id === 'box' || id === 'sphere') return LAYER.EQPM;
        if (id === 'pathShape') return LAYER.ROOM_PATH;

        if (DEVICE_LAYER_FOR_DEVICE_ID[id]) return DEVICE_LAYER_FOR_DEVICE_ID[id];

        return DEFAULT_LAYER_FOR_GROUP[group] || LAYER.EQPM;
    };

    /** Layer for the text label that accompanies a device, if any. */
    DxfBlockLibrary.prototype.labelLayerForItem = function (item, group) {
        const itemLayer = this.layerForItem(item, group);
        if (itemLayer === LAYER.AV_CODE || itemLayer === LAYER.AV_CMRA ||
            itemLayer === LAYER.AV_MICR || itemLayer === LAYER.AV_DSPL ||
            itemLayer === LAYER.AV_SPKR || itemLayer === LAYER.AV_CTRL ||
            itemLayer === LAYER.AV_PERF) {
            return LAYER.AV_IDEN;
        }
        if (itemLayer === LAYER.FURN_CHRS || itemLayer === LAYER.FURN_TBLS ||
            itemLayer === LAYER.FURN_PEOP) {
            return LAYER.FURN_IDEN;
        }
        return LAYER.FLOR_IDEN;
    };

    /* Lazily register a layer with the writer, idempotent. */
    DxfBlockLibrary.prototype.useLayer = function (layerDef) {
        if (!layerDef) return '0';
        if (this.registeredLayers.has(layerDef.name)) return layerDef.name;
        if (layerDef.lineType === 'DASHED') {
            this.dxf.addLineType(LTYPE_DASHED);
        }
        this.dxf.addLayer(layerDef);
        this.registeredLayers.add(layerDef.name);
        return layerDef.name;
    };

    /* ---------- VRC layer mirror -------------------------------------- */

    /**
     * Register one Z-VRC-LAYER-* layer per VRC layer in `roomObjLayers`,
     * propagating the visible/locked state. Returns a map from VRC
     * layerid → DXF layer name (or null when omitted).
     */
    DxfBlockLibrary.prototype.registerVrcMirrorLayers = function (roomObjLayers) {
        const map = {};
        if (!Array.isArray(roomObjLayers)) return map;
        for (const ly of roomObjLayers) {
            const safeName = sanitizeLayerName(ly.name || ('Layer ' + ly.layerid));
            const mirrorName = 'Z-VRC-LAYER-' + safeName;
            const def = {
                name: mirrorName,
                color: 9,
                lineType: 'CONTINUOUS',
                off: ly.visible === false,
                locked: ly.locked === true
            };
            this.useLayer(def);
            map[String(ly.layerid)] = mirrorName;
        }
        return map;
    };

    /* ---------- Standard layers (always present) ---------------------- */

    DxfBlockLibrary.prototype._registerStandardLayers = function () {
        /* Always include the perimeter wall layer so an empty room still
         * yields a meaningful drawing. Other layers are added on demand. */
        this.useLayer(LAYER.WALL_EXTR);
    };

    /* ---------- Block lazy registration ------------------------------- */

    /**
     * Build (if needed) and return the block name to INSERT for a given
     * item. Returns null when no block fits and the caller should emit
     * geometry inline (tables, walls, displays, custom path shapes).
     */
    DxfBlockLibrary.prototype.blockForItem = function (item, group) {
        if (!item) return null;
        const id = item.data_deviceid;
        if (!id || SKIP_DEVICE_IDS.has(id)) return null;

        /* Inline geometry types — no block. */
        if (group === 'tables' || group === 'stageFloors' || group === 'boxes' ||
            group === 'rooms' || group === 'displays') {
            return null;
        }
        if (DOOR_DEVICE_IDS.has(id)) return this._ensureDoorBlock(id, item);
        if (PEOPLE_DEVICE_IDS.has(id)) return this._ensurePersonBlock(id, item);
        if (id === 'wheelchair' || id === 'wheelchairTurnCycle') return this._ensureWheelchairBlock(id, item);
        if (id === 'circulationSpace') return null;     /* drawn inline as a dashed circle */

        const layer = this.layerForItem(item, group);
        const blockName = blockNameFor(id);

        if (this.registeredBlocks.has(blockName)) return blockName;
        const dims = this._dimsForItem(item, group);
        if (!dims) return null;

        if (layer === LAYER.AV_CMRA) {
            /* Room Vision PTZ Cam & Bracket has a very distinctive top-down
             * silhouette (wall mount + PTZ ball + lens module) that's worth
             * matching closely. Other cameras use the generic block. */
            if (id === 'ptzVision' || id === 'ptzVision2') {
                this._defineRoomVisionBlock(blockName, dims, layer.name);
            } else {
                this._defineCameraBlock(blockName, dims, layer.name);
            }
        } else if (layer === LAYER.AV_MICR) {
            this._defineMicrophoneBlock(blockName, id, dims, layer.name);
        } else if (layer === LAYER.AV_SPKR) {
            this._defineSpeakerBlock(blockName, dims, layer.name);
        } else if (layer === LAYER.AV_CTRL) {
            this._defineNavigatorBlock(blockName, dims, layer.name);
        } else if (layer === LAYER.AV_CODE) {
            this._defineCodecBlock(blockName, dims, layer.name);
        } else if (group === 'chairs') {
            this._defineChairBlock(blockName, id, dims, layer.name);
        } else {
            /* Generic rectangle block. */
            this._defineRectBlock(blockName, dims, layer.name);
        }
        this.registeredBlocks.add(blockName);
        return blockName;
    };

    /* ---------- Block authoring helpers ------------------------------- */

    /**
     * Get (width, depth) in EXPORT meters for an item. We prefer the
     * item's own width/length attributes (which Konva resizing may have
     * stretched), falling back to the catalog mm value.
     */
    DxfBlockLibrary.prototype._dimsForItem = function (item, group) {
        const id = item.data_deviceid;
        const cat = this.allDeviceTypes[id];

        const unitToM = this.opts.unitToM || 1;

        let widthM, depthM;
        if (typeof item.width === 'number') widthM = item.width * unitToM;
        else if (cat && typeof cat.width === 'number') widthM = cat.width / 1000;

        /* For non-table items the catalog "depth" lives there; for tables
         * the room state stores the size in `height` (Konva height). */
        const itemLengthLikeKey =
            (group === 'tables' || group === 'stageFloors' || group === 'boxes' || group === 'rooms')
                ? (typeof item.height === 'number' ? item.height : item.length)
                : item.length;
        if (typeof itemLengthLikeKey === 'number') depthM = itemLengthLikeKey * unitToM;
        else if (cat && typeof cat.depth === 'number') depthM = cat.depth / 1000;

        if (!Number.isFinite(widthM) || widthM <= 0) widthM = 0.30;
        if (!Number.isFinite(depthM) || depthM <= 0) depthM = 0.30;
        return { w: widthM, d: depthM };
    };

    /* Each device block is centered at the origin so INSERT(x,y,rotation)
     * places its centroid exactly at (x,y) and rotates around the centroid.
     * The "front" of every device faces +Y in the block frame, matching how
     * Konva treats rotation = 0. */
    DxfBlockLibrary.prototype._defineRectBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, 0), { closed: true, layer });
    };

    DxfBlockLibrary.prototype._defineCodecBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, 0), { closed: true, layer });
        /* Front-face line: a slightly inset line on the +Y edge marks the
         * lens / display side so the orientation reads in CAD. */
        const inset = Math.min(dims.d * 0.25, 0.04);
        blk.line(-dims.w / 2 + 0.02, dims.d / 2 - inset, dims.w / 2 - 0.02, dims.d / 2 - inset, { layer });
    };

    /**
     * Room Vision PTZ Cam & Bracket — bespoke block matching the actual
     * top-down silhouette of the device:
     *
     *      ╔════╪═══════════╪════╗   ← wall-mount bracket (back, +Y)
     *      ║       ┌─────┐       ║
     *      ║       │ ▢▢▢ │       ║      PTZ housing circle dominating
     *      ║       │ ▢▢▢ │       ║      the body, with the lens module
     *      ║       └─────┘       ║      rounded-rectangle nested inside
     *      ╚══════════ ─ ════════╝   ← short lens tick on -Y (room side)
     *
     * Used by `ptzVision` and `ptzVision2`. Other PTZ cameras (PTZ 4K Cam
     * & Bracket, Precision 60, etc.) keep using the simpler concentric-
     * circles block from `_defineCameraBlock`.
     *
     * Block-frame convention (see header of this file):
     *   +Y = TOP of CAD viewer at rot=0  =  back of device  (wall mount)
     *   -Y = BOTTOM of CAD viewer at rot=0  =  front of device  (lens)
     * This mirrors the asset image `ptzVision-top.png`, where the
     * wall-mount bracket sits at the top of the image and the lens
     * module is at the bottom — keeping CAD output visually consistent
     * with what the user sees on the VRC canvas.
     */
    DxfBlockLibrary.prototype._defineRoomVisionBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        const minDim = Math.min(dims.w, dims.d);

        /* Outer body footprint — rounded rectangle. */
        const bodyCorner = minDim * 0.18;
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, bodyCorner),
            { closed: true, layer });

        /* Wall-mount bracket separator — a short horizontal line near the
         * +Y (back) edge, marking where the wall-mount portion ends and
         * the camera ball begins. Narrower than the body. */
        const bracketY = dims.d / 2 - dims.d * 0.30;
        const bracketHalfW = dims.w * 0.36;
        blk.line(-bracketHalfW, bracketY, bracketHalfW, bracketY, { layer });

        /* PTZ housing circle — the dominant feature of the silhouette.
         * Centered slightly forward of the body's geometric center so it
         * sits between the bracket (back, +Y) and the lens edge (-Y). */
        const housingR = minDim * 0.42;
        const housingCY = -dims.d * 0.10;
        blk.circle(0, housingCY, housingR, { layer });

        /* Lens module — rounded rectangle nested inside the housing. */
        const lensW = dims.w * 0.32;
        const lensD = dims.d * 0.32;
        const lensCorner = Math.min(lensW, lensD) * 0.22;
        const lensPoints = DxfWriter.roundedRectPoints(lensW, lensD, lensCorner)
            .map(p => p.length === 3
                ? [p[0], p[1] + housingCY, p[2]]
                : [p[0], p[1] + housingCY]);
        blk.lwpolyline(lensPoints, { closed: true, layer });

        /* Lens-face orientation tick on the -Y (room-facing) edge. */
        const tickHalf = dims.w * 0.10;
        blk.line(-tickHalf, -dims.d / 2, tickHalf, -dims.d / 2, { layer });
    };

    /**
     * Camera block — a top-down camera symbol that stays inside its
     * footprint so it reads cleanly at any zoom in CAD viewers.
     *
     * Two layouts:
     *   • "bracket-style" (w / d > 4) — wide thin camera bars like the
     *     Quad Camera (950×102 mm) or codec-integrated cameras. Drawn as
     *     a long horizontal bar with a centered lens housing on the
     *     front (-Y) face.
     *   • "compact" (PTZ 4K Cam & Bracket, Precision 60, etc.) — a body
     *     rectangle with concentric circles for the lens housing on the
     *     front (-Y) face, plus a short "front" notch line on the -Y
     *     edge so orientation reads even when the device is small.
     *
     * (Room Vision PTZ has its own bespoke block — see
     * `_defineRoomVisionBlock` above.)
     *
     * Block-frame convention (see header of this file):
     *   +Y = TOP of CAD viewer at rot=0  =  back of camera (wall side)
     *   -Y = BOTTOM of CAD viewer at rot=0  =  front of camera (lens)
     * This mirrors the asset top-down images, where the lens / aperture
     * is at the bottom of the image — keeping CAD output visually
     * consistent with what the user sees on the VRC canvas.
     *
     * No FOV triangle: the lens housing alone is enough to indicate
     * "camera + facing direction", and triangles that extend past the
     * device footprint were causing scale confusion in viewers.
     */
    DxfBlockLibrary.prototype._defineCameraBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        const isBracketStyle = (dims.w / Math.max(dims.d, 0.001)) > 4;

        /* Body rectangle. */
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, 0), { closed: true, layer });

        if (isBracketStyle) {
            /* Centered lens housing on the -Y (front) edge. */
            const lensR = dims.d * 0.35;
            const lensCY = -dims.d / 2 + lensR * 1.15;
            blk.circle(0, lensCY, lensR, { layer });
            blk.circle(0, lensCY, lensR * 0.45, { layer });
        } else {
            /* Compact camera — larger concentric lens circles + front notch. */
            const lensR = Math.min(dims.w, dims.d) * 0.30;
            const lensCY = -dims.d / 2 + lensR * 1.15;
            blk.circle(0, lensCY, lensR, { layer });
            blk.circle(0, lensCY, lensR * 0.4, { layer });
            /* "Front-face" tick on the -Y edge for unambiguous orientation. */
            const tickHalf = Math.min(dims.w, dims.d) * 0.18;
            blk.line(-tickHalf, -dims.d / 2, tickHalf, -dims.d / 2, { layer });
        }
    };

    DxfBlockLibrary.prototype._defineMicrophoneBlock = function (name, id, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.max(dims.w, dims.d) / 2 });
        const r = Math.max(dims.w, dims.d) / 2;
        if (id === 'ceilingMic' || id === 'ceilingMicPro') {
            /* Ceiling fixture symbol — circle + cross hairs, common in CAD. */
            blk.circle(0, 0, r, { layer });
            blk.line(-r, 0, r, 0, { layer });
            blk.line(0, -r, 0, r, { layer });
        } else {
            /* Table mics — small circle. */
            blk.circle(0, 0, r, { layer });
        }
    };

    DxfBlockLibrary.prototype._defineSpeakerBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.max(dims.w, dims.d) / 2 });
        const r = Math.max(dims.w, dims.d) / 2;
        /* Circle for the housing + smaller inner circle for the cone. */
        blk.circle(0, 0, r, { layer });
        blk.circle(0, 0, r * 0.45, { layer });
    };

    DxfBlockLibrary.prototype._defineNavigatorBlock = function (name, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, Math.min(dims.w, dims.d) * 0.08), { closed: true, layer });
        /* Inset rectangle = screen face. */
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w * 0.85, dims.d * 0.85, 0), { closed: true, layer });
    };

    DxfBlockLibrary.prototype._defineChairBlock = function (name, id, dims, layer) {
        const blk = this.dxf.addBlock(name, { boundingRadius: Math.hypot(dims.w, dims.d) });
        /* Seat outline. */
        const radius = Math.min(dims.w, dims.d) * 0.12;
        blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, radius), { closed: true, layer });
        /* Chair-back line on the +Y side. Chair faces -Y, matching the
         * `chair-top.png` asset (back of chair at top of image, seat at
         * bottom). See the BLOCK FRAME convention at the head of this
         * file: +Y in block frame = TOP of CAD viewer at rot=0 = TOP of
         * Konva canvas at rot=0 = back/wall side of the device. */
        const backDepth = Math.min(0.06, dims.d * 0.18);
        blk.line(-dims.w / 2, dims.d / 2 - backDepth, dims.w / 2, dims.d / 2 - backDepth, { layer });
    };

    DxfBlockLibrary.prototype._ensureDoorBlock = function (id, item) {
        const blockName = blockNameFor(id);
        if (this.registeredBlocks.has(blockName)) return blockName;
        const dims = this._dimsForItem(item, 'chairs');
        const layer = this.useLayer(LAYER.DOOR);
        const blk = this.dxf.addBlock(blockName, { boundingRadius: Math.hypot(dims.w, dims.d) });
        const halfW = dims.w / 2;
        const halfD = dims.d / 2;
        const isDouble = id.indexOf('Double') >= 0;
        const isLeft = id.indexOf('Left') >= 0;

        /* Door geometry — match the standard architectural plan-view
         * symbol used by the VRC `doorRight-top.png` asset:
         *   - The bbox depth (`dims.d`) is approximately the SWING
         *     RADIUS of the door, NOT the wall thickness. Drawing the
         *     wall as the full bbox depth (the previous behaviour)
         *     made the door look like a giant solid rectangle with an
         *     arc trapped inside.
         *   - The actual wall is a THIN STRIP at the very bottom edge
         *     of the bbox (`-Y` in block frame). After the export's
         *     flipY transform, this strip lands flush with the room's
         *     wall edge in the CAD viewer.
         *   - The door leaf and swing arc are hinged at the room-facing
         *     corner of the wall strip and fill the rest of the bbox
         *     above it. */
        const WALL_T = Math.min(0.05, dims.d * 0.08);   /* ~5 cm wall thickness */
        const wallTopY = -halfD + WALL_T;               /* room-facing wall face */

        /* Wall strip — closed thin rectangle at the bottom of the bbox. */
        blk.line(-halfW, -halfD,  halfW, -halfD,  { layer }); /* outer wall face */
        blk.line(-halfW,  wallTopY, halfW,  wallTopY, { layer }); /* inner (room) face */
        blk.line(-halfW, -halfD, -halfW,  wallTopY, { layer }); /* left wall end */
        blk.line( halfW, -halfD,  halfW,  wallTopY, { layer }); /* right wall end */

        if (isDouble) {
            /* Two half-width leaves hinged at the room-side corners of
             * the wall strip, each sweeping a 90° quarter-arc into the
             * room until they meet at the top center. */
            const leafLen = halfW;
            blk.line(-halfW, wallTopY, -halfW, wallTopY + leafLen, { layer });
            blk.line( halfW, wallTopY,  halfW, wallTopY + leafLen, { layer });
            blk.arc(-halfW, wallTopY, leafLen, 0, 90,    { layer }); /* left  half */
            blk.arc( halfW, wallTopY, leafLen, 90, 180,  { layer }); /* right half */
        } else {
            /* leafLen = dims.w so the arc reaches the opposite wall
             * corner — matching the asset image. May extend slightly
             * past the bbox top when the device's depth < width, which
             * is fine and matches the on-canvas rendering. */
            const leafLen = dims.w;
            if (isLeft) {
                /* doorLeft: hinge on -X side, swings RIGHT into the room. */
                blk.line(-halfW, wallTopY, -halfW, wallTopY + leafLen, { layer });
                blk.arc(-halfW, wallTopY, leafLen, 0, 90, { layer });
            } else {
                /* doorRight: hinge on +X side, swings LEFT into the room. */
                blk.line(halfW, wallTopY, halfW, wallTopY + leafLen, { layer });
                blk.arc(halfW, wallTopY, leafLen, 90, 180, { layer });
            }
        }
        this.registeredBlocks.add(blockName);
        return blockName;
    };

    DxfBlockLibrary.prototype._ensurePersonBlock = function (id, item) {
        const blockName = blockNameFor(id);
        if (this.registeredBlocks.has(blockName)) return blockName;
        const dims = this._dimsForItem(item, 'chairs');
        const layer = this.useLayer(LAYER.FURN_PEOP);
        const blk = this.dxf.addBlock(blockName, { boundingRadius: Math.max(dims.w, dims.d) / 2 });

        /* People = circle for shoulders + smaller circle for head.
         * Plants/trees = single circle. */
        const r = Math.max(dims.w, dims.d) / 2;
        if (id === 'plant' || id === 'tree' || id === 'pouf') {
            blk.circle(0, 0, r, { layer });
            if (id === 'tree') blk.circle(0, 0, r * 0.6, { layer });
        } else {
            blk.circle(0, 0, r * 0.55, { layer });
            blk.circle(0, 0, r * 0.18, { layer });
        }
        this.registeredBlocks.add(blockName);
        return blockName;
    };

    DxfBlockLibrary.prototype._ensureWheelchairBlock = function (id, item) {
        const blockName = blockNameFor(id);
        if (this.registeredBlocks.has(blockName)) return blockName;
        const dims = this._dimsForItem(item, 'chairs');
        const layer = this.useLayer(LAYER.FURN_CHRS);
        const blk = this.dxf.addBlock(blockName, { boundingRadius: Math.max(dims.w, dims.d) / 2 });
        const halfW = dims.w / 2;
        const halfD = dims.d / 2;
        const r = Math.min(halfW, halfD);
        /* Outer turning circle as a dashed line is best done by emitting
         * a CIRCLE on the chairs layer; for the chair body itself we draw
         * a simple rounded rectangle. */
        if (id === 'wheelchairTurnCycle') {
            blk.circle(0, 0, r, { layer });
        } else {
            blk.lwpolyline(DxfWriter.roundedRectPoints(dims.w, dims.d, Math.min(0.05, r * 0.2)), { closed: true, layer });
            blk.circle(0, 0, r * 0.25, { layer });
        }
        this.registeredBlocks.add(blockName);
        return blockName;
    };

    /* ------------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------------ */

    function blockNameFor(deviceId) {
        return 'VRC_' + String(deviceId || 'UNKNOWN').toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_');
    }

    /* AutoCAD layer names cannot contain  <>/\":;?*|=' — we replace any
     * unsafe character with an underscore. Whitespace is folded too so
     * the layer panel stays readable. */
    function sanitizeLayerName(name) {
        return String(name)
            .replace(/[<>/\\":;?*|='`,]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 100) || 'UNNAMED';
    }
    DxfBlockLibrary.sanitizeLayerName = sanitizeLayerName;

    root.DxfBlockLibrary = DxfBlockLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
