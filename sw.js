/* js/version.js is the single source of truth for APP_VERSION (also read by
 * roomcalc.js on the page side). The service-worker update check byte-compares
 * the main script AND every importScripts() file against the previously
 * installed worker, so a bump to APP_VERSION alone is enough for the browser
 * to detect this as a new service worker, install it, and re-populate the
 * cache under the new CACHE_NAME below -- no separate step required. */
importScripts('./js/version.js');

const CACHE_VERSION = APP_VERSION;
const CACHE_NAME = `vrc-pwa-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  './',
  './RoomCalculator.html',
  './style.css',
  './manifest.json',
  './js/version.js',
  './js/purify.min.js',
  './js/konva.min.js',
  './js/constants.js',
  './js/roomcalc.js',
  './js/templates.js',
  './js/idbStorage.js',
  './js/undoApply.js',
  './js/colorPicker.js',
  './js/qrcode.js',
  './js/pocLoginCloud.js',
  './js/migrateLegacyItemsShape.js',
  './js/dxfWriter.js',
  './js/dxfBlockLibrary.js',
  './js/drpDownOverride.js',
  './js/pathEditor/pathEditor.js',
  './js/pathEditor/pathEditor.css',
  './js/util/units.js',
  './js/data/workspaceKey.js',
  './js/data/certifiedDisplays.js',
  './js/data/menuItemsAndMessages.js',
  './assets/momentum-icons.css',
  './assets/Inter-VariableFont.ttf',
  './assets/MomentumFontIcon.woff2',
  './assets/favicon.ico',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/Video_Camera-front.png',
  './assets/images/Video_Camera-top.png',
  './assets/images/boardPro55-front.png',
  './assets/images/boardPro55-top.png',
  './assets/images/boardPro75-front.png',
  './assets/images/boardPro75-top.png',
  './assets/images/box-front.png',
  './assets/images/brdPro55G2-front.png',
  './assets/images/brdPro55G2-top.png',
  './assets/images/brdPro55G2FS-front.png',
  './assets/images/brdPro55G2FS-top.png',
  './assets/images/brdPro75G2-front.png',
  './assets/images/brdPro75G2-top.png',
  './assets/images/brdPro75G2FS-front.png',
  './assets/images/brdPro75G2FS-top.png',
  './assets/images/brdPro75G2Wheel-top.png',
  './assets/images/cameraP60-front.png',
  './assets/images/cameraP60-top.png',
  './assets/images/ceilingFan-menu.png',
  './assets/images/ceilingFan-top.png',
  './assets/images/ceilingGrid-menu.png',
  './assets/images/ceilingMic-front.png',
  './assets/images/ceilingMic-top.png',
  './assets/images/ceilingMicPro-front.png',
  './assets/images/ceilingMicPro-top.png',
  './assets/images/ceilingSpeaker-menu.png',
  './assets/images/ceilingSpeaker-top.png',
  './assets/images/chair-front.png',
  './assets/images/chair-top.png',
  './assets/images/chairBlack-front.png',
  './assets/images/chairBlack-top.png',
  './assets/images/chairGrey-front.png',
  './assets/images/chairGrey-top.png',
  './assets/images/chairHigh-top.png',
  './assets/images/chairSit-menu.png',
  './assets/images/chairStoolRow-top.png',
  './assets/images/chairSwivel-top.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('vrc-pwa-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === '/heartbeat') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
