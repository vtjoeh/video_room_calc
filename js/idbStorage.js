/* ============================================================================
 * idbStorage.js — IndexedDB persistence layer for the Video Room Calculator.
 *
 * Provides a tiny promise-based wrapper around IndexedDB and exposes a flat
 * API on `window.idbStore`. Persists three things across page reloads:
 *
 *   1. undoEntries  — one record per undo snapshot (was localStorage 'undoArray')
 *   2. redoEntries  — one record per redo snapshot (was in-memory only)
 *   3. bgImages     — up to 5 background floor-plan images, stored as Blobs
 *                     (FIFO eviction by addedAt timestamp)
 *
 * Why IndexedDB instead of localStorage?
 *   - Quota: ~5–10 MB hard cap in localStorage vs effectively GB-scale in IDB,
 *     which is why the legacy code had to slice undoArray to 30 entries and
 *     strip backgroundImageFile before saving.
 *   - Asynchronous: localStorage.setItem blocks the main thread for the full
 *     JSON.stringify(...) of the whole array on every save.
 *   - Native binary: Blobs are stored natively, avoiding the +33% base64
 *     overhead that previously made image persistence impossible.
 *
 * Failure mode: if IndexedDB is unavailable (Safari private mode quirks,
 * disabled by browser policy, etc.) the module exposes the same API but
 * every method becomes a no-op that resolves to a safe default. Callers
 * never need to check whether IDB is available — they just `await` and
 * the in-memory state remains the source of truth.
 *
 * Schema versioning: bumping DB_VERSION re-runs onupgradeneeded; add new
 * stores there. Never re-key existing stores in place — write a migration. */

