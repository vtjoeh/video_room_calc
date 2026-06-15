/* Custom color/opacity popover. See notes/COLOR_PICKER.md */
(function () {
    'use strict';

    const APPLY_DEBOUNCE_MS = 250;

    function clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    function normalizeHex(hex) {
        if (typeof hex !== 'string') return null;
        let h = hex.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(h)) {
            h = h.split('').map(c => c + c).join('');
        }
        if (/^[0-9a-fA-F]{6}$/.test(h)) {
            return '#' + h.toUpperCase();
        }
        return null;
    }

    function hexToRgb(hex) {
        const h = normalizeHex(hex) || '#FFFFFF';
        return {
            r: parseInt(h.slice(1, 3), 16),
            g: parseInt(h.slice(3, 5), 16),
            b: parseInt(h.slice(5, 7), 16),
        };
    }

    function rgbToHex(r, g, b) {
        const to2 = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
        return ('#' + to2(r) + to2(g) + to2(b)).toUpperCase();
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        const s = max === 0 ? 0 : d / max;
        const v = max;
        return { h, s, v };
    }

    function hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255),
        };
    }

    let dom = null;
    let state = null;
    let applyTimer = null;
    let currentSwatch = null;

    function buildDom() {
        const root = document.createElement('div');
        root.id = 'colorPickerPopover';
        root.className = 'colorPickerPopover';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'Choose color and opacity');
        root.style.display = 'none';

        root.innerHTML = `
            <div class="colorPickerHeader">
              <span class="colorPickerTitle">Color &amp; Opacity</span>
              <button type="button" class="colorPickerClose" title="Close" aria-label="Close">
                <i class="icon icon-cancel-bold"></i>
              </button>
            </div>

            <div class="colorPickerColorSection">
              <div class="colorPickerSV" tabindex="0">
                <div class="colorPickerSVWhite"></div>
                <div class="colorPickerSVBlack"></div>
                <div class="colorPickerSVThumb"></div>
              </div>
              <input type="range" class="colorPickerHue" min="0" max="360" step="1" aria-label="Hue">
            </div>

            <div class="colorPickerHexRow">
              <label class="colorPickerHexLabel">HEX</label>
              <input type="text" class="colorPickerHexInput" spellcheck="false" autocomplete="off"
                     maxlength="7" aria-label="Hex color code">
              <button type="button" class="colorPickerCopy" title="Copy hex code">
                <i class="icon icon-copy-bold"></i>
              </button>
            </div>

            <div class="colorPickerOpacitySection">
              <label class="colorPickerOpacityLabel">Opacity</label>
              <input type="range" class="colorPickerOpacitySlider" min="0" max="100" step="1" aria-label="Opacity">
              <div class="colorPickerOpacityValueWrap">
                <input type="number" class="colorPickerOpacityInput" min="0" max="100" step="1"
                       aria-label="Opacity percent">
                <span class="colorPickerOpacityPct">%</span>
              </div>
            </div>

            <div class="colorPickerFooter">
              <button type="button" class="colorPickerReset button">Reset to default</button>
              <div class="colorPickerPreviewWrap">
                <span class="colorPickerPreviewLabel">Preview</span>
                <span class="colorPickerPreview"><span class="colorPickerPreviewColor"></span></span>
              </div>
              <button type="button" class="colorPickerDone button">Done</button>
            </div>
        `;

        document.body.appendChild(root);

        dom = {
            root,
            close: root.querySelector('.colorPickerClose'),
            colorSection: root.querySelector('.colorPickerColorSection'),
            hexRow: root.querySelector('.colorPickerHexRow'),
            sv: root.querySelector('.colorPickerSV'),
            svThumb: root.querySelector('.colorPickerSVThumb'),
            hue: root.querySelector('.colorPickerHue'),
            hexInput: root.querySelector('.colorPickerHexInput'),
            copy: root.querySelector('.colorPickerCopy'),
            opacitySection: root.querySelector('.colorPickerOpacitySection'),
            opacitySlider: root.querySelector('.colorPickerOpacitySlider'),
            opacityInput: root.querySelector('.colorPickerOpacityInput'),
            reset: root.querySelector('.colorPickerReset'),
            preview: root.querySelector('.colorPickerPreviewColor'),
            done: root.querySelector('.colorPickerDone'),
        };

        wireEvents();
    }

    /* Anchor the popover above-left of its swatch, clamped to the viewport. */
    function positionPopover() {
        const root = dom.root;
        root.style.visibility = 'hidden';
        root.style.display = 'block';
        if (currentSwatch) {
            const pop = root.getBoundingClientRect();
            const sw = currentSwatch.getBoundingClientRect();
            const m = 8;
            let top = sw.top - pop.height - m;
            if (top < m) top = sw.bottom + m;
            let left = sw.right - pop.width;
            left = Math.max(m, Math.min(left, window.innerWidth - pop.width - m));
            top = Math.max(m, Math.min(top, window.innerHeight - pop.height - m));
            root.style.left = left + 'px';
            root.style.top = top + 'px';
        }
        root.style.visibility = '';
    }

    function onDocPointerDown(e) {
        if (!dom) return;
        if (dom.root.contains(e.target)) return;
        if (currentSwatch && currentSwatch.contains(e.target)) return;
        closePicker();
    }

    function currentHex() {
        const rgb = hsvToRgb(state.h, state.s, state.v);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function render(skipHexInput) {
        const hex = currentHex();
        const hueRgb = hsvToRgb(state.h, 1, 1);

        dom.sv.style.backgroundColor = rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
        dom.svThumb.style.left = (state.s * 100) + '%';
        dom.svThumb.style.top = ((1 - state.v) * 100) + '%';
        dom.svThumb.style.backgroundColor = hex;

        dom.hue.value = String(Math.round(state.h));

        if (!skipHexInput) dom.hexInput.value = hex;

        const pct = Math.round(state.alpha * 100);
        dom.opacitySlider.value = String(pct);
        dom.opacityInput.value = String(pct);

        dom.preview.style.backgroundColor = hex;
        dom.preview.style.opacity = String(state.alpha);
    }

    function commit() {
        const cfg = state.cfg;
        const fillEl = document.getElementById(cfg.fillId);
        const opEl = document.getElementById(cfg.opacityId);

        if (fillEl && cfg.showColor) {
            fillEl.value = currentHex();
        }
        if (opEl && cfg.showOpacity) {
            opEl.value = state.alpha >= 1 ? '' : String(Math.round(state.alpha * 100) / 100);
        }

        if (typeof window.updateFillSwatch === 'function') {
            window.updateFillSwatch(cfg.fillId, cfg.opacityId, cfg.swatchId);
        }

        if (typeof cfg.onApply === 'function') {
            if (applyTimer) clearTimeout(applyTimer);
            applyTimer = setTimeout(() => {
                applyTimer = null;
                cfg.onApply();
            }, APPLY_DEBOUNCE_MS);
        }
    }

    function svPointer(evt) {
        const rect = dom.sv.getBoundingClientRect();
        const x = clamp(evt.clientX - rect.left, 0, rect.width);
        const y = clamp(evt.clientY - rect.top, 0, rect.height);
        state.s = rect.width ? x / rect.width : 0;
        state.v = rect.height ? 1 - y / rect.height : 0;
        render();
        commit();
    }

    function wireEvents() {
        dom.close.addEventListener('click', closePicker);
        dom.done.addEventListener('click', closePicker);
        document.addEventListener('keydown', onKeyDown);

        let svDragging = false;
        dom.sv.addEventListener('pointerdown', (e) => {
            svDragging = true;
            dom.sv.setPointerCapture(e.pointerId);
            svPointer(e);
        });
        dom.sv.addEventListener('pointermove', (e) => {
            if (svDragging) svPointer(e);
        });
        dom.sv.addEventListener('pointerup', (e) => {
            svDragging = false;
            try { dom.sv.releasePointerCapture(e.pointerId); } catch (_) { }
        });

        dom.hue.addEventListener('input', () => {
            state.h = Number(dom.hue.value);
            render();
            commit();
        });

        dom.hexInput.addEventListener('input', () => {
            const norm = normalizeHex(dom.hexInput.value);
            if (norm) {
                const rgb = hexToRgb(norm);
                const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                state.h = hsv.h; state.s = hsv.s; state.v = hsv.v;
                render(true);
                commit();
            }
        });
        dom.hexInput.addEventListener('blur', () => {
            const norm = normalizeHex(dom.hexInput.value);
            dom.hexInput.value = norm || currentHex();
        });
        dom.hexInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') dom.hexInput.blur();
        });

        dom.copy.addEventListener('click', async () => {
            const hex = currentHex();
            try {
                await navigator.clipboard.writeText(hex);
            } catch (_) {
                dom.hexInput.select();
                document.execCommand && document.execCommand('copy');
            }
            dom.copy.classList.add('colorPickerCopied');
            setTimeout(() => dom.copy.classList.remove('colorPickerCopied'), 900);
        });

        dom.opacitySlider.addEventListener('input', () => {
            state.alpha = clamp(Number(dom.opacitySlider.value) / 100, 0, 1);
            render();
            commit();
        });
        dom.opacityInput.addEventListener('input', () => {
            const pct = clamp(Number(dom.opacityInput.value), 0, 100);
            if (!isNaN(pct)) {
                state.alpha = pct / 100;
                render();
                commit();
            }
        });

        dom.reset.addEventListener('click', () => {
            state.h = 0; state.s = 0; state.v = 1;
            state.alpha = 1;
            render();
            commit();
        });
    }

    function onKeyDown(e) {
        if (e.key === 'Escape' && dom && dom.root.style.display !== 'none') {
            closePicker();
        }
    }

    function closePicker() {
        if (applyTimer) {
            clearTimeout(applyTimer);
            applyTimer = null;
            if (state && typeof state.cfg.onApply === 'function') state.cfg.onApply();
        }
        document.removeEventListener('pointerdown', onDocPointerDown, true);
        if (dom) dom.root.style.display = 'none';
    }

    window.VRC_openColorPicker = function (cfg) {
        if (!dom) buildDom();

        currentSwatch = document.getElementById(cfg.swatchId) || null;
        const fillEl = document.getElementById(cfg.fillId);
        const opEl = document.getElementById(cfg.opacityId);

        const showColor = cfg.showColor !== false;
        const showOpacity = cfg.showOpacity !== false;

        const hex = (fillEl && normalizeHex(fillEl.value)) || '#FFFFFF';
        const rgb = hexToRgb(hex);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

        let alpha = 1;
        if (opEl && opEl.value !== '' && !isNaN(Number(opEl.value))) {
            alpha = clamp(Number(opEl.value), 0, 1);
        }

        state = {
            h: hsv.h, s: hsv.s, v: hsv.v,
            alpha,
            cfg: {
                fillId: cfg.fillId,
                opacityId: cfg.opacityId,
                swatchId: cfg.swatchId,
                showColor,
                showOpacity,
                onApply: cfg.onApply,
            },
        };

        dom.colorSection.style.display = showColor ? '' : 'none';
        dom.hexRow.style.display = showColor ? '' : 'none';
        dom.opacitySection.style.display = showOpacity ? '' : 'none';

        render();
        positionPopover();
        setTimeout(() => document.addEventListener('pointerdown', onDocPointerDown, true), 0);
        dom.hexInput.focus();
        dom.hexInput.select();
    };
})();
