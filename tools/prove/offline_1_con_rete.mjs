import { avvia, sleep, J } from './harness.mjs';
const b = await avvia(9366, { profilo: 'prof_offline', pulisci: true });
const { ev, vai, prova, T } = b;
await vai('#recitazioni', { attesa: "window.Bonaccia && Bonaccia.QuranPlayer && document.getElementById('q-prog')" });
// attesa del service worker e della cache
let n = 0;
for (let i = 0; i < 80; i++) {
  n = await ev(`(async () => { const ks = await caches.keys(); let m = 0; for (const k of ks) { if (k.indexOf('bonaccia-v') === 0 && k.indexOf('recitazioni') < 0) m = Math.max(m, (await (await caches.open(k)).keys()).length); } return m; })()`);
  if (n >= 90) break; await sleep(500);
}
prova('service worker installato e cache piena (≥ 90 file)', n >= 90, 'file in cache: ' + n);
// Afasy, Sura 108, salvataggio offline
await ev(`document.querySelector('[data-reciter=afasy]').click()`); await sleep(400);
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="108"]').click()`); await sleep(4000);
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(600);
await ev(`document.getElementById('q-more').open = true`);
await ev(`document.getElementById('q-offline-btn').click()`);
for (let i = 0; i < 40; i++) { if (/Salvato/.test(await ev(`document.getElementById('q-offline-btn').textContent`))) break; await sleep(500); }
const salv = await ev(`caches.open('bonaccia-recitazioni-v1').then(c => c.keys()).then(k => k.map(r => r.url))`);
prova('Afasy 108 salvata offline', salv.length === 1 && /108\.mp3/.test(salv[0]), J(salv));
console.log('dialoghi:', J(T.dialoghi), ' errori:', J(T.errs));
b.chiudi(); process.exit(0);
