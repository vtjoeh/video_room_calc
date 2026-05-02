/* eslint-env browser */
/* exported DxfWriter */

/**
 * DxfWriter — zero-dependency vanilla-JS writer for AutoCAD DXF text files.
 *
 * **Targets AutoCAD R12 (AC1009)** — the lowest-common-denominator format
 * that every modern CAD tool reads, including the strict AutoCAD Web App.
 * R12 is older than subclass markers, so the file stays small and the
 * writer stays simple, but it does require:
 *   • Every entity carries a hexadecimal handle (group code 5).
 *   • A complete set of TABLES (VPORT, LTYPE, LAYER, STYLE, VIEW, UCS,
 *     APPID, DIMSTYLE) — most can be minimal/default.
 *   • The reserved BLOCKS `$Model_Space` and `$Paper_Space` always exist.
 *   • A reasonable HEADER with $ACADVER, $DWGCODEPAGE, $HANDSEED, etc.
 *
 * Supported entities: LINE, POLYLINE+VERTEX+SEQEND (with bulges),
 * CIRCLE, ARC, TEXT, INSERT (block reference). The public API still
 * exposes `lwpolyline()` and `ellipse()` for caller convenience — both
 * are emitted as POLYLINE under the hood (R12 has no LWPOLYLINE/ELLIPSE
 * entity), with `ellipse()` tessellated into a closed POLYLINE around
 * the perimeter.
 *
 * Coordinates are written in *export units* (meters by default). The
 * caller is responsible for any unit conversion + Y-axis flipping
 * (Konva uses Y-down, CAD uses Y-up).
 *
 * Author: Joe Hughes (Cisco) — Video Room Calculator
 */

'use strict';

