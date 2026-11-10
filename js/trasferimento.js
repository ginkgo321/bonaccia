/* Bonaccia – trasferimento dei dati da un indirizzo all'altro.
   Bonaccia è nata su ginkgo321.github.io/bonaccia (sito «vecchio») e ora ha un indirizzo tutto suo (sito «nuovo»).
   La memoria del browser non passa da un indirizzo all'altro: l'utente porta i dati con un FILE. Niente link con i dati:
   il diario è un dato personale e non deve finire nell'indirizzo, quindi nella cronologia del browser.
   - Sito vecchio (RUOLO = 'vecchio'): solo LEGGE le chiavi di localStorage. Non scrive e non cancella niente
     (a parte la data dell'avviso, chiave `bonacciaAvviso`, che non viene mai esportata).
   - Sito nuovo (RUOLO = 'nuovo'): riceve il file, mostra cosa ha trovato (solo numeri, mai il testo delle note)
     e importa solo dopo il «sì» dell'utente.
   Questo file è identico nei due repository: cambia solo la riga RUOLO. */
(function () {
  'use strict';

  var B = window.Bonaccia = window.Bonaccia || {};
  var RUOLO = 'vecchio';                                    // 'vecchio' | 'nuovo'
  var INDIRIZZO_NUOVO = 'https://bonaccia.150796.xyz/';
  var INDIRIZZO_VECCHIO = 'ginkgo321.github.io/bonaccia';
  var FORMATO = 1;
  /* Si trasferiscono solo le chiavi di Bonaccia (bonaccia.diary, .worries, .checks, .settings e le future).
     `bonaccia.quran_settings` è una vecchia impostazione delle recitazioni, che oggi sono in Sakina: non si porta. */
  var CHIAVE_OK = /^bonaccia\.[a-z_]{1,40}$/;
  var NON_SUE = { 'bonaccia.quran_settings': true };
  var MAX_VALORE = 1500000, MAX_TOTALE = 3000000, MAX_CHIAVI = 12, MAX_FILE = 4000000;
  var AVVISO = 'bonacciaAvviso', GIORNI = 14;

  function $(sel) { return document.querySelector(sel); }
  function el(tag, classe, testo) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (testo != null) e.textContent = testo;        // sempre textContent: note e testi dell'utente non sono mai HTML
    return e;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- lettura ---------- */
  function raccogli() {
    var dati = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && CHIAVE_OK.test(k) && !NON_SUE[k]) {
          var v = localStorage.getItem(k);
          if (typeof v === 'string') dati[k] = v;
        }
      }
    } catch (e) {}
    return dati;
  }
  function pacchetto() { return { app: 'bonaccia', formato: FORMATO, creato: new Date().toISOString(), dati: raccogli() }; }

  /* ---------- controllo dei dati ricevuti ----------
     Ogni voce non valida si scarta (e si conta): una voce rovinata non deve bloccare l'importazione di tutte le altre. */
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function dataOk(s) { return typeof s === 'string' && !isNaN(Date.parse(s)); }
  function numOk(n) { return typeof n === 'number' && isFinite(n); }
  function strOpz(v, max) { return v == null || (typeof v === 'string' && v.length <= (max || 5000)); }
  function diarioOk(e) {
    return isObj(e) && (e.type === 'mood' || e.type === 'sleep') && dataOk(e.ts) && strOpz(e.id, 80) &&
      ['loud', 'ann', 'str', 'tib', 'hours', 'eff'].every(function (k) { return e[k] == null || numOk(e[k]); }) &&
      strOpz(e.note) && strOpz(e.sound, 200) && strOpz(e.bed, 20) && strOpz(e.wake, 20) &&
      (e.where == null || (Array.isArray(e.where) && e.where.length <= 30 && e.where.every(function (w) { return typeof w === 'string' && w.length <= 200; })));
  }
  function preoccupazioneOk(w) { return isObj(w) && dataOk(w.ts) && typeof w.text === 'string' && w.text.length <= 5000; }
  function mixOk(m) { return isObj(m) && typeof m.name === 'string' && m.name.length <= 200 && isObj(m.layers); }

  /* Ritorna { testo, scartate } con il valore già ripulito, oppure null se la chiave non si può usare. */
  function ripulisci(chiave, testo) {
    var x;
    try { x = JSON.parse(testo); } catch (e) { return null; }
    var scartate = 0;
    if (chiave === 'bonaccia.diary') {
      if (!Array.isArray(x)) return null;
      var d = x.filter(diarioOk); scartate = x.length - d.length;
      if (d.length > 20000) return null;
      return { testo: JSON.stringify(d), scartate: scartate };
    }
    if (chiave === 'bonaccia.worries') {
      if (!Array.isArray(x)) return null;
      var w = x.filter(preoccupazioneOk).slice(0, 200); scartate = x.length - w.length;
      return { testo: JSON.stringify(w), scartate: scartate };
    }
    if (chiave === 'bonaccia.checks') {
      if (!isObj(x)) return null;
      if (x.date != null && typeof x.date !== 'string') return null;
      if (x.done != null && !(Array.isArray(x.done) && x.done.every(numOk))) return null;
      return { testo: JSON.stringify(x), scartate: 0 };
    }
    if (chiave === 'bonaccia.settings') {
      if (!isObj(x)) return null;
      if (x.mixes != null) {
        if (!Array.isArray(x.mixes)) return null;
        var m = x.mixes.filter(mixOk).slice(0, 200); scartate = x.mixes.length - m.length; x.mixes = m;
      }
      return { testo: JSON.stringify(x), scartate: scartate };
    }
    return { testo: JSON.stringify(x), scartate: 0 };          // chiave futura: va bene se è JSON
  }

  function valida(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.app !== 'bonaccia') return { errore: 'Questo non è un salvataggio di Bonaccia.' };
    if (obj.formato !== FORMATO) return { errore: 'Il salvataggio viene da una versione che non conosco.' };
    var d = obj.dati;
    if (!isObj(d)) return { errore: 'Il salvataggio è rovinato.' };
    var chiavi = Object.keys(d), tot = 0, out = {}, scartate = 0;
    if (!chiavi.length) return { errore: 'Nel salvataggio non c’è niente da importare.' };
    if (chiavi.length > MAX_CHIAVI) return { errore: 'Il salvataggio è rovinato.' };
    for (var i = 0; i < chiavi.length; i++) {
      var k = chiavi[i], v = d[k];
      if (!CHIAVE_OK.test(k) || NON_SUE[k] || typeof v !== 'string' || v.length > MAX_VALORE) return { errore: 'Il salvataggio è rovinato.' };
      tot += v.length;
      if (tot > MAX_TOTALE) return { errore: 'Il salvataggio è rovinato.' };
      var r = ripulisci(k, v);
      if (!r) return { errore: 'Il salvataggio è rovinato.' };
      out[k] = r.testo; scartate += r.scartate;
    }
    return { dati: out, scartate: scartate };
  }

  /* ---------- sito vecchio: «Salva i dati in un file» (sola lettura) ---------- */
  function oggi() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function salvaFile() {
    var p = pacchetto();
    if (!Object.keys(p.dati).length) return false;
    var url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
    var a = el('a'); a.href = url; a.download = 'bonaccia-dati-' + oggi() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    return true;
  }
  function disegnaVecchio(box) {
    box.appendChild(el('h2', null, 'Trasferisci i tuoi dati'));
    box.appendChild(el('p', null, 'Bonaccia ha ora un indirizzo tutto suo: ' + INDIRIZZO_NUOVO.replace(/^https:\/\//, '').replace(/\/$/, '') + '. Questa versione continua a funzionare e i tuoi dati qui restano dove sono. Per passare al nuovo indirizzo, salva i tuoi dati in un file e importalo là.'));
    var az = el('div', 'row');
    var bFile = el('button', 'btn', 'Salva i dati in un file'); bFile.type = 'button';
    var bNuovo = el('a', 'btn secondary', 'Apri il nuovo indirizzo'); bNuovo.href = INDIRIZZO_NUOVO;
    az.appendChild(bFile); az.appendChild(bNuovo); box.appendChild(az);
    var hint = el('p', 'hint', 'Il file contiene note, notti, preoccupazioni, impostazioni e mix. È un dato personale: tienilo al sicuro. Salvarlo non cambia e non cancella niente qui.');
    hint.setAttribute('role', 'status'); hint.setAttribute('aria-live', 'polite'); box.appendChild(hint);
    bFile.addEventListener('click', function () {
      hint.textContent = salvaFile() ? 'File salvato. Al nuovo indirizzo, nella scheda Diario, scegli «Importa da un file». Poi cancella il file dal telefono, se non ti serve più.' : 'Qui non ci sono ancora dati da salvare.';
    });
  }

  /* ---------- sito nuovo: «Importa da un file» ---------- */
  var dialogo = null, scheda = null, aperto = false;
  function creaDialogo() {
    if (dialogo) return;
    dialogo = el('div', 'sheet'); dialogo.id = 'trasf'; dialogo.hidden = true;
    dialogo.setAttribute('role', 'dialog'); dialogo.setAttribute('aria-modal', 'true'); dialogo.setAttribute('aria-labelledby', 'trasf-titolo');
    scheda = el('div', 'sheet-card'); scheda.id = 'trasf-card'; scheda.tabIndex = -1;
    dialogo.appendChild(scheda); document.body.appendChild(dialogo);
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) chiudi(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aperto) chiudi(); });
  }
  function apri(focus) {
    aperto = true; dialogo.hidden = false; document.body.style.overflow = 'hidden';
    scheda.scrollTop = 0; (focus || scheda).focus();
  }
  /* Si chiude ricaricando la pagina: riparte l'app (con i dati appena importati, se c'è stato il «sì»). */
  function chiudi() { document.body.style.overflow = ''; window.location.replace(window.location.pathname + window.location.search); }

  function contaJson(testo, quale) {
    try {
      var x = JSON.parse(testo);
      if (quale === 'mood') return x.filter(function (e) { return e.type === 'mood'; }).length;
      if (quale === 'sleep') return x.filter(function (e) { return e.type === 'sleep'; }).length;
      if (quale === 'lista') return x.length;
      if (quale === 'mix') return Array.isArray(x.mixes) ? x.mixes.length : 0;
    } catch (e) {}
    return 0;
  }
  function plurale(n, uno, molti) { return n + ' ' + (n === 1 ? uno : molti); }
  function riepilogo(d, scartate) {
    var r = [], n;
    if (d['bonaccia.diary']) {
      if ((n = contaJson(d['bonaccia.diary'], 'mood'))) r.push(plurale(n, 'nota nel diario', 'note nel diario'));
      if ((n = contaJson(d['bonaccia.diary'], 'sleep'))) r.push(plurale(n, 'notte registrata', 'notti registrate'));
    }
    if (d['bonaccia.worries'] && (n = contaJson(d['bonaccia.worries'], 'lista'))) r.push(plurale(n, 'preoccupazione scritta', 'preoccupazioni scritte'));
    if (d['bonaccia.settings']) {
      r.push('Impostazioni e taratura');
      if ((n = contaJson(d['bonaccia.settings'], 'mix'))) r.push(plurale(n, 'mix salvato', 'mix salvati'));
    }
    if (!r.length) r.push('Le impostazioni dell’app');
    if (scartate) r.push('Attenzione: ' + plurale(scartate, 'voce rovinata non verrà importata', 'voci rovinate non verranno importate'));
    return r;
  }
  /* Dati veri dell'utente già presenti qui: note e notti, preoccupazioni, mix. Le impostazioni di base NON contano:
     l'app le scrive da sola appena si apre, quindi «niente dati» non vuol dire «memoria vuota». */
  function datiQui() {
    var q = raccogli(), r = { diario: 0, preoccupazioni: 0, mix: 0 };
    if (q['bonaccia.diary']) r.diario = contaJson(q['bonaccia.diary'], 'mood') + contaJson(q['bonaccia.diary'], 'sleep');
    if (q['bonaccia.worries']) r.preoccupazioni = contaJson(q['bonaccia.worries'], 'lista');
    if (q['bonaccia.settings']) r.mix = contaJson(q['bonaccia.settings'], 'mix');
    return r;
  }
  function haDatiQui() { var r = datiQui(); return r.diario > 0 || r.preoccupazioni > 0 || r.mix > 0; }
  function differenteQui(dati) {
    var q = raccogli();
    return Object.keys(dati).some(function (k) { return q[k] != null && q[k] !== dati[k]; });
  }

  /* Scrive i dati e CONTROLLA che restino: Bonaccia riscrive le impostazioni da sola (renderEngine → saveS, con 250 ms di
     ritardo), quindi si aspetta, si rilegge e, se serve, si riscrive. Solo dopo si può ricaricare in sicurezza. */
  function scrivi(dati) {
    function una() { try { Object.keys(dati).forEach(function (k) { localStorage.setItem(k, dati[k]); }); return true; } catch (e) { return false; } }
    function tuttiUguali() { try { return Object.keys(dati).every(function (k) { return localStorage.getItem(k) === dati[k]; }); } catch (e) { return false; } }
    if (!una()) return Promise.resolve(false);
    return sleep(700).then(function () {
      if (!tuttiUguali()) { if (!una()) return false; return sleep(700).then(tuttiUguali); }
      return true;
    });
  }

  function intestazione(testo) { scheda.textContent = ''; var t = el('h2', null, testo); t.id = 'trasf-titolo'; scheda.appendChild(t); }
  function mostraErrore(msg) {
    creaDialogo(); intestazione('Non riesco a importare');
    scheda.appendChild(el('p', null, msg + ' Non è stato cambiato niente.'));
    var az = el('div', 'sheet-actions'), b = el('button', 'btn', 'Chiudi'); b.type = 'button'; b.addEventListener('click', chiudi);
    az.appendChild(b); scheda.appendChild(az); apri(b);
  }
  function mostraConferma(dati, scartate) {
    creaDialogo(); intestazione('Ho trovato i tuoi dati');
    scheda.appendChild(el('p', null, 'Vengono dall’altro indirizzo di Bonaccia. Restano nel tuo telefono e non vengono inviati a nessuno.'));
    var ul = el('ul'); riepilogo(dati, scartate).forEach(function (r) { ul.appendChild(el('li', null, r)); }); scheda.appendChild(ul);
    if (haDatiQui() && differenteQui(dati)) {
      var q = datiQui(), parti = [];
      if (q.diario) parti.push(plurale(q.diario, 'voce nel diario', 'voci nel diario'));
      if (q.preoccupazioni) parti.push(plurale(q.preoccupazioni, 'preoccupazione', 'preoccupazioni'));
      if (q.mix) parti.push(plurale(q.mix, 'mix', 'mix'));
      scheda.appendChild(el('p', 'hint', 'Attenzione: qui hai già dei dati (' + parti.join(', ') + '). Se importi, prendono il posto di quelli di qui e non si recuperano.'));
    }
    var az = el('div', 'sheet-actions');
    var si = el('button', 'btn', 'Importa'); si.type = 'button';
    var no = el('button', 'btn secondary', 'Non adesso'); no.type = 'button';
    az.appendChild(si); az.appendChild(no); scheda.appendChild(az);
    no.addEventListener('click', chiudi);
    si.addEventListener('click', function () {
      si.disabled = true; no.disabled = true; si.textContent = 'Importo…';
      scrivi(dati).then(function (ok) {
        if (!ok) { mostraErrore('Il telefono non mi lascia salvare i dati.'); return; }
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
        try { sessionStorage.setItem('bonacciaImportato', '1'); } catch (e) {}
        chiudi();
      });
    });
    apri(si);
  }
  function mostraFatto() {
    creaDialogo(); intestazione('Fatto');
    scheda.appendChild(el('p', null, 'I tuoi dati sono stati importati. Puoi continuare da qui.'));
    scheda.appendChild(el('p', 'hint', 'Il file che hai salvato contiene dati personali: cancellalo dal telefono se non ti serve più.'));
    var az = el('div', 'sheet-actions'), ok = el('button', 'btn', 'Continua'); ok.type = 'button';
    ok.addEventListener('click', function () { aperto = false; dialogo.hidden = true; document.body.style.overflow = ''; });
    az.appendChild(ok); scheda.appendChild(az); apri(ok);
  }

  function importaTesto(testo) {
    var obj;
    try { obj = JSON.parse(testo); } catch (e) { mostraErrore('Il file non si legge.'); return; }
    var v = valida(obj);
    if (v.errore) mostraErrore(v.errore); else mostraConferma(v.dati, v.scartate);
  }
  function scegliFile(inp) { inp.value = ''; inp.click(); }

  function disegnaNuovo(box, inp) {
    box.appendChild(el('h2', null, 'Importa i tuoi dati'));
    box.appendChild(el('p', null, 'Hai già usato Bonaccia all’indirizzo ' + INDIRIZZO_VECCHIO + '? Lì, nella scheda Diario, scegli «Salva i dati in un file». Poi importalo qui.'));
    var az = el('div', 'row');
    var b = el('button', 'btn secondary', 'Importa da un file'); b.type = 'button';
    az.appendChild(b); box.appendChild(az);
    b.addEventListener('click', function () { scegliFile(inp); });
  }

  /* ---------- avviso in cima alla pagina (chiudibile: torna dopo 14 giorni) ---------- */
  function chiuso() {
    try { var t = parseInt(localStorage.getItem(AVVISO), 10), ora = Date.now(); return t > 0 && t <= ora && ora - t < GIORNI * 86400000; } catch (e) { return false; }
  }
  function vaiAlDiario() {
    location.hash = '#diario';
    setTimeout(function () { var s = $('#trasferimento'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'start' }); }, 150);
  }
  function disegnaAvviso(titolo, testo, etichetta) {
    var main = $('#main');
    if (!main || chiuso()) return;
    var box = el('section', 'avviso-nuovo');
    box.setAttribute('aria-label', titolo);
    box.appendChild(el('p', 'avviso-titolo', titolo));
    box.appendChild(el('p', 'avviso-testo', testo));
    var az = el('div', 'avviso-azioni');
    var vai = el('button', 'btn', etichetta); vai.type = 'button';
    var dopo = el('button', 'btn secondary', 'Non adesso'); dopo.type = 'button';
    az.appendChild(vai); az.appendChild(dopo); box.appendChild(az);
    main.insertBefore(box, main.firstChild);
    vai.addEventListener('click', vaiAlDiario);
    dopo.addEventListener('click', function () {
      try { localStorage.setItem(AVVISO, String(Date.now())); } catch (e) {}
      box.remove(); main.focus();
    });
  }

  /* ---------- avvio ---------- */
  var box = $('#trasferimento');
  if (RUOLO === 'vecchio') {
    if (box) disegnaVecchio(box);
    disegnaAvviso('Bonaccia ha un nuovo indirizzo', 'Puoi portare con te note, sonno, impostazioni e mix quando vuoi. Qui i tuoi dati restano al sicuro.', 'Trasferisci i miei dati');
  } else {
    var inp = el('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.hidden = true; inp.id = 'trasf-file';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > MAX_FILE) { mostraErrore('Il file è troppo grande.'); return; }
      var r = new FileReader();
      r.onload = function () { importaTesto(String(r.result)); };
      r.onerror = function () { mostraErrore('Il file non si legge.'); };
      r.readAsText(f);
    });
    if (box) disegnaNuovo(box, inp);
    if (!haDatiQui()) disegnaAvviso('Hai già usato Bonaccia?', 'Se la usavi a un altro indirizzo, puoi portare qui note, sonno, impostazioni e mix.', 'Importa i miei dati');
    try { if (sessionStorage.getItem('bonacciaImportato') === '1') { sessionStorage.removeItem('bonacciaImportato'); mostraFatto(); } } catch (e) {}
  }

  B.Trasferimento = { ruolo: RUOLO, pacchetto: pacchetto, valida: valida, _importaTesto: importaTesto };   // esposta per le prove
})();
