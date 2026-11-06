import { avvia, sleep, J } from './harness.mjs';
const b = await avvia(9367, { profilo: 'prof_offline', pulisci: false, extra: ['--host-resolver-rules=MAP cdn.mp3quran.net ~NOTFOUND'] });
const { ev, vai, prova, T } = b;
await vai('#recitazioni', { attesa: "window.Bonaccia && Bonaccia.QuranPlayer && document.getElementById('q-prog')" });
const dbg = () => ev('Bonaccia.QuranPlayer._debug()');
const st = () => ev('Bonaccia.QuranPlayer._debugState()');
prova('app caricata senza rete (server spento)', (await ev(`!!document.getElementById('q-prog')`)) === true, J(T.errs));
await ev(`document.querySelector('[data-reciter=afasy]').click()`); await sleep(400);
// Sura salvata
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="108"]').click()`);
await sleep(4000);
let s = await st(), d = await dbg();
prova('Sura salvata (108): parte senza rete', s.playing && !s.loading, J({ s, d }));
const t1 = await ev(`document.getElementById('q-time-cur').textContent`);
await sleep(2000);
const t2 = await ev(`document.getElementById('q-time-cur').textContent`);
prova('il tempo avanza', t1 !== t2, t1 + ' → ' + t2);
console.log('     durata/rimanente:', await ev(`document.getElementById('q-time-dur').textContent`), ' elemento:', d.audioEl, ' routedFailed:', d.routedFailed);
// seek (richiede risposte Range dal service worker)
await ev(`(() => { const e = document.getElementById('q-prog'); e.value = 60; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await sleep(1500);
const pr = await ev(`+document.getElementById('q-prog').value`);
prova('seek a 60 % con la Sura salvata', pr > 55 && pr < 80, 'posizione ' + pr.toFixed(1) + ' %');
await sleep(9000);
s = await st();
prova('a fine Sura si ferma', !s.playing, J(s));
// Sura non salvata: errore gestito, niente stato bloccato
T.dialoghi.length = 0;
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="12"]').click()`);
await sleep(5000);
s = await st(); d = await dbg();
prova('Sura non salvata: avviso mostrato', T.dialoghi.some(x => /Non è stato possibile/.test(x)), J(T.dialoghi));
prova('Sura non salvata: nessuno stato bloccato (né play né spinner)', !s.playing && !s.loading, J(s));
console.log('     dopo l\'errore di rete: routedFailed =', d.routedFailed, ' elemento =', d.audioEl);
prova('un errore di rete NON disattiva per sempre i livelli (routedFailed resta false)', d.routedFailed === false);
// la Sura salvata riparte ancora, con i livelli
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="108"]').click()`);
await sleep(4000);
s = await st(); d = await dbg();
prova('dopo l\'errore la Sura salvata riparte e usa ancora i livelli', s.playing && d.audioEl === 'routed', J({ s, d }));
// suoni della natura e voce guida da cache
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(500);
await ev(`location.hash = '#suoni'`); await sleep(600);
const r = await ev(`(async () => { const E = Bonaccia.Engine, p = Bonaccia.Content.presets.find(x => x.id === 'pioggia'); E.setLayers(p.layers); E.setMaster(0.6); E.start(0.2);
  await new Promise(r => setTimeout(r, 4000)); const an = E.analyser, buf = new Float32Array(an.fftSize); let s = 0, n = 0; const t0 = performance.now();
  while (performance.now() - t0 < 1500) { an.getFloatTimeDomainData(buf); for (const v of buf) s += v * v; n += buf.length; await new Promise(r => setTimeout(r, 40)); }
  return { real: E.realStatus('rain'), rms: 10 * Math.log10(s / n + 1e-12) }; })()`);
prova('pioggia registrata (da cache) suona senza rete', r.real === 'ready' && r.rms > -60, J(r));
const man = await ev(`fetch('audio/voce/manifest.json').then(r => r.ok ? r.json().then(j => Object.keys(j.items || {}).length) : 'HTTP ' + r.status)`);
prova('voce guida: manifest disponibile senza rete', man > 50, 'voci: ' + man);
const mp3 = await ev(`fetch('audio/voce/spalle_01.mp3').then(r => r.status + ' ' + r.headers.get('content-type'))`);
prova('un file della voce guida si legge dalla cache', /^200/.test(mp3), mp3);
console.log('errori JS:', J(T.errs.filter(e => !/Failed to load resource|net::ERR/.test(e))));
b.chiudi(); process.exit(0);
