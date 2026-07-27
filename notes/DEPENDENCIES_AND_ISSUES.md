# External Dependencies & Common Issues

A short reference for runtime third-party dependencies and a quick
troubleshooting cheat sheet.

This file is a **lazy-loaded reference** — it is intentionally NOT in
the always-applied workspace rules. Open it on demand when adding a
new dependency or diagnosing a reported runtime issue.

---

## Third-party Dependencies

**There are no CDN dependencies.** Every third-party library is
vendored into `js/` and served from the same origin:

| File | Library | Loaded |
|------|---------|--------|
| `js/konva.min.js` | Konva.js | eager, `<script>` in `RoomCalculator.html` |
| `js/purify.min.js` | DOMPurify 3.0.6 | eager, `<script>` in `RoomCalculator.html` (first script in `<head>`) |

DOMPurify was previously pulled from
`cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js`. It is
now local, so it works offline, is covered by the service worker
precache (`js/purify.min.js` is in `PRECACHE_ASSETS`), and cannot be
affected by a third-party CDN outage or compromise. Upgrading it means
replacing the file, not editing a URL.

There is **no**
build step — every JS file under `js/` is loaded directly from disk.
The eager-loaded `<script>` order is `version.js` → `konva.min.js` →
`constants.js` → `data/workspaceKey.js` → `data/certifiedDisplays.js` →
`data/menuItemsAndMessages.js` → `util/units.js` → `undoApply.js` →
`idbStorage.js` → `templates.js` → `roomcalc.js`. Lazy-loaded modules
(`qrcode.js`, `drpDownOverride.js`, `dxfWriter.js`, `dxfBlockLibrary.js`,
`migrateLegacyItemsShape.js`) are pulled in on demand by
`loadScriptOnce()`.

## PWA / Service Worker caching

`sw.js` is a **cache-first** service worker (checks `caches.match()`
before ever touching the network) that precaches `RoomCalculator.html`,
every eager `js/` file, and the core assets. Its cache name is
`vrc-pwa-${CACHE_VERSION}`, where `CACHE_VERSION` is
`APP_VERSION + '-' + BUILD_VERSION` (the `-` suffix omitted when
`BUILD_VERSION` is empty), both read from `js/version.js` via
`importScripts()` at the top of `sw.js`.

**`js/version.js` is the single source of truth for the app version.**
It carries TWO constants: `APP_VERSION` (the user-visible version) and
`BUILD_VERSION` (a free-form build tag — bump it INSTEAD of
`APP_VERSION` for small pushes that shouldn't change the visible
version number; empty string = no build). Changing EITHER one forces
clients to update. `roomcalc.js`'s `const version = APP_VERSION;`
(line 1) reads the version on the page side and logs
`[VRC] <version> build <build>` to the console at boot so you can
check which build a client is actually running; `sw.js` reads the same
file via `importScripts()`. Bumping either string in `js/version.js`
is therefore the ONLY step required to
get users off a stale cached build — no separate "remember to also
edit `sw.js`" step, because the browser's service-worker update check
does a byte-for-byte comparison of the SW's main script **plus every
file it pulls in via `importScripts()`**, so a changed `version.js`
alone is picked up as a new service worker on the next check (page
load, `registration.update()` call, or the browser's background
~24h check). The new worker's `activate` handler deletes every old
`vrc-pwa-*` cache, so stale entries never accumulate.

Before this fix (`CACHE_VERSION` was a hardcoded `'v1'` that no commit
ever bumped since PWA support was added), the browser had **no signal
that anything changed** on ordinary app deploys — editing
`roomcalc.js` alone doesn't touch `sw.js`'s bytes, so the SW update
check never fires, and the cache-first fetch handler serves the
original install-time copy of every precached file indefinitely. This
is also why `Ctrl+Shift+R` doesn't fix it: hard-reload bypasses the
*browser's* HTTP cache, but a page's requests are still intercepted by
its *active* service worker regardless of how the reload was
triggered, and a cache-first worker answers from its own cache without
ever asking the network.

**If you land a change and still see old behavior while testing**, the
version bump normally handles it, but the reliable manual fallback is
DevTools → Application → **Storage** → **Clear site data** (or,
narrower: Application → Service Workers → Unregister, then Application
→ Cache Storage → delete the `vrc-pwa-*` entry, then reload).

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Canvas not rendering | Check browser console for Konva errors |
| Images not loading | Verify paths in `assets/images/` |
| URL too long | Room has too many objects (>500), use JSON file instead |
| Workspace Designer export fails | Check `workspaceKey` mapping exists |
| App shows stale JS after a deploy | Bump `js/version.js`'s `APP_VERSION` (or just `BUILD_VERSION` to keep the visible version number). If it's already current, see "PWA / Service Worker caching" above for the manual cache-clear fallback |