(function (root) {
    /* DXF $INSUNITS group code (70) values for each supported export unit.
     * Note: R12 doesn't formally encode $INSUNITS in the header, but most
     * tools (LibreCAD, BricsCAD, FreeCAD, AutoCAD newer than R12) honor
     * it when present, and ignore it otherwise. */
    const INSUNITS = { meters: 6, mm: 4, feet: 2, inches: 1 };

    /**
     * @param {Object} [opts]
     * @param {('meters'|'mm'|'feet'|'inches')} [opts.units='meters']
     */
    function DxfWriter(opts) {
        opts = opts || {};
        this.units = opts.units || 'meters';
        this.acadver = 'AC1009';                    /* AutoCAD R12 */
        this.layers = [];                           /* [{name, color, lineType, off, locked}] */
        this.layerNames = new Set();
        this.lineTypes = [];                        /* [{name, pattern, total, segments[]}] */
        this.lineTypeNames = new Set();
        this.blocks = [];                           /* [{name, entities: []}] */
        this.blockNames = new Set();
        this.entities = [];
        this.extents = {
            minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity
        };

        /* Handles must be unique across the whole drawing. We hand them
         * out lazily as 4-digit hex strings starting at 0x100 (the first
         * 0xFF are reserved for entries we generate up-front in the
         * tables/blocks sections). */
        this._nextHandle = 0x100;

        /* DXF requires CONTINUOUS, ByLayer and ByBlock linetypes to be
         * defined before any entity references them. */
        this.addLineType({ name: 'ByBlock', pattern: '', segments: [] });
        this.addLineType({ name: 'ByLayer', pattern: '', segments: [] });
        this.addLineType({ name: 'CONTINUOUS', pattern: 'Solid line', segments: [] });
    }

    /* ---------- Layer & linetype definitions --------------------------- */

    /**
     * Define a CAD layer. Safe to call repeatedly with the same name —
     * later calls update the previous record.
     */
    DxfWriter.prototype.addLayer = function (def) {
        const name = String(def.name);
        const layer = {
            name: name,
            color: typeof def.color === 'number' ? def.color : 7,
            lineType: def.lineType || 'CONTINUOUS',
            off: !!def.off,
            locked: !!def.locked
        };
        if (this.layerNames.has(name)) {
            const idx = this.layers.findIndex(l => l.name === name);
            this.layers[idx] = layer;
        } else {
            this.layers.push(layer);
            this.layerNames.add(name);
        }
    };

    /**
     * Define a linetype. The default CONTINUOUS / ByLayer / ByBlock are
     * preregistered by the constructor. `segments` is dash/gap pattern
     * lengths in the export unit (positive = dash, negative = gap).
     */
    DxfWriter.prototype.addLineType = function (def) {
        const name = String(def.name);
        if (this.lineTypeNames.has(name)) return;
        const segments = def.segments || [];
        const total = segments.reduce((sum, s) => sum + Math.abs(s), 0);
        this.lineTypes.push({
            name: name,
            pattern: def.pattern || '',
            segments: segments,
            total: total
        });
        this.lineTypeNames.add(name);
    };

    /* ---------- Internal entity primitives ----------------------------- */

    /* Track drawing extents so $EXTMIN/$EXTMAX can be written in HEADER. */
    DxfWriter.prototype._extend = function (x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < this.extents.minX) this.extents.minX = x;
        if (y < this.extents.minY) this.extents.minY = y;
        if (x > this.extents.maxX) this.extents.maxX = x;
        if (y > this.extents.maxY) this.extents.maxY = y;
    };

    /* Round to 4 decimal places — ≈0.1 mm precision in meters. Avoids
     * 12-digit floating-point noise in the output file. */
    function f(n) {
        if (!Number.isFinite(n)) return '0.0';
        return Math.abs(n) < 1e-9 ? '0.0' : Number(n.toFixed(4)).toString();
    }

    /* Push a (group code, value) pair onto a target entity stream. */
    function pair(target, code, value) {
        target.push(String(code));
        target.push(String(value));
    }

    /* Allocate the next unique handle as an upper-case hex string. */
    DxfWriter.prototype._handle = function () {
        const h = this._nextHandle.toString(16).toUpperCase();
        this._nextHandle++;
        return h;
    };

    /* Common entity preamble: type, handle, layer, optional linetype. */
    DxfWriter.prototype._head = function (target, type, layer, lineType) {
        pair(target, 0, type);
        pair(target, 5, this._handle());
        pair(target, 8, layer || '0');
        if (lineType && lineType !== 'CONTINUOUS') pair(target, 6, lineType);
    };

    /* Resolve which entity stream a call should write to: a block being
     * built, or the global entities list. */
    DxfWriter.prototype._target = function (opts) {
        if (opts && opts._block) return opts._block.entities;
        return this.entities;
    };

    /* ---------- Public entity API -------------------------------------- */

    /** Straight line. */
    DxfWriter.prototype.line = function (x1, y1, x2, y2, opts) {
        opts = opts || {};
        const e = this._target(opts);
        this._head(e, 'LINE', opts.layer, opts.lineType);
        pair(e, 10, f(x1)); pair(e, 20, f(y1)); pair(e, 30, '0.0');
        pair(e, 11, f(x2)); pair(e, 21, f(y2)); pair(e, 31, '0.0');
        if (!opts._block) { this._extend(x1, y1); this._extend(x2, y2); }
    };

    /**
     * Polyline. `points` is an array of `[x, y]` (or `[x, y, bulge]`)
     * tuples. `opts.closed` joins the last vertex back to the first.
     * Bulge values turn segments into arcs:
     *   bulge =  tan(angle/4)   — positive = CCW arc, negative = CW.
     *   bulge =  1.0  → semicircle
     *   bulge = ~0.4142 → quarter circle (sweep 90°)
     *
     * Emitted as R12 POLYLINE + VERTEX + SEQEND records. The method is
     * named `lwpolyline` for backward compat with callers; under the
     * hood R12 has no LWPOLYLINE entity.
     */
    DxfWriter.prototype.lwpolyline = function (points, opts) {
        opts = opts || {};
        if (!points || points.length < 2) return;
        const e = this._target(opts);
        const layer = opts.layer || '0';
        const lineType = opts.lineType;

        /* Header POLYLINE record — 66/1 = "vertices follow", 70 bit 1 = closed. */
        pair(e, 0, 'POLYLINE');
        pair(e, 5, this._handle());
        pair(e, 8, layer);
        if (lineType && lineType !== 'CONTINUOUS') pair(e, 6, lineType);
        pair(e, 66, 1);
        pair(e, 10, '0.0'); pair(e, 20, '0.0'); pair(e, 30, '0.0');
        pair(e, 70, opts.closed ? 1 : 0);

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            pair(e, 0, 'VERTEX');
            pair(e, 5, this._handle());
            pair(e, 8, layer);
            pair(e, 10, f(p[0]));
            pair(e, 20, f(p[1]));
            pair(e, 30, '0.0');
            if (p.length >= 3 && Number.isFinite(p[2]) && p[2] !== 0) {
                pair(e, 42, f(p[2]));
            }
            pair(e, 70, 0);
            if (!opts._block) this._extend(p[0], p[1]);
        }

        pair(e, 0, 'SEQEND');
        pair(e, 5, this._handle());
        pair(e, 8, layer);
    };

    /** Polyline (alias for lwpolyline — same behavior in R12). */
    DxfWriter.prototype.polyline = DxfWriter.prototype.lwpolyline;

    /** Circle. */
    DxfWriter.prototype.circle = function (cx, cy, radius, opts) {
        opts = opts || {};
        const e = this._target(opts);
        this._head(e, 'CIRCLE', opts.layer, opts.lineType);
        pair(e, 10, f(cx)); pair(e, 20, f(cy)); pair(e, 30, '0.0');
        pair(e, 40, f(radius));
        if (!opts._block) {
            this._extend(cx - radius, cy - radius);
            this._extend(cx + radius, cy + radius);
        }
    };

    /**
     * Ellipse — emitted as a closed POLYLINE approximation since R12
     * doesn't have a native ELLIPSE entity. `(majorX, majorY)` is the
     * vector from the center to the end of the major axis (defines
     * orientation + major radius). `ratio` is minor/major in (0, 1].
     */
    DxfWriter.prototype.ellipse = function (cx, cy, majorX, majorY, ratio, opts) {
        opts = opts || {};
        const major = Math.hypot(majorX, majorY);
        const minor = major * ratio;
        const angle = Math.atan2(majorY, majorX);
        const segments = 64;
        const points = [];
        for (let i = 0; i < segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const lx = major * Math.cos(t);
            const ly = minor * Math.sin(t);
            const rx = lx * Math.cos(angle) - ly * Math.sin(angle);
            const ry = lx * Math.sin(angle) + ly * Math.cos(angle);
            points.push([cx + rx, cy + ry]);
        }
        this.lwpolyline(points, Object.assign({}, opts, { closed: true }));
    };

    /** Counter-clockwise arc (degrees). */
    DxfWriter.prototype.arc = function (cx, cy, radius, startDeg, endDeg, opts) {
        opts = opts || {};
        const e = this._target(opts);
        this._head(e, 'ARC', opts.layer, opts.lineType);
        pair(e, 10, f(cx)); pair(e, 20, f(cy)); pair(e, 30, '0.0');
        pair(e, 40, f(radius));
        pair(e, 50, f(startDeg));
        pair(e, 51, f(endDeg));
        if (!opts._block) {
            this._extend(cx - radius, cy - radius);
            this._extend(cx + radius, cy + radius);
        }
    };

    /**
     * Single-line TEXT entity.
     * @param {number} x  insertion point X
     * @param {number} y  insertion point Y
     * @param {string} text
     * @param {Object} [opts]
     * @param {number} [opts.height=0.10]  text height in export units
     * @param {number} [opts.rotation=0]   degrees (CCW)
     * @param {number} [opts.halign=1]     0=left, 1=center, 2=right (group 72)
     * @param {number} [opts.valign=2]     0=baseline, 1=bottom, 2=middle, 3=top (group 73)
     */
    DxfWriter.prototype.text = function (x, y, text, opts) {
        opts = opts || {};
        const e = this._target(opts);
        const height = opts.height != null ? opts.height : 0.10;
        const halign = opts.halign != null ? opts.halign : 1;
        const valign = opts.valign != null ? opts.valign : 2;
        this._head(e, 'TEXT', opts.layer, opts.lineType);
        pair(e, 10, f(x)); pair(e, 20, f(y)); pair(e, 30, '0.0');
        pair(e, 40, f(height));
        pair(e, 1, sanitizeText(text));
        if (opts.rotation) pair(e, 50, f(opts.rotation));
        pair(e, 7, 'STANDARD');
        pair(e, 72, halign);
        pair(e, 11, f(x)); pair(e, 21, f(y)); pair(e, 31, '0.0');
        pair(e, 73, valign);
        if (!opts._block) {
            const r = height * 4 + Math.abs(text || '').length * height * 0.6;
            this._extend(x - r, y - r);
            this._extend(x + r, y + r);
        }
    };

    /** Block insertion. Places `blockName` at (x,y) with optional rotation + scale. */
    DxfWriter.prototype.insert = function (blockName, x, y, opts) {
        opts = opts || {};
        const e = this._target(opts);
        this._head(e, 'INSERT', opts.layer, opts.lineType);
        pair(e, 2, blockName);
        pair(e, 10, f(x)); pair(e, 20, f(y)); pair(e, 30, '0.0');
        const sx = opts.scale != null ? opts.scale : (opts.scaleX != null ? opts.scaleX : 1);
        const sy = opts.scale != null ? opts.scale : (opts.scaleY != null ? opts.scaleY : 1);
        if (sx !== 1) pair(e, 41, f(sx));
        if (sy !== 1) pair(e, 42, f(sy));
        if (opts.rotation) pair(e, 50, f(opts.rotation));
        if (!opts._block) {
            const block = this.blocks.find(b => b.name === blockName);
            if (block && Number.isFinite(block._rough)) {
                const r = block._rough * Math.max(Math.abs(sx), Math.abs(sy));
                this._extend(x - r, y - r);
                this._extend(x + r, y + r);
            } else {
                this._extend(x, y);
            }
        }
    };

    /* ---------- Block authoring ---------------------------------------- */

    /**
     * Define a reusable block. Returns a *proxy* object with the same
     * line / lwpolyline / circle / ellipse / arc / text / insert methods.
     */
    DxfWriter.prototype.addBlock = function (name, opts) {
        opts = opts || {};
        if (this.blockNames.has(name)) {
            return this._blockProxy(this.blocks.find(b => b.name === name));
        }
        const block = { name: name, entities: [], _rough: opts.boundingRadius || 1 };
        this.blocks.push(block);
        this.blockNames.add(name);
        return this._blockProxy(block);
    };

    DxfWriter.prototype._blockProxy = function (block) {
        const self = this;
        const wrap = (fn) => function () {
            const args = Array.prototype.slice.call(arguments);
            const lastIdx = args.length - 1;
            const last = args[lastIdx];
            if (last && typeof last === 'object' && !Array.isArray(last)) {
                args[lastIdx] = Object.assign({}, last, { _block: block });
            } else {
                args.push({ _block: block });
            }
            return fn.apply(self, args);
        };
        return {
            line: wrap(self.line),
            lwpolyline: wrap(self.lwpolyline),
            polyline: wrap(self.lwpolyline),
            circle: wrap(self.circle),
            ellipse: wrap(self.ellipse),
            arc: wrap(self.arc),
            text: wrap(self.text),
            insert: wrap(self.insert),
            name: block.name
        };
    };

    /* ---------- Serialization ------------------------------------------ */

    /** Build the complete DXF text document. */
    DxfWriter.prototype.toString = function () {
        const lines = [];
        const insunits = INSUNITS[this.units] != null ? INSUNITS[this.units] : 0;

        /* Pre-allocate every handle we'll use during serialization BEFORE
         * we start writing the header — that way $HANDSEED can be the
         * true upper bound and no two records collide. */
        const handles = this._allocateBoilerplateHandles();
        const userBlockHandles = this.blocks.map(() => ({
            blkHandle: this._handle(),
            endHandle: this._handle()
        }));
        const handseed = this._nextHandle.toString(16).toUpperCase();

        /* ------------------ HEADER ----------------------------------- */
        lines.push('0', 'SECTION', '2', 'HEADER');
        lines.push('9', '$ACADVER', '1', this.acadver);
        lines.push('9', '$DWGCODEPAGE', '3', 'ANSI_1252');
        lines.push('9', '$INSBASE',
            '10', '0.0', '20', '0.0', '30', '0.0');
        if (this.extents.minX !== Infinity) {
            lines.push('9', '$EXTMIN',
                '10', f(this.extents.minX), '20', f(this.extents.minY), '30', '0.0');
            lines.push('9', '$EXTMAX',
                '10', f(this.extents.maxX), '20', f(this.extents.maxY), '30', '0.0');
            lines.push('9', '$LIMMIN',
                '10', f(this.extents.minX), '20', f(this.extents.minY));
            lines.push('9', '$LIMMAX',
                '10', f(this.extents.maxX), '20', f(this.extents.maxY));
        } else {
            lines.push('9', '$EXTMIN', '10', '0.0', '20', '0.0', '30', '0.0');
            lines.push('9', '$EXTMAX', '10', '1.0', '20', '1.0', '30', '0.0');
            lines.push('9', '$LIMMIN', '10', '0.0', '20', '0.0');
            lines.push('9', '$LIMMAX', '10', '1.0', '20', '1.0');
        }
        lines.push('9', '$ORTHOMODE', '70', '0');
        lines.push('9', '$REGENMODE', '70', '1');
        lines.push('9', '$FILLMODE', '70', '1');
        lines.push('9', '$QTEXTMODE', '70', '0');
        lines.push('9', '$MIRRTEXT', '70', '0');
        lines.push('9', '$LTSCALE', '40', '1.0');
        lines.push('9', '$ATTMODE', '70', '1');
        lines.push('9', '$TEXTSIZE', '40', '0.2');
        lines.push('9', '$TRACEWID', '40', '0.05');
        lines.push('9', '$TEXTSTYLE', '7', 'STANDARD');
        lines.push('9', '$CLAYER', '8', '0');
        lines.push('9', '$CELTYPE', '6', 'BYLAYER');
        lines.push('9', '$CECOLOR', '62', '256');
        lines.push('9', '$DIMSCALE', '40', '1.0');
        lines.push('9', '$DIMASZ', '40', '0.18');
        lines.push('9', '$DIMEXO', '40', '0.0625');
        lines.push('9', '$DIMDLI', '40', '0.38');
        lines.push('9', '$DIMRND', '40', '0.0');
        lines.push('9', '$DIMDLE', '40', '0.0');
        lines.push('9', '$DIMEXE', '40', '0.18');
        lines.push('9', '$DIMTP', '40', '0.0');
        lines.push('9', '$DIMTM', '40', '0.0');
        lines.push('9', '$DIMTXT', '40', '0.18');
        lines.push('9', '$DIMCEN', '40', '0.09');
        lines.push('9', '$DIMTSZ', '40', '0.0');
        lines.push('9', '$DIMTOL', '70', '0');
        lines.push('9', '$DIMLIM', '70', '0');
        lines.push('9', '$DIMTIH', '70', '1');
        lines.push('9', '$DIMTOH', '70', '1');
        lines.push('9', '$DIMSE1', '70', '0');
        lines.push('9', '$DIMSE2', '70', '0');
        lines.push('9', '$DIMTAD', '70', '0');
        lines.push('9', '$DIMZIN', '70', '0');
        lines.push('9', '$DIMBLK', '1', '');
        lines.push('9', '$DIMASO', '70', '1');
        lines.push('9', '$DIMSHO', '70', '1');
        lines.push('9', '$DIMPOST', '1', '');
        lines.push('9', '$DIMAPOST', '1', '');
        lines.push('9', '$DIMALT', '70', '0');
        lines.push('9', '$DIMALTD', '70', '2');
        lines.push('9', '$DIMALTF', '40', '25.4');
        lines.push('9', '$DIMLFAC', '40', '1.0');
        lines.push('9', '$DIMTOFL', '70', '0');
        lines.push('9', '$DIMTVP', '40', '0.0');
        lines.push('9', '$DIMTIX', '70', '0');
        lines.push('9', '$DIMSOXD', '70', '0');
        lines.push('9', '$DIMSAH', '70', '0');
        lines.push('9', '$DIMBLK1', '1', '');
        lines.push('9', '$DIMBLK2', '1', '');
        lines.push('9', '$DIMSTYLE', '2', 'STANDARD');
        lines.push('9', '$DIMCLRD', '70', '0');
        lines.push('9', '$DIMCLRE', '70', '0');
        lines.push('9', '$DIMCLRT', '70', '0');
        lines.push('9', '$DIMTFAC', '40', '1.0');
        lines.push('9', '$DIMGAP', '40', '0.09');
        lines.push('9', '$LUNITS', '70', '2');           /* 2 = decimal */
        lines.push('9', '$LUPREC', '70', '4');
        lines.push('9', '$AUNITS', '70', '0');           /* 0 = decimal degrees */
        lines.push('9', '$AUPREC', '70', '0');
        lines.push('9', '$INSUNITS', '70', String(insunits));
        lines.push('9', '$HANDSEED', '5', handseed);
        lines.push('0', 'ENDSEC');

        /* ------------------ TABLES ----------------------------------- */
        lines.push('0', 'SECTION', '2', 'TABLES');

        /* VPORT — viewport. AutoCAD insists on at least one record. */
        lines.push('0', 'TABLE', '2', 'VPORT', '70', '1');
        lines.push('0', 'VPORT', '5', handles.vport, '2', '*ACTIVE', '70', '0');
        lines.push('10', '0.0', '20', '0.0');
        lines.push('11', '1.0', '21', '1.0');
        lines.push('12', '0.0', '22', '0.0');
        lines.push('13', '0.0', '23', '0.0');
        lines.push('14', '0.1', '24', '0.1');
        lines.push('15', '0.1', '25', '0.1');
        lines.push('16', '0.0', '26', '0.0', '36', '1.0');
        lines.push('17', '0.0', '27', '0.0', '37', '0.0');
        lines.push('40', '20.0');                          /* view height */
        lines.push('41', '1.5');                            /* view aspect ratio */
        lines.push('42', '50.0', '43', '0.0', '44', '0.0');
        lines.push('50', '0.0', '51', '0.0');
        lines.push('71', '0', '72', '100', '73', '1', '74', '3');
        lines.push('75', '0', '76', '0', '77', '0', '78', '0');
        lines.push('0', 'ENDTAB');

        /* LTYPE table */
        lines.push('0', 'TABLE', '2', 'LTYPE', '70', String(this.lineTypes.length));
        for (let i = 0; i < this.lineTypes.length; i++) {
            const lt = this.lineTypes[i];
            lines.push('0', 'LTYPE');
            lines.push('5', handles.ltype[i]);
            lines.push('2', lt.name);
            lines.push('70', '0');
            lines.push('3', lt.pattern);
            lines.push('72', '65');                       /* alignment 'A' */
            lines.push('73', String(lt.segments.length));
            lines.push('40', f(lt.total));
            for (const s of lt.segments) {
                lines.push('49', f(s));
            }
        }
        lines.push('0', 'ENDTAB');

        /* LAYER table — always include layer "0". */
        const layers = this.layers.slice();
        if (!this.layerNames.has('0')) {
            layers.unshift({ name: '0', color: 7, lineType: 'CONTINUOUS', off: false, locked: false });
        }
        lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layers.length));
        for (let i = 0; i < layers.length; i++) {
            const ly = layers[i];
            lines.push('0', 'LAYER');
            lines.push('5', handles.layer[i]);
            lines.push('2', ly.name);
            lines.push('70', String(ly.locked ? 4 : 0));
            lines.push('62', String(ly.off ? -Math.abs(ly.color) : ly.color));
            lines.push('6', ly.lineType);
        }
        lines.push('0', 'ENDTAB');

        /* STYLE table — at minimum 'STANDARD'. */
        lines.push('0', 'TABLE', '2', 'STYLE', '70', '1');
        lines.push('0', 'STYLE', '5', handles.style, '2', 'STANDARD', '70', '0');
        lines.push('40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '0.2');
        lines.push('3', 'txt', '4', '');
        lines.push('0', 'ENDTAB');

        /* VIEW table — empty. */
        lines.push('0', 'TABLE', '2', 'VIEW', '70', '0', '0', 'ENDTAB');

        /* UCS table — empty. */
        lines.push('0', 'TABLE', '2', 'UCS', '70', '0', '0', 'ENDTAB');

        /* APPID table — at minimum 'ACAD'. */
        lines.push('0', 'TABLE', '2', 'APPID', '70', '1');
        lines.push('0', 'APPID', '5', handles.appid, '2', 'ACAD', '70', '0');
        lines.push('0', 'ENDTAB');

        /* DIMSTYLE table — at minimum 'STANDARD'. */
        lines.push('0', 'TABLE', '2', 'DIMSTYLE', '70', '1');
        lines.push('0', 'DIMSTYLE', '105', handles.dimstyle, '2', 'STANDARD', '70', '0');
        lines.push('3', '', '4', '', '5', '', '6', '', '7', '');
        lines.push('40', '1.0', '41', '0.18', '42', '0.0625', '43', '0.38', '44', '0.18');
        lines.push('45', '0.0', '46', '0.0', '47', '0.0', '48', '0.0');
        lines.push('140', '0.18', '141', '0.09', '142', '0.0', '143', '25.4');
        lines.push('144', '1.0', '145', '0.0', '146', '1.0', '147', '0.09');
        lines.push('71', '0', '72', '0', '73', '1', '74', '1', '75', '0');
        lines.push('76', '0', '77', '0', '78', '0');
        lines.push('170', '0', '171', '2', '172', '0', '173', '0', '174', '0');
        lines.push('175', '0', '176', '0', '177', '0', '178', '0');
        lines.push('0', 'ENDTAB');

        lines.push('0', 'ENDSEC');

        /* ------------------ BLOCKS ----------------------------------- */
        lines.push('0', 'SECTION', '2', 'BLOCKS');

        /* Reserved blocks $Model_Space and $Paper_Space MUST exist in
         * every R12 file (AutoCAD will reject otherwise). They're empty. */
        emitReservedBlock(lines, '$Model_Space', handles.modelSpace, handles.modelSpaceEnd);
        emitReservedBlock(lines, '$Paper_Space', handles.paperSpace, handles.paperSpaceEnd);

        /* User blocks (using pre-allocated handles). */
        for (let i = 0; i < this.blocks.length; i++) {
            const blk = this.blocks[i];
            const { blkHandle, endHandle } = userBlockHandles[i];
            lines.push('0', 'BLOCK');
            lines.push('5', blkHandle);
            lines.push('8', '0');
            lines.push('2', blk.name);
            lines.push('70', '0');
            lines.push('10', '0.0', '20', '0.0', '30', '0.0');
            lines.push('3', blk.name);
            lines.push('1', '');
            for (const ln of blk.entities) lines.push(ln);
            lines.push('0', 'ENDBLK');
            lines.push('5', endHandle);
            lines.push('8', '0');
        }
        lines.push('0', 'ENDSEC');

        /* ------------------ ENTITIES --------------------------------- */
        lines.push('0', 'SECTION', '2', 'ENTITIES');
        for (const ln of this.entities) lines.push(ln);
        lines.push('0', 'ENDSEC');

        lines.push('0', 'EOF');

        /* DXF spec uses CRLF — most modern parsers tolerate either, but
         * CRLF maximises compat with legacy AutoCAD versions. */
        return lines.join('\r\n') + '\r\n';
    };

    /* ---------- Helpers ------------------------------------------------ */

    /* Pre-allocate the small set of handles needed for the boilerplate
     * (vport, ltype/layer/style/appid/dimstyle/reserved-block records).
     * Returns an object with named slots so the serializer can refer to
     * them in order. */
    DxfWriter.prototype._allocateBoilerplateHandles = function () {
        const layerCount = this.layers.length + (this.layerNames.has('0') ? 0 : 1);
        return {
            vport: this._handle(),
            ltype: this.lineTypes.map(() => this._handle()),
            layer: Array.from({ length: layerCount }, () => this._handle()),
            style: this._handle(),
            appid: this._handle(),
            dimstyle: this._handle(),
            modelSpace: this._handle(),
            modelSpaceEnd: this._handle(),
            paperSpace: this._handle(),
            paperSpaceEnd: this._handle(),
        };
    };

    function emitReservedBlock(lines, name, blkHandle, endHandle) {
        lines.push('0', 'BLOCK');
        lines.push('5', blkHandle);
        lines.push('8', '0');
        lines.push('2', name);
        lines.push('70', '0');
        lines.push('10', '0.0', '20', '0.0', '30', '0.0');
        lines.push('3', name);
        lines.push('1', '');
        lines.push('0', 'ENDBLK');
        lines.push('5', endHandle);
        lines.push('8', '0');
    }

    /* Strip control characters that would corrupt the group-code/value
     * line pairing, and collapse newlines (TEXT is single-line). */
    function sanitizeText(s) {
        if (s == null) return '';
        return String(s).replace(/[\r\n\t]+/g, ' ').slice(0, 250);
    }

    /* ---------- Static helper: SVG path → polyline points -------------- */

    /**
     * Tessellate a small subset of SVG path-data into [x,y] points for
     * polyline. Supports M/m, L/l, H/h, V/v, Z/z, C/c (cubic Bézier
     * sampled at `samples` points), Q/q (quadratic Bézier).
     */
    DxfWriter.tessellateSvgPath = function (d, samples) {
        samples = samples || 16;
        if (!d) return [];
        const subPaths = [];
        let current = null;
        let cx = 0, cy = 0, sx = 0, sy = 0;
        const tokens = d.match(/([a-zA-Z])|(-?\d*\.?\d+(?:[eE][+\-]?\d+)?)/g) || [];
        let i = 0;
        let cmd = '';
        function num() { return parseFloat(tokens[i++]); }
        function startSubpath() {
            current = [];
            subPaths.push(current);
        }
        function pushPoint(x, y) {
            if (!current) startSubpath();
            current.push([x, y]);
        }
        while (i < tokens.length) {
            const t = tokens[i];
            if (/[a-zA-Z]/.test(t)) { cmd = t; i++; continue; }
            switch (cmd) {
                case 'M': cx = num(); cy = num(); sx = cx; sy = cy; startSubpath(); pushPoint(cx, cy); cmd = 'L'; break;
                case 'm': cx += num(); cy += num(); sx = cx; sy = cy; startSubpath(); pushPoint(cx, cy); cmd = 'l'; break;
                case 'L': cx = num(); cy = num(); pushPoint(cx, cy); break;
                case 'l': cx += num(); cy += num(); pushPoint(cx, cy); break;
                case 'H': cx = num(); pushPoint(cx, cy); break;
                case 'h': cx += num(); pushPoint(cx, cy); break;
                case 'V': cy = num(); pushPoint(cx, cy); break;
                case 'v': cy += num(); pushPoint(cx, cy); break;
                case 'C': case 'c': {
                    let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
                    if (cmd === 'c') { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
                    sampleCubic(cx, cy, x1, y1, x2, y2, x, y, samples, pushPoint);
                    cx = x; cy = y;
                    break;
                }
                case 'Q': case 'q': {
                    let x1 = num(), y1 = num(), x = num(), y = num();
                    if (cmd === 'q') { x1 += cx; y1 += cy; x += cx; y += cy; }
                    sampleQuadratic(cx, cy, x1, y1, x, y, samples, pushPoint);
                    cx = x; cy = y;
                    break;
                }
                case 'Z': case 'z':
                    pushPoint(sx, sy);
                    cx = sx; cy = sy;
                    current = null;
                    break;
                default:
                    /* Skip unsupported commands (A/S/T) — fall through one number. */
                    num();
            }
        }
        return subPaths.filter(p => p.length >= 2);
    };

    function sampleCubic(x0, y0, x1, y1, x2, y2, x3, y3, n, push) {
        for (let s = 1; s <= n; s++) {
            const t = s / n, mt = 1 - t;
            const px = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
            const py = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
            push(px, py);
        }
    }
    function sampleQuadratic(x0, y0, x1, y1, x2, y2, n, push) {
        for (let s = 1; s <= n; s++) {
            const t = s / n, mt = 1 - t;
            const px = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
            const py = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
            push(px, py);
        }
    }

    /* ---------- Static helper: rounded-rectangle polyline -------------- */

    /**
     * Build the [x,y,bulge] vertex array for a rectangle of width `w`,
     * height `h`, centered at the origin, with corners optionally rounded
     * by radius `r` (set 0 for sharp corners). For lwpolyline a quarter
     * circle has bulge = tan(45°/2) ≈ 0.41421356.
     */
    DxfWriter.roundedRectPoints = function (w, h, r) {
        const halfW = w / 2, halfH = h / 2;
        if (!r || r <= 0) {
            return [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]];
        }
        const cr = Math.min(r, halfW, halfH);
        const Q = 0.41421356; /* tan(π/8) — quarter-circle bulge */
        return [
            [-halfW + cr, -halfH, 0],
            [halfW - cr, -halfH, Q],
            [halfW, -halfH + cr, 0],
            [halfW, halfH - cr, Q],
            [halfW - cr, halfH, 0],
            [-halfW + cr, halfH, Q],
            [-halfW, halfH - cr, 0],
            [-halfW, -halfH + cr, Q]
        ];
    };

    /* Expose globally — there is no module loader in this project. */
    root.DxfWriter = DxfWriter;
})(typeof window !== 'undefined' ? window : globalThis);
