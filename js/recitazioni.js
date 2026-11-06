/* Bonaccia – Motore e interfaccia per le recitazioni coraniche (Hafs Mujawwad).
   Supporta streaming istantaneo delle 114 Sure dei 3 maestri egiziani,
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
  var elPlain = new Audio();
  elPlain.preload = 'none';
  var elRouted = new Audio();
  elRouted.preload = 'none';
  elRouted.crossOrigin = 'anonymous';
  var audioEl = elPlain;
  var routedFailed = false;
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
    moreOpen: false      // pannello «Sottofondo e offline» aperto
  };

  /* Carica preferenze salvate */
  try {
    var saved = localStorage.getItem('bonaccia.quran_settings');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.reciter && D.reciters[parsed.reciter]) state.reciter = parsed.reciter;
      if (parsed.surah) state.surah = parsed.surah;
      if (parsed.bgPreset) state.bgPreset = parsed.bgPreset;
      if (typeof parsed.bgRel === 'number') state.bgRel = Math.max(-24, Math.min(-4, parsed.bgRel));
      if (typeof parsed.leveling === 'boolean') state.leveling = parsed.leveling;
    }
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem('bonaccia.quran_settings', JSON.stringify({
        reciter: state.reciter,
        surah: state.surah,
        bgPreset: state.bgPreset,
        bgRel: state.bgRel,
        leveling: state.leveling
      }));
    } catch (e) {}
  }

  function getSurah(n) {
    for (var i = 0; i < D.surahs.length; i++) {
      if (D.surahs[i].n === n) return D.surahs[i];
    }
    return D.surahs[0];
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
        artist: r.nome + ' (Mujawwad - Hafs)',
        album: 'Recitazioni Coraniche - Bonaccia'
      });
      navigator.mediaSession.setActionHandler('play', function () { playSurah(state.surah); });
      navigator.mediaSession.setActionHandler('pause', function () { audioEl.pause(); });
      navigator.mediaSession.setActionHandler('seekbackward', function () { skip(-15); });
      navigator.mediaSession.setActionHandler('seekforward', function () { skip(15); });
    } catch (e) {}
  }

  function playSurah(n, seekTo) {
    var s = getSurah(n);
    state.surah = n;
    saveSettings();

    pickElement();
    var url = getAudioUrl(state.reciter, s.pad);
    if (audioEl.src !== url) {
      audioEl.src = url;
    }
    if (typeof seekTo === 'number') pendingSeek = seekTo;
    applyLevel(true);
    applyMediaSession(s);

    var p = audioEl.play();
    if (p && p.then) {
      p.then(function () {
        state.playing = true;
        syncBackgroundSound(true);
        applyMediaSession(s);
        renderPlayerCard();
        renderActiveItem();
      }).catch(function () {
        if (audioEl === elRouted && !routedFailed) {   // il percorso con livelli non parte: si ripiega sull'audio semplice
          routedFailed = true;
          playSurah(n, seekTo);
          return;
        }
        state.playing = false;
        renderPlayerCard();
        alert('Non è stato possibile avviare la recitazione. Controlla la connessione.');
      });
    }
  }

  function togglePlay() {
    if (audioEl.paused || !state.playing) {
      playSurah(state.surah);
    } else {
      audioEl.pause();
      state.playing = false;
      syncBackgroundSound(false);
      renderPlayerCard();
    }
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
  var dockObserver = null;

  function renderDock() {
    var dock = document.getElementById('q-dock');
    if (!dock) return;
    var s = getSurah(state.surah);
    var r = D.reciters[state.reciter];
    var t = document.getElementById('q-dock-title');
    var sub = document.getElementById('q-dock-sub');
    var pl = document.getElementById('q-dock-play');
    if (t) t.textContent = s.n + '. ' + s.nome;
    if (sub) sub.textContent = r.nome;
    if (pl) {
      pl.innerHTML = state.playing ? ICON_PAUSE : ICON_PLAY;
      pl.setAttribute('aria-label', state.playing ? 'Pausa' : 'Avvia');
    }
  }

  function setupDock() {
    if (dockObserver) { dockObserver.disconnect(); dockObserver = null; }
    var dock = document.getElementById('q-dock');
    var box = document.getElementById('q-player-box');
    if (!dock || !box) return;
    document.getElementById('q-dock-bwd').addEventListener('click', function () { skip(-15); });
    document.getElementById('q-dock-fwd').addEventListener('click', function () { skip(15); });
    document.getElementById('q-dock-play').addEventListener('click', togglePlay);
    document.getElementById('q-dock-prog').addEventListener('input', function (e) {
      if (audioEl.duration) audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
    });
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

  function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function wire(el) {
    function mine() { return el === audioEl; }
    el.addEventListener('play', function () {
      if (!mine()) return;
      if (B.Engine) B.Engine.mediaActive(el === elRouted);
      state.playing = true;
      syncBackgroundSound(true);
      applyMediaSession();
      renderPlayerCard();
      renderActiveItem();
    });
    el.addEventListener('pause', function () {
      if (!mine()) return;
      state.playing = false;
      syncBackgroundSound(false);
      if (B.Engine) B.Engine.mediaActive(false);
      renderPlayerCard();
      renderActiveItem();
    });
    el.addEventListener('ended', function () {
      if (!mine()) return;
      state.playing = false;
      syncBackgroundSound(false);
      if (B.Engine) B.Engine.mediaActive(false);
      renderPlayerCard();
      renderActiveItem();
    });
    el.addEventListener('loadedmetadata', function () {
      if (!mine() || pendingSeek == null) return;
      try { el.currentTime = pendingSeek; } catch (e) {}
      pendingSeek = null;
    });
    el.addEventListener('error', function () {
      if (el === elRouted && el === audioEl && !routedFailed) {
        routedFailed = true;
        playSurah(state.surah);
      }
    });
    el.addEventListener('timeupdate', function () {
      if (!mine()) return;
      var prog = document.getElementById('q-prog');
      var cur = document.getElementById('q-time-cur');
      var dur = document.getElementById('q-time-dur');
      if (prog && el.duration) {
        prog.value = (el.currentTime / el.duration) * 100;
      }
      if (cur) cur.textContent = fmtTime(el.currentTime);
      if (dur && el.duration) dur.textContent = fmtTime(el.duration);
      var dprog = document.getElementById('q-dock-prog');
      if (dprog && el.duration) dprog.value = (el.currentTime / el.duration) * 100;
    });
  }
  wire(elPlain);
  wire(elRouted);

  /* Rendering dell'interfaccia */
  function renderView() {
    var v = document.getElementById('v-recitazioni');
    if (!v) return;

    var html = '' +
      '<div class="top-nav-row">' +
        '<a href="#calma" class="back-link">← Torna a Calma</a>' +
      '</div>' +

      '<h1>Recitazioni coraniche</h1>' +
      '<p class="lede">Tradizione <strong>Hafs</strong>, stile <strong>Mujawwad</strong>: recitazione lenta e distensiva, adatta al riposo.</p>' +

      '<!-- Scelta del Maestro -->' +
      '<div class="q-reciter-chips" role="radiogroup" aria-label="Seleziona il recitatore">' +
        '<button type="button" class="chip' + (state.reciter === 'minshawi' ? ' on' : '') + '" data-reciter="minshawi">Al-Minshawi <small>1920–1969</small></button>' +
        '<button type="button" class="chip' + (state.reciter === 'basit' ? ' on' : '') + '" data-reciter="basit">Abdul Basit <small>1927–1988</small></button>' +
        '<button type="button" class="chip' + (state.reciter === 'hussary' ? ' on' : '') + '" data-reciter="hussary">Al-Hussary <small>1917–1980</small></button>' +
      '</div>' +

      '<!-- Player attivo -->' +
      '<div class="panel q-player-card" id="q-player-box"></div>' +

      '<!-- Consigliate per la notte -->' +
      '<h2>⭐ Consigliate per il riposo</h2>' +
      '<p class="sub">Sure scelte specificamente per la cadenza distensiva, i messaggi di conforto interiore e l\'assenza di picchi acustici improvvisi.</p>' +
      '<div class="list" id="q-recommended-list"></div>' +

      '<!-- Catalogo Completo 114 Sure -->' +
      '<h2>📖 Tutte le 114 Sure</h2>' +
      '<p class="sub">Puoi ascoltare in streaming qualsiasi Sura del Corano. Seleziona una Sura per avviare l\'ascolto immediato o salvarla per l\'uso senza rete.</p>' +
      '<div class="q-search-box">' +
        '<input type="search" id="q-search-input" placeholder="Cerca Sura per nome, significato o numero (es. Maryam, 55, Il Misericordioso)..." autocomplete="off">' +
      '</div>' +
      '<div class="list" id="q-all-surahs-list"></div>' +

      '<p class="fine">Registrazioni originali in studio radiofonico ad alta fedeltà (Repubblica Araba d\'Egitto). Streaming pubblico gratuito via CDN MP3Quran, nessun dato personale raccolto. I file salvati offline restano esclusivamente nella memoria locale del tuo dispositivo.</p>' +

      '<!-- Lettore compatto fisso -->' +
      '<div class="q-dock" id="q-dock" role="group" aria-label="Comandi di ascolto">' +
        '<input type="range" class="q-dock-prog" id="q-dock-prog" min="0" max="100" step="0.1" value="0" aria-label="Avanzamento audio">' +
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
        state.reciter = rId;
        saveSettings();
        rChips.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-reciter') === rId); });
        updateCacheIndex();
        renderPlayerCard();
        renderRecommended();
        renderAllSurahs();
        if (state.playing) {
          playSurah(state.surah);
        }
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
        '<input type="range" id="q-prog" min="0" max="100" step="0.1" value="' + (audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0) + '" aria-label="Avanzamento audio">' +
        '<div class="q-time-row">' +
          '<span id="q-time-cur">' + fmtTime(audioEl.currentTime) + '</span>' +
          '<span id="q-time-dur">' + fmtTime(audioEl.duration) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="q-controls">' +
        '<button type="button" class="q-skip" id="q-bwd" aria-label="Indietro 15 secondi">' + ICON_BWD + '<span>15 s</span></button>' +
        '<button type="button" class="q-play-btn" id="q-play-toggle" aria-label="' + (state.playing ? 'Pausa' : 'Avvia') + '">' +
          (state.playing ? ICON_PAUSE : ICON_PLAY).replace(/="30"/g, '="38"') +
        '</button>' +
        '<button type="button" class="q-skip" id="q-fwd" aria-label="Avanti 15 secondi">' + ICON_FWD + '<span>15 s</span></button>' +
      '</div>' +

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
          '<span>Pareggia il volume delle voci<small class="tenue" style="display:block">Porta tutte le Sure e le tre voci allo stesso livello, vicino a quello dei suoni di Bonaccia. Se la riproduzione a schermo bloccato si interrompe, spegnilo.</small></span></label>' +

        '<div class="q-offline-row">' +
          '<button type="button" class="btn secondary piccolo q-btn-offline" id="q-offline-btn"' + (isDownloading ? ' disabled' : '') + '>' +
            (isDownloading ? 'Scaricamento in corso...' : (isSaved ? '✓ Salvato sul telefono (offline)' : '📥 Salva sul telefono (ascolto offline)')) +
          '</button>' +
          '<small class="tenue">' + (isSaved ? 'Disponibile anche in modalità aereo' : 'In streaming CDN (0 MB occupati)') + '</small>' +
        '</div>' +
      '</details>';

    box.innerHTML = h;
    renderDock();

    // Event listeners del player
    var btnPlay = document.getElementById('q-play-toggle');
    if (btnPlay) btnPlay.addEventListener('click', togglePlay);

    var btnBwd = document.getElementById('q-bwd');
    if (btnBwd) btnBwd.addEventListener('click', function () { skip(-15); });

    var btnFwd = document.getElementById('q-fwd');
    if (btnFwd) btnFwd.addEventListener('click', function () { skip(15); });

    var more = document.getElementById('q-more');
    if (more) more.addEventListener('toggle', function () { state.moreOpen = more.open; });

    var prog = document.getElementById('q-prog');
    if (prog) {
      prog.addEventListener('input', function () {
        if (audioEl.duration) {
          audioEl.currentTime = (prog.value / 100) * audioEl.duration;
        }
      });
    }

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

    var rec = D.surahs.filter(function (s) { return s.cons; });
    var html = '';

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
            (s.nota ? '<p class="q-item-nota">' + s.nota + '</p>' : '') +
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
    var filtered = D.surahs.filter(function (s) {
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
