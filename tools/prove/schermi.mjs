import { avvia, sleep, J } from './harness.mjs';
const VISTE = ['ora', 'suoni', 'calma', 'sonno', 'diario', 'capire'];
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
  if (w === 320 || w === 1280) await shot(`vp_${w}.png`);
  tot++; if (T.errs.length) { ko++; console.log('  ERRORI JS:', J(T.errs)); }
  b.chiudi();
}
console.log(`\nTOTALE ${tot - ko}/${tot} ok`);
process.exit(0);
