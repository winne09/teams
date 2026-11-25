// Teams-Generator – Offline-Speicher (Service Worker)
// Legt nur die App-Dateien auf dem Gerät ab. Die Namen liegen getrennt im
// Browser-Speicher des Geräts und werden nie übertragen.
// Bei jeder Änderung an der App: CACHE-Version erhöhen.
const CACHE = 'teams-v2.3';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
// Texterkennung für „Namen aus Foto“ (ca. 9 MB): wird beim ersten Start im Hintergrund
// mitgeladen, damit sie auch in der Halle ohne Internet funktioniert.
const OCR_FILES = [
  './ocr/tesseract.min.js',
  './ocr/worker.min.js',
  './ocr/tesseract-core-lstm.wasm.js',
  './ocr/tesseract-core-simd-lstm.wasm.js',
  './ocr/deu.traineddata.gz'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).then(() => c.addAll(OCR_FILES).catch(() => {}))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('teams-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Speicher (startet sofort, auch ohne WLAN),
// im Hintergrund still nach einer neuen Version schauen.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const key = isPage ? './index.html' : req;
      const hit = await cache.match(key, { ignoreSearch: true });
      const update = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic' && !res.redirected) cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(update); return hit; }
      const res = await update;
      return res || new Response('Offline – bitte einmal mit Internet öffnen.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});
