/* Bonaccia – service worker: tiene l’app e i suoni in memoria per usarla senza rete. */
var CACHE = 'bonaccia-v7';
var QURAN_CACHE = 'bonaccia-recitazioni-v1';
var FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'js/version.js', 'js/audio.js', 'js/content.js', 'js/recitazioni_data.js', 'js/recitazioni_livelli.js', 'js/recitazioni.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
var NATURA = ['pioggia', 'mare', 'fiume', 'fontana', 'bosco', 'drone'].map(function (n) { return 'audio/natura/natura_' + n + '.mp3'; });

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
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== QURAN_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

async function rispostaAudioCdn(req) {
  var cache = await caches.open(QURAN_CACHE);
  var hit = await cache.match(req.url);
  if (!hit) return fetch(req);
  var buf = await hit.arrayBuffer();
  var range = req.headers.get('range');
  var tipo = hit.headers.get('content-type') || 'audio/mpeg';
  if (!range) return new Response(buf, { status: 200, headers: { 'Content-Type': tipo, 'Content-Length': buf.byteLength, 'Accept-Ranges': 'bytes' } });
  var m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  var tot = buf.byteLength;
  var inizio, fine;
  if (!m[1] && m[2]) { inizio = Math.max(0, tot - parseInt(m[2], 10)); fine = tot - 1; }
  else { inizio = m[1] ? parseInt(m[1], 10) : 0; fine = m[2] ? Math.min(parseInt(m[2], 10), tot - 1) : tot - 1; }
  if (inizio >= tot || inizio > fine) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + tot } });
  return new Response(buf.slice(inizio, fine + 1), {
    status: 206,
    headers: {
      'Content-Type': tipo,
      'Content-Length': fine - inizio + 1,
      'Content-Range': 'bytes ' + inizio + '-' + fine + '/' + tot,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Audio esterno MP3Quran (streaming CDN o salvato selettivamente offline)
  if (url.hostname.indexOf('mp3quran.net') >= 0) {
    e.respondWith(rispostaAudioCdn(req));
    return;
  }

  if (url.origin !== location.origin) return;

  var isAudio = /\.mp3$/.test(url.pathname);
  if (isAudio) {
    /* audio locale di Bonaccia: prima la copia salvata, poi la rete */
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
