/* Bonaccia – Motore e interfaccia per le recitazioni coraniche (tradizione Hafs).
   Supporta streaming istantaneo delle 114 Sure con 5 voci (alcune con una selezione ristretta di Sure),
   salvataggio selettivo offline nella Cache del browser e mix leggero
   con i suoni ambientali di Bonaccia (pioggia, onde, vento, ruscello). */
(function () {
  'use strict';

  var B = window.Bonaccia = window.Bonaccia || {};
  var D = B.QuranData;
  if (!D) return;

  var CACHE_NAME = 'bonaccia-recitazioni-v1';

  /* Due elementi audio. Quello «con livelli» passa dal motore di Bonaccia (js/audio.js), che applica un guadagno
     per voce e per Sura (js/recitazioni_livelli.js) e un limitatore: porta tutte le registrazioni allo stesso livello.
     Quello «semplice» è un normale <audio>, usato se i livelli sono spenti o se il percorso con livelli non funziona. */
  var FROM_NAMES = { ora: 'Ora', calma: 'Calma', sonno: 'Sonno' };
  var RECITERS = ['minshawi', 'basit', 'hussary', 'salimi', 'afasy'].filter(function (id) { return !!D.reciters[id]; });
  var elPlain = new Audio();
  elPlain.preload = 'none';
  var elRouted = new Audio();
  elRouted.preload = 'none';
  elRouted.crossOrigin = 'anonymous';
  var audioEl = elPlain;
  var routedFailed = false;
  var fallbackTrial = false;   // si sta provando l'audio semplice dopo un errore del percorso con livelli
  var playToken = 0;           // ogni avvio ha il suo numero: l'esito di un tentativo già sostituito si ignora
  var pendingSeek = null;
  var LV = B.QuranLevels || null;

  var state = {
    reciter: 'minshawi', // 'basit' | 'minshawi' | 'hussary'
    surah: 55,           // default: Ar-Rahman
    playing: false,
    bgPreset: 'nessuno', // 'nessuno' | 'pioggia' | 'vento' | 'onde' | 'ruscello'
    bgRel: -12,          // sottofondo: dB sotto il livello della voce
    leveling: true,      // pareggia il volume delle voci
    cachedUrls: {},      // url -> true
    filter: '',
    downloading: null,   // url currently downloading
    moreOpen: false,     // pannello «Sottofondo e offline» aperto
    endMode: 'stop',     // a fine Sura: 'stop' | 'next' | 'repeat'
    sleepMin: 0,         // timer di spegnimento (minuti, 0 = nessuno)
    sleepEnd: 0,         // istante di spegnimento (ms), 0 = non ancora partito
    loading: false,      // in attesa dei primi dati dalla rete
    scrub: false         // si sta trascinando la barra
  };

  /* Carica preferenze salvate */
  try {
    var saved = localStorage.getItem('bonaccia.quran_settings');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (typeof parsed.reciter === 'string' && Object.prototype.hasOwnProperty.call(D.reciters, parsed.reciter)) state.reciter = parsed.reciter;
      var sn = parseInt(parsed.surah, 10);
      if (sn >= 1 && sn <= D.surahs.length) state.surah = sn;
      if (['nessuno', 'pioggia', 'vento', 'onde', 'ruscello'].indexOf(parsed.bgPreset) >= 0) state.bgPreset = parsed.bgPreset;
      if (typeof parsed.bgRel === 'number') state.bgRel = Math.max(-24, Math.min(-4, parsed.bgRel));
      if (typeof parsed.leveling === 'boolean') state.leveling = parsed.leveling;
      if (parsed.endMode === 'next' || parsed.endMode === 'repeat') state.endMode = parsed.endMode;
    }
  } catch (e) {}

  if (!isAllowed(state.reciter, state.surah)) state.surah = reciterSurahs(state.reciter)[0].n;

  function saveSettings() {
    try {
      localStorage.setItem('bonaccia.quran_settings', JSON.stringify({
        reciter: state.reciter,
        surah: state.surah,
        bgPreset: state.bgPreset,
        bgRel: state.bgRel,
        leveling: state.leveling,
        endMode: state.endMode
      }));
    } catch (e) {}
  }

  function getSurah(n) {
    for (var i = 0; i < D.surahs.length; i++) {
      if (D.surahs[i].n === n) return D.surahs[i];
    }
    return D.surahs[0];
  }

  /* Sure disponibili con un recitatore: se ha «surahs», solo quelle (selezione protetta, vedi recitazioni_data.js) */
  function reciterSurahs(rid) {
    var r = D.reciters[rid];
    if (!r || !r.surahs) return D.surahs;
    return D.surahs.filter(function (s) { return r.surahs.indexOf(s.n) >= 0; });
  }
  function isAllowed(rid, n) {
    var r = D.reciters[rid];
    if (!r || typeof n !== 'number' || n % 1 !== 0 || n < 1 || n > D.surahs.length) return false;
    return !r.surahs || r.surahs.indexOf(n) >= 0;
  }
  function neighbour(n, dir) {
    var list = reciterSurahs(state.reciter);
    for (var i = 0; i < list.length; i++) {
      if (list[i].n === n) return list[i + dir] ? list[i + dir].n : null;
    }
    return null;
  }
  function isRecommended(rid, s) {
    var r = D.reciters[rid];
    return s.cons || !!(r && r.cons && r.cons.indexOf(s.n) >= 0);
  }
  function surahNote(rid, s) {
    var r = D.reciters[rid];
    return (r && r.note && r.note[s.n]) || s.nota || '';
  }

  function getAudioUrl(reciterId, surahPad) {
    var r = D.reciters[reciterId];
    if (!r) return '';
    return r.baseUrl + surahPad + '.mp3';
  }

  /* Controllo cache offline */
  async function checkCached(url) {
    if (!('caches' in window)) return false;
    try {
      var c = await caches.open(CACHE_NAME);
      var m = await c.match(url);
      return !!m;
    } catch (e) {
      return false;
    }
  }

  async function updateCacheIndex() {
    if (!('caches' in window)) return;
    try {
      var c = await caches.open(CACHE_NAME);
      var keys = await c.keys();
      state.cachedUrls = {};
      keys.forEach(function (k) {
        state.cachedUrls[k.url] = true;
      });
      renderOfflineBadges();
    } catch (e) {}
  }

  async function toggleOffline(surahN, btnEl) {
    if (!('caches' in window)) {
      alert('La memoria offline non è supportata da questo browser.');
      return;
    }
    var s = getSurah(surahN);
    var url = getAudioUrl(state.reciter, s.pad);
    var isSaved = !!state.cachedUrls[url];

    try {
      var c = await caches.open(CACHE_NAME);
      if (isSaved) {
        if (!confirm('Vuoi rimuovere "' + s.nome + '" dallo spazio offline del telefono?')) return;
        await c.delete(url);
        delete state.cachedUrls[url];
        if (btnEl) btnEl.textContent = '📥 Salva offline';
        renderPlayerCard();
        renderOfflineBadges();
      } else {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent = 'Scaricamento in corso...';
        }
        state.downloading = url;
        try {   // file enormi (Al-Baqarah di Salimi: 269 MB) non si tengono in memoria sul telefono
          var head = await fetch(url, { method: 'HEAD' });
          var size = parseInt(head.headers.get('content-length') || '0', 10);
          if (size > 100 * 1024 * 1024) {
            state.downloading = null;
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = '📥 Salva sul telefono (ascolto offline)'; }
            alert('Questa Sura è troppo grande per essere salvata sul telefono (' + Math.round(size / 1048576) + ' MB). Si ascolta solo in streaming.');
            renderPlayerCard();
            return;
          }
        } catch (e) { /* senza HEAD si prova comunque */ }
        var res = await fetch(url);
        if (!res.ok) throw new Error('Errore di rete: ' + res.status);
        await c.put(url, res);
        state.cachedUrls[url] = true;
        state.downloading = null;
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = '✓ Salvato offline';
        }
        renderPlayerCard();
        renderOfflineBadges();
      }
    } catch (err) {
      state.downloading = null;
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '📥 Salva offline';
      }
      alert('Impossibile scaricare la Sura. Verifica la connessione a Internet.');
    }
  }

  /* Livelli */
  function levelDb(rid, n) {
    if (!LV) return 0;
    var g = LV.gain && LV.gain[rid] && LV.gain[rid][n];
    if (typeof g === 'number') return g;
    return (LV.predefinito && LV.predefinito[rid]) || 0;
  }

  function wantRouted() {
    return state.leveling && !routedFailed && !!LV && !!B.Engine && B.Engine.supported;
  }

  function pickElement() {
    var next = elPlain;
    if (wantRouted()) {
      if (B.Engine.attachMedia(elRouted)) next = elRouted; else routedFailed = true;
    }
    if (next !== audioEl) {
      var old = audioEl;
      audioEl = next;       // da qui gli eventi del vecchio elemento vengono ignorati
      try { old.pause(); } catch (e) {}
    }
  }

  function applyLevel(immediate) {
    if (audioEl === elRouted && B.Engine) B.Engine.setMediaGainDb(levelDb(state.reciter, state.surah), immediate);
  }

  /* Gestione audio e mix */
  /* Livello (LUFS) di ogni atmosfera con il volume generale a 0 dB: calcolato dai guadagni del motore e corretto
     con una misura del livello in uscita in Chrome (vedi docs/analisi_suoni.md). Serve a tenere il sottofondo a una distanza fissa dalla voce. */
  var BG_REF = { pioggia: -13.6, onde: -13.0, ruscello: -15.9, vento: -16.9 };   // tarati con una misura in Chrome (RMS in uscita)

  function bgMaster() {
    var ref = BG_REF[state.bgPreset] != null ? BG_REF[state.bgPreset] : -15;
    var target = (LV ? LV.obiettivo : -18) + state.bgRel;      // LUFS voluti per il sottofondo
    var db = target - ref;                                       // volume generale in dB
    return Math.max(0.02, Math.min(1, (db + 54) / 51));          // inverso di masterCurve in audio.js
  }

  function presetFor(id) {
    var list = (B.Content && B.Content.presets) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var bgSaved = null;       // mix e volume che aveva l'utente prima del sottofondo
  var restoreTimer = null;

  function restoreEngine() {
    restoreTimer = null;
    var E = B.Engine;
    if (!bgSaved || !E || B._quranBgActive || E.playing) return;
    E.setLayers(bgSaved.layers);
    E.setMaster(bgSaved.master);
    bgSaved = null;
  }

  function syncBackgroundSound(start) {
    var E = B.Engine;
    if (!E) return;
    if (state.bgPreset === 'nessuno' || !start) {
      if (B._quranBgActive) {
        B._quranBgActive = false;
        E.stop(1.5);
        // il mix dell'utente torna al suo posto a dissolvenza finita
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(restoreEngine, 1800);
      }
      return;
    }
    var p = presetFor(state.bgPreset);
    if (!p) return;
    if (!B._quranBgActive) {
      if (E.playing) return;   // sta già ascoltando un suo suono: non lo tocco
      B._quranBgActive = true;
    }
    clearTimeout(restoreTimer);
    if (!bgSaved) bgSaved = { layers: JSON.parse(JSON.stringify(E.layerState)), master: E.masterV };
    E.setLayers(p.layers);
    E.setMaster(bgMaster());
    if (!E.playing) E.start(2);
  }

  function applyMediaSession(s) {
    if (!('mediaSession' in navigator)) return;
    s = s || getSurah(state.surah);
    var r = D.reciters[state.reciter];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.n + '. ' + s.nome + ' (' + s.trad + ') - ' + s.ar,
        artist: r.nome + ' (' + (r.stile ? r.stile.replace(/ \(studio\)/, '') : 'Hafs') + ')',
        album: 'Recitazioni Coraniche - Bonaccia'
      });
    } catch (e) {}
    function azione(nome, fn) { try { navigator.mediaSession.setActionHandler(nome, fn); } catch (e) {} }   // un browser può non supportarla
    azione('play', function () { playSurah(state.surah); });
    azione('pause', function () { audioEl.pause(); });
    azione('seekbackward', function () { skip(-15); });
    azione('seekforward', function () { skip(15); });
    azione('previoustrack', function () { goPrev(); });
    azione('nexttrack', function () { goNext(); });
    azione('seekto', function (d) {
      if (d && typeof d.seekTime === 'number' && audioEl.duration) audioEl.currentTime = Math.max(0, Math.min(audioEl.duration, d.seekTime));
    });
  }

  function playSurah(n, seekTo) {
    if (!isAllowed(state.reciter, n)) return;      // selezione protetta: nessuna Sura fuori elenco parte mai
    var s = getSurah(n);
    state.surah = n;
    saveSettings();

    pickElement();
    var url = getAudioUrl(state.reciter, s.pad);
    if (audioEl.src !== url) {
      audioEl.src = url;
    }
    if (typeof seekTo === 'number') pendingSeek = seekTo;
    audioEl.volume = 1;          // dopo una dissolvenza del timer (dove il volume si può regolare)
    applyLevel(true);
    applyMediaSession(s);
    state.loading = true;
    syncTransport();
    renderActiveItem();

    var token = ++playToken;
    var p = audioEl.play();
    if (p && p.then) {
      p.then(function () {
        if (token !== playToken) return;
        state.playing = true;
        syncBackgroundSound(true);
        applyMediaSession(s);
        renderPlayerCard();
        renderActiveItem();
      }).catch(function (err) {
        if (token !== playToken) return;               // un tentativo più recente ha preso il posto di questo
        if (err && err.name === 'AbortError') return;   // pausa o cambio Sura durante il caricamento
        if (audioEl === elRouted && !routedFailed) {   // il percorso con livelli non parte: si prova l'audio semplice
          routedFailed = true;
          fallbackTrial = true;
          playSurah(n, seekTo);
          return;
        }
        if (fallbackTrial) { routedFailed = false; fallbackTrial = false; }   // falliva anche l'audio semplice: era la rete, non i livelli
        state.playing = false;
        state.loading = false;
        renderPlayerCard();
        alert('Non è stato possibile avviare la recitazione. Controlla la connessione.');
      });
    }
  }

  /* Svuota l'elemento audio (cambio di voce o di Sura senza avviare l'ascolto): niente tempi del brano precedente */
  function resetMedia() {
    try { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); } catch (e) {}
    // load() annulla l'evento 'pause' in coda: lo stato si aggiorna qui
    state.playing = false;
    state.loading = false;
    syncBackgroundSound(false);
    if (B.Engine) B.Engine.mediaActive(false);
  }

  function togglePlay() {
    if (state.playing || state.loading) {
      audioEl.pause();            // l'evento 'pause' aggiorna lo stato e ferma il sottofondo
    } else {
      playSurah(state.surah);
    }
  }

  /* Sura precedente e successiva */
  function goNext() { var n = neighbour(state.surah, 1); if (n) playSurah(n); }
  function goPrev() {
    if (audioEl.currentTime > 5) { audioEl.currentTime = 0; return; }
    var n = neighbour(state.surah, -1);
    if (n) playSurah(n);
  }

  function skip(delta) {
    if (!audioEl.duration) return;
    audioEl.currentTime = Math.max(0, Math.min(audioEl.duration, audioEl.currentTime + delta));
  }

  /* Lettore compatto fisso in basso: resta a portata di pollice mentre si scorre l'elenco */
  var ICON_PLAY = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICON_BWD = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12.5 8c-3.1 0-5.8 1.9-6.9 4.7l-2.1-2.1V16h5.4L6.8 13.9c.9-2.2 3-3.9 5.7-3.9 3.3 0 6 2.7 6 6s-2.7 6-6 6c-1.7 0-3.2-.7-4.2-1.8l-1.4 1.4c1.4 1.5 3.4 2.4 5.6 2.4 4.4 0 8-3.6 8-8s-3.6-8-8-8z" fill="currentColor"/><text x="12" y="17" font-size="7" text-anchor="middle" font-weight="bold" fill="currentColor">15</text></svg>';
  var ICON_FWD = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M11.5 8c3.1 0 5.8 1.9 6.9 4.7l2.1-2.1V16h-5.4l2.1-2.1c-.9-2.2-3-3.9-5.7-3.9-3.3 0-6 2.7-6 6s2.7 6 6 6c1.7 0 3.2-.7 4.2-1.8l1.4 1.4c-1.4 1.5-3.4 2.4-5.6 2.4-4.4 0-8-3.6-8-8s3.6-8 8-8z" fill="currentColor"/><text x="12" y="17" font-size="7" text-anchor="middle" font-weight="bold" fill="currentColor">15</text></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 5.5v13L9.5 12z"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M5 5.5v13l9.5-6.5z"/></svg>';
  var ICON_SPIN = '<svg class="q-spin" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8" opacity=".25"/><path d="M12 4a8 8 0 0 1 8 8"/></svg>';
  var dockObserver = null;

  function fmtTime(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60);
    return h ? h + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s) : m + ':' + (s < 10 ? '0' + s : s);
  }

  /* Barra di avanzamento (quella grande e quella del lettore fisso) e tempi.
     previewPct: mentre si trascina si mostra solo l'anteprima, l'audio si sposta al rilascio. */
  function updateProgress(previewPct) {
    if (state.scrub && previewPct == null) return;      // non si tocca la barra mentre la si trascina
    var dur = audioEl.duration, has = isFinite(dur) && dur > 0;
    var pct = previewPct != null ? previewPct : (has ? (audioEl.currentTime / dur) * 100 : 0);
    var cur = has ? (pct / 100) * dur : audioEl.currentTime;
    ['q-prog', 'q-dock-prog'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = !has;
      el.value = pct;
      el.style.setProperty('--p', pct + '%');
      el.setAttribute('aria-valuetext', has ? fmtTime(cur) + ' su ' + fmtTime(dur) : 'Non ancora caricato');
    });
    var c = document.getElementById('q-time-cur');
    var d = document.getElementById('q-time-dur');
    if (c) c.textContent = fmtTime(cur);
    if (d) d.textContent = has ? '−' + fmtTime(dur - cur) : '–:––';
  }

  function bindScrub(el) {
    if (!el) return;
    function commit() {
      if (!state.scrub) return;
      state.scrub = false;
      if (audioEl.duration) audioEl.currentTime = (el.value / 100) * audioEl.duration;
      updateProgress();
    }
    el.addEventListener('input', function () { state.scrub = true; updateProgress(parseFloat(el.value)); });
    el.addEventListener('change', commit);
    el.addEventListener('pointerup', commit);
    el.addEventListener('touchend', commit);
    el.addEventListener('blur', commit);
  }

  /* Tasti play/pausa (grande e fisso): riproduzione, pausa o caricamento */
  function syncTransport() {
    [['q-play-toggle', 38], ['q-dock-play', 30]].forEach(function (x) {
      var b = document.getElementById(x[0]);
      if (!b) return;
      var icon = state.loading ? ICON_SPIN : (state.playing ? ICON_PAUSE : ICON_PLAY);
      b.innerHTML = icon.replace(/width="30" height="30"/, 'width="' + x[1] + '" height="' + x[1] + '"');
      b.setAttribute('aria-label', state.loading ? 'Caricamento, tocca per annullare' : (state.playing ? 'Pausa' : 'Avvia'));
      b.classList.toggle('is-loading', state.loading);
    });
  }

  function renderDock() {
    var dock = document.getElementById('q-dock');
    if (!dock) return;
    var s = getSurah(state.surah);
    var r = D.reciters[state.reciter];
    var t = document.getElementById('q-dock-title');
    var sub = document.getElementById('q-dock-sub');
    if (t) t.textContent = s.n + '. ' + s.nome;
    if (sub) sub.textContent = r.nome;
    syncTransport();
    updateProgress();
  }

  function setupDock() {
    if (dockObserver) { dockObserver.disconnect(); dockObserver = null; }
    var dock = document.getElementById('q-dock');
    var box = document.getElementById('q-player-box');
    if (!dock || !box) return;
    document.getElementById('q-dock-bwd').addEventListener('click', function () { skip(-15); });
    document.getElementById('q-dock-fwd').addEventListener('click', function () { skip(15); });
    document.getElementById('q-dock-play').addEventListener('click', togglePlay);
    bindScrub(document.getElementById('q-dock-prog'));
    /* il lettore compatto compare solo quando quello grande è uscito dallo schermo */
    if ('IntersectionObserver' in window) {
      dockObserver = new IntersectionObserver(function (entries) {
        dock.classList.toggle('show', !entries[0].isIntersecting);
      }, { threshold: 0.05 });
      dockObserver.observe(box);
    } else {
      dock.classList.add('show');
    }
    renderDock();
  }

  /* Timer di spegnimento: dissolvenza negli ultimi secondi, poi pausa. Parte quando parte l'ascolto. */
  var FADE_S = 12;
  var sleepIv = null, fading = false, lastPos = 0;

  function sleepLabel() {
    var el = document.getElementById('q-sleep-left');
    if (!el) return;
    if (!state.sleepMin) { el.textContent = ''; return; }
    if (!state.sleepEnd) { el.textContent = 'Il timer parte con l’ascolto.'; return; }
    var left = Math.max(0, Math.round((state.sleepEnd - Date.now()) / 1000));
    el.textContent = 'Si spegne tra ' + fmtTime(left) + '.';
  }

  function sleepClear() {
    clearInterval(sleepIv);
    sleepIv = null;
    fading = false;
  }

  function sleepStartClock() {
    if (!state.sleepMin || state.sleepEnd) return;
    state.sleepEnd = Date.now() + state.sleepMin * 60000;
    sleepClear();
    sleepIv = setInterval(sleepTick, 1000);
    sleepLabel();
  }

  function setSleep(min) {
    sleepClear();
    state.sleepMin = min;
    state.sleepEnd = 0;
    if (min && (state.playing || state.loading)) sleepStartClock();
    sleepLabel();
  }

  function sleepTick() {
    var left = (state.sleepEnd - Date.now()) / 1000;
    if (left <= 0) {
      sleepClear();
      state.sleepMin = 0; state.sleepEnd = 0;
      audioEl.pause();
      audioEl.volume = 1;
      var sel = document.getElementById('q-sleep-select');
      if (sel) sel.value = '0';
      sleepLabel();
      return;
    }
    if (left <= FADE_S && state.playing) {
      if (!fading) {
        fading = true;
        if (audioEl === elRouted && B.Engine) B.Engine.fadeMedia(left);
      }
      if (audioEl === elPlain) audioEl.volume = Math.max(0, left / FADE_S);   // su iPhone il volume non si regola: si ferma e basta
    }
    sleepLabel();
  }

  function updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    var now = Date.now();
    if (now - lastPos < 1000) return;
    lastPos = now;
    var d = audioEl.duration;
    if (!isFinite(d) || d <= 0) return;
    try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: 1, position: Math.min(d, audioEl.currentTime) }); } catch (e) {}
  }

  function wire(el) {
    function mine() { return el === audioEl; }
    el.addEventListener('play', function () {
      if (!mine()) return;
      if (B.Engine) B.Engine.mediaActive(el === elRouted);
      state.playing = true;
      sleepStartClock();
      syncBackgroundSound(true);
      applyMediaSession();
      renderPlayerCard();
      renderActiveItem();
    });
    el.addEventListener('playing', function () {
      if (!mine()) return;
      if (el === elPlain) fallbackTrial = false;       // l'audio semplice funziona: il guasto era del percorso con livelli
      state.loading = false;
      syncTransport();
    });
    el.addEventListener('waiting', function () {
      if (!mine() || !state.playing) return;
      state.loading = true;
      syncTransport();
    });
    el.addEventListener('pause', function () {
      if (!mine()) return;
      state.playing = false;
      state.loading = false;
      syncBackgroundSound(false);
      if (B.Engine) B.Engine.mediaActive(false);
      renderPlayerCard();
      renderActiveItem();
    });
    el.addEventListener('ended', function () {
      if (!mine()) return;
      state.playing = false;
      state.loading = false;
      syncBackgroundSound(false);
      if (B.Engine) B.Engine.mediaActive(false);
      renderPlayerCard();
      renderActiveItem();
      // a fine Sura: ferma, passa alla successiva o ripeti
      if (state.endMode === 'repeat') {
        playSurah(state.surah);
      } else if (state.endMode === 'next') {
        var nx = neighbour(state.surah, 1);
        if (nx) playSurah(nx);
      }
    });
    el.addEventListener('loadedmetadata', function () {
      if (!mine()) return;
      if (pendingSeek != null) {
        try { el.currentTime = pendingSeek; } catch (e) {}
        pendingSeek = null;
      }
      updateProgress();
    });
    el.addEventListener('durationchange', function () { if (mine()) updateProgress(); });
    el.addEventListener('error', function () {
      if (!mine()) return;
      if (!el.getAttribute('src')) return;                  // elemento svuotato da noi (resetMedia): non è un guasto
      if (el === elRouted && !routedFailed && (state.playing || state.loading)) {
        routedFailed = true;
        fallbackTrial = true;
        playSurah(state.surah);
        return;
      }
      if (el === elPlain && fallbackTrial) { routedFailed = false; fallbackTrial = false; }
      state.loading = false;
      syncTransport();
    });
    el.addEventListener('timeupdate', function () {
      if (!mine()) return;
      updateProgress();
      updatePositionState();
    });
  }
  wire(elPlain);
  wire(elRouted);

  /* Rendering dell'interfaccia */
  function renderView() {
    var v = document.getElementById('v-recitazioni');
    if (!v) return;

    var from = FROM_NAMES[B.quranFrom] ? B.quranFrom : 'calma';      // la scheda da cui si è arrivati (impostata da app.js)
    var html = '' +
      '<div class="top-nav-row">' +
        '<a href="#' + from + '" class="back-link">← Torna a ' + FROM_NAMES[from] + '</a>' +
      '</div>' +

      '<h1>Recitazioni coraniche</h1>' +
      '<p class="lede">Tradizione <strong>Hafs</strong>: recitazione lenta e distensiva, adatta al riposo.</p>' +

      '<!-- Scelta della voce -->' +
      '<div class="q-reciter-chips" role="radiogroup" aria-label="Seleziona il recitatore">' +
        RECITERS.map(function (rid) {
          var r = D.reciters[rid];
          return '<button type="button" class="chip' + (state.reciter === rid ? ' on' : '') + '" data-reciter="' + rid + '">' + (r.corto || r.nome) + '</button>';
        }).join('') +
      '</div>' +

      '<!-- Player attivo -->' +
      '<div class="panel q-player-card" id="q-player-box"></div>' +

      '<!-- Consigliate per la notte -->' +
      '<h2 id="q-rec-title">⭐ Consigliate per il riposo</h2>' +
      '<p class="sub" id="q-rec-sub">Sure scelte specificamente per la cadenza distensiva, i messaggi di conforto interiore e l\'assenza di picchi acustici improvvisi.</p>' +
      '<div class="list" id="q-recommended-list"></div>' +

      '<!-- Catalogo Completo 114 Sure -->' +
      '<h2 id="q-all-title">📖 Tutte le 114 Sure</h2>' +
      '<p class="sub" id="q-all-sub">Puoi ascoltare in streaming qualsiasi Sura del Corano. Seleziona una Sura per avviare l\'ascolto immediato o salvarla per l\'uso senza rete.</p>' +
      '<div class="q-search-box" id="q-search-wrap">' +
        '<input type="search" id="q-search-input" aria-label="Cerca una Sura" placeholder="Cerca Sura per nome, significato o numero (es. Maryam, 55, Il Misericordioso)..." autocomplete="off">' +
      '</div>' +
      '<div class="list" id="q-all-surahs-list"></div>' +

      '<p class="fine">Le recitazioni arrivano in streaming dal servizio pubblico gratuito MP3Quran, che, come ogni sito, vede l’indirizzo del tuo dispositivo mentre ascolti. Bonaccia non raccoglie nessun dato. I file salvati offline restano nella memoria del telefono e si ascoltano anche senza rete.</p>' +

      '<!-- Lettore compatto fisso -->' +
      '<div class="q-dock" id="q-dock" role="group" aria-label="Comandi di ascolto">' +
        '<input type="range" class="q-range q-dock-prog" id="q-dock-prog" min="0" max="100" step="0.1" value="0" aria-label="Avanzamento audio" disabled>' +
        '<div class="q-dock-row">' +
          '<div class="q-dock-info"><strong id="q-dock-title"></strong><small id="q-dock-sub"></small></div>' +
          '<button type="button" class="q-dock-btn" id="q-dock-bwd" aria-label="Indietro 15 secondi">' + ICON_BWD + '</button>' +
          '<button type="button" class="q-dock-btn q-dock-main" id="q-dock-play" aria-label="Avvia"></button>' +
          '<button type="button" class="q-dock-btn" id="q-dock-fwd" aria-label="Avanti 15 secondi">' + ICON_FWD + '</button>' +
        '</div>' +
      '</div>';

    v.innerHTML = html;
    setupDock();

    // Event listener per recitatori
    var rChips = v.querySelectorAll('[data-reciter]');
    rChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rId = btn.getAttribute('data-reciter');
        if (state.reciter === rId) return;
        var wasPlaying = state.playing || state.loading;
        state.reciter = rId;
        var keep = isAllowed(rId, state.surah);
        if (!keep) state.surah = reciterSurahs(rId)[0].n;    // la Sura in corso non esiste con questa voce
        saveSettings();
        if (!(wasPlaying && keep)) resetMedia();             // se suonava la stessa Sura riparte da sola con la nuova voce
        rChips.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-reciter') === rId); });
        updateCacheIndex();
        renderPlayerCard();
        renderRecommended();
        renderAllSurahs();
        if (wasPlaying && keep) playSurah(state.surah);      // se la Sura non esiste con questa voce resta in pausa: non parte mai una Sura che non hai scelto tu
      });
    });

    // Ricerca live
    var searchIn = document.getElementById('q-search-input');
    if (searchIn) {
      searchIn.value = state.filter;
      searchIn.addEventListener('input', function (e) {
        state.filter = e.target.value.toLowerCase().trim();
        renderAllSurahs();
      });
    }

    renderPlayerCard();
    renderRecommended();
    renderAllSurahs();
    updateCacheIndex();
  }

  function renderPlayerCard() {
    var box = document.getElementById('q-player-box');
    if (!box) return;

    var s = getSurah(state.surah);
    var r = D.reciters[state.reciter];
    var url = getAudioUrl(state.reciter, s.pad);
    var isSaved = !!state.cachedUrls[url];
    var isDownloading = state.downloading === url;

    var h = '' +
      '<div class="q-now-row">' +
        '<div class="q-now-info">' +
          '<span class="q-badge-num">' + s.n + '</span>' +
          '<div>' +
            '<h3 class="q-now-title">' + s.nome + ' <span class="q-ar">' + s.ar + '</span></h3>' +
            '<p class="piccolo" style="margin:0;">' + s.trad + ' · <span class="tenue">' + r.nome + '</span></p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="q-timeline">' +
        '<input type="range" class="q-range" id="q-prog" min="0" max="100" step="0.1" value="0" aria-label="Avanzamento audio" disabled>' +
        '<div class="q-time-row">' +
          '<span id="q-time-cur">0:00</span>' +
          '<span id="q-time-dur">–:––</span>' +
        '</div>' +
      '</div>' +

      '<div class="q-controls">' +
        '<button type="button" class="q-nav" id="q-prev" aria-label="Sura precedente"' + (neighbour(state.surah, -1) ? '' : ' disabled') + '>' + ICON_PREV + '</button>' +
        '<button type="button" class="q-skip" id="q-bwd" aria-label="Indietro 15 secondi">' + ICON_BWD + '<span>15 s</span></button>' +
        '<button type="button" class="q-play-btn" id="q-play-toggle" aria-label="Avvia"></button>' +
        '<button type="button" class="q-skip" id="q-fwd" aria-label="Avanti 15 secondi">' + ICON_FWD + '<span>15 s</span></button>' +
        '<button type="button" class="q-nav" id="q-next" aria-label="Sura successiva"' + (neighbour(state.surah, 1) ? '' : ' disabled') + '>' + ICON_NEXT + '</button>' +
      '</div>' +

      '<div class="q-opts-row">' +
        '<label>Spegni dopo<select id="q-sleep-select" aria-label="Timer di spegnimento">' +
          '<option value="0"' + (!state.sleepMin ? ' selected' : '') + '>Mai</option>' +
          [15, 30, 45, 60, 90].map(function (m) { return '<option value="' + m + '"' + (state.sleepMin === m ? ' selected' : '') + '>' + m + ' minuti</option>'; }).join('') +
        '</select></label>' +
        '<label>Alla fine<select id="q-end-select" aria-label="Cosa fare alla fine della Sura">' +
          '<option value="stop"' + (state.endMode === 'stop' ? ' selected' : '') + '>Fermati</option>' +
          '<option value="next"' + (state.endMode === 'next' ? ' selected' : '') + '>Prossima Sura</option>' +
          '<option value="repeat"' + (state.endMode === 'repeat' ? ' selected' : '') + '>Ripeti questa</option>' +
        '</select></label>' +
      '</div>' +
      '<p class="hint q-sleep-left" id="q-sleep-left" role="status" aria-live="off"></p>' +

      (state.reciter === 'basit' && !wantRouted()
        ? '<p class="hint q-warn">Questa voce è registrata molto più forte delle altre (fino a 10 dB). Abbassa il volume del telefono prima di avviare.</p>'
        : '') +

      '<details class="q-more" id="q-more"' + (state.moreOpen ? ' open' : '') + '>' +
        '<summary>Sulla voce, sottofondo e offline' + (state.bgPreset !== 'nessuno' ? ' <small class="tenue">· ' + state.bgPreset + '</small>' : '') + (isSaved ? ' <small class="tenue">· salvata</small>' : '') + '</summary>' +
        '<p class="sub q-reciter-desc">' + r.desc + '</p>' +

        '<div class="q-mix-box">' +
          '<div class="q-mix-head">' +
            '<span class="q-mix-label">Sottofondo sonoro Bonaccia:</span>' +
            '<select id="q-bg-select" aria-label="Seleziona sottofondo ambientale">' +
              '<option value="nessuno"' + (state.bgPreset === 'nessuno' ? ' selected' : '') + '>Nessuno (voce pura)</option>' +
              '<option value="pioggia"' + (state.bgPreset === 'pioggia' ? ' selected' : '') + '>+ Pioggia leggera</option>' +
              '<option value="vento"' + (state.bgPreset === 'vento' ? ' selected' : '') + '>+ Vento morbido</option>' +
              '<option value="onde"' + (state.bgPreset === 'onde' ? ' selected' : '') + '>+ Onde lente</option>' +
              '<option value="ruscello"' + (state.bgPreset === 'ruscello' ? ' selected' : '') + '>+ Ruscello calmo</option>' +
            '</select>' +
          '</div>' +
          (state.bgPreset !== 'nessuno'
            ? '<div class="q-mix-slider-row">' +
                '<small class="tenue">Più lontano</small>' +
                '<input type="range" id="q-bg-rel" min="-24" max="-4" step="1" value="' + state.bgRel + '" aria-label="Quanto è presente il sottofondo rispetto alla voce" aria-describedby="q-bg-rel-o">' +
                '<small class="tenue">Più vicino</small>' +
              '</div>' +
              '<small class="tenue" id="q-bg-rel-o">' + (-state.bgRel) + ' dB sotto la voce</small>'
            : '') +
        '</div>' +

        '<label class="check q-level-row"><input type="checkbox" id="q-level"' + (state.leveling ? ' checked' : '') + (LV ? '' : ' disabled') + '> ' +
          '<span>Pareggia il volume delle voci<small class="tenue" style="display:block">Porta tutte le Sure e tutte le voci allo stesso livello, vicino a quello dei suoni di Bonaccia. Se la riproduzione a schermo bloccato si interrompe, spegnilo.</small></span></label>' +

        '<div class="q-offline-row">' +
          '<button type="button" class="btn secondary piccolo q-btn-offline" id="q-offline-btn"' + (isDownloading ? ' disabled' : '') + '>' +
            (isDownloading ? 'Scaricamento in corso...' : (isSaved ? '✓ Salvato sul telefono (offline)' : '📥 Salva sul telefono (ascolto offline)')) +
          '</button>' +
          '<small class="tenue">' + (isSaved ? 'Disponibile anche in modalità aereo' : 'In streaming CDN (0 MB occupati)') + '</small>' +
        '</div>' +
      '</details>';

    var focusId = (document.activeElement && box.contains(document.activeElement)) ? document.activeElement.id : '';
    box.innerHTML = h;
    renderDock();      // aggiorna anche play/pausa e barra della card
    if (focusId) { var fe = document.getElementById(focusId); if (fe && !fe.disabled) fe.focus(); }   // la scheda viene ridisegnata: il focus da tastiera non si perde

    var btnPlay = document.getElementById('q-play-toggle');
    if (btnPlay) btnPlay.addEventListener('click', togglePlay);

    var btnBwd = document.getElementById('q-bwd');
    if (btnBwd) btnBwd.addEventListener('click', function () { skip(-15); });

    var btnFwd = document.getElementById('q-fwd');
    if (btnFwd) btnFwd.addEventListener('click', function () { skip(15); });

    var btnPrev = document.getElementById('q-prev');
    if (btnPrev) btnPrev.addEventListener('click', goPrev);
    var btnNext = document.getElementById('q-next');
    if (btnNext) btnNext.addEventListener('click', goNext);

    var sleepSel = document.getElementById('q-sleep-select');
    if (sleepSel) sleepSel.addEventListener('change', function () { setSleep(parseInt(sleepSel.value, 10)); });
    var endSel = document.getElementById('q-end-select');
    if (endSel) endSel.addEventListener('change', function () { state.endMode = endSel.value; saveSettings(); });
    sleepLabel();

    var more = document.getElementById('q-more');
    if (more) more.addEventListener('toggle', function () { state.moreOpen = more.open; });

    bindScrub(document.getElementById('q-prog'));

    var bgSel = document.getElementById('q-bg-select');
    if (bgSel) {
      bgSel.addEventListener('change', function () {
        state.bgPreset = bgSel.value;
        saveSettings();
        syncBackgroundSound(state.playing);
        renderPlayerCard();
      });
    }

    var bgRel = document.getElementById('q-bg-rel');
    if (bgRel) {
      bgRel.addEventListener('input', function () {
        state.bgRel = parseInt(bgRel.value, 10);
        saveSettings();
        var o = document.getElementById('q-bg-rel-o');
        if (o) o.textContent = (-state.bgRel) + ' dB sotto la voce';
        if (B.Engine && B._quranBgActive) B.Engine.setMaster(bgMaster());
      });
    }

    var lvl = document.getElementById('q-level');
    if (lvl) {
      lvl.addEventListener('change', function () {
        state.leveling = lvl.checked;
        saveSettings();
        var wasPlaying = state.playing, t = audioEl.currentTime;
        if (wasPlaying) playSurah(state.surah, t); else { pickElement(); renderPlayerCard(); }
      });
    }

    var btnOff = document.getElementById('q-offline-btn');
    if (btnOff) {
      btnOff.addEventListener('click', function () {
        toggleOffline(state.surah, btnOff);
      });
    }
  }

  function renderRecommended() {
    var list = document.getElementById('q-recommended-list');
    if (!list) return;

    var rec = reciterSurahs(state.reciter).filter(function (s) { return isRecommended(state.reciter, s); });
    var html = '';
    var rt = document.getElementById('q-rec-title'), rs = document.getElementById('q-rec-sub');
    if (rt) rt.hidden = !rec.length;
    if (rs) rs.hidden = !rec.length;

    rec.forEach(function (s) {
      var isCur = state.surah === s.n;
      var isPl = isCur && state.playing;
      var url = getAudioUrl(state.reciter, s.pad);
      var isSaved = !!state.cachedUrls[url];

      html += '' +
        '<div class="session-item q-item' + (isCur ? ' active' : '') + '" data-surah="' + s.n + '">' +
          '<div class="session-main">' +
            '<div class="session-meta">' +
              '<span class="q-badge-num">' + s.n + '</span>' +
              '<div>' +
                '<strong>' + s.nome + ' <span class="q-ar">' + s.ar + '</span></strong>' +
                '<small class="sub">' + s.trad + (isSaved ? ' · <span style="color:var(--deep)">✓ Offline</span>' : '') + '</small>' +
              '</div>' +
            '</div>' +
            (surahNote(state.reciter, s) ? '<p class="q-item-nota">' + surahNote(state.reciter, s) + '</p>' : '') +
          '</div>' +
          '<button type="button" class="btn secondary piccolo q-play-item-btn" data-play-surah="' + s.n + '">' +
            (isPl ? 'Pausa' : 'Ascolta') +
          '</button>' +
        '</div>';
    });

    list.innerHTML = html;
    bindListEvents(list);
  }

  function renderAllSurahs() {
    var list = document.getElementById('q-all-surahs-list');
    if (!list) return;

    var filter = state.filter;
    var all = reciterSurahs(state.reciter);
    var limited = all.length < D.surahs.length;
    var at = document.getElementById('q-all-title'), as = document.getElementById('q-all-sub'), sw = document.getElementById('q-search-wrap');
    if (at) at.textContent = limited ? '📖 Le Sure per questa voce (' + all.length + ')' : '📖 Tutte le 114 Sure';
    if (as) as.textContent = limited
      ? 'Con questa voce trovi queste Sure. Selezionane una per avviare l\'ascolto immediato.'
      : 'Puoi ascoltare in streaming qualsiasi Sura del Corano. Seleziona una Sura per avviare l\'ascolto immediato o salvarla per l\'uso senza rete.';
    if (sw) sw.hidden = limited && all.length <= 12;
    var filtered = all.filter(function (s) {
      if (!filter) return true;
      return s.n.toString() === filter ||
             s.nome.toLowerCase().indexOf(filter) >= 0 ||
             s.trad.toLowerCase().indexOf(filter) >= 0;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<p class="hint" style="padding:15px 0;">Nessuna Sura trovata con questo termine di ricerca.</p>';
      return;
    }

    var html = '';
    filtered.forEach(function (s) {
      var isCur = state.surah === s.n;
      var isPl = isCur && state.playing;
      var url = getAudioUrl(state.reciter, s.pad);
      var isSaved = !!state.cachedUrls[url];

      html += '' +
        '<div class="session-item q-item' + (isCur ? ' active' : '') + '" data-surah="' + s.n + '">' +
          '<div class="session-main">' +
            '<div class="session-meta">' +
              '<span class="q-badge-num">' + s.n + '</span>' +
              '<div>' +
                '<strong>' + s.nome + ' <span class="q-ar">' + s.ar + '</span></strong>' +
                '<small class="sub">' + s.trad + ' · ' + s.ayahs + ' versetti' + (isSaved ? ' · <span style="color:var(--deep)">✓ Offline</span>' : '') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn secondary piccolo q-play-item-btn" data-play-surah="' + s.n + '">' +
            (isPl ? 'Pausa' : 'Ascolta') +
          '</button>' +
        '</div>';
    });

    list.innerHTML = html;
    bindListEvents(list);
  }

  function renderOfflineBadges() {
    var items = document.querySelectorAll('[data-surah]');
    items.forEach(function (it) {
      var sn = parseInt(it.getAttribute('data-surah'), 10);
      var s = getSurah(sn);
      var url = getAudioUrl(state.reciter, s.pad);
      var isSaved = !!state.cachedUrls[url];
      var badge = it.querySelector('.q-offline-badge');
      if (isSaved && !badge) {
        var sub = it.querySelector('small.sub');
        if (sub && sub.innerHTML.indexOf('✓ Offline') === -1) {
          sub.innerHTML += ' · <span style="color:var(--deep)" class="q-offline-badge">✓ Offline</span>';
        }
      }
    });
  }

  function renderActiveItem() {
    var items = document.querySelectorAll('[data-surah]');
    items.forEach(function (it) {
      var sn = parseInt(it.getAttribute('data-surah'), 10);
      var isCur = state.surah === sn;
      it.classList.toggle('active', isCur);
      var btn = it.querySelector('.q-play-item-btn');
      if (btn) {
        btn.textContent = (isCur && state.playing) ? 'Pausa' : 'Ascolta';
      }
    });
  }

  function bindListEvents(container) {
    var btns = container.querySelectorAll('[data-play-surah]');
    btns.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var sn = parseInt(b.getAttribute('data-play-surah'), 10);
        if (state.surah === sn && state.playing) {
          togglePlay();
        } else {
          playSurah(sn);
        }
      });
    });

    var rows = container.querySelectorAll('.q-item');
    rows.forEach(function (r) {
      r.addEventListener('click', function () {
        var sn = parseInt(r.getAttribute('data-surah'), 10);
        if (state.surah === sn && state.playing) {
          togglePlay();
        } else {
          playSurah(sn);
        }
      });
    });
  }

  // Esporta interfaccia pubblica
  B.QuranPlayer = {
    _debugSleep: function (sec) { sleepClear(); state.sleepMin = 1; state.sleepEnd = Date.now() + sec * 1000; sleepIv = setInterval(sleepTick, 1000); sleepLabel(); },
    _debugState: function () { return { surah: state.surah, playing: state.playing, loading: state.loading, scrub: state.scrub, endMode: state.endMode, fading: fading, sleepMin: state.sleepMin, paused: audioEl.paused, src: (audioEl.getAttribute('src') || '').slice(-7), reciter: state.reciter, time: audioEl.currentTime }; },
    _debug: function () { return { audioEl: audioEl === elRouted ? 'routed' : 'plain', routedFailed: routedFailed, master: bgMaster(), gain: levelDb(state.reciter, state.surah) }; },
    init: function () {
      renderView();
    },
    playSurah: playSurah,
    togglePlay: togglePlay,
    stop: function () {
      audioEl.pause();
      state.playing = false;
      syncBackgroundSound(false);
      renderPlayerCard();
    }
  };

})();
