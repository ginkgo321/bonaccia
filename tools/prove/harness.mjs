// Banco di prova condiviso: avvia Chrome senza finestra, espone ev(), errori JS, rete e dialoghi.
// Serve il sito su http://127.0.0.1:8093 (python -m http.server 8093 --bind 127.0.0.1) o su PORTA_SITO.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import { mkdirSync } from 'node:fs';
export const SP = os.tmpdir().split(String.fromCharCode(92)).join('/') + '/bonaccia-prove/';   // file temporanei e schermate
mkdirSync(SP, { recursive: true });
export const PORTA_SITO = process.env.PORTA_SITO || '8093';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const J = x => JSON.stringify(x);

export async function avvia(porta, { w = 390, h = 844, tema = 'dark', mobile = true, profilo = null, extra = [], pulisci = true } = {}) {
  const prof = SP + (profilo || 'prof_h' + porta);
  if (pulisci) { try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=' + porta, '--user-data-dir=' + prof, ...extra, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${porta}/json`)).json(); if (targets.find(t => t.type === 'page')) break; } catch (e) {}
    await sleep(250);
  }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = {};
  const T = { errs: [], rete: [], dialoghi: [], risposte: {} };
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') T.errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0]);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') T.errs.push('console.error: ' + d.params.args.map(a => a.value || a.description).join(' ').slice(0, 200));
    if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) T.rete.push(d.params.response.status + ' ' + d.params.response.url);
    if (d.method === 'Page.javascriptDialogOpening') { T.dialoghi.push(d.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result; if (r.exceptionDetails) return 'ECCEZIONE: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result ? r.result.value : r; };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
  const shot = async name => writeFileSync(SP + name, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const vai = async (hash = '#ora', { attesa = 'window.Bonaccia && Bonaccia.Engine' } = {}) => {
    await send('Page.navigate', { url: 'http://127.0.0.1:' + PORTA_SITO + '/index.html' + hash });
    for (let i = 0; i < 60; i++) { if (await ev(`document.readyState === 'complete' && !!(${attesa})`) === true) break; await sleep(250); }
    await sleep(700);
  };
  const ricarica = async (hash, opz) => { await ev(`location.hash = '${hash}'`); await sleep(200); await send('Page.reload', { ignoreCache: true }); for (let i = 0; i < 60; i++) { if (await ev(`document.readyState === 'complete' && !!(window.Bonaccia && Bonaccia.Engine)`) === true) break; await sleep(250); } await sleep(900); };
  let ok = 0, ko = 0;
  const prova = (nome, cond, extra = '') => { if (cond) ok++; else ko++; console.log((cond ? 'OK   ' : 'FALLITO ') + nome + (extra ? '  ' + extra : '')); };
  const chiudi = () => { try { ws.close(); } catch (e) {} chrome.kill(); console.log(`\n== ${ok} ok, ${ko} falliti`); };
  return { ev, send, shot, vai, ricarica, prova, chiudi, T, sleep };
}
