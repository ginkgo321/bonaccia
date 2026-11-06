import { avvia, sleep, J } from './harness.mjs';
const b = await avvia(9361);
const { ev, vai, ricarica, prova, T } = b;
const VISTE = ['ora', 'suoni', 'calma', 'sonno', 'diario', 'capire', 'recitazioni'];
const casi = {
  'impostazioni recitazioni: tipi sbagliati': { 'bonaccia.quran_settings': '{"reciter":"zzz","surah":999,"bgPreset":"x","bgRel":"abc","endMode":"boom","leveling":"yes"}' },
  'recitazioni: Sura come testo e voce con selezione': { 'bonaccia.quran_settings': '{"reciter":"afasy","surah":"36","bgRel":-500}' },
  'recitazioni: voce con nome di proprietà JS': { 'bonaccia.quran_settings': '{"reciter":"constructor","surah":55}' },
  'recitazioni: JSON rotto': { 'bonaccia.quran_settings': '{{{non json' },
  'recitazioni: Sura negativa': { 'bonaccia.quran_settings': '{"reciter":"salimi","surah":-3,"bgRel":99}' },
  'impostazioni app: valori assurdi': { 'bonaccia.settings': '{"master":"abc","layers":{"noise":5,"rain":null},"current":"inesistente","sl":null,"br":"x","mixes":"x","zone":"x","theme":"viola","src":"boh","timerMin":"molti"}' },
  'impostazioni app: non è un oggetto': { 'bonaccia.settings': '42' },
  'impostazioni app: JSON rotto': { 'bonaccia.settings': '{{{' },
  'diario, controlli e preoccupazioni corrotti': { 'bonaccia.diary': '{"a":1}', 'bonaccia.checks': '[1,2]', 'bonaccia.worries': '"testo"' },
  'diario con voci incomplete': { 'bonaccia.diary': '[{"ts":"non una data"},{},null,{"ts":"2026-11-05T10:00:00Z","loud":"x","ann":99,"str":-4}]' },
};
await vai('#ora');
for (const [nome, chiavi] of Object.entries(casi)) {
  await ev(`localStorage.clear(); const k = ${J(chiavi)}; for (const x in k) localStorage.setItem(x, k[x]);`);
  T.errs.length = 0; T.dialoghi.length = 0;
  await ricarica('#ora');
  const problemi = [];
  for (const v of VISTE) {
    await ev(`location.hash = '#${v}'`); await sleep(500);
    const r = await ev(`({ vista: [...document.querySelectorAll('.view')].filter(e => !e.hidden).map(e => e.id).join(), vuota: document.querySelector('.view:not([hidden])').innerText.trim().length < 20 })`);
    if (r.vista !== 'v-' + v) problemi.push(`${v}: vista ${r.vista}`);
    if (r.vuota) problemi.push(`${v}: vista vuota`);
  }
  // stato delle recitazioni dopo il caricamento
  await ev(`location.hash = '#recitazioni'`); await sleep(500);
  const q = await ev(`(() => { const s = Bonaccia.QuranPlayer._debugState(); const d = Bonaccia.QuranPlayer._debug(); return { surah: s.surah, endMode: s.endMode, titolo: document.querySelector('.q-now-title') && document.querySelector('.q-now-title').textContent.trim(), voce: document.querySelector('[data-reciter].on') && document.querySelector('[data-reciter].on').dataset.reciter, bg: document.getElementById('q-bg-select') && document.getElementById('q-bg-select').value, master: d.master, gain: d.gain, relMin: document.getElementById('q-bg-rel') && document.getElementById('q-bg-rel').value }; })()`);
  const ammesse = q.voce === 'afasy' ? [1, 12, 19, 31, 93, 94, 95, 108, 112, 113, 114] : null;
  if (!(q.surah >= 1 && q.surah <= 114 && Number.isInteger(q.surah))) problemi.push('Sura non valida ' + q.surah);
  if (ammesse && !ammesse.includes(q.surah)) problemi.push('Sura protetta selezionata: ' + q.surah);
  if (!q.voce) problemi.push('nessuna voce evidenziata');
  if (!['stop', 'next', 'repeat'].includes(q.endMode)) problemi.push('endMode ' + q.endMode);
  if (!(q.master > 0 && q.master <= 1)) problemi.push('master ' + q.master);
  if (T.errs.length) problemi.push('errori JS: ' + T.errs.slice(0, 3).join(' | '));
  prova(nome, problemi.length === 0, problemi.join(' ; ') + ' ' + J(q));
}
b.chiudi(); process.exit(0);
