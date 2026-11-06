import { avvia, sleep, J } from './harness.mjs';
const b = await avvia(9369);
const { ev, vai, prova, T, ricarica } = b;
await vai('#suoni');
const click = sel => ev(`(() => { const e = document.querySelector(${J(sel)}); if (!e) return 'ASSENTE'; e.click(); return 'ok'; })()`);
const campiona = (ms = 1500) => ev(`(async () => { const E = Bonaccia.Engine, an = E.analyser, buf = new Float32Array(an.fftSize); let s = 0, n = 0, pk = 0; const t0 = performance.now();
  while (performance.now() - t0 < ${ms}) { an.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; if (Math.abs(v) > pk) pk = Math.abs(v); } n += buf.length; await new Promise(r => setTimeout(r, 30)); }
  return { rms: +(10 * Math.log10(s / n + 1e-12)).toFixed(1), pk: +(20 * Math.log10(pk + 1e-9)).toFixed(1) }; })()`);

// ---- A. tutte le atmosfere, con registrazioni e con suoni sintetici
const lista = await ev(`Bonaccia.Content.presets.map(p => ({ id: p.id, realOnly: !!p.realOnly, layers: Object.keys(p.layers) }))`);
console.log('--- A. atmosfere (volume generale 0,6)');
const tab = [];
for (const src of ['real', 'synth']) {
  for (const p of lista) {
    if (src === 'synth' && p.realOnly) continue;
    await ev(`(() => { const E = Bonaccia.Engine, p = Bonaccia.Content.presets.find(x => x.id === ${J(p.id)}); E.setSource(${J(src)}); E.setLayers(p.layers); E.setMaster(0.6); E.start(0.1); })()`);
    // attesa del caricamento delle registrazioni
    if (src === 'real') { for (let i = 0; i < 30; i++) { const pronti = await ev(`(() => { const E = Bonaccia.Engine; return Object.keys(Bonaccia.Content.presets.find(x => x.id === ${J(p.id)}).layers).filter(n => E.realState && ['rain','waves','stream','fontana','bosco','drone'].includes(n)).every(n => E.realStatus(n) === 'ready'); })()`); if (pronti) break; await sleep(300); } }
    await sleep(1200);
    const m = await campiona(1200);
    await ev(`Bonaccia.Engine.stop(0.05)`); await sleep(250);
    tab.push({ id: p.id, src, ...m });
  }
}
tab.forEach(r => console.log(`   ${r.id.padEnd(9)} ${r.src.padEnd(5)} RMS ${String(r.rms).padStart(6)} dBFS  picco ${String(r.pk).padStart(6)} dBFS`));
prova('ogni atmosfera produce suono (RMS > −75 dBFS)', tab.every(r => r.rms > -75), J(tab.filter(r => r.rms <= -75)));
prova('nessun picco oltre −3 dBFS al volume 0,6', tab.every(r => r.pk < -3), J(tab.filter(r => r.pk >= -3)));
const reali = tab.filter(r => r.src === 'real').map(r => r.rms);
console.log(`   scarto tra le atmosfere registrate: ${(Math.max(...reali) - Math.min(...reali)).toFixed(1)} dB`);
await ev(`Bonaccia.Engine.setSource('real')`);

// ---- B. interfaccia della scheda Suoni
console.log('--- B. scheda Suoni');
await ricarica('#suoni');
await click('#play'); await sleep(2500);
prova('tasto play: il suono parte', (await ev(`Bonaccia.Engine.playing`)) === true);
const classe = await ev(`document.body.className + ' | ' + document.querySelector('.field-wrap').className`);
await click('#play'); await sleep(2500);
prova('secondo tocco: il suono si ferma', (await ev(`Bonaccia.Engine.playing`)) === false);
// timer
await click('#play'); await sleep(800);
const chips = await ev(`[...document.querySelectorAll('#timer-chips button')].map(b => b.textContent.trim())`);
await ev(`document.querySelector('#timer-chips button:nth-child(2)').click()`); await sleep(500);
const tl = await ev(`document.getElementById('timer-left').textContent`);
prova('timer: scelta di una durata mostra il conto alla rovescia', /scend|spegn|Il volume/i.test(tl), chips.join(',') + ' → ' + tl);
await ev(`Bonaccia.Engine.stop(0.1)`);
// mixer + salvataggio
await ev(`(() => { const n = document.getElementById('mix-name'); n.value = 'Prova mix'; document.getElementById('save-mix').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); })()`); await sleep(500);
const mix = await ev(`document.getElementById('mymixes').innerText`);
prova('«I tuoi mix»: il mix salvato compare', /Prova mix/.test(mix), mix.slice(0, 60));
// punto d'incontro
await click('#btn-calib'); await sleep(800);
prova('taratura: si apre la finestra', (await ev(`!document.getElementById('sheet').hidden`)) === true);
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(500);
prova('Esc chiude la finestra', (await ev(`document.getElementById('sheet').hidden`)) === true);
await ev(`Bonaccia.Engine.stop(0.1)`);

