import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { mkdirSync } from 'node:fs';
const SP = os.tmpdir().split(String.fromCharCode(92)).join('/') + '/bonaccia-prove/';
mkdirSync(SP, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=9390', '--user-data-dir=' + SP + 'prof_lettore_barra_timer', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9390/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch (e) {}
  await sleep(250);
}
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = {}; const errs = [];
ws.addEventListener('message', m => {
  const d = JSON.parse(m.data);
  if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console.error: ' + d.params.args.map(a => a.value || a.description).join(' '));
  if (d.method === 'Page.javascriptDialogOpening') { errs.push('DIALOG: ' + d.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result; return r.result ? r.result.value : r; };
const shot = async name => writeFileSync(SP + name, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
const J = x => JSON.stringify(x);
const ok = (nome, cond, extra = '') => console.log((cond ? 'OK   ' : 'FALLITO ') + nome + (extra ? '  ' + extra : ''));
const info = () => ev(`({
  prog: +document.getElementById('q-prog').value, disabled: document.getElementById('q-prog').disabled,
  p: document.getElementById('q-prog').style.getPropertyValue('--p'), vt: document.getElementById('q-prog').getAttribute('aria-valuetext'),
  cur: document.getElementById('q-time-cur').textContent, dur: document.getElementById('q-time-dur').textContent,
  btn: document.getElementById('q-play-toggle').getAttribute('aria-label'), spin: !!document.querySelector('#q-play-toggle .q-spin'),
  title: document.querySelector('.q-now-title').textContent.trim(), st: Bonaccia.QuranPlayer._debugState()
})`);

try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8093/index.html#recitazioni' });
  for (let i = 0; i < 40; i++) { if (await ev("document.readyState === 'complete' && !!window.Bonaccia && !!Bonaccia.QuranPlayer && !!document.getElementById('q-prog')")) break; await sleep(250); }
  await sleep(600);

  let i0 = await info();
  ok('prima del play: barra disattivata e tempo rimanente "–:––"', i0.disabled && i0.dur === '–:––', J(i0));
  await shot('p0.png');

  // play con la Sura 55 (Minshawi)
  await ev(`document.getElementById('q-play-toggle').click()`);
  await sleep(120);
  let i1 = await info();
  ok('subito dopo il tocco: spinner di caricamento', i1.spin && /Caricamento/.test(i1.btn), J({ btn: i1.btn, spin: i1.spin }));
  await sleep(6000);
  let i2 = await info();
  ok('in riproduzione: caricamento finito, tasto Pausa', !i2.spin && i2.btn === 'Pausa' && !i2.st.loading, J(i2));
  ok('barra attiva, tempo rimanente "−m:ss"', !i2.disabled && /^−\d+:\d\d$/.test(i2.dur), 'rimanente ' + i2.dur + ', valuetext "' + i2.vt + '"');
  await shot('p1.png');

  // trascinamento: la barra non deve saltare mentre il dito è sopra
  await ev(`(() => { const e = document.getElementById('q-prog'); e.value = 50; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(2500);   // nel frattempo arrivano i timeupdate
  let i3 = await info();
  ok('durante il trascinamento la barra resta a 50', Math.abs(i3.prog - 50) < 0.2 && i3.st.scrub, J({ prog: i3.prog, cur: i3.cur, dur: i3.dur }));
  const tPrima = await ev('Math.round(document.querySelector("audio, video") ? 0 : 0)');
  await ev(`document.getElementById('q-prog').dispatchEvent(new Event('change', { bubbles: true }))`);
  await sleep(4000);
  let i4 = await info();
  ok('al rilascio l\'audio si sposta a metà', i4.prog > 49 && i4.prog < 55 && !i4.st.scrub, J({ prog: +i4.prog.toFixed(1), cur: i4.cur, dur: i4.dur }));

  // successiva e precedente
  await ev(`document.getElementById('q-next').click()`);
  await sleep(5000);
  let i5 = await info();
  ok('successiva: passa a 56', i5.st.surah === 56 && /Al-Wāqi|Waqi/i.test(i5.title) , J({ surah: i5.st.surah, title: i5.title, playing: i5.st.playing }));
  await sleep(7000);   // oltre i 5 s dall'inizio
  await ev(`document.getElementById('q-prev').click()`);
  await sleep(1500);
  let i6 = await info();
  ok('precedente (oltre 5 s dall\'inizio): riparte la stessa Sura', i6.st.surah === 56, J({ surah: i6.st.surah, cur: i6.cur }));
  await ev(`document.getElementById('q-prev').click()`);   // subito: entro 5 s dall'inizio
  await sleep(4000);
  let i7 = await info();
  ok('precedente (entro 5 s): torna a 55', i7.st.surah === 55, J({ surah: i7.st.surah, cur: i7.cur, playing: i7.st.playing }));

  // timer di spegnimento con dissolvenza
  await ev(`Bonaccia.QuranPlayer._debugSleep(16)`);
  await sleep(6000);
  let g1 = await ev(`+Bonaccia.Engine.vgain.gain.value.toFixed(3)`);
  console.log('     a ~10 s dalla fine, guadagno =', g1, ' etichetta:', await ev(`document.getElementById('q-sleep-left').textContent`));
  await sleep(5000);
  let g2 = await ev(`+Bonaccia.Engine.vgain.gain.value.toFixed(3)`);
  ok('dissolvenza in corso: il guadagno scende', g2 < g1 * 0.7 && g2 > 0, 'prima ' + g1 + ' poi ' + g2);
  await sleep(7000);
  let i8 = await info();
  ok('timer scaduto: in pausa e timer azzerato', !i8.st.playing && i8.st.sleepMin === 0, J(i8.st));
  // ripartenza: il guadagno deve tornare normale
  await ev(`document.getElementById('q-play-toggle').click()`);
  await sleep(4000);
  let g3 = await ev(`+Bonaccia.Engine.vgain.gain.value.toFixed(3)`);
  ok('dopo il timer, riavviando, il livello è tornato normale', g3 > 0.2, 'guadagno ' + g3);

  // fine Sura -> successiva
  await ev(`(() => { const e = document.getElementById('q-end-select'); e.value = 'next'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await ev(`(() => { const e = document.getElementById('q-prog'); e.value = 99.7; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(14000);
  let i9 = await info();
  ok('a fine Sura con «Passa alla successiva»: passa dalla 55 alla 56', i9.st.surah === 56 && i9.st.playing, J({ surah: i9.st.surah, playing: i9.st.playing, loading: i9.st.loading }));
  await shot('p2.png');
  await ev(`document.getElementById('q-play-toggle').click()`);
  await sleep(800);
  console.log('ERRORI:', J(errs));
} finally { ws.close(); chrome.kill(); }
process.exit(0);
