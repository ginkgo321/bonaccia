import { avvia, sleep, J } from './harness.mjs';
const b = await avvia(9361);
const { ev, vai, ricarica, prova, T } = b;
const VISTE = ['ora', 'suoni', 'calma', 'sonno', 'diario', 'capire'];
const casi = {
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
  if (T.errs.length) problemi.push('errori JS: ' + T.errs.slice(0, 3).join(' | '));
  prova(nome, problemi.length === 0, problemi.join(' ; '));
}
b.chiudi(); process.exit(0);