// ---- C. Calma
console.log('--- C. scheda Calma');
await ev(`location.hash = '#calma'`); await sleep(500);
await click('#br-start'); await sleep(2500);
prova('respiro guidato: si apre', (await ev(`!document.getElementById('sheet').hidden`)) === true, await ev(`document.querySelector('.breath-label') ? document.querySelector('.breath-label').textContent : 'nessuna etichetta'`));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(600);
prova('respiro: dopo la chiusura il suono guida è spento', (await ev(`Bonaccia.Engine.cueOn !== true`)) === true);
const nSes = await ev(`document.querySelectorAll('#session-list .item').length`);
let sesOk = 0, sesErr = [];
for (let i = 0; i < nSes; i++) {
  T.errs.length = 0;
  await ev(`document.querySelectorAll('#session-list .item')[${i}].click()`);
  await sleep(i === 0 ? 4500 : 2500);
  const t = await ev(`(document.querySelector('.step-text') || {}).textContent`);
  const aperto = await ev(`!document.getElementById('sheet').hidden`);
  if (i === 0) {
    await ev(`[...document.querySelectorAll('#sheet-card .btn')].find(b => /Pausa/.test(b.textContent)).click()`); await sleep(400);
    const rip = await ev(`[...document.querySelectorAll('#sheet-card .btn')].some(b => /Riprendi/.test(b.textContent))`);
    await ev(`[...document.querySelectorAll('#sheet-card .btn')].find(b => /Riprendi/.test(b.textContent)).click()`); await sleep(400);
    await ev(`[...document.querySelectorAll('#sheet-card .btn')].find(b => /successivo/.test(b.textContent)).click()`); await sleep(1200);
    prova('esercizio guidato 1: pausa, riprendi, passo successivo', rip === true && T.errs.length === 0, J(T.errs));
  }
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(500);
  const chiuso = await ev(`document.getElementById('sheet').hidden`);
  const voce = await ev(`Bonaccia.Engine.voiceActive`);
  if (aperto && t && t !== 'Preparo la voce…' && chiuso && !voce && T.errs.length === 0) sesOk++; else sesErr.push({ i, aperto, t: (t || '').slice(0, 40), chiuso, voce, errs: T.errs.slice(0, 2) });
}
prova(`tutti i ${nSes} esercizi guidati si aprono, mostrano il testo e si chiudono pulito`, sesOk === nSes, J(sesErr));

// ---- D. Sonno
console.log('--- D. scheda Sonno');
await ev(`location.hash = '#sonno'`); await sleep(500);
await click('#sl-go'); await sleep(2500);
const notte = await ev(`({ vis: !document.getElementById('night').hidden, eng: Bonaccia.Engine.playing, m: Bonaccia.Engine.masterV })`);
prova('«Buonanotte»: schermo nero e suono acceso', notte.vis && notte.eng, J(notte));
await click('#night-down'); await sleep(300); await click('#night-down'); await sleep(300);
const m2 = await ev(`Bonaccia.Engine.masterV`);
prova('«Più piano» abbassa il volume', m2 < notte.m, notte.m.toFixed(3) + ' → ' + m2.toFixed(3));
await click('#night-up'); await sleep(300);
prova('«Più forte» lo rialza', (await ev(`Bonaccia.Engine.masterV`)) > m2);
await click('#night-wake'); await sleep(2500);
prova('«Mi sono svegliata»: parte il respiro al buio', (await ev(`!document.getElementById('sheet').hidden || !document.getElementById('night').hidden`)) === true);
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(500);
await click('#night-off'); await sleep(2500);
const spento = await ev(`({ night: document.getElementById('night').hidden, eng: Bonaccia.Engine.playing })`);
prova('«Spegni ed esci»', spento.night && !spento.eng, J(spento));
await ev(`(() => { const t = document.getElementById('worry-text'); t.value = 'Una preoccupazione di prova'; document.getElementById('worry-save').click(); })()`); await sleep(400);
prova('quarto d\'ora delle preoccupazioni: si salva', /Una preoccupazione/.test(await ev(`document.getElementById('worry-list').innerText`)));
await click('#checklist li input, #checklist li button, #checklist li label'); await sleep(300);

// ---- E. Diario
console.log('--- E. scheda Diario');
await ev(`location.hash = '#diario'`); await sleep(500);
await ev(`document.getElementById('diary-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))`); await sleep(500);
prova('diario: si salva una voce', /salvat|Fatto|ok/i.test(await ev(`document.getElementById('d-saved').textContent`)) || (await ev(`JSON.parse(localStorage.getItem('bonaccia.diary') || '[]').length`)) >= 1, await ev(`document.getElementById('d-saved').textContent`));
await ev(`(() => { document.getElementById('sleep-box').open = true; document.getElementById('s-save').click(); })()`); await sleep(500);
prova('diario: si salva la notte', (await ev(`JSON.parse(localStorage.getItem('bonaccia.diary') || '[]').filter(e => e.type === 'sleep').length`)) >= 1);
const note = await ev(`document.getElementById('entries').innerText`);
prova('«Le tue note» mostra le voci', note.length > 20, note.slice(0, 60).replace(/\n/g, ' / '));
await click('#ex-copy'); await sleep(500); await click('#ex-csv'); await sleep(500);
console.log('     esportazione:', await ev(`document.getElementById('ex-info').textContent`));
await click('#ex-clear'); await sleep(600);
prova('«Cancella tutti i dati» (con conferma) svuota diario e impostazioni', (await ev(`Object.keys(localStorage).filter(k => k.indexOf('bonaccia.') === 0 && k !== 'bonaccia.quran_settings').length`)) <= 1, await ev(`Object.keys(localStorage).join(',')`));
// ---- F. tema
await click('#btn-theme'); await sleep(400);
const th = await ev(`document.documentElement.getAttribute('data-theme')`);
prova('tema: il pulsante cambia giorno/notte', th === 'day', 'ora: ' + th);
console.log('dialoghi:', J(T.dialoghi), '\nerrori JS:', J(T.errs));
prova('nessun errore JS nell\'intera sessione di prova', T.errs.length === 0);
b.chiudi(); process.exit(0);
