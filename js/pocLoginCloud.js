/* Video Room Calculator — Webex Cloud Storage Proof of Concept
 * ================================================================
 *
 * This file is a PROOF OF CONCEPT (hence the "poc" in the filename).
 * It demonstrates using the Webex Messaging API as ad-hoc cloud
 * storage for VRC room files. NOT for production.
 *
 * The entire flow is gated behind the URL query flag `?testLogin=1` so
 * casual users never see it. When that flag is present this module:
 *
 *   1. Reveals a small "Login" button to the left of the 3D View
 *      button in the header.
 *   2. On click, opens a dialog that accepts a Webex Personal Access
 *      Token (PoC shortcut — no OAuth round-trip).
 *   3. Lazy-loads the Webex JS SDK from CONFIG.sdkUrl (UMD bundle
 *      from unpkg). The SDK is only fetched when the user is actually
 *      signing in, never on page load — and never at all without
 *      `?testLogin=1`.
 *   4. Initializes the SDK with the PAT, waits for the SDK's 'ready'
 *      event, then replaces the "Login" button with the user's Webex
 *      avatar. Clicking the avatar opens the dialog defined in
 *      RoomCalculator.html (id="dialogPocLoginCloud").
 *   5. Finds or creates a group space called "Video Room Calc Rooms"
 *      and uses it as the storage backend.
 *   6. Saves the current roomObj as a `.vrc.json` file-attached
 *      message and keeps a `RoomMap.json` index attached to the most
 *      recent index message in the same space.
 *   7. Lists previously saved rooms in the modal and loads them via
 *      the existing routeUploadedFileText() importer.
 *
 * Why the SDK instead of raw fetch():
 *   webexapis.com refuses direct browser fetch() — its preflight
 *   responds with HTTP 401 and no `Access-Control-Allow-Origin`
 *   header, blocking any cross-origin request that needs to send an
 *   `Authorization` header. /v1/people/me, /v1/rooms, /v1/messages,
 *   /v1/contents/* — all of them. The SDK has its own transport
 *   (and handles E2EE for group spaces via the internal-plugin-
 *   encryption module), so every Webex call goes through it.
 *
 * Configuration:
 *   - PoC default: the Login button opens a small dialog asking for a
 *     Webex Personal Access Token grabbed manually from
 *     developer.webex.com. No Integration / Client ID needed; the
 *     token is good for 12 hours.
 *   - Production-shape: swap the Login-button click handler in init()
 *     from `openPatLoginDialog` back to `startWebexLogin` (paste a
 *     Webex Integration Client ID into CONFIG.clientId and register
 *     the page URL as a Redirect URI in the developer portal). The
 *     OAuth implicit-flow code below is left intact for that path —
 *     the access token it returns plugs into the same SDK pipeline.
 *
 * Security:
 *   - The OAuth `state` (for the parked OAuth path) is a CSPRNG UUID
 *     stored in sessionStorage and verified on return, then deleted.
 *     Mismatches abort the login.
 *   - The OAuth response (if used) is stripped from the URL via
 *     history.replaceState before any other code can observe it.
 *   - Tokens live in localStorage scoped by CONFIG.storagePrefix. A
 *     401/403 from any SDK call clears the token and forces a fresh
 *     login.
 *   - All user-supplied / Webex-supplied strings rendered into the
 *     DOM go through textContent or DOMPurify.sanitize() — no
 *     innerHTML with untrusted data.
 *
 * Intentional limitations:
 *   - No refresh token. When the token expires (12h for a PAT, ~14d
 *     for OAuth implicit) the user has to sign in again.
 *   - "Latest message wins" for RoomMap.json. Older index messages
 *     are left in the space as an audit trail.
 *   - No conflict resolution. Concurrent edits from two browsers will
 *     each post their own RoomMap.json; the later one wins.
 *   - No ACLs / sharing — anyone with access to the space sees all
 *     rooms saved there.
 */

