import { avvia, sleep, J } from './harness.mjs';
const VISTE = ['ora', 'suoni', 'calma', 'sonno', 'diario', 'capire', 'recitazioni'];
const SIZES = [[320, 568, true], [360, 640, true], [390, 844, true], [768, 1024, false], [1280, 800, false]];
let tot = 0, ko = 0;
for (const [w, h, mobile] of SIZES) {
  const b = await avvia(9380 + w % 100, { w, h, mobile, tema: 'dark' });
  const { ev, vai, prova, T, shot } = b;
  await vai('#ora');
  console.log(`=== ${w}×${h}`);
  for (const v of VISTE) {
    await ev(`location.hash = '#${v}'`); await sleep(700);
    const r = await ev(`(() => {
      const out = { ov: document.documentElement.scrollWidth - window.innerWidth, fuori: [] };
      const vw = window.innerWidth;
      document.querySelectorAll('.view:not([hidden]) *').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.canvas, canvas') && !e.closest('[hidden]')) out.fuori.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + Math.round(r.left) + '…' + Math.round(r.right));
      });
      return out;
    })()`);
    const p = [];
    if (r.ov > 1) p.push('scorrimento orizzontale +' + r.ov);
    if (r.fuori.length) p.push('elementi fuori schermo: ' + r.fuori.slice(0, 4).join(' ; '));
    tot++; if (p.length) ko++;
    console.log(`  ${v.padEnd(12)} ${p.length ? 'PROBLEMI: ' + p.join(' | ') : 'ok'}`);
  }
  // lettore delle recitazioni: tutto dentro la scheda
  await ev(`location.hash = '#recitazioni'`); await sleep(700);
  const g = await ev(`(() => {
    const card = document.getElementById('q-player-box').getBoundingClientRect();
    const dentro = [...document.querySelectorAll('#q-player-box .q-controls > *, #q-player-box .q-opts-row select, #q-player-box .q-time-row, #q-player-box .q-timeline')].map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || e.className || e.tagName), fuori: r.right > card.right - 1 || r.left < card.left + 1 }; });
    const ctrl = document.querySelector('.q-controls');
    return { cardW: Math.round(card.width), ctrlW: Math.round(ctrl.scrollWidth), ctrlClientW: Math.round(ctrl.clientWidth), tasti: [...ctrl.children].map(c => Math.round(c.getBoundingClientRect().width)), fuori: dentro.filter(d => d.fuori).map(d => d.n) };
  })()`);
  tot++;
  const okc = g.fuori.length === 0 && g.ctrlW <= g.ctrlClientW + 1;
  if (!okc) ko++;
  console.log(`  lettore: scheda ${g.cardW}px, comandi ${g.ctrlW}/${g.ctrlClientW}px, tasti ${g.tasti.join('+')}  ${okc ? 'ok' : 'PROBLEMA: fuori dalla scheda: ' + g.fuori}`);
  // lettore fisso sopra la barra delle schede
  await ev(`window.scrollTo(0, 1400)`); await sleep(600);
  const dk = await ev(`(() => { const d = document.getElementById('q-dock'), t = document.getElementById('tabs'); const a = d.getBoundingClientRect(), c = t.getBoundingClientRect(); return { visibile: d.classList.contains('show'), dockBasso: Math.round(a.bottom), tabsAlto: Math.round(c.top), larg: Math.round(a.width), titolo: Math.round(document.getElementById('q-dock-title').getBoundingClientRect().width) }; })()`);
  tot++;
  const okd = dk.visibile && dk.dockBasso <= dk.tabsAlto && dk.titolo >= 60;
  if (!okd) ko++;
  console.log(`  lettore fisso: ${J(dk)} ${okd ? 'ok' : 'PROBLEMA'}`);
  if (w === 320 || w === 1280) await shot(`vp_${w}.png`);
  tot++; if (T.errs.length) { ko++; console.log('  ERRORI JS:', J(T.errs)); }
  b.chiudi();
}
console.log(`\nTOTALE ${tot - ko}/${tot} ok`);
process.exit(0);
