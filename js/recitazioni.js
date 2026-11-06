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
  var audioEl = new Audio();
  audioEl.preload = 'none';

  var state = {
    reciter: 'minshawi', // 'basit' | 'minshawi' | 'hussary'
    surah: 55,           // default: Ar-Rahman
    playing: false,
    bgPreset: 'nessuno', // 'nessuno' | 'pioggia' | 'vento' | 'onde' | 'ruscello'
    bgVol: 0.15,
    cachedUrls: {},      // url -> true
    filter: '',
    downloading: null    // url currently downloading
  };

  /* Carica preferenze salvate */
  try {
    var saved = localStorage.getItem('bonaccia.quran_settings');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.reciter && D.reciters[parsed.reciter]) state.reciter = parsed.reciter;
      if (parsed.surah) state.surah = parsed.surah;
      if (parsed.bgPreset) state.bgPreset = parsed.bgPreset;
      if (typeof parsed.bgVol === 'number') state.bgVol = parsed.bgVol;
    }
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem('bonaccia.quran_settings', JSON.stringify({
        reciter: state.reciter,
        surah: state.surah,
        bgPreset: state.bgPreset,
        bgVol: state.bgVol
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

  /* Gestione audio e mix */
  function syncBackgroundSound(start) {
    if (!B.Engine) return;
    if (state.bgPreset === 'nessuno' || !start) {
      // Se avevamo avviato noi un sottofondo, possiamo attenuarlo
      if (B._quranBgActive) {
        B._quranBgActive = false;
        if (B.Engine.playing) B.Engine.stop();
      }
      return;
    }

    // Avvia sottofondo morbido al volume scelto
    B._quranBgActive = true;
    B.Engine.applyPreset(state.bgPreset);
    B.Engine.setMaster(state.bgVol);
    if (!B.Engine.playing) B.Engine.start();
  }

  function playSurah(n) {
    var s = getSurah(n);
    state.surah = n;
    saveSettings();

    var url = getAudioUrl(state.reciter, s.pad);
    if (audioEl.src !== url) {
      audioEl.src = url;
    }

    var r = D.reciters[state.reciter];
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.n + '. ' + s.nome + ' (' + s.trad + ') - ' + s.ar,
        artist: r.nome + ' (Mujawwad - Hafs)',
        album: 'Recitazioni Coraniche - Bonaccia'
      });
      navigator.mediaSession.setActionHandler('play', function () { audioEl.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audioEl.pause(); });
      navigator.mediaSession.setActionHandler('seekbackward', function () { audioEl.currentTime = Math.max(0, audioEl.currentTime - 15); });
      navigator.mediaSession.setActionHandler('seekforward', function () { audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 15); });
    }

    audioEl.play().then(function () {
      state.playing = true;
      syncBackgroundSound(true);
      renderPlayerCard();
      renderActiveItem();
    }).catch(function (err) {
      state.playing = false;
      renderPlayerCard();
      alert('Non è stato possibile avviare la recitazione. Controlla la connessione.');
    });
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

  function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  audioEl.addEventListener('play', function () {
    state.playing = true;
    syncBackgroundSound(true);
    renderPlayerCard();
    renderActiveItem();
  });

  audioEl.addEventListener('pause', function () {
    state.playing = false;
    syncBackgroundSound(false);
    renderPlayerCard();
    renderActiveItem();
  });

  audioEl.addEventListener('ended', function () {
    state.playing = false;
    syncBackgroundSound(false);
    renderPlayerCard();
    renderActiveItem();
  });

  audioEl.addEventListener('timeupdate', function () {
    var prog = document.getElementById('q-prog');
    var cur = document.getElementById('q-time-cur');
    var dur = document.getElementById('q-time-dur');
    if (prog && audioEl.duration) {
      prog.value = (audioEl.currentTime / audioEl.duration) * 100;
    }
    if (cur) cur.textContent = fmtTime(audioEl.currentTime);
    if (dur && audioEl.duration) dur.textContent = fmtTime(audioEl.duration);
  });

  /* Rendering dell'interfaccia */
  function renderView() {
    var v = document.getElementById('v-recitazioni');
    if (!v) return;

    var curR = D.reciters[state.reciter];

    var html = '' +
      '<div class="top-nav-row">' +
        '<a href="#calma" class="back-link">← Torna a Calma</a>' +
      '</div>' +

      '<h1>Recitazioni coraniche</h1>' +
      '<p class="lede">Secondo la tradizione <strong>Hafs</strong> (scuola di Kūfa / Iraq) in stile <strong>Mujawwad</strong>: recitazione solenne, lenta e distensiva, adatta al riposo e alla riduzione dell\'acufene.</p>' +

      '<!-- Scelta del Maestro -->' +
      '<div class="panel">' +
        '<h2>Scegli la voce</h2>' +
        '<div class="chips q-reciter-chips" role="radiogroup" aria-label="Seleziona il recitatore">' +
          '<button type="button" class="chip' + (state.reciter === 'minshawi' ? ' on' : '') + '" data-reciter="minshawi">Al-Minshawi <small>(1920–1969)</small></button>' +
          '<button type="button" class="chip' + (state.reciter === 'basit' ? ' on' : '') + '" data-reciter="basit">Abdul Basit <small>(1927–1988)</small></button>' +
          '<button type="button" class="chip' + (state.reciter === 'hussary' ? ' on' : '') + '" data-reciter="hussary">Al-Hussary <small>(1917–1980)</small></button>' +
        '</div>' +
        '<p class="sub" style="margin-top:10px;" id="q-reciter-desc">' + curR.desc + '</p>' +
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

      '<p class="fine">Registrazioni originali in studio radiofonico ad alta fedeltà (Repubblica Araba d\'Egitto). Streaming pubblico gratuito via CDN MP3Quran, nessun dato personale raccolto. I file salvati offline restano esclusivamente nella memoria locale del tuo dispositivo.</p>';

    v.innerHTML = html;

    // Event listener per recitatori
    var rChips = v.querySelectorAll('[data-reciter]');
    rChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rId = btn.getAttribute('data-reciter');
        if (state.reciter === rId) return;
        state.reciter = rId;
        saveSettings();
        rChips.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-reciter') === rId); });
        var d = document.getElementById('q-reciter-desc');
        if (d) d.textContent = D.reciters[rId].desc;
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
        '<button type="button" class="icon-btn q-skip" id="q-bwd" aria-label="Indietro 15 secondi">' +
          '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12.5 8c-3.1 0-5.8 1.9-6.9 4.7l-2.1-2.1V16h5.4L6.8 13.9c.9-2.2 3-3.9 5.7-3.9 3.3 0 6 2.7 6 6s-2.7 6-6 6c-1.7 0-3.2-.7-4.2-1.8l-1.4 1.4c1.4 1.5 3.4 2.4 5.6 2.4 4.4 0 8-3.6 8-8s-3.6-8-8-8z" fill="currentColor"/><text x="12" y="17" font-size="7" text-anchor="middle" font-weight="bold" fill="currentColor">15</text></svg>' +
        '</button>' +

        '<button type="button" class="q-play-btn" id="q-play-toggle" aria-label="' + (state.playing ? 'Pausa' : 'Avvia') + '">' +
          (state.playing
            ? '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
            : '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>') +
        '</button>' +

        '<button type="button" class="icon-btn q-skip" id="q-fwd" aria-label="Avanti 15 secondi">' +
          '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M11.5 8c3.1 0 5.8 1.9 6.9 4.7l2.1-2.1V16h-5.4l2.1-2.1c-.9-2.2-3-3.9-5.7-3.9-3.3 0-6 2.7-6 6s2.7 6 6 6c1.7 0 3.2-.7 4.2-1.8l1.4 1.4c-1.4 1.5-3.4 2.4-5.6 2.4-4.4 0-8-3.6-8-8s3.6-8 8-8z" fill="currentColor"/><text x="12" y="17" font-size="7" text-anchor="middle" font-weight="bold" fill="currentColor">15</text></svg>' +
        '</button>' +
      '</div>' +

      '<!-- Mix Sottofondo Naturale -->' +
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
              '<small class="tenue">Livello sottofondo:</small>' +
              '<input type="range" id="q-bg-vol" min="0.05" max="0.4" step="0.02" value="' + state.bgVol + '" aria-label="Volume sottofondo">' +
            '</div>'
          : '') +
      '</div>' +

      '<!-- Tasto Offline -->' +
      '<div class="q-offline-row">' +
        '<button type="button" class="btn secondary piccolo q-btn-offline" id="q-offline-btn"' + (isDownloading ? ' disabled' : '') + '>' +
          (isDownloading ? 'Scaricamento in corso...' : (isSaved ? '✓ Salvato sul telefono (offline)' : '📥 Salva sul telefono (ascolto offline)')) +
        '</button>' +
        '<small class="tenue">' + (isSaved ? 'Disponibile anche in modalità aereo' : 'In streaming CDN (0 MB occupati)') + '</small>' +
      '</div>';

    box.innerHTML = h;

    // Event listeners del player
    var btnPlay = document.getElementById('q-play-toggle');
    if (btnPlay) btnPlay.addEventListener('click', togglePlay);

    var btnBwd = document.getElementById('q-bwd');
    if (btnBwd) btnBwd.addEventListener('click', function () {
      audioEl.currentTime = Math.max(0, audioEl.currentTime - 15);
    });

    var btnFwd = document.getElementById('q-fwd');
    if (btnFwd) btnFwd.addEventListener('click', function () {
      audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 15);
    });

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

    var bgVol = document.getElementById('q-bg-vol');
    if (bgVol) {
      bgVol.addEventListener('input', function () {
        state.bgVol = parseFloat(bgVol.value);
        saveSettings();
        if (B.Engine && B._quranBgActive) {
          B.Engine.setMaster(state.bgVol);
        }
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
