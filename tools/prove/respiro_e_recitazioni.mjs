import { avvia, sleep, J } from './harness.mjs';
// Respiro guidato, esercizi con la voce e recitazioni non si sovrappongono e non si avviano a vicenda.
const b = await avvia(9395);
const { ev, send, vai, prova, T } = b;
// si registrano i comandi della schermata di blocco (Media Session) per poterli «premere» dal test
const SORG = "window.__az = {}; if (navigator.mediaSession) { const _s = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler = function (n, f) { window.__az[n] = f; return _s(n, f); }; }";
await send('Page.addScriptToEvaluateOnNewDocument', { source: SORG });
const st = () => ev('Bonaccia.QuranPlayer._debugState()');
const chiudi = () => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await vai('#recitazioni', { attesa: "window.Bonaccia && Bonaccia.QuranPlayer && document.getElementById('q-prog')" });

// 1. recitazione avviata e messa in pausa, poi respiro: non riparte
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(4500);
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(1200);
await ev(`location.hash = '#calma'`); await sleep(700);
await ev(`document.getElementById('br-start').click()`); await sleep(3500);
let s = await st();
prova('recitazione in pausa + respiro guidato: la recitazione resta in pausa', !s.playing && s.paused, J(s));
// 2. il comando «play» della schermata di blocco durante il respiro non avvia la recitazione
await ev(`window.__az.play && window.__az.play()`); await sleep(2500);
s = await st();
prova('«play» della schermata di blocco durante il respiro: ignorato', !s.playing && !s.loading, J(s));
await chiudi(); await sleep(800);
// 3. a respiro chiuso il comando «play» funziona di nuovo
await ev(`window.__az.play && window.__az.play()`); await sleep(4500);
s = await st();
prova('a respiro chiuso il comando «play» riprende la recitazione', s.playing && !s.paused, J(s) + ' ' + J(await ev(`({ cueOn: Bonaccia.Engine.cueOn, voice: Bonaccia.Engine.voiceActive, eng: Bonaccia.Engine.playing, bg: !!Bonaccia._quranBgActive, ctx: Bonaccia.Engine.ctx && Bonaccia.Engine.ctx.state, azioni: Object.keys(window.__az).join() })`)));
// 4. recitazione IN CORSO: aprendo il respiro si mette in pausa
await ev(`location.hash = '#calma'`); await sleep(600);
await ev(`document.getElementById('br-start').click()`); await sleep(2500);
s = await st();
prova('recitazione in corso + respiro guidato: la recitazione si mette in pausa', !s.playing && s.paused, J(s));
await chiudi(); await sleep(800);
// 5. lo stesso con un esercizio con la voce
await ev(`location.hash = '#recitazioni'`); await sleep(600);
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(4500);
await ev(`location.hash = '#calma'`); await sleep(600);
await ev(`document.querySelectorAll('#session-list .item')[0].click()`); await sleep(3000);
s = await st();
prova('recitazione in corso + esercizio guidato: la recitazione si mette in pausa', !s.playing && s.paused, J(s));
await ev(`window.__az.play && window.__az.play()`); await sleep(2500);
s = await st();
prova('«play» della schermata di blocco durante la voce guida: ignorato', !s.playing, J(s));
await chiudi(); await sleep(800);
// 6. fine Sura con «Prossima Sura» mentre c'è un altro audio: non riparte
await ev(`location.hash = '#recitazioni'`); await sleep(600);
await ev(`document.querySelector('[data-reciter=afasy]').click()`); await sleep(400);
await ev(`(() => { const e = document.getElementById('q-end-select'); e.value = 'next'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="108"]').click()`); await sleep(4000);
await ev(`location.hash = '#calma'`); await sleep(500);
await ev(`(() => { const p = Bonaccia.Content.presets.find(x => x.id === 'pioggia'); Bonaccia.Engine.setLayers(p.layers); Bonaccia.Engine.setMaster(0.4); Bonaccia.Engine.start(0.1); })()`);
await ev(`location.hash = '#recitazioni'`); await sleep(500);
await ev(`(() => { const e = document.getElementById('q-prog'); e.value = 98; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await sleep(7000);
s = await st();
prova('fine Sura con «Prossima Sura» mentre suona un suono dell\'utente: non parte la successiva', !s.playing && s.surah === 108, J(s));
await ev(`Bonaccia.Engine.stop(0.1)`); await sleep(1500);   // il punto 6 lascia acceso un suono dell'utente
// 7. con un sottofondo scelto, dopo la pausa i comandi della schermata di blocco restano della recitazione
await ev(`location.hash = '#recitazioni'`); await sleep(600);
await ev(`(() => { document.getElementById('q-more').open = true; const e = document.getElementById('q-bg-select'); e.value = 'pioggia'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await ev(`(() => { const e = document.getElementById('q-end-select'); e.value = 'stop'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await ev(`document.querySelector('#q-all-surahs-list [data-play-surah="108"]').click()`); await sleep(4500);
await ev(`document.getElementById('q-play-toggle').click()`); await sleep(2500);
await ev(`location.hash = '#calma'`); await sleep(600);
await ev(`document.getElementById('br-start').click()`); await sleep(3000);
await ev(`window.__az.play && window.__az.play()`); await sleep(2500);
let m = await ev(`({ rec: Bonaccia.QuranPlayer._debugState().playing, motore: Bonaccia.Engine.playing })`);
prova('con sottofondo: «play» della schermata di blocco durante il respiro non avvia né recitazione né suoni', !m.rec && !m.motore, J(m));
await chiudi(); await sleep(1200);
await ev(`window.__az.play && window.__az.play()`); await sleep(4500);
m = await ev(`({ rec: Bonaccia.QuranPlayer._debugState().playing, bg: !!Bonaccia._quranBgActive })`);
prova('con sottofondo: a respiro chiuso «play» riprende la recitazione (non il motore dei suoni)', m.rec && m.bg, J(m));
await ev(`document.getElementById('q-play-toggle') && 0`);
console.log('errori JS:', J(T.errs));
prova('nessun errore JS', T.errs.length === 0);
b.chiudi(); process.exit(0);