(function () {
    'use strict';

    const VRC = window.VRC || (window.VRC = {});
    const C = (VRC.constants || {});

    const CONFIG = {
        /* PoC OAuth Client ID. Paste a Webex Integration's Client ID
         * here. The Integration needs the scopes listed in oauthScopes
         * below and a Redirect URI matching window.location.origin +
         * window.location.pathname. Public identifier — not a secret. */
        clientId: '',

        oauthAuthorizeUrl: C.WEBEX_OAUTH_AUTHORIZE_URL || 'https://webexapis.com/v1/authorize',
        apiBase: C.WEBEX_API_BASE || 'https://webexapis.com/v1',

        /* UMD bundle for the Webex JS SDK. Lazy-loaded on first
         * sign-in attempt (never at page load) via the global
         * loadScriptOnce() helper exported by roomcalc.js. */
        sdkUrl: C.WEBEX_SDK_URL || 'https://unpkg.com/webex@3/umd/webex.min.js',

        /* Hydra (REST API gateway) URL override. SDK default is
         * https://api.ciscospark.com/v1 which has NO CORS — see
         * the long-form rationale on C.WEBEX_HYDRA_URL in
         * js/constants.js. */
        hydraUrl: C.WEBEX_HYDRA_URL || 'https://hydra-a.wbx2.com/v1',

        spaceTitle: C.WEBEX_SPACE_TITLE || 'Video Room Calc Rooms',
        roomMapFileName: C.WEBEX_ROOMMAP_FILENAME || 'RoomMap.json',

        storagePrefix: C.WEBEX_OAUTH_STORAGE_PREFIX || 'vrc_poc_webex',

        /* Minimal scopes needed by the PoC. spark:kms is required by
         * Webex for E2EE spaces (matches the wxsd-sales reference). */
        oauthScopes: [
            'spark:people_read',
            'spark:rooms_read',
            'spark:rooms_write',
            'spark:messages_read',
            'spark:messages_write',
            'spark:kms',
        ],
    };

    const STATE = {
        enabled: false,
        token: null,
        tokenExpiresAt: 0,
        me: null,
        spaceId: null,
        roomMap: {},
        roomMapMessageId: null,
        bootstrapInFlight: false,
        lastSaveAt: null,

        /* Webex JS SDK instance + ready flag. Reset on signOut and
         * on any 401/403 from an SDK call. */
        webex: null,
        sdkReady: false,
    };

    /* ------------------------------------------------------------------
     * Storage helpers (localStorage / sessionStorage, prefix-scoped)
     * ---------------------------------------------------------------- */

    function storageKey(name) {
        return `${CONFIG.storagePrefix}_${name}`;
    }

    function saveCredentials(token, expiresAt) {
        try {
            localStorage.setItem(storageKey('access_token'), token);
            localStorage.setItem(storageKey('expires_at'), String(expiresAt || ''));
        } catch (_) { /* best-effort */ }
    }

    function loadCredentials() {
        try {
            const token = localStorage.getItem(storageKey('access_token'));
            if (!token) return null;
            const expiresAt = Number(localStorage.getItem(storageKey('expires_at')) || 0);
            if (expiresAt && Date.now() > expiresAt) {
                clearCredentials();
                return null;
            }
            return { token, expiresAt };
        } catch (_) { return null; }
    }

    function clearCredentials() {
        try {
            localStorage.removeItem(storageKey('access_token'));
            localStorage.removeItem(storageKey('expires_at'));
            sessionStorage.removeItem(storageKey('state'));
        } catch (_) { /* ignore */ }
    }

    /* ------------------------------------------------------------------
     * OAuth implicit-grant flow
     * ---------------------------------------------------------------- */

    function getCreateUuid() {
        return (VRC.util && VRC.util.createUuid)
            ? VRC.util.createUuid
            : () => (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    }

    function startWebexLogin() {
        if (!CONFIG.clientId) {
            alert(
                'Webex Cloud PoC is not configured.\n\n' +
                'Open js/pocLoginCloud.js and paste your Webex Integration\n' +
                "Client ID into CONFIG.clientId."
            );
            return;
        }

        const stateValue = getCreateUuid()();
        try { sessionStorage.setItem(storageKey('state'), stateValue); } catch (_) {}

        const redirectUri = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            client_id: CONFIG.clientId,
            response_type: 'token',
            redirect_uri: redirectUri,
            scope: CONFIG.oauthScopes.join(' '),
            state: stateValue,
        });

        window.location.assign(`${CONFIG.oauthAuthorizeUrl}?${params.toString()}`);
    }

    /* ------------------------------------------------------------------
     * Personal Access Token entry (PoC shortcut — skips OAuth entirely)
     * ---------------------------------------------------------------- */

    function openPatLoginDialog() {
        const dlg = document.getElementById('dialogPocCloudPat');
        if (!dlg) return;
        const input = document.getElementById('pocCloudPatInput');
        const err = document.getElementById('pocCloudPatError');
        if (input) input.value = '';
        if (err) err.textContent = '';
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
        if (input) {
            setTimeout(() => input.focus(), 0);
            input.onkeydown = (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    submitPatFromDialog();
                }
            };
        }
    }

    function setPatError(msg) {
        const err = document.getElementById('pocCloudPatError');
        if (err) err.textContent = msg || '';
    }

    function submitPatFromDialog() {
        const input = document.getElementById('pocCloudPatInput');
        const raw = (input && input.value) || '';
        const token = raw.trim();
        if (!token) {
            setPatError('Please paste a token.');
            return;
        }
        /* Webex Personal Access Tokens are opaque, base64-ish strings well
         * above 40 chars. Reject very short input as an obvious typo. */
        if (token.length < 20) {
            setPatError('That does not look like a Webex Personal Access Token.');
            return;
        }
        signInWithPersonalAccessToken(token);
    }

    function signInWithPersonalAccessToken(token) {
        /* 12 hours is the documented Personal Access Token lifetime.
         * We don't actually know when this specific token was issued
         * so pick the worst case; safeSdkCall() will clear the token
         * on the next 401/403 if it actually expires sooner. */
        const expiresAt = Date.now() + 12 * 3600 * 1000;
        STATE.token = token;
        STATE.tokenExpiresAt = expiresAt;
        saveCredentials(token, expiresAt);

        /* Close the PAT dialog (if open) and reflect the logged-in
         * state in the header. */
        const patDlg = document.getElementById('dialogPocCloudPat');
        if (patDlg && typeof patDlg.close === 'function') {
            try { patDlg.close(); } catch (_) { /* ignore */ }
        }
        setPatError('');

        renderHeader();
        /* Open the main cloud modal IMMEDIATELY so the user sees
         * progress while the Webex SDK lazy-loads (≈600 KB) and
         * boots. renderModalContent() reads STATE.bootstrapInFlight
         * / STATE.sdkReady / STATE.me / STATE.spaceId to show a
         * staged status line that ticks forward as each step
         * completes. */
        openModal();
        bootstrapAfterLogin().catch((e) => {
            console.error('[pocLoginCloud] Sign-in failed:', e);
            alert(`Sign-in failed: ${e.message || e}`);
            signOut();
        });
    }

    /* ------------------------------------------------------------------
     * OAuth implicit-flow helpers (parked — not wired to a button in
     * the PoC PAT shortcut path, but kept intact so flipping back to
     * full OAuth is a one-line change in init()).
     * ---------------------------------------------------------------- */

    /* Parse #access_token=... from the URL fragment after the OAuth
     * provider redirects back. Returns { token, expiresAt } on success
     * (and cleans the URL); null otherwise. */
    function consumeOAuthRedirect() {
        const hash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1) : window.location.hash;
        if (!hash || hash.indexOf('access_token=') === -1) return null;

        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        if (!accessToken) return null;

        const returnedState = hashParams.get('state');
        let expectedState = null;
        try { expectedState = sessionStorage.getItem(storageKey('state')); } catch (_) {}
        try { sessionStorage.removeItem(storageKey('state')); } catch (_) {}

        cleanOAuthUrl();

        if (!returnedState || !expectedState || returnedState !== expectedState) {
            console.warn('[pocLoginCloud] OAuth state mismatch; aborting login.');
            return null;
        }

        const expiresIn = Number(hashParams.get('expires_in'));
        const expiresAt = Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000;

        return { token: accessToken, expiresAt };
    }

    function cleanOAuthUrl() {
        try {
            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState({}, document.title, url.toString());
        } catch (_) { /* ignore */ }
    }

    async function signOut() {
        const token = STATE.token;
        STATE.token = null;
        STATE.tokenExpiresAt = 0;
        STATE.me = null;
        STATE.spaceId = null;
        STATE.roomMap = {};
        STATE.roomMapMessageId = null;
        /* Drop the SDK client so the next sign-in cleanly re-inits
         * with the new token. Leaving the prior instance around
         * would resurface the stale token via the SDK's internal
         * credentials store. */
        STATE.webex = null;
        STATE.sdkReady = false;
        clearCredentials();

        /* idbroker.webex.com IS CORS-friendly for the token-revoke
         * call (unlike webexapis.com), so a raw fetch() works here
         * and we don't need to round-trip through the SDK. */
        if (token) {
            try {
                await fetch('https://idbroker.webex.com/idb/oauth2/v1/tokens/me?authtoken=true', {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (e) {
                console.warn('[pocLoginCloud] Token revoke failed (non-fatal):', e);
            }
        }

        closeModal();
        renderHeader();
    }

    /* ------------------------------------------------------------------
     * Webex JS SDK (lazy-loaded only on first sign-in)
     * ---------------------------------------------------------------- */

    /* Inject the Webex SDK <script> tag the first time we need it.
     * Idempotent: roomcalc.js's loadScriptOnce() caches the load
     * promise so repeat calls are free. */
    async function ensureSdkLoaded() {
        if (window.Webex && typeof window.Webex.init === 'function') return;
        if (typeof window.loadScriptOnce !== 'function') {
            throw new Error('loadScriptOnce() not available — roomcalc.js must load before pocLoginCloud.js.');
        }
        await window.loadScriptOnce(CONFIG.sdkUrl);
        if (!window.Webex || typeof window.Webex.init !== 'function') {
            throw new Error('Webex SDK loaded but window.Webex.init is unavailable.');
        }
    }

    /* Build (or return the cached) Webex SDK client bound to the
     * current PAT/OAuth token. Waits for the 'ready' event before
     * resolving so any caller can assume the SDK is fully booted. */
    async function getWebexClient() {
        if (STATE.webex && STATE.sdkReady) return STATE.webex;
        if (!STATE.token) throw new Error('Not signed in (no access token).');

        await ensureSdkLoaded();

        if (!STATE.webex) {
            /* CRITICAL: route hydra requests through the CORS-friendly
             * internal host. The SDK default is
             * https://api.ciscospark.com/v1 which returns 401 on the
             * CORS preflight with no Access-Control-Allow-Origin
             * header — every webex.people / webex.rooms /
             * webex.messages call fails as "statusCode: undefined"
             * (i.e. fetch threw at the CORS gate) without this
             * override. hydra-a.wbx2.com/v1 is the same API behind
             * a host that echoes the page origin. */
            STATE.webex = window.Webex.init({
                credentials: { access_token: STATE.token },
                config: {
                    services: {
                        discovery: {
                            hydra: CONFIG.hydraUrl,
                        },
                    },
                },
            });
        }

        /* Some SDK versions resolve canAuthorize synchronously right
         * after init(); others fire 'ready' asynchronously once the
         * encryption / device / mercury plugins have registered. */
        if (STATE.sdkReady || STATE.webex.canAuthorize === true) {
            STATE.sdkReady = true;
            return STATE.webex;
        }

        await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (err) => {
                if (settled) return;
                settled = true;
                if (err) reject(err); else resolve();
            };
            const timer = setTimeout(
                () => finish(new Error('Webex SDK did not become ready within 30s.')),
                30000
            );
            try {
                STATE.webex.once('ready', () => { clearTimeout(timer); finish(); });
                STATE.webex.once('error', (err) => { clearTimeout(timer); finish(err); });
            } catch (e) {
                clearTimeout(timer);
                finish(e);
            }
        });

        STATE.sdkReady = true;
        return STATE.webex;
    }

    /* SDK errors carry status info on `.statusCode` or
     * `.response.statusCode`. Treat 401/403 as "token bad" — the
     * documented Webex contract for a revoked / expired PAT. */
    function isAuthError(err) {
        if (!err) return false;
        const code = err.statusCode
            || (err.response && err.response.statusCode);
        if (code === 401 || code === 403) return true;
        const msg = String(err.message || err);
        return /\b401\b|unauthori[sz]ed|invalid[ _]token|access[ _]token/i.test(msg);
    }

    /* Wrap an SDK call so that an auth failure scrubs the token and
     * surfaces a friendly error. Other errors propagate verbatim so
     * callers can decide how to render them. */
    async function safeSdkCall(fn) {
        try {
            return await fn();
        } catch (e) {
            if (isAuthError(e)) {
                console.warn('[pocLoginCloud] Auth error from Webex SDK — clearing token.', e);
                STATE.token = null;
                STATE.tokenExpiresAt = 0;
                STATE.webex = null;
                STATE.sdkReady = false;
                clearCredentials();
                renderHeader();
                throw new Error('Webex session expired. Please sign in again.');
            }
            throw e;
        }
    }

    /* ------------------------------------------------------------------
     * Webex helpers (SDK-backed)
     * ---------------------------------------------------------------- */

    async function getMe() {
        const wbx = await getWebexClient();
        return safeSdkCall(() => wbx.people.get('me'));
    }

    async function findOrCreateSpace() {
        const wbx = await getWebexClient();
        const list = await safeSdkCall(() => wbx.rooms.list({
            type: 'group',
            max: 500,
            sortBy: 'lastactivity',
        }));
        const items = (list && list.items) || [];
        const match = items.find(r => r.title === CONFIG.spaceTitle);
        if (match) return match;
        return safeSdkCall(() => wbx.rooms.create({ title: CONFIG.spaceTitle }));
    }

    /* Rewrite a Webex content URL from the public alias host
     * (webexapis.com / api.ciscospark.com — both reject CORS
     * preflights from arbitrary origins) to the CORS-friendly
     * internal hydra host. /v1/contents/{id} is identical at both
     * hosts; hydra handles decryption server-side and returns the
     * cleartext bytes directly. */
    function rewriteToInternalHydra(uri) {
        if (typeof uri !== 'string') return uri;
        return uri.replace(
            /^https:\/\/(api\.ciscospark\.com|webexapis\.com)(\/|$)/,
            'https://hydra-a.wbx2.com$2'
        );
    }

    /* Download a Webex content-service file URI (as found in
     * `message.files[]`) and return the bytes as a UTF-8 string.
     *
     * We deliberately bypass `webex.internal.encryption.download()`
     * here. That helper's 3.x signature is `download({scr, fileUrl})`
     * — it needs the per-file Secure Content Reference (encryption
     * key + IV) which the hydra-shaped `message.files` array does
     * NOT carry (the SDK strips SCRs when projecting activities
     * down to the public message shape).
     *
     * Hydra's `/v1/contents/{id}` endpoint does the decryption
     * server-side and just returns the cleartext bytes, so a plain
     * authenticated GET to hydra-a.wbx2.com is all we need. The
     * rewrite above makes sure we hit the CORS-friendly host
     * regardless of which alias host the SDK echoed back in the
     * message payload. */
    async function downloadAttachmentText(fileUri) {
        if (!STATE.token) throw new Error('Not signed in.');
        const url = rewriteToInternalHydra(fileUri);
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${STATE.token}` },
        });
        if (res.status === 401 || res.status === 403) {
            console.warn('[pocLoginCloud] Auth error on file download — clearing token.');
            STATE.token = null;
            STATE.tokenExpiresAt = 0;
            STATE.webex = null;
            STATE.sdkReady = false;
            clearCredentials();
            renderHeader();
            throw new Error('Webex session expired. Please sign in again.');
        }
        if (!res.ok) {
            let detail = '';
            try { detail = await res.text(); } catch (_) { /* ignore */ }
            throw new Error(`Attachment download failed: ${res.status} ${detail || res.statusText}`);
        }
        return res.text();
    }

    /* Walk the most recent messages in the storage space looking for
     * an attachment named RoomMap.json. Returns { messageId, map } or
     * { messageId: null, map: {} } if the space is empty / has none. */
    async function fetchLatestRoomMap(spaceId) {
        const wbx = await getWebexClient();
        const data = await safeSdkCall(() => wbx.messages.list({
            roomId: spaceId,
            max: 100,
        }));
        const items = (data && data.items) || [];
        const wantedMarker = `[VRC] ${CONFIG.roomMapFileName}`;
        for (const msg of items) {
            if (!msg.files || msg.files.length === 0) continue;
            const looksLikeMap = (typeof msg.text === 'string' && msg.text.indexOf(wantedMarker) === 0);
            if (!looksLikeMap) continue;
            try {
                const text = await downloadAttachmentText(msg.files[0]);
                const map = JSON.parse(text);
                return { messageId: msg.id, map: (map && typeof map === 'object') ? map : {} };
            } catch (e) {
                console.warn('[pocLoginCloud] Could not parse a RoomMap.json candidate:', e);
            }
        }
        return { messageId: null, map: {} };
    }

    /* Post a message with a single file attachment via the SDK. The
     * SDK takes care of the multipart upload, the per-space
     * encryption key handshake, and the resulting message hydration. */
    async function postMessageWithFile(spaceId, text, fileName, content, mimeType) {
        const wbx = await getWebexClient();
        const mime = mimeType || 'application/octet-stream';
        /* Prefer File over Blob so the SDK has a filename to send in
         * the multipart Content-Disposition header. File is supported
         * in every modern browser; fall back to Blob in oddball
         * environments. */
        let attachment;
        if (typeof window.File === 'function') {
            attachment = new window.File([content], fileName, { type: mime });
        } else {
            attachment = new Blob([content], { type: mime });
            attachment.name = fileName;
        }

        return safeSdkCall(() => wbx.messages.create({
            roomId: spaceId,
            text,
            files: [attachment],
        }));
    }

    /* ------------------------------------------------------------------
     * Save / Load
     * ---------------------------------------------------------------- */

    function buildVrcJsonPayload() {
        if (!VRC.roomFile || typeof VRC.roomFile.buildRoomObjJsonPayload !== 'function') {
            throw new Error('VRC.roomFile.buildRoomObjJsonPayload not available (roomcalc.js not loaded yet)');
        }
        return VRC.roomFile.buildRoomObjJsonPayload();
    }

    async function saveCurrentRoomToWebex() {
        if (!STATE.token || !STATE.spaceId) {
            setSaveStatus('Not connected to Webex.', 'error');
            return;
        }
        setSaveStatus('Saving…', 'info');
        try {
            const payload = buildVrcJsonPayload();
            const roomName = payload.roomName || 'Untitled Room';
            const roomId = payload.roomId || ('noid-' + Date.now());

            const text = `[VRC] ${roomName}`;
            const created = await postMessageWithFile(
                STATE.spaceId,
                text,
                payload.fileName,
                payload.content,
                'application/json'
            );

            STATE.roomMap[roomId] = {
                name: roomName,
                messageId: created.id,
                fileName: payload.fileName,
                updatedAt: new Date().toISOString(),
                version: (window.roomObj && window.roomObj.version) || '',
                authorEmail: (STATE.me && STATE.me.emails && STATE.me.emails[0]) || '',
            };

            const mapJson = JSON.stringify(STATE.roomMap, null, 2);
            const mapMsg = await postMessageWithFile(
                STATE.spaceId,
                `[VRC] ${CONFIG.roomMapFileName}`,
                CONFIG.roomMapFileName,
                mapJson,
                'application/json'
            );
            STATE.roomMapMessageId = mapMsg.id;
            STATE.lastSaveAt = new Date();

            setSaveStatus(`Saved "${roomName}" at ${formatTime(STATE.lastSaveAt)}.`, 'ok');
            renderRoomsList();
        } catch (e) {
            console.error('[pocLoginCloud] Save failed:', e);
            setSaveStatus(`Save failed: ${e.message || e}`, 'error');
        }
    }

    async function loadRoomFromMessage(messageId) {
        if (!STATE.token) return;
        try {
            const wbx = await getWebexClient();
            const msg = await safeSdkCall(() => wbx.messages.get(messageId));
            if (!msg.files || !msg.files.length) {
                alert('That saved room has no file attachment.');
                return;
            }
            const text = await downloadAttachmentText(msg.files[0]);

            const entry = Object.values(STATE.roomMap)
                .find(e => e && e.messageId === messageId);
            const fileName = (entry && entry.fileName) || 'webex.vrc.json';

            if (typeof window.routeUploadedFileText === 'function') {
                window.routeUploadedFileText(text, fileName);
            } else {
                alert('VRC importer not ready. Please reload the page and try again.');
                return;
            }
            closeModal();
        } catch (e) {
            console.error('[pocLoginCloud] Load failed:', e);
            alert(`Load failed: ${e.message || e}`);
        }
    }

    /* Remove a room from RoomMap.json and re-post the updated index.
     *
     * Scope mirrors the user request ("remove it from the RoomMap.json
     * file"): we drop the entry from the in-memory map and push a
     * fresh RoomMap.json. The original room's `.vrc.json` attachment
     * MESSAGE is intentionally NOT deleted from the Webex space —
     * keeping it preserves the existing audit-trail pattern (older
     * RoomMap messages are also retained, see file header comment)
     * and avoids the Webex API's "can only delete your own messages"
     * 403 trap when a teammate originally saved the room.
     *
     * Optimistic UI: the entry is removed locally and the list
     * re-rendered BEFORE the network round-trip so the click feels
     * snappy. If the upload fails we restore the entry and re-render
     * so the row reappears. */
    async function deleteRoomFromMap(roomId) {
        if (!STATE.token || !STATE.spaceId) {
            setSaveStatus('Not connected to Webex.', 'error');
            return;
        }
        const entry = STATE.roomMap && STATE.roomMap[roomId];
        if (!entry) return;

        const label = entry.name || '(unnamed)';
        const confirmed = window.confirm(
            `Remove "${label}" from this Webex space's RoomMap?\n\n` +
            'The underlying saved-room message is kept in the space ' +
            'as an audit trail; only the index entry is removed.'
        );
        if (!confirmed) return;

        /* Snapshot for rollback before the optimistic delete. */
        const previousEntry = entry;
        delete STATE.roomMap[roomId];
        renderRoomsList();
        setSaveStatus(`Removing "${label}"…`, 'info');

        try {
            const mapJson = JSON.stringify(STATE.roomMap, null, 2);
            const mapMsg = await postMessageWithFile(
                STATE.spaceId,
                `[VRC] ${CONFIG.roomMapFileName}`,
                CONFIG.roomMapFileName,
                mapJson,
                'application/json'
            );
            STATE.roomMapMessageId = mapMsg.id;
            setSaveStatus(`Removed "${label}".`, 'ok');
        } catch (e) {
            console.error('[pocLoginCloud] Delete failed:', e);
            STATE.roomMap[roomId] = previousEntry;
            renderRoomsList();
            setSaveStatus(`Delete failed: ${e.message || e}`, 'error');
        }
    }

    /* ------------------------------------------------------------------
     * UI: header (Login button / avatar button)
     * ---------------------------------------------------------------- */

    function renderHeader() {
        if (!STATE.enabled) return;
        const btnLogin = document.getElementById('btnPocCloudLogin');
        const btnAvatar = document.getElementById('btnPocCloudAvatar');
        const imgAvatar = document.getElementById('pocCloudAvatarImg');
        if (!btnLogin || !btnAvatar) return;

        if (STATE.token) {
            btnLogin.style.display = 'none';
            btnAvatar.style.display = '';
            if (imgAvatar && STATE.me && STATE.me.avatar) {
                imgAvatar.src = STATE.me.avatar;
            } else if (imgAvatar) {
                imgAvatar.removeAttribute('src');
            }
        } else {
            btnAvatar.style.display = 'none';
            btnLogin.style.display = '';
        }
    }

    /* ------------------------------------------------------------------
     * UI: modal
     * ---------------------------------------------------------------- */

    function openModal() {
        const dlg = document.getElementById('dialogPocLoginCloud');
        if (!dlg) return;
        renderModalContent();
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', '');
    }

    function closeModal() {
        const dlg = document.getElementById('dialogPocLoginCloud');
        if (!dlg) return;
        if (typeof dlg.close === 'function') {
            try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); }
        } else {
            dlg.removeAttribute('open');
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value == null ? '' : String(value);
    }

    function setSaveStatus(message, kind) {
        const el = document.getElementById('pocCloudSaveStatus');
        if (!el) return;
        el.textContent = message || '';
        el.style.color = kind === 'error' ? '#b00'
            : kind === 'ok' ? '#0a7a0a'
                : '#555';
    }

    function renderModalContent() {
        if (STATE.me) {
            setText('pocCloudUserName', STATE.me.displayName || STATE.me.nickName || '');
            setText('pocCloudUserEmail', (STATE.me.emails && STATE.me.emails[0]) || '');
            const avatar = document.getElementById('pocCloudUserAvatar');
            if (avatar) {
                if (STATE.me.avatar) avatar.src = STATE.me.avatar;
                else avatar.removeAttribute('src');
            }
        } else if (STATE.bootstrapInFlight) {
            setText('pocCloudUserName', 'Signing in…');
            setText('pocCloudUserEmail', '');
        } else {
            setText('pocCloudUserName', 'Not signed in');
            setText('pocCloudUserEmail', '');
        }

        const titleEl = document.getElementById('pocCloudSpaceTitle');
        const metaEl = document.getElementById('pocCloudSpaceMeta');
        if (titleEl) titleEl.textContent = CONFIG.spaceTitle;
        if (metaEl) {
            /* Staged status: SDK load -> SDK ready -> profile fetched
             * -> space resolved. Each branch is mutually exclusive
             * and reads from STATE so a single renderModalContent()
             * call always lands on the right line. */
            if (STATE.spaceId) {
                metaEl.textContent = `Space ready · id ${STATE.spaceId.slice(0, 12)}…`;
            } else if (STATE.bootstrapInFlight && !STATE.sdkReady) {
                metaEl.textContent = 'Loading Webex SDK…';
            } else if (STATE.bootstrapInFlight && !STATE.me) {
                metaEl.textContent = 'Initializing Webex session…';
            } else if (STATE.bootstrapInFlight) {
                metaEl.textContent = 'Connecting to Webex space…';
            } else {
                metaEl.textContent = 'Not connected';
            }
        }

        setSaveStatus(
            STATE.lastSaveAt ? `Last saved at ${formatTime(STATE.lastSaveAt)}.` : '',
            'info'
        );

        renderRoomsList();
    }

    function renderRoomsList() {
        const list = document.getElementById('pocCloudRoomsList');
        if (!list) return;
        while (list.firstChild) list.removeChild(list.firstChild);

        const entries = Object.entries(STATE.roomMap || {})
            .map(([roomId, e]) => ({ roomId, ...e }))
            .filter(e => e && e.messageId)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.id = 'pocCloudRoomsEmpty';
            empty.className = 'pocCloudRoomsEmpty';
            empty.textContent = STATE.spaceId
                ? 'No rooms saved to this space yet.'
                : 'Loading…';
            list.appendChild(empty);
            return;
        }

        for (const e of entries) {
            const row = document.createElement('div');
            row.className = 'pocCloudRoomRow';

            const info = document.createElement('div');
            info.className = 'pocCloudRoomInfo';

            const name = document.createElement('div');
            name.className = 'pocCloudRoomName';
            name.textContent = e.name || '(unnamed)';
            info.appendChild(name);

            const meta = document.createElement('div');
            meta.className = 'pocCloudRoomMeta';
            const when = e.updatedAt ? formatRelative(new Date(e.updatedAt)) : '';
            const who = e.authorEmail || '';
            meta.textContent = [when, who].filter(Boolean).join(' · ');
            info.appendChild(meta);

            row.appendChild(info);

            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.className = 'button dropDownBtnWhite pocCloudLoadBtn';
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', () => {
                loadRoomFromMessage(e.messageId);
            });
            row.appendChild(loadBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'button dropDownBtnWhite pocCloudDeleteBtn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.title = `Remove "${e.name || '(unnamed)'}" from RoomMap.json`;
            deleteBtn.addEventListener('click', () => {
                deleteRoomFromMap(e.roomId);
            });
            row.appendChild(deleteBtn);

            list.appendChild(row);
        }
    }

    /* ------------------------------------------------------------------
     * Misc helpers
     * ---------------------------------------------------------------- */

    function formatTime(d) {
        if (!d) return '';
        try { return d.toLocaleTimeString(); } catch (_) { return d.toISOString(); }
    }

    function formatRelative(d) {
        if (!d || isNaN(d.getTime())) return '';
        const diffMs = Date.now() - d.getTime();
        const sec = Math.round(diffMs / 1000);
        if (sec < 60) return `${sec}s ago`;
        const min = Math.round(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.round(min / 60);
        if (hr < 24) return `${hr}h ago`;
        const day = Math.round(hr / 24);
        if (day < 30) return `${day}d ago`;
        try { return d.toLocaleDateString(); } catch (_) { return d.toISOString().slice(0, 10); }
    }

    /* ------------------------------------------------------------------
     * Bootstrap
     * ---------------------------------------------------------------- */

    async function bootstrapAfterLogin() {
        if (STATE.bootstrapInFlight) return;
        STATE.bootstrapInFlight = true;
        renderModalContent();
        try {
            /* Step 1: ensure SDK is loaded and 'ready' fired. */
            await getWebexClient();
            renderModalContent();

            /* Step 2: profile (drives header avatar + modal identity). */
            STATE.me = await getMe();
            renderHeader();
            renderModalContent();

            /* Step 3: find or create the storage space. */
            const space = await findOrCreateSpace();
            STATE.spaceId = space.id;
            renderModalContent();

            /* Step 4: latest RoomMap.json (drives the rooms list). */
            const { messageId, map } = await fetchLatestRoomMap(STATE.spaceId);
            STATE.roomMapMessageId = messageId;
            STATE.roomMap = map || {};
            renderHeader();
            renderModalContent();
        } catch (e) {
            console.error('[pocLoginCloud] Bootstrap failed:', e);
            /* Propagate so the caller (signInWithPersonalAccessToken)
             * can alert + signOut. Without rethrow the user would
             * see "Signing in…" forever after a token failure. */
            throw e;
        } finally {
            STATE.bootstrapInFlight = false;
            renderModalContent();
        }
    }

    /* The `?testLogin=1` URL flag is sticky: once seen on any page
     * load it gets latched into localStorage so future loads of this
     * same origin behave as if `?testLogin=1` were always present.
     * `?testLogin=0` (or any other explicit value) clears the latch.
     * Absent URL flag => use the latched value, if any. */
    function readTestLoginEnabled(urlParams) {
        const qsName = C.QS_TEST_LOGIN || 'testLogin';
        const latchKey = storageKey('test_login_enabled');
        const urlValue = urlParams.get(qsName);

        if (urlValue === '1') {
            try { localStorage.setItem(latchKey, '1'); } catch (_) { /* best-effort */ }
            return true;
        }
        if (urlValue !== null) {
            /* Any explicit non-"1" value (most usefully "0") clears
             * the latch. This is the documented kill switch. */
            try { localStorage.removeItem(latchKey); } catch (_) { /* ignore */ }
            return false;
        }
        try {
            return localStorage.getItem(latchKey) === '1';
        } catch (_) {
            return false;
        }
    }

    function init() {
        let urlParams;
        try { urlParams = new URLSearchParams(window.location.search); }
        catch (_) { return; }

        if (!readTestLoginEnabled(urlParams)) {
            return;
        }
        STATE.enabled = true;

        const redirect = consumeOAuthRedirect();
        if (redirect && redirect.token) {
            STATE.token = redirect.token;
            STATE.tokenExpiresAt = redirect.expiresAt;
            saveCredentials(redirect.token, redirect.expiresAt);
        } else {
            const stored = loadCredentials();
            if (stored) {
                STATE.token = stored.token;
                STATE.tokenExpiresAt = stored.expiresAt;
            }
        }

        const btnLogin = document.getElementById('btnPocCloudLogin');
        const btnAvatar = document.getElementById('btnPocCloudAvatar');
        /* PoC PAT shortcut: open the token-entry dialog instead of
         * redirecting to Webex OAuth. To restore the OAuth flow,
         * swap `openPatLoginDialog` for `startWebexLogin` here. */
        if (btnLogin) btnLogin.addEventListener('click', openPatLoginDialog);
        if (btnAvatar) btnAvatar.addEventListener('click', openModal);

        renderHeader();

        if (STATE.token) {
            /* Cached token from a prior session. Re-bootstrap quietly
             * (no modal pop): a dead token will be scrubbed by
             * safeSdkCall() and the header reverts to the Login
             * button via renderHeader() inside signOut paths. */
            bootstrapAfterLogin().catch((e) => {
                console.warn('[pocLoginCloud] Cached-token bootstrap failed:', e);
            });
        }
    }

    /* ------------------------------------------------------------------
     * Public surface
     * ---------------------------------------------------------------- */

    VRC.pocLoginCloud = {
        /* PoC PAT shortcut (current default). */
        openPatLoginDialog,
        submitPatFromDialog,
        signInWithPersonalAccessToken,

        /* Full OAuth implicit flow (parked). */
        startWebexLogin,

        signOut,
        saveCurrentRoomToWebex,
        loadRoomFromMessage,
        deleteRoomFromMap,
        openModal,
        closeModal,
        _state: STATE,
        _config: CONFIG,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
