'use strict';

/* ==========================================================================
   document-converter/service-worker.js pattern reused here for word-counter.
   SAVE THIS FILE AT: word-counter/service-worker.js
   (same folder as word-counter/index.html — not inside assets/js/)
   Registered by a few lines at the bottom of assets/js/word-counter.js.
   ========================================================================== */

const CACHE_NAME = 'dkb-word-counter-v1';

const APP_SHELL = [
  '/word-counter/',
  '/word-counter/index.html',
  '/word-counter/manifest.json',
  '/assets/css/word-counter.css',
  '/assets/js/word-counter.js',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && APP_SHELL.includes(event.request.url)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});