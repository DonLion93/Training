/* Service Worker: macht die App offline nutzbar. Wird beim Bauen erzeugt (build_pwa2.py), nicht von Hand ändern. */
const CACHE = "trainingswoche-1.21.0-bd93fea3";
const FONTS = "trainingswoche-fonts";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./js/backup.js",
  "./js/badges.js",
  "./js/calc.js",
  "./js/changelog.js",
  "./js/compare.js",
  "./js/core.js",
  "./js/daydrag.js",
  "./js/diag.js",
  "./js/dialog.js",
  "./js/files.js",
  "./js/fold.js",
  "./js/health.js",
  "./js/keyboard.js",
  "./js/persona.js",
  "./js/records.js",
  "./js/reminder.js",
  "./js/reorder.js",
  "./js/reports.js",
  "./js/shift.js",
  "./js/stats.js",
  "./js/store.js",
  "./js/theme.js",
  "./js/timer.js",
  "./js/views/berichte.js",
  "./js/views/einstellungen.js",
  "./js/views/plan.js",
  "./js/views/uebungen.js",
  "./js/weight.js",
  "./js/weightremind.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Eigene Dateien: aus dem Zwischenspeicher dieser Version, sonst aus dem Netz
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match("./index.html")))
    );
    return;
  }
  // Schriften von Google: einmal geladen, später auch offline da
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
