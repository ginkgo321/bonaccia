/* Bonaccia – service worker: tiene l’app e i suoni in memoria per usarla senza rete. */
var CACHE = 'bonaccia-v2';
var FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'js/audio.js', 'js/content.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
var NATURA = ['pioggia', 'mare', 'fiume', 'fontana', 'bosco'].map(function (n) { return 'audio/natura/natura_' + n + '.mp3'; });

/* I file audio sono pesanti: si scaricano all’installazione ma senza far fallire l’installazione. */
function precacheAudio(cache) {
  var urls = NATURA.slice();
  return fetch('audio/voce/manifest.json').then(function (r) {
    var copy = r.clone();
    return Promise.all([r.json(), cache.put('audio/voce/manifest.json', copy)]);
  }).then(function (res) {
    Object.keys(res[0].items || {}).forEach(function (k) { urls.push('audio/voce/' + k + '.mp3'); });
  }).catch(function () {}).then(function () {
    return Promise.all(urls.map(function (u) { return cache.add(u).catch(function () {}); }));
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES).then(function () { return precacheAudio(c); }); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  var isAudio = /\.mp3$/.test(url.pathname);
  if (isAudio) {
    /* audio: prima la copia salvata, poi la rete */
    e.respondWith(caches.match(req).then(function (m) {
      return m || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    }));
    return;
  }
  /* il resto: prima la rete (gli aggiornamenti arrivano), e senza rete la copia salvata */
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
    })
  );
});