(function (window) {
    'use strict';

    const DB_NAME = 'videoRoomCalculator';
    /* DB_VERSION 2 — adds STORE_CUSTOMITEMS (VRC Custom Item Library).
     * onupgradeneeded creates the new store only when it does not already
     * exist, so a fresh install creates v2 directly and an existing v1
     * install upgrades by adding the new store without touching the
     * undo/redo/bgImages stores. */
    const DB_VERSION = 2;

    const STORE_UNDO = 'undoEntries';
    const STORE_REDO = 'redoEntries';
    const STORE_BG = 'bgImages';
    const STORE_CUSTOMITEMS = 'customItems';

    /* Hard caps. The undo cap matches the legacy in-memory `maxUndoArrayLength`
     * so the IDB store stays bounded. The bg-image cap is a small FIFO
     * library — 10 floor-plans is plenty for almost any user and still leaves
     * the per-origin quota untouched even with multi-MB images. The custom-item
     * cap is generous (the records are small — a few KB JPEG + part metadata)
     * but bounded to keep the library list manageable in the UI palette. */
    const MAX_UNDO_ENTRIES = 100;
    const MAX_REDO_ENTRIES = 100;
    const MAX_BG_IMAGES = 10;
    const MAX_CUSTOM_ITEMS = 200;

    /* Legacy localStorage key we migrate from on first run with IDB enabled. */
    const LEGACY_LS_UNDO_KEY = 'undoArray';

    let dbPromise = null;
    let idbAvailable = (typeof indexedDB !== 'undefined' && indexedDB !== null);

    function openDb() {
        if (!idbAvailable) return Promise.reject(new Error('IndexedDB unavailable'));
        if (dbPromise) return dbPromise;

        dbPromise = new Promise(function (resolve, reject) {
            let req;
            try {
                req = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (e) {
                idbAvailable = false;
                reject(e);
                return;
            }

            req.onupgradeneeded = function (ev) {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains(STORE_UNDO)) {
                    db.createObjectStore(STORE_UNDO, { keyPath: 'seq', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_REDO)) {
                    db.createObjectStore(STORE_REDO, { keyPath: 'seq', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_BG)) {
                    const bg = db.createObjectStore(STORE_BG, { keyPath: 'id' });
                    bg.createIndex('addedAt', 'addedAt', { unique: false });
                }
                /* VRC Custom Item Library — keyed by customItemBaseId so an
                 * import of a customItem with a baseId that already exists
                 * naturally upserts (same key, new value). The addedAt index
                 * supports FIFO eviction and newest-first listing in the
                 * Quick Add palette (future PR). updatedAt is stored on the
                 * record but not indexed; sorting by updatedAt is done in
                 * the JS layer when needed. */
                if (!db.objectStoreNames.contains(STORE_CUSTOMITEMS)) {
                    const ci = db.createObjectStore(STORE_CUSTOMITEMS, { keyPath: 'customItemBaseId' });
                    ci.createIndex('addedAt', 'addedAt', { unique: false });
                }
            };

            req.onsuccess = function (ev) { resolve(ev.target.result); };
            req.onerror = function (ev) {
                idbAvailable = false;
                reject(ev.target.error || new Error('Failed to open IndexedDB'));
            };
            req.onblocked = function () {
                /* Another tab is holding an old version open. Resolve eventually. */
                console.warn('[idbStorage] open blocked by another tab');
            };
        });

        return dbPromise;
    }

    /* Run a transaction and resolve with whatever the executor returns or
     * with the request result if the executor returns nothing. The transaction
     * is committed when no more requests are pending — we resolve on its
     * `oncomplete` so the caller's await guarantees durability. */
    function tx(storeName, mode, executor) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                let userResult;
                try {
                    userResult = executor(store, transaction);
                } catch (e) {
                    reject(e);
                    return;
                }
                transaction.oncomplete = function () { resolve(userResult); };
                transaction.onerror = function (ev) { reject(ev.target.error || new Error('IDB tx error')); };
                transaction.onabort = function (ev) { reject(ev.target.error || new Error('IDB tx aborted')); };
            });
        });
    }

    function reqToPromise(request) {
        return new Promise(function (resolve, reject) {
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    /* ----- Generic helpers used by both undo and redo stores ---------------- */

    function storeAddPayload(storeName, payload) {
        if (!idbAvailable) return Promise.resolve(null);
        return tx(storeName, 'readwrite', function (store) {
            const result = {};
            const addReq = store.add({ payload: payload, addedAt: Date.now() });
            addReq.onsuccess = function () { result.seq = addReq.result; };
            return result;
        }).catch(function (e) {
            console.warn('[idbStorage] add to', storeName, 'failed:', e && e.message);
            return null;
        });
    }

    /* Trim a store down to `cap` entries by deleting the lowest-keyed records.
     * Cheap because object stores are key-ordered. Returns the number of
     * entries deleted. */
    function storeTrim(storeName, cap) {
        if (!idbAvailable) return Promise.resolve(0);
        return tx(storeName, 'readwrite', function (store) {
            const out = { deleted: 0 };
            const countReq = store.count();
            countReq.onsuccess = function () {
                const excess = countReq.result - cap;
                if (excess <= 0) return;
                let removed = 0;
                /* Walk forward (lowest seq first); delete until we've trimmed `excess`. */
                store.openCursor().onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (!cursor || removed >= excess) return;
                    cursor.delete();
                    removed++;
                    out.deleted = removed;
                    cursor.continue();
                };
            };
            return out;
        }).catch(function (e) {
            console.warn('[idbStorage] trim', storeName, 'failed:', e && e.message);
            return 0;
        });
    }

    function storeDeleteHighest(storeName) {
        if (!idbAvailable) return Promise.resolve(false);
        return tx(storeName, 'readwrite', function (store) {
            const out = { deleted: false };
            store.openCursor(null, 'prev').onsuccess = function (ev) {
                const cursor = ev.target.result;
                if (cursor) {
                    cursor.delete();
                    out.deleted = true;
                }
            };
            return out;
        }).catch(function (e) {
            console.warn('[idbStorage] delete highest in', storeName, 'failed:', e && e.message);
            return { deleted: false };
        });
    }

    function storeClear(storeName) {
        if (!idbAvailable) return Promise.resolve();
        return tx(storeName, 'readwrite', function (store) {
            store.clear();
        }).catch(function (e) {
            console.warn('[idbStorage] clear', storeName, 'failed:', e && e.message);
        });
    }

    function storeGetAllPayloads(storeName) {
        if (!idbAvailable) return Promise.resolve([]);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const out = [];
                store.openCursor().onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (cursor) {
                        if (cursor.value && 'payload' in cursor.value) {
                            out.push(cursor.value.payload);
                        }
                        cursor.continue();
                    }
                };
                transaction.oncomplete = function () { resolve(out); };
                transaction.onerror = function (ev) { reject(ev.target.error || new Error('IDB read error')); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] read', storeName, 'failed:', e && e.message);
            return [];
        });
    }

    /* ----- One-time migration of legacy localStorage 'undoArray' ----------- */

    function migrateLegacyUndoFromLocalStorage() {
        if (!idbAvailable) return Promise.resolve(0);
        let raw;
        try {
            raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(LEGACY_LS_UNDO_KEY) : null;
        } catch (e) {
            return Promise.resolve(0);
        }
        if (!raw) return Promise.resolve(0);

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            try { localStorage.removeItem(LEGACY_LS_UNDO_KEY); } catch (_) { /* best-effort */ }
            return Promise.resolve(0);
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
            try { localStorage.removeItem(LEGACY_LS_UNDO_KEY); } catch (_) { /* best-effort */ }
            return Promise.resolve(0);
        }

        /* Only migrate if the IDB undo store is empty — we never want to
         * clobber newer IDB data with stale localStorage data on subsequent
         * runs. */
        return tx(STORE_UNDO, 'readwrite', function (store) {
            const out = { count: 0 };
            const countReq = store.count();
            countReq.onsuccess = function () {
                if (countReq.result > 0) return;
                parsed.slice(-MAX_UNDO_ENTRIES).forEach(function (entry) {
                    store.add({ payload: entry, addedAt: Date.now() });
                    out.count++;
                });
            };
            return out;
        }).then(function (result) {
            try { localStorage.removeItem(LEGACY_LS_UNDO_KEY); } catch (_) { /* best-effort */ }
            const n = (result && result.count) || 0;
            if (n > 0) console.info('[idbStorage] migrated', n, 'undo entries from localStorage');
            return n;
        }).catch(function (e) {
            console.warn('[idbStorage] migration failed:', e && e.message);
            return 0;
        });
    }

    /* ----- Background-image library ---------------------------------------- */

    function generateImageId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        /* Cheap fallback (sufficient — collision-resistant enough for local IDB). */
        return 'bg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function bgImagesAdd(record) {
        if (!idbAvailable) return Promise.resolve(null);
        if (!record || !record.blob) return Promise.resolve(null);
        const id = record.id || generateImageId();
        const entry = {
            id: id,
            name: String(record.name || 'untitled'),
            mimeType: String(record.mimeType || (record.blob.type) || 'application/octet-stream'),
            blob: record.blob,
            sizeBytes: (record.blob.size != null) ? record.blob.size : 0,
            addedAt: Date.now()
        };
        return tx(STORE_BG, 'readwrite', function (store) {
            store.put(entry);
        }).then(function () {
            return bgImagesEvictExcess();
        }).then(function () {
            return id;
        }).catch(function (e) {
            console.warn('[idbStorage] bgImagesAdd failed:', e && e.message);
            return null;
        });
    }

    /* FIFO eviction: when more than MAX_BG_IMAGES exist, delete the oldest
     * entries (lowest addedAt) until we're back at the cap. */
    function bgImagesEvictExcess() {
        if (!idbAvailable) return Promise.resolve(0);
        return tx(STORE_BG, 'readwrite', function (store) {
            const out = { deleted: 0 };
            const countReq = store.count();
            countReq.onsuccess = function () {
                const excess = countReq.result - MAX_BG_IMAGES;
                if (excess <= 0) return;
                let removed = 0;
                const idx = store.index('addedAt');
                idx.openCursor().onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (!cursor || removed >= excess) return;
                    cursor.delete();
                    removed++;
                    out.deleted = removed;
                    cursor.continue();
                };
            };
            return out;
        }).catch(function (e) {
            console.warn('[idbStorage] bgImagesEvictExcess failed:', e && e.message);
            return 0;
        });
    }

    function bgImagesGetAll() {
        if (!idbAvailable) return Promise.resolve([]);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_BG, 'readonly');
                const store = transaction.objectStore(STORE_BG);
                const out = [];
                /* Walk the addedAt index newest-first so the dropdown UI can
                 * show them in most-recent order without a client-side sort. */
                store.index('addedAt').openCursor(null, 'prev').onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (cursor) {
                        out.push(cursor.value);
                        cursor.continue();
                    }
                };
                transaction.oncomplete = function () { resolve(out); };
                transaction.onerror = function (ev) { reject(ev.target.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] bgImagesGetAll failed:', e && e.message);
            return [];
        });
    }

    function bgImagesGetById(id) {
        if (!idbAvailable || !id) return Promise.resolve(null);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_BG, 'readonly');
                const store = transaction.objectStore(STORE_BG);
                const req = store.get(id);
                req.onsuccess = function () { resolve(req.result || null); };
                req.onerror = function () { reject(req.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] bgImagesGetById failed:', e && e.message);
            return null;
        });
    }

    function bgImagesDelete(id) {
        if (!idbAvailable || !id) return Promise.resolve(false);
        return tx(STORE_BG, 'readwrite', function (store) {
            store.delete(id);
        }).then(function () { return true; })
            .catch(function (e) {
                console.warn('[idbStorage] bgImagesDelete failed:', e && e.message);
                return false;
            });
    }

    /* Merge a partial update onto an existing bgImages record without
     * rewriting the blob. Used to remember the user's calibrated scale
     * (scaledWidthMeters / scaledHeightMeters) so that re-applying the
     * image from "Recent Floor Plans" restores the same scale rather than
     * auto-fitting to the current room. Allowed update fields are limited
     * to a known allow-list so callers can't accidentally clobber the blob
     * or the addedAt FIFO key. */
    function bgImagesUpdate(id, partial) {
        if (!idbAvailable || !id || !partial) return Promise.resolve(false);
        const ALLOWED_FIELDS = ['scaledWidthMeters', 'scaledHeightMeters', 'name'];
        return tx(STORE_BG, 'readwrite', function (store) {
            const out = { updated: false };
            const getReq = store.get(id);
            getReq.onsuccess = function () {
                const rec = getReq.result;
                if (!rec) return;
                ALLOWED_FIELDS.forEach(function (k) {
                    if (Object.prototype.hasOwnProperty.call(partial, k)) {
                        rec[k] = partial[k];
                    }
                });
                store.put(rec);
                out.updated = true;
            };
            return out;
        }).then(function (r) { return !!(r && r.updated); })
            .catch(function (e) {
                console.warn('[idbStorage] bgImagesUpdate failed:', e && e.message);
                return false;
            });
    }

    /* ----- VRC Custom Item Library ----------------------------------------
     *
     * One record per customItem "template" (family / baseId). The record is
     * the same shape that the .vrcCustomItems export file emits for a single
     * customItem, plus bookkeeping (addedAt / updatedAt). Same record shape
     * means an imported file payload can be put directly without
     * transformation, and an exported file is built by reading the record
     * back as-is. Schema:
     *
     *   {
     *     customItemBaseId: '<uuid>',                // primary key
     *     customItemName:   'Friendly Name',         // user-visible name.
     *                                                //   Legacy alias `data_labelField`
     *                                                //   is read but no longer written
     *                                                //   (auto-migrated on first upsert).
     *     width:            <number, meters>,
     *     height:           <number, meters>,
     *     customItemParts:  [...],                   // normalized part list
     *     menuImage:        'data:image/png;base64,...',
     *     addedAt:          '2026-05-11T20:55:00.000Z',  // ISO 8601 UTC,
     *                                                    //   preserved across upserts
     *     updatedAt:        '2026-05-11T20:55:00.000Z'   // ISO 8601 UTC,
     *                                                    //   refreshed on every put
     *   }
     *
     * Why ISO 8601 strings instead of Date.now() epoch ms?
     *   - Self-documenting when inspecting records in DevTools.
     *   - Lexicographic order == chronological order, so the addedAt IDB
     *     index keeps working unchanged: the cursor still walks oldest
     *     to newest, FIFO eviction still picks the right victim, and the
     *     newest-first sort in customItemGetAll is a string compare.
     *   - Round-trips losslessly through JSON.
     *   - Universal standard (locale-independent — unlike toLocaleString
     *     output which would vary per user).
     *
     * customItemPut() upserts by baseId — same baseId overwrites in place
     * (no duplicates), which is exactly the import dedup semantic the user
     * asked for. FIFO eviction (oldest addedAt) runs only when a NEW baseId
     * pushes the count past MAX_CUSTOM_ITEMS, so existing entries can't be
     * evicted by re-saving them. */

    function customItemPut(record) {
        if (!idbAvailable) return Promise.resolve(null);
        if (!record || !record.customItemBaseId) {
            console.warn('[idbStorage] customItemPut: missing customItemBaseId');
            return Promise.resolve(null);
        }
        const baseId = String(record.customItemBaseId);
        const nowIso = new Date().toISOString();
        return tx(STORE_CUSTOMITEMS, 'readwrite', function (store) {
            const out = { baseId: baseId, isNew: false };
            const getReq = store.get(baseId);
            getReq.onsuccess = function () {
                const existing = getReq.result;
                /* Preserve original addedAt across upserts so FIFO order
                 * reflects when the user first added the template, not the
                 * most recent edit. */
                const addedAt = (existing && existing.addedAt) || nowIso;
                out.isNew = !existing;
                const entry = {
                    customItemBaseId: baseId,
                    /* Canonical key is `customItemName` (renamed from
                     * the legacy `data_labelField` in May 2026). Read
                     * either key so an incoming record (file import or
                     * an older in-memory rec) migrates atomically on
                     * this upsert; only the new key is persisted. */
                    customItemName: String(record.customItemName || record.data_labelField || ''),
                    /* Optional descriptive metadata. Coerced to string
                     * (the on-disk shape never carries numbers / objects)
                     * and length-capped here defensively — the dialogs
                     * already cap input lengths, but a hand-edited
                     * import file could carry arbitrarily long values
                     * that would balloon IDB row size. */
                    author: String(record.author || '').slice(0, 120),
                    description: String(record.description || '').slice(0, 2000),
                    version: String(record.version || '1').slice(0, 40),
                    width: Number(record.width) || 0,
                    height: Number(record.height) || 0,
                    customItemParts: Array.isArray(record.customItemParts) ? record.customItemParts : [],
                    menuImage: typeof record.menuImage === 'string' ? record.menuImage : '',
                    addedAt: addedAt,
                    updatedAt: nowIso
                };
                store.put(entry);
            };
            return out;
        }).then(function (result) {
            /* Only evict when a NEW baseId crossed the cap — upserts of
             * existing entries leave the count unchanged. */
            if (result && result.isNew) return customItemsEvictExcess().then(function () { return result.baseId; });
            return (result && result.baseId) || null;
        }).catch(function (e) {
            console.warn('[idbStorage] customItemPut failed:', e && e.message);
            return null;
        });
    }

    function customItemsEvictExcess() {
        if (!idbAvailable) return Promise.resolve(0);
        return tx(STORE_CUSTOMITEMS, 'readwrite', function (store) {
            const out = { deleted: 0 };
            const countReq = store.count();
            countReq.onsuccess = function () {
                const excess = countReq.result - MAX_CUSTOM_ITEMS;
                if (excess <= 0) return;
                let removed = 0;
                const idx = store.index('addedAt');
                idx.openCursor().onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (!cursor || removed >= excess) return;
                    cursor.delete();
                    removed++;
                    out.deleted = removed;
                    cursor.continue();
                };
            };
            return out;
        }).catch(function (e) {
            console.warn('[idbStorage] customItemsEvictExcess failed:', e && e.message);
            return 0;
        });
    }

    function customItemGet(baseId) {
        if (!idbAvailable || !baseId) return Promise.resolve(null);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_CUSTOMITEMS, 'readonly');
                const store = transaction.objectStore(STORE_CUSTOMITEMS);
                const req = store.get(String(baseId));
                req.onsuccess = function () { resolve(req.result || null); };
                req.onerror = function () { reject(req.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] customItemGet failed:', e && e.message);
            return null;
        });
    }

    /* Return all library records, newest-first by updatedAt so the Quick Add
     * palette shows the most recently edited / imported templates first. The
     * sort is done in JS because we only index addedAt (FIFO eviction key);
     * adding a second index just for sort order would double the write cost. */
    function customItemGetAll() {
        if (!idbAvailable) return Promise.resolve([]);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_CUSTOMITEMS, 'readonly');
                const store = transaction.objectStore(STORE_CUSTOMITEMS);
                const out = [];
                store.openCursor().onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (cursor) {
                        out.push(cursor.value);
                        cursor.continue();
                    }
                };
                transaction.oncomplete = function () {
                    /* String compare on ISO 8601 timestamps gives the
                     * same chronological order as numeric compare on
                     * epoch ms — ISO 8601 was specifically designed for
                     * this property. Descending (newest-first) because
                     * the Quick Add palette renders most-recently-edited
                     * templates first. */
                    out.sort(function (a, b) {
                        const au = String(a.updatedAt || '');
                        const bu = String(b.updatedAt || '');
                        if (au < bu) return 1;
                        if (au > bu) return -1;
                        return 0;
                    });
                    resolve(out);
                };
                transaction.onerror = function (ev) { reject(ev.target.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] customItemGetAll failed:', e && e.message);
            return [];
        });
    }

    /* Lightweight variant — returns just the array of customItemBaseIds, used
     * to seed the in-memory `customItemLibraryIds` cache on boot without
     * paying the cost of reading every base64 menuImage data URL. */
    function customItemGetAllIds() {
        if (!idbAvailable) return Promise.resolve([]);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_CUSTOMITEMS, 'readonly');
                const store = transaction.objectStore(STORE_CUSTOMITEMS);
                const out = [];
                /* getAllKeys is the cheap path — pulls just the primary keys
                 * (the customItemBaseId strings) without deserializing record
                 * values. Falls back to a cursor on older browsers. */
                if (typeof store.getAllKeys === 'function') {
                    const req = store.getAllKeys();
                    req.onsuccess = function () {
                        (req.result || []).forEach(function (k) { out.push(String(k)); });
                    };
                } else {
                    store.openKeyCursor().onsuccess = function (ev) {
                        const cursor = ev.target.result;
                        if (cursor) {
                            out.push(String(cursor.primaryKey));
                            cursor.continue();
                        }
                    };
                }
                transaction.oncomplete = function () { resolve(out); };
                transaction.onerror = function (ev) { reject(ev.target.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] customItemGetAllIds failed:', e && e.message);
            return [];
        });
    }

    function customItemDelete(baseId) {
        if (!idbAvailable || !baseId) return Promise.resolve(false);
        return tx(STORE_CUSTOMITEMS, 'readwrite', function (store) {
            store.delete(String(baseId));
        }).then(function () { return true; })
            .catch(function (e) {
                console.warn('[idbStorage] customItemDelete failed:', e && e.message);
                return false;
            });
    }

    function customItemHas(baseId) {
        if (!idbAvailable || !baseId) return Promise.resolve(false);
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                const transaction = db.transaction(STORE_CUSTOMITEMS, 'readonly');
                const store = transaction.objectStore(STORE_CUSTOMITEMS);
                /* count() with a key range of exactly one key returns 0 or 1
                 * without ever materializing the (potentially large)
                 * menuImage payload — much cheaper than store.get() when the
                 * caller only needs the boolean. */
                const req = store.count(IDBKeyRange.only(String(baseId)));
                req.onsuccess = function () { resolve(req.result > 0); };
                req.onerror = function () { reject(req.error); };
            });
        }).catch(function (e) {
            console.warn('[idbStorage] customItemHas failed:', e && e.message);
            return false;
        });
    }

    /* ----- Public API ------------------------------------------------------ */

    /* Hydrate the undo and redo arrays from IDB. Performs the one-time
     * legacy-localStorage migration first so the very first run that has IDB
     * available adopts whatever was in localStorage. */
    function hydrateUndoRedoFromIdb() {
        if (!idbAvailable) {
            return Promise.resolve({ undo: [], redo: [], priorHadData: false });
        }
        return migrateLegacyUndoFromLocalStorage()
            .then(function () {
                return Promise.all([
                    storeGetAllPayloads(STORE_UNDO),
                    storeGetAllPayloads(STORE_REDO)
                ]);
            })
            .then(function (results) {
                const undo = results[0] || [];
                const redo = results[1] || [];
                return { undo: undo, redo: redo, priorHadData: undo.length > 0 };
            })
            .catch(function (e) {
                console.warn('[idbStorage] hydrate failed, starting empty:', e && e.message);
                return { undo: [], redo: [], priorHadData: false };
            });
    }

    /* Wipe both stores. Used when the user explicitly chooses to start fresh. */
    function clearAllUndoRedo() {
        return Promise.all([storeClear(STORE_UNDO), storeClear(STORE_REDO)]);
    }

    window.idbStore = {
        /* Capabilities */
        isAvailable: function () { return idbAvailable; },
        ready: function () { return idbAvailable ? openDb().then(function () { return true; }, function () { return false; }) : Promise.resolve(false); },

        /* Undo / redo */
        hydrateUndoRedoFromIdb: hydrateUndoRedoFromIdb,
        undoAdd: function (payload) {
            return storeAddPayload(STORE_UNDO, payload).then(function () {
                return storeTrim(STORE_UNDO, MAX_UNDO_ENTRIES);
            });
        },
        undoPopLast: function () { return storeDeleteHighest(STORE_UNDO); },
        undoClearAll: function () { return storeClear(STORE_UNDO); },
        redoAdd: function (payload) {
            return storeAddPayload(STORE_REDO, payload).then(function () {
                return storeTrim(STORE_REDO, MAX_REDO_ENTRIES);
            });
        },
        redoPopLast: function () { return storeDeleteHighest(STORE_REDO); },
        redoClearAll: function () { return storeClear(STORE_REDO); },
        clearAllUndoRedo: clearAllUndoRedo,

        /* Background images (FIFO library, capped at MAX_BG_IMAGES) */
        bgImagesAdd: bgImagesAdd,
        bgImagesGetAll: bgImagesGetAll,
        bgImagesGetById: bgImagesGetById,
        bgImagesDelete: bgImagesDelete,
        bgImagesUpdate: bgImagesUpdate,
        bgImagesMax: function () { return MAX_BG_IMAGES; },

        /* VRC Custom Item Library (FIFO library, capped at MAX_CUSTOM_ITEMS,
         * keyed by customItemBaseId so same-baseId import upserts in place) */
        customItemPut: customItemPut,
        customItemGet: customItemGet,
        customItemGetAll: customItemGetAll,
        customItemGetAllIds: customItemGetAllIds,
        customItemDelete: customItemDelete,
        customItemHas: customItemHas,
        customItemMax: function () { return MAX_CUSTOM_ITEMS; },

        /* Exposed for tests / future tooling */
        _constants: {
            DB_NAME: DB_NAME, DB_VERSION: DB_VERSION,
            STORE_UNDO: STORE_UNDO, STORE_REDO: STORE_REDO, STORE_BG: STORE_BG,
            STORE_CUSTOMITEMS: STORE_CUSTOMITEMS,
            MAX_UNDO_ENTRIES: MAX_UNDO_ENTRIES, MAX_REDO_ENTRIES: MAX_REDO_ENTRIES,
            MAX_BG_IMAGES: MAX_BG_IMAGES, MAX_CUSTOM_ITEMS: MAX_CUSTOM_ITEMS
        }
    };

    /* Kick off the open eagerly so the upgrade transaction is done by the
     * time the rest of the app needs it. Errors are swallowed — the API
     * already gracefully degrades when IDB is unavailable. */
    if (idbAvailable) {
        openDb().catch(function (e) {
            console.warn('[idbStorage] eager open failed; persistence disabled:', e && e.message);
        });
    } else {
        console.info('[idbStorage] IndexedDB unavailable; persistence disabled');
    }

})(typeof window !== 'undefined' ? window : this);
