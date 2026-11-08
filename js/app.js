/* Bonaccia – interfaccia e logica dell’app. */
(function () {
  'use strict';

  var B = window.Bonaccia, E = B.Engine, C = B.Content;

  /* ---------- utilità ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function num(x, d) { return Number(x).toFixed(d == null ? 1 : d).replace('.', ','); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function words(t) { return t.split(/\s+/).length; }
  function fmtLeft(s) {
    if (s >= 3600) { var hh = Math.floor(s / 3600), mm = Math.round((s % 3600) / 60); return hh + ' h ' + (mm ? mm + ' min' : ''); }
    if (s >= 60) return Math.ceil(s / 60) + ' min';
    return 'meno di un minuto';
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  var PFX = 'bonaccia.';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} },
    /* letture con controllo del tipo: dati salvati vecchi o rovinati non devono bloccare l'app */
    getArr: function (k) { var v = this.get(k, []); return Array.isArray(v) ? v : []; },
    getObj: function (k) { var v = this.get(k, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; },
    clearAll: function () {
      try { Object.keys(localStorage).filter(function (k) { return k.indexOf(PFX) === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    }
  };

  var S = Object.assign({
    theme: null, master: 0.5, layers: null, current: 'pioggia', zone: null, src: 'real',
    timerMin: null, timerMode: 'low', installHidden: false,
    sl: { preset: 'notte', min: null, awake: false },
    br: { pattern: 'dolce', dur: 3, cue: true },
    voice: true, mixes: []
  }, store.getObj('settings'));
  /* impostazioni salvate con tipi sbagliati (versioni vecchie, modifiche a mano): si rimettono i valori di partenza */
  (function () {
    function obj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
    S.sl = Object.assign({ preset: 'notte', min: null, awake: false }, obj(S.sl) ? S.sl : {});
    S.br = Object.assign({ pattern: 'dolce', dur: 3, cue: true }, obj(S.br) ? S.br : {});
    if (!Array.isArray(S.mixes)) S.mixes = [];
    S.mixes = S.mixes.filter(function (m) { return obj(m) && typeof m.name === 'string' && obj(m.layers); });
    if (typeof S.master !== 'number' || !isFinite(S.master)) S.master = 0.5;
    if (!obj(S.layers)) S.layers = null;
    if (S.theme !== 'day' && S.theme !== 'night') S.theme = null;
    if (S.src !== 'real' && S.src !== 'synth') S.src = 'real';
    if (typeof S.current !== 'string') S.current = 'pioggia';
    if (S.timerMin != null && !(S.timerMin > 0)) S.timerMin = null;
    if (S.timerMode !== 'low' && S.timerMode !== 'off') S.timerMode = 'low';
    if (!obj(S.zone) || !isFinite(S.zone.lo) || !isFinite(S.zone.hi)) S.zone = null;
  })();
  var saveTimer = null;
  function saveS() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { store.set('settings', S); }, 250); }

  function presetById(id) { return C.presets.filter(function (p) { return p.id === id; })[0]; }

  /* ---------- tema ---------- */
  function applyTheme() {
    var t = S.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
    document.documentElement.setAttribute('data-theme', t);
    var m = $('#meta-theme'); if (m) m.setAttribute('content', t === 'night' ? '#111C23' : '#E8EEEB');
    var b = $('#btn-theme');
    if (b) { b.setAttribute('aria-pressed', t === 'night' ? 'true' : 'false'); b.setAttribute('aria-label', t === 'night' ? 'Passa al tema giorno' : 'Passa al tema notte'); }
    readColors(); drawField(performance.now());
  }
  $('#btn-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    S.theme = cur === 'night' ? 'day' : 'night'; saveS(); applyTheme();
  });

  /* ---------- finestre sovrapposte ---------- */
  var sheet = $('#sheet'), card = $('#sheet-card'), lastFocus = null, sheetClose = null, sheetModal = false;
  function openSheet(content, opts) {
    opts = opts || {};
    closeSheet();
    lastFocus = document.activeElement;
    card.innerHTML = '';
    card.className = 'sheet-card' + (opts.full ? ' full' : '') + (opts.dark ? ' dark' : '');
    sheet.className = 'sheet' + (opts.dark ? ' dark' : '');
    card.appendChild(content);
    sheet.hidden = false;
    sheetClose = opts.onClose || null; sheetModal = !!opts.modal;
    document.body.style.overflow = 'hidden';
    card.scrollTop = 0; card.focus();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true; card.innerHTML = '';
    document.body.style.overflow = $('#night').hidden ? '' : 'hidden';
    var cb = sheetClose; sheetClose = null;
    if (cb) cb();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  sheet.addEventListener('click', function (e) { if (e.target === sheet && !sheetModal) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* ---------- schermo acceso ---------- */
  var wl = null, wlCount = 0;
  function lockScreen(on) {
    wlCount = Math.max(0, wlCount + (on ? 1 : -1));
    if (!('wakeLock' in navigator)) return;
    if (wlCount > 0 && !wl) {
      navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {});
    } else if (wlCount === 0 && wl) { wl.release().catch(function () {}); wl = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      if (wlCount > 0 && !wl && 'wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () {});
      E.tick();
      if (E.playing && E.ctx && E.ctx.state !== 'running') { try { E.ctx.resume(); } catch (e) {} }
      renderEngine();
    }
  });

  /* ---------- diario: dati ---------- */
  function diary() {
    return store.getArr('diary').filter(function (e) { return e && typeof e === 'object' && (e.type === 'mood' || e.type === 'sleep') && !isNaN(Date.parse(e.ts)); });
  }
  function saveDiary(a) { store.set('diary', a); }
  function addEntry(e) {
    var a = diary(); e.id = Date.now() + '-' + Math.floor(Math.random() * 1000); e.ts = new Date().toISOString();
    a.push(e); saveDiary(a); return e;
  }
  function soundName() {
    if (!E.playing) return 'Nessun suono';
    if (S.current && S.current.indexOf('mix:') === 0) return S.current.slice(4);
    var p = presetById(S.current);
    return p ? p.name : 'Il mio mix';
  }

  /* ================= ORA ================= */
  function renderGreeting() {
    var hr = new Date().getHours();
    $('#greet').textContent = hr < 5 ? 'Buona notte' : hr < 12 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : hr < 23 ? 'Buonasera' : 'Buona notte';
  }
  var ci = $('#ci-range');
  ci.addEventListener('input', function () { $('#ci-out').textContent = ci.value; });
  $('#ci-save').addEventListener('click', function () {
    var v = +ci.value;
    addEntry({ type: 'mood', ann: v, sound: soundName(), where: [] });
    var msg;
    if (v <= 3) msg = 'Segnato. Va bene così: tieni un suono basso e vai avanti con la tua giornata.';
    else if (v <= 6) msg = 'Segnato. Se ti va, prova un minuto di calma o cambia atmosfera nella scheda Suoni.';
    else msg = 'Segnato. È un momento duro, e passa. Prova «Calma adesso»: dura tre minuti.';
    $('#ci-hint').textContent = msg;
    renderDiary();
  });

  $('#act-calm').addEventListener('click', function () {
    var p = presetById('pioggia');
    E.setLayers(p.layers); S.current = p.id; E.setTitle(p.name);
    startSound();
    openBreath({ pattern: 'dolce', minutes: 3, cue: true });
  });
  $('#act-sleep').addEventListener('click', function () { location.hash = '#sonno'; });
  $('#act-out').addEventListener('click', function () {
    var box = h('div', {}, [
      h('h2', { id: 'sheet-title', text: 'In mezzo al rumore' }),
      h('p', { class: 'sub', text: 'Il rumore non è il problema: lo sono la tensione e la fretta. Qualche idea:' }),
      h('ul', {}, C.fuori.map(function (t) { return h('li', { text: t }); })),
      h('div', { class: 'sheet-actions' }, [
        h('button', { class: 'btn', type: 'button', text: 'Ascolto del mondo, 3 minuti', onclick: function () { openSession(sessionById('mondo')); } }),
        h('button', { class: 'btn secondary', type: 'button', text: 'Un minuto di calma', onclick: function () { openSession(sessionById('pausa')); } }),
        h('button', { class: 'linkbtn', type: 'button', text: 'Chiudi', onclick: closeSheet })
      ])
    ]);
    openSheet(box);
  });

  function renderZonePanel() {
    var p = $('#zone-panel'); p.innerHTML = '';
    if (S.zone) {
      p.appendChild(h('h2', { text: 'Il tuo punto d’incontro' }));
      p.appendChild(h('p', { text: 'È salvato. Restando nella tua zona, il suono e il fruscio si fondono. Se cambi cuffie o volume del telefono, rifai la taratura.' }));
      p.appendChild(h('button', { class: 'btn secondary', type: 'button', text: 'Rifai la taratura', onclick: openCalibration }));
    } else {
      p.appendChild(h('h2', { text: 'Trova il tuo punto d’incontro' }));
      p.appendChild(h('p', { text: 'Il suono più utile non copre il fruscio: si mescola con lui, poco sotto. Ci vuole un minuto per trovare il livello giusto per te, e poi ti basta restarci.' }));
      p.appendChild(h('button', { class: 'btn', type: 'button', text: 'Inizia la taratura', onclick: openCalibration }));
    }
  }

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone = (navigator.standalone === true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (isIOS && !standalone && !S.installHidden) $('#install-tip').hidden = false;
  $('#install-hide').addEventListener('click', function () { S.installHidden = true; saveS(); $('#install-tip').hidden = true; });

  /* ================= SUONI ================= */
  var playBtn = $('#play'), master = $('#master');
  if (!E.supported) { $('#audio-warn').hidden = false; playBtn.disabled = true; }

  function startSound() {
    if (!E.start(2)) return;
    if (S.timerMin && !E.timer) E.setTimer(S.timerMin, S.timerMode);
  }
  playBtn.addEventListener('click', function () { if (E.playing) E.stop(1.5); else startSound(); });
  $('#mini-toggle').addEventListener('click', function () { if (E.playing) E.stop(1.5); else startSound(); });
  $('#mini-open').addEventListener('click', function () { location.hash = '#suoni'; });

  master.addEventListener('input', function () { E.setMaster(+master.value); });

  function renderZoneBar() {
    var z = $('#zone');
    if (S.zone) {
      z.hidden = false; z.style.setProperty('--lo', S.zone.lo); z.style.setProperty('--hi', S.zone.hi);
      $('#zone-mid').textContent = 'la tua zona';
    } else { z.hidden = true; $('#zone-mid').textContent = ''; }
    var v = E.masterV, hint;
    if (!S.zone) hint = 'Non hai ancora trovato il tuo punto. Metti il volume del telefono a metà e tocca il pulsante qui sotto.';
    else if (v < S.zone.lo - 0.01) hint = 'Sotto la tua zona: il fruscio può emergere. Se vuoi, sali un po’.';
    else if (v > S.zone.hi + 0.01) hint = 'Sopra la tua zona: copri più del necessario. Va bene per un momento duro, poi torna alla zona.';
    else hint = 'Sei nella tua zona: il suono e il fruscio si fondono senza sovrastarsi.';
    if (v > 0.85) hint += ' Il volume è alto: il suono dovrebbe restare comodo.';
    $('#level-hint').textContent = hint;
  }
  $('#btn-calib').addEventListener('click', openCalibration);

  /* atmosfere */
  var builtSrc = null;
  function buildPresets() {
    var box = $('#presets'); box.innerHTML = '';
    var synth = E.source === 'synth';
    ['natura', 'musica', 'rumore'].forEach(function (g) {
      var list = C.presets.filter(function (p) { return p.group === g && !(synth && p.realOnly); });
      if (!list.length) return;
      var target = box;
      if (g === 'rumore') {
        var cur = C.presets.filter(function (p) { return p.id === S.current; })[0];
        target = h('details', { class: 'rumori', open: cur && cur.group === 'rumore' ? '' : null }, [
          h('summary', { text: 'Rumori, da provare con cautela' }),
          h('p', { class: 'sub', text: 'Sono uniformi e si somigliano al fruscio: a volte aiutano a farlo fondere, a volte lo rinforzano. Parti a volume molto basso e fermati se lo senti salire.' })
        ]);
        box.appendChild(target);
      } else {
        box.appendChild(h('h3', { class: 'grp-h', text: C.presetGroups[g] }));
      }
      list.forEach(function (p) {
        target.appendChild(h('button', {
          class: 'preset', type: 'button', 'data-id': p.id, 'aria-pressed': String(p.id === S.current),
          onclick: function () { E.setLayers(p.layers); S.current = p.id; E.setTitle(p.name); startSound(); saveS(); renderEngine(); }
        }, [h('strong', { text: p.name }), h('span', { text: p.desc })]));
      });
    });
    builtSrc = E.source;
  }
  $$('#src-seg button').forEach(function (b) {
    b.addEventListener('click', function () { S.src = b.getAttribute('data-src'); saveS(); E.setSource(S.src); });
  });

  /* mixer */
  function buildMixer() {
    var box = $('#mixer'); box.innerHTML = '';
    ['rain', 'waves', 'stream', 'fontana', 'bosco', 'drone', 'wind', 'chimes', 'noise'].forEach(function (n) {
      var label = C.layerLabels[n];
      var row = h('div', { class: 'mix-row', 'data-layer': n });
      var sw = h('label', { class: 'switch' }, [
        h('input', { type: 'checkbox', 'aria-label': label + ': acceso o spento', 'data-k': 'on' }), h('i')
      ]);
      row.appendChild(h('div', { class: 'mix-head' }, [h('span', { text: label }), sw]));
      var extra = h('div', { class: 'mix-extra' });
      extra.appendChild(slider('vol', 'Quanto: ' + label, 0, 1, 0.01));
      if (n === 'noise') {
        extra.appendChild(h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Colore del fruscio' },
          [['white', 'Bianco'], ['pink', 'Rosa'], ['brown', 'Marrone']].map(function (c) {
            return h('button', { class: 'chip', type: 'button', role: 'radio', 'data-color': c[0], 'aria-checked': 'false', text: c[1] });
          })));
        extra.appendChild(slider('tilt', 'Tono: più caldo o più chiaro', -1, 1, 0.05));
        extra.appendChild(h('div', { class: 'lbl' }, [h('span', { text: 'più caldo' }), h('span', { text: 'più chiaro' })]));
        extra.appendChild(h('label', { class: 'check' }, [
          h('input', { type: 'checkbox', 'data-k': 'breath' }), h('span', { text: 'Respiro lento: il suono sale e scende piano' })
        ]));
      }
      if (n === 'chimes') {
        extra.appendChild(slider('density', 'Quanto fitti', 0, 1, 0.02));
        extra.appendChild(h('div', { class: 'lbl' }, [h('span', { text: 'più rari' }), h('span', { text: 'più fitti' })]));
      }
      row.appendChild(extra);
      box.appendChild(row);
    });
    box.addEventListener('input', onMixerInput);
    box.addEventListener('change', onMixerInput);
    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-color]') : null;
      if (!b) return;
      var row = b.closest('.mix-row');
      touchedMix(); E.setLayer(row.getAttribute('data-layer'), { color: b.getAttribute('data-color') });
    });
  }
  function slider(k, label, min, max, step) {
    return h('input', { type: 'range', 'data-k': k, min: min, max: max, step: step, 'aria-label': label });
  }
  function touchedMix() {
    if (S.current !== 'custom') { S.current = 'custom'; E.setTitle('Il tuo mix'); }
    saveS();
  }
  function onMixerInput(e) {
    var t = e.target, k = t.getAttribute && t.getAttribute('data-k');
    if (!k) return;
    var row = t.closest('.mix-row'), n = row.getAttribute('data-layer');
    var val = t.type === 'checkbox' ? t.checked : +t.value;
    touchedMix(); E.setLayer(n, (function () { var o = {}; o[k] = val; return o; })());
  }
  function syncMixer() {
    $$('.mix-row').forEach(function (row) {
      var n = row.getAttribute('data-layer'), st = E.layerState[n];
      row.hidden = E.source === 'synth' && (n === 'fontana' || n === 'bosco' || n === 'drone');
      var on = $('[data-k="on"]', row); if (on !== document.activeElement) on.checked = !!st.on;
      $('.mix-extra', row).hidden = !st.on;
      $$('[data-k]', row).forEach(function (el) {
        var k = el.getAttribute('data-k');
        if (k === 'on' || el === document.activeElement) return;
        if (el.type === 'checkbox') el.checked = !!st[k]; else if (st[k] != null) el.value = st[k];
      });
      $$('[data-color]', row).forEach(function (c) { c.setAttribute('aria-checked', st.color === c.getAttribute('data-color') ? 'true' : 'false'); });
    });
  }

  /* timer */
  var TIMERS = [[null, 'Nessuno'], [15, '15 min'], [30, '30 min'], [60, '1 ora'], [120, '2 ore'], [480, '8 ore']];
  function buildTimerChips() {
    var box = $('#timer-chips'); box.innerHTML = '';
    TIMERS.forEach(function (t) {
      box.appendChild(h('button', {
        class: 'chip', type: 'button', role: 'radio', 'data-min': t[0] == null ? '' : t[0], 'aria-checked': 'false', text: t[1],
        onclick: function () {
          S.timerMin = t[0]; saveS();
          if (E.playing) E.setTimer(S.timerMin, S.timerMode);
          renderEngine();
        }
      }));
    });
    $$('#end-mode button').forEach(function (b) {
      b.addEventListener('click', function () {
        S.timerMode = b.getAttribute('data-mode'); saveS();
        if (E.playing && E.timer) E.setTimer(E.timer.minutes, S.timerMode);
        renderEngine();
      });
    });
  }
  function renderTimer() {
    $$('#timer-chips .chip').forEach(function (c) {
      var m = c.getAttribute('data-min'); c.setAttribute('aria-checked', String((m === '' ? null : +m) === S.timerMin));
    });
    $$('#end-mode button').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-mode') === S.timerMode)); });
    var left = E.timerLeft(), hint = $('#timer-left');
    if (E.timer && left != null) {
      hint.textContent = 'Il volume comincia a scendere tra ' + fmtLeft(Math.max(0, left - E.timer.fade)) + (S.timerMode === 'low' ? ' e poi resta sommesso.' : ' e il suono si spegne.');
    } else if (S.timerMin) hint.textContent = 'Il timer parte quando avvii il suono.';
    else hint.textContent = 'Senza timer, il suono resta acceso finché non lo fermi.';
  }

  /* i tuoi mix */
  $('#save-mix').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#mix-name').value.trim();
    if (!name) { $('#mix-name').focus(); return; }
    S.mixes = S.mixes.filter(function (m) { return m.name !== name; });
    S.mixes.push({ name: name, layers: clone(E.layerState), master: E.masterV });
    S.current = 'mix:' + name; $('#mix-name').value = ''; saveS(); renderMixes(); renderEngine();
  });
  function renderMixes() {
    var box = $('#mymixes'); box.innerHTML = '';
    if (!S.mixes.length) { box.appendChild(h('p', { class: 'empty', text: 'Qui compariranno i mix che salvi.' })); return; }
    S.mixes.forEach(function (m, i) {
      box.appendChild(h('div', { class: 'mymix' }, [
        h('button', { class: 'name', type: 'button', text: m.name, onclick: function () {
          E.setLayers(m.layers); E.setMaster(m.master); S.current = 'mix:' + m.name; E.setTitle(m.name); startSound(); saveS(); renderEngine();
        } }),
        h('button', { class: 'del', type: 'button', 'aria-label': 'Elimina il mix ' + m.name, text: '×', onclick: function () {
          S.mixes.splice(i, 1); saveS(); renderMixes();
        } })
      ]));
    });
  }

  /* ---------- campo del suono (canvas) ---------- */
  var fcv = $('#field'), fx = fcv.getContext('2d'), col = {}, lv = 0, raf = null;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['deep', 'sage', 'zone', 'line', 'surf', 'surf2'].forEach(function (k) { col[k] = cs.getPropertyValue('--' + k).trim(); });
  }
  function rr(R, v) { return R * (0.42 + 0.56 * v); }
  function drawField(ts) {
    if (!col.deep) return;
    var W = fcv.width, cx = W / 2, R = W / 2 - 8;
    fx.clearRect(0, 0, W, W);
    fx.fillStyle = col.surf2; fx.beginPath(); fx.arc(cx, cx, R, 0, 6.2832); fx.fill();
    if (S.zone) {
      fx.strokeStyle = col.zone; fx.lineWidth = Math.max(2, rr(R, S.zone.hi) - rr(R, S.zone.lo));
      fx.globalAlpha = 0.9; fx.beginPath(); fx.arc(cx, cx, (rr(R, S.zone.hi) + rr(R, S.zone.lo)) / 2, 0, 6.2832); fx.stroke(); fx.globalAlpha = 1;
    }
    var playing = E.playing;
    fx.globalAlpha = playing ? 0.35 : 0.18; fx.fillStyle = col.sage;
    fx.beginPath(); fx.arc(cx, cx, rr(R, E.masterV), 0, 6.2832); fx.fill(); fx.globalAlpha = 1;
    fx.strokeStyle = col.deep; fx.lineWidth = 4; fx.globalAlpha = playing ? 1 : 0.55;
    fx.beginPath(); fx.arc(cx, cx, rr(R, E.masterV), 0, 6.2832); fx.stroke(); fx.globalAlpha = 1;
    if (playing && !reduced) {
      lv = lv * 0.92 + E.level() * 0.08;
      for (var k = 0; k < 3; k++) {
        var p = ((ts / 9000) + k / 3) % 1, r0 = rr(R, E.masterV), r = r0 + p * (R - r0);
        fx.strokeStyle = col.deep; fx.lineWidth = 2; fx.globalAlpha = (1 - p) * (0.15 + Math.min(0.35, lv * 2));
        fx.beginPath(); fx.arc(cx, cx, r, 0, 6.2832); fx.stroke();
      }
      fx.globalAlpha = 1;
    }
  }
  function loop(ts) {
    if (currentView !== 'suoni' || document.hidden || !E.playing || reduced) { raf = null; drawField(ts || 0); return; }
    drawField(ts); raf = requestAnimationFrame(loop);
  }
  function kickField() { if (!raf) raf = requestAnimationFrame(loop); }

  /* ---------- rendering dello stato del motore ---------- */
  var miniEl = $('#mini');
  function renderEngine() {
    document.body.classList.toggle('is-playing', E.playing);
    playBtn.setAttribute('aria-label', E.playing ? 'Metti in pausa il suono' : 'Avvia il suono');
    $('#mini-toggle').setAttribute('aria-label', E.playing ? 'Metti in pausa' : 'Riprendi');
    var title = E.playing ? soundName() : null;
    $('#now').textContent = E.playing
      ? (title + (E.ctx && E.ctx.state !== 'running' ? ' (fermato dal sistema: tocca per riprendere)' : ''))
      : 'Pronto. Tocca per iniziare.';
    if (document.activeElement !== master) master.value = E.masterV;
    renderZoneBar();
    if (builtSrc !== E.source) buildPresets();
    $$('#presets .preset').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === S.current)); });
    $$('#src-seg button').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-src') === E.source)); });
    var loading = false, failed = false;
    ['rain', 'waves', 'stream', 'fontana', 'bosco', 'drone'].forEach(function (n) {
      if (!E.layerState[n].on || E.source !== 'real') return;
      var st = E.realStatus(n); if (st === 'loading') loading = true; if (st === 'error') failed = true;
    });
    $('#src-hint').textContent = failed ? 'Non riesco a caricare le registrazioni: per ora suonano quelle sintetiche. Serve la rete la prima volta.'
      : loading ? 'Sto caricando la registrazione… intanto suona la versione sintetica.' : '';
    syncMixer(); renderTimer();
    var showMini = E.playing && currentView !== 'suoni' && $('#night').hidden;
    miniEl.hidden = !showMini;
    $('#mini-title').textContent = title || '';
    var left = E.timerLeft(); $('#mini-sub').textContent = E.timer && left != null ? 'Timer: ' + fmtLeft(left) : '';
    S.master = E.masterV; S.layers = E.layerState; saveS();
    if (!raf) kickField();
    if (!E.playing) drawField(performance.now());
  }
  E.onChange(renderEngine);

  /* ---------- taratura del punto d’incontro ---------- */
  function openCalibration() {
    var prev = { layers: clone(E.layerState), master: E.masterV, playing: E.playing, current: S.current };
    var ramp = null, v = 0.04, done = false;
    var content = h('div');

    function restore(stopIfIdle) {
      if (ramp) { clearInterval(ramp); ramp = null; }
      E.setLayers(prev.layers); E.setMaster(prev.master); S.current = prev.current;
      if (!prev.playing && stopIfIdle) E.stop(1.2);
    }
    function showIntro() {
      if (ramp) { clearInterval(ramp); ramp = null; }
      if (E.playing && !prev.playing) E.stop(0.6);
      content.innerHTML = '';
      [h('h2', { id: 'sheet-title', text: 'Trova il tuo punto d’incontro' }),
       h('p', { text: 'Il suono più utile non copre il fruscio: si mescola con lui. Lo cerchiamo insieme, in un minuto.' }),
       h('p', { class: 'sub', text: 'Uso l’atmosfera che hai scelto adesso. Se non ce n’è una, parto dalla pioggia.' }),
       h('ol', {}, [
         h('li', { text: 'Siediti in un posto calmo, con le cuffie o l’altoparlante che usi di solito.' }),
         h('li', { text: 'Metti il volume del telefono a metà e poi non toccarlo più.' }),
         h('li', { text: 'Il suono salirà piano. Tocca «Si fonde col mio fruscio» quando senti i due insieme.' })
       ]),
       h('div', { class: 'sheet-actions' }, [
         h('button', { class: 'btn', type: 'button', text: 'Inizia', onclick: showRun }),
         h('button', { class: 'linkbtn', type: 'button', text: 'Annulla', onclick: function () { closeSheet(); } })
       ])].forEach(function (n) { content.appendChild(n); });
    }
    function showRun() {
      content.innerHTML = '';
      v = 0.04; done = false;
      var anyOn = B.Audio.LAYER_NAMES.some(function (n) { return E.layerState[n].on; });
      if (!anyOn) { var pr = presetById('pioggia'); E.setLayers(pr.layers); S.current = pr.id; E.setTitle(pr.name); }
      E.setMaster(v); E.setTimer(null); E.start(1);
      var bar = h('div', { class: 'progress' }, [h('i')]);
      var fill = bar.firstChild;
      [h('h2', { id: 'sheet-title', text: 'Ascolta' }),
       h('p', { text: 'Il suono sale piano. Aspetta il momento in cui si mescola col tuo fruscio: li senti insieme, uno non sovrasta l’altro.' }),
       bar,
       h('div', { class: 'sheet-actions' }, [
         h('button', { class: 'btn', type: 'button', text: 'Si fonde col mio fruscio', onclick: function () { pick(v); } }),
         h('button', { class: 'btn secondary', type: 'button', text: 'Ora il fruscio non si sente più', onclick: function () { pick(Math.max(0.1, v - 0.06)); } }),
         h('button', { class: 'linkbtn', type: 'button', text: 'Annulla', onclick: function () { closeSheet(); } })
       ])].forEach(function (n) { content.appendChild(n); });
      ramp = setInterval(function () {
        v += 0.86 / 700;
        E.setMaster(v); fill.style.transition = 'none'; fill.style.width = (v / 0.9 * 100) + '%';
        if (v >= 0.9) {
          clearInterval(ramp); ramp = null;
          content.innerHTML = '';
          [h('h2', { id: 'sheet-title', text: 'Non l’hai trovato' }),
           h('p', { text: 'Nessun problema. Succede se il volume del telefono è troppo basso o troppo alto. Mettilo a metà e riprova con calma, oppure rimanda a un altro momento.' }),
           h('div', { class: 'sheet-actions' }, [
             h('button', { class: 'btn', type: 'button', text: 'Riprova', onclick: showIntro }),
             h('button', { class: 'linkbtn', type: 'button', text: 'Chiudi', onclick: function () { closeSheet(); } })
           ])].forEach(function (n) { content.appendChild(n); });
          E.setMaster(prev.master);
        }
      }, 100);
    }
    function pick(L) {
      if (ramp) { clearInterval(ramp); ramp = null; }
      L = clamp(L, 0.12, 0.92);
      var rest = clamp(L - 0.04, 0.08, 0.9);
      E.setMaster(rest);
      content.innerHTML = '';
      [h('h2', { id: 'sheet-title', text: 'Eccolo' }),
       h('p', { text: 'Ho messo il suono poco sotto il punto in cui si fonde. Resta un minuto ad ascoltare: dovresti sentire il suono e il tuo fruscio insieme, e nessuno dei due ti disturba.' }),
       h('p', { class: 'sub', text: 'Se lo senti troppo forte o troppo debole, correggi con la barra del volume prima di salvare.' }),
       h('div', { class: 'sheet-actions' }, [
         h('button', { class: 'btn', type: 'button', text: 'Salva la mia zona', onclick: function () {
           var here = E.masterV;
           S.zone = { lo: clamp(here - 0.07, 0, 1), hi: clamp(here + 0.06, 0, 1) };
           done = true; S.master = here; saveS();
           closeSheet();
           E.setLayers(prev.layers); E.setMaster(here); S.current = prev.current;
           if (!prev.playing) E.stop(1.5);
           renderZonePanel(); renderEngine();
         } }),
         h('button', { class: 'btn secondary', type: 'button', text: 'Rifai', onclick: showIntro }),
         h('button', { class: 'linkbtn', type: 'button', text: 'Annulla', onclick: function () { closeSheet(); } })
       ])].forEach(function (n) { content.appendChild(n); });
    }
    showIntro();
    openSheet(content, { modal: true, onClose: function () { if (!done) restore(true); } });
  }

  /* ================= CALMA ================= */
  function sessionById(id) { return C.sessions.filter(function (s) { return s.id === id; })[0]; }
  var BR_DURS = [2, 3, 5, 10];

  function buildCalma() {
    var pat = $('#br-pattern'); pat.innerHTML = '';
    C.breathing.forEach(function (p) {
      pat.appendChild(h('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': p.id, 'aria-checked': 'false', text: p.name,
        onclick: function () { S.br.pattern = p.id; saveS(); renderCalma(); } }));
    });
    var dur = $('#br-dur'); dur.innerHTML = '';
    BR_DURS.forEach(function (m) {
      dur.appendChild(h('button', { class: 'chip', type: 'button', role: 'radio', 'data-m': m, 'aria-checked': 'false', text: m + ' min',
        onclick: function () { S.br.dur = m; saveS(); renderCalma(); } }));
    });
    $('#br-cue').addEventListener('change', function () { S.br.cue = this.checked; saveS(); });
    $('#br-start').addEventListener('click', function () {
      openBreath({ pattern: S.br.pattern, minutes: S.br.dur, cue: S.br.cue });
    });
    var list = $('#session-list'); list.innerHTML = '';
    C.sessions.forEach(function (s) {
      list.appendChild(h('button', { class: 'item', type: 'button', onclick: function () { openSession(s); } }, [
        h('strong', { text: s.title }), h('small', { text: s.minutes + ' min' }), h('span', { text: s.desc })
      ]));
    });
  }
  function renderCalma() {
    $$('#br-pattern .chip').forEach(function (c) { c.setAttribute('aria-checked', String(c.getAttribute('data-id') === S.br.pattern)); });
    $$('#br-dur .chip').forEach(function (c) { c.setAttribute('aria-checked', String(+c.getAttribute('data-m') === S.br.dur)); });
    var p = C.breathing.filter(function (x) { return x.id === S.br.pattern; })[0];
    $('#br-desc').textContent = p ? p.desc : '';
    $('#br-cue').checked = !!S.br.cue;
  }

  /* respiro guidato */
  function openBreath(o) {
    var pat = C.breathing.filter(function (x) { return x.id === o.pattern; })[0] || C.breathing[0];
    var end = Date.now() + o.minutes * 60 * 1000, stopped = false, tm = null, tk = null;
    var orb = h('div', { class: 'breath-orb' });
    var label = h('div', { class: 'breath-label', 'aria-live': 'polite', text: 'Preparati' });
    var left = h('p', { class: 'breath-left' });
    var box = h('div', { class: 'breath-wrap' }, [
      h('h2', { id: 'sheet-title', class: 'visually-hidden', text: 'Respiro guidato' }),
      h('div', { class: 'breath-stage' }, [orb]), label, left,
      h('div', { class: 'sheet-actions' }, [h('button', { class: 'btn secondary', type: 'button', text: 'Chiudi', onclick: function () { closeSheet(); } })])
    ]);
    function fmt(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + pad(s % 60); }
    function cleanup() {
      stopped = true; clearTimeout(tm); clearInterval(tk);
      if (o.cue) E.cueStop();
      lockScreen(false);
    }
    function phase(kind, secs, next) {
      if (stopped) return;
      label.textContent = kind === 'in' ? 'Inspira' : kind === 'out' ? 'Espira' : 'Trattieni';
      if (kind !== 'hold') {
        orb.style.transition = 'transform ' + secs + 's ease-in-out, opacity ' + secs + 's ease-in-out';
        orb.style.transform = kind === 'in' ? 'scale(1)' : 'scale(.55)';
        orb.style.opacity = kind === 'in' ? '1' : '.8';
        if (o.cue) E.cuePhase(kind, secs);
      }
      tm = setTimeout(next, secs * 1000);
    }
    function cycle() {
      if (stopped) return;
      if (Date.now() >= end) {
        label.textContent = 'Bene così'; left.textContent = 'Resta ancora un momento, se vuoi.';
        if (o.cue) E.cueStop();
        return;
      }
      phase('in', pat.in, function () {
        var after = function () { phase('out', pat.out, cycle); };
        if (pat.hold) phase('hold', pat.hold, after); else after();
      });
    }
    openSheet(box, { full: true, dark: !!o.dark, onClose: cleanup });
    lockScreen(true);
    if (o.cue) E.cueStart();
    tk = setInterval(function () { if (Date.now() < end) left.textContent = fmt(end - Date.now()); }, 500);
    left.textContent = fmt(end - Date.now());
    requestAnimationFrame(function () { requestAnimationFrame(function () { cycle(); }); });
  }

  /* esercizi guidati */
  var hasSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  function pickVoice() {
    var vs = hasSpeech ? speechSynthesis.getVoices().filter(function (v) { return /^it/i.test(v.lang); }) : [];
    var pref = vs.filter(function (v) { return /alice|federica|elsa|paola|silvia/i.test(v.name); })[0];
    return pref || vs[0] || null;
  }
  if (hasSpeech) { try { speechSynthesis.onvoiceschanged = function () {}; speechSynthesis.getVoices(); } catch (e) {} }

  /* voce guida registrata: elenco delle frasi disponibili (audio/voce/manifest.json) */
  var VOICE = { items: null };
  fetch('audio/voce/manifest.json').then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { if (m && m.items) VOICE.items = m.items; }).catch(function () {});
  function sessName(sess, i) { return sess.id + '_' + pad(i + 1); }
  function voiceAvailable(sess) {
    return !!VOICE.items && sess.steps.every(function (_, i) { return VOICE.items[sessName(sess, i)]; });
  }

  function openSession(sess, startAt) {
    var steps = sess.steps, n = steps.length;
    var canRec = voiceAvailable(sess) && E.supported;
    var useRec = canRec && !!S.voice;
    var useSpeech = !canRec && !!S.voice && hasSpeech;
    var closed = false, idx = startAt || 0, paused = false, tm = null, tick = null, started = false, finished = false;
    var bufs = null, offs = [], total = 0, t0 = 0, schedStart = 0, shown = -1;
    var txt = h('p', { class: 'step-text', 'aria-live': 'polite' });
    var bar = h('div', { class: 'progress' }, [h('i')]);
    var fill = bar.firstChild;
    var pauseBtn = h('button', { class: 'btn', type: 'button', text: 'Pausa', onclick: togglePause });
    var skipBtn = h('button', { class: 'btn secondary', type: 'button', text: 'Passo successivo', onclick: skip });
    var voiceChip = (canRec || hasSpeech) ? h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!S.voice), text: 'Voce guida', onclick: function () {
      S.voice = !S.voice; saveS();
      var at = idx; closeSheet(); openSession(sess, at);
    } }) : null;
    var soundChip = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(E.playing), text: 'Suono di sottofondo', onclick: function () {
      if (E.playing) E.stop(1.5); else startSound();
      this.setAttribute('aria-pressed', String(E.playing));
    } });
    var box = h('div', {}, [
      h('h2', { id: 'sheet-title', text: sess.title }),
      h('div', { class: 'chips' }, [voiceChip, soundChip]),
      bar, txt,
      h('div', { class: 'sheet-actions' }, [pauseBtn, skipBtn, h('button', { class: 'linkbtn', type: 'button', text: 'Chiudi', onclick: function () { closeSheet(); } })])
    ]);

    function done() {
      finished = true; clearTimeout(tm); clearInterval(tick);
      txt.textContent = 'Fatto. Prenditi ancora un momento prima di rialzarti.';
      fill.style.transition = 'width .8s linear'; fill.style.width = '100%';
      pauseBtn.hidden = true; skipBtn.hidden = true;
    }

    /* --- voce registrata: tutto programmato sull'orologio audio --- */
    function scheduleFrom(i) {
      E.voiceStop(); clearInterval(tick);
      if (i >= n) { done(); return; }
      schedStart = i; shown = -1;
      t0 = E.ctx.currentTime + 0.5 - offs[i];
      for (var j = i; j < n; j++) E.voicePlay(bufs[j], t0 + offs[j]);
      tick = setInterval(update, 250); update();
    }
    function update() {
      var el = E.ctx.currentTime - t0, cur = schedStart;
      for (var j = schedStart; j < n; j++) { if (el >= offs[j]) cur = j; }
      idx = cur;
      if (idx !== shown) { shown = idx; txt.textContent = steps[idx].t; }
      fill.style.transition = 'width .3s linear';
      fill.style.width = clamp(el / total, 0, 1) * 100 + '%';
      if (el >= total) done();
    }
    function startRec() {
      if (!E.voiceBegin()) { useRec = false; useSpeech = false; return startText(idx); }
      txt.textContent = 'Preparo la voce…'; pauseBtn.disabled = true; skipBtn.disabled = true;
      Promise.all(steps.map(function (_, i) { return E.loadBuffer('audio/voce/' + sessName(sess, i) + '.mp3'); })).then(function (b) {
        if (closed || finished) return;
        bufs = b; offs = []; var a = 0;
        b.forEach(function (x, i) { offs.push(a); a += x.duration + steps[i].p; });
        total = a; pauseBtn.disabled = false; skipBtn.disabled = false;
        scheduleFrom(idx);
      }, function () {
        if (closed) return;
        E.voiceEnd(); useRec = false; pauseBtn.disabled = false; skipBtn.disabled = false;
        txt.textContent = 'Non riesco a caricare la voce: leggi il testo. Serve la rete la prima volta.';
        setTimeout(function () { if (!closed) startText(idx); }, 2500);
      });
    }

    /* --- solo testo (o voce del telefono) --- */
    var durs = steps.map(function (s) { return Math.round(words(s.t) / 2.2 + s.p); });
    var cum = durs.map(function (_, i) { return durs.slice(0, i).reduce(function (a, b) { return a + b; }, 0); });
    var totalT = durs.reduce(function (a, b) { return a + b; }, 0);
    function speak(t) {
      if (!useSpeech) return;
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(t); u.lang = 'it-IT'; u.rate = 0.85;
        var v = pickVoice(); if (v) u.voice = v;
        speechSynthesis.speak(u);
      } catch (e) {}
    }
    function runText(i) {
      idx = i;
      if (idx >= n) { done(); return; }
      txt.textContent = steps[idx].t;
      fill.style.transition = 'width ' + durs[idx] + 's linear';
      fill.style.width = ((cum[idx] + durs[idx]) / totalT * 100) + '%';
      speak(steps[idx].t);
      tm = setTimeout(function () { runText(idx + 1); }, durs[idx] * 1000);
    }
    function startText(i) { useRec = false; runText(i); }

    /* --- comandi --- */
    function togglePause() {
      if (!paused) {
        paused = true; pauseBtn.textContent = 'Riprendi'; fill.style.transition = 'none';
        clearTimeout(tm); clearInterval(tick);
        if (useRec) E.voiceStop(); else if (hasSpeech) { try { speechSynthesis.cancel(); } catch (e) {} }
      } else {
        paused = false; pauseBtn.textContent = 'Pausa';
        if (useRec) scheduleFrom(idx); else runText(idx);
      }
    }
    function skip() {
      if (finished || paused) return;
      if (useRec) scheduleFrom(idx + 1);
      else { clearTimeout(tm); if (hasSpeech) { try { speechSynthesis.cancel(); } catch (e) {} } runText(idx + 1); }
    }

    openSheet(box, { full: true, onClose: function () {
      closed = true; clearTimeout(tm); clearInterval(tick);
      if (started && canRec) E.voiceEnd();
      if (hasSpeech) { try { speechSynthesis.cancel(); } catch (e) {} }
      lockScreen(false);
    } });
    lockScreen(true);
    started = true;
    if (useRec) startRec(); else runText(idx);
  }

  /* ================= SONNO ================= */
  var SL_PRESETS = ['notte', 'onde', 'pioggia', 'ruscello', 'vento'];
  var SL_TIMERS = [[30, '30 min'], [60, '1 ora'], [120, '2 ore'], [null, 'Tutta la notte']];
  function buildSonno() {
    var pbox = $('#sl-preset'); pbox.innerHTML = '';
    SL_PRESETS.forEach(function (id) {
      var p = presetById(id);
      pbox.appendChild(h('button', { class: 'chip', type: 'button', role: 'radio', 'data-id': id, 'aria-checked': 'false', text: p.name,
        onclick: function () { S.sl.preset = id; saveS(); renderSonno(); } }));
    });
    var tbox = $('#sl-timer'); tbox.innerHTML = '';
    SL_TIMERS.forEach(function (t) {
      tbox.appendChild(h('button', { class: 'chip', type: 'button', role: 'radio', 'data-min': t[0] == null ? '' : t[0], 'aria-checked': 'false', text: t[1],
        onclick: function () { S.sl.min = t[0]; saveS(); renderSonno(); } }));
    });
    $('#sl-awake').addEventListener('change', function () { S.sl.awake = this.checked; saveS(); });
    $('#sl-go').addEventListener('click', function () {
      var p = presetById(S.sl.preset);
      E.setLayers(p.layers); S.current = p.id; E.setTitle(p.name);
      E.setTimer(null);
      if (!E.start(3)) return;
      if (S.sl.min) E.setTimer(S.sl.min, S.timerMode);
      openNight();
    });
    $('#sl-wake').addEventListener('click', function () { openBreath({ pattern: 'lunga', minutes: 2, cue: true, dark: true }); });

    var cl = $('#checklist'); cl.innerHTML = '';
    C.checklist.forEach(function (t, i) {
      cl.appendChild(h('li', {}, [h('label', {}, [h('input', { type: 'checkbox', 'data-i': i }), h('span', { text: t })])]));
    });
    cl.addEventListener('change', function (e) {
      var d = dkey(new Date()), st = store.getObj('checks');
      if (st.date !== d) st = { date: d, done: [] };
      var i = +e.target.getAttribute('data-i');
      st.done = st.done.filter(function (x) { return x !== i; });
      if (e.target.checked) st.done.push(i);
      store.set('checks', st);
    });
    $('#worry-save').addEventListener('click', function () {
      var t = $('#worry-text').value.trim(); if (!t) return;
      var a = store.getArr('worries'); a.unshift({ ts: new Date().toISOString(), text: t }); store.set('worries', a.slice(0, 30));
      $('#worry-text').value = ''; renderWorries();
    });
  }
  function renderSonno() {
    $$('#sl-preset .chip').forEach(function (c) { c.setAttribute('aria-checked', String(c.getAttribute('data-id') === S.sl.preset)); });
    $$('#sl-timer .chip').forEach(function (c) { var m = c.getAttribute('data-min'); c.setAttribute('aria-checked', String((m === '' ? null : +m) === S.sl.min)); });
    $('#sl-awake').checked = !!S.sl.awake;
    var st = store.getObj('checks'), d = dkey(new Date());
    $$('#checklist input').forEach(function (i) { i.checked = st.date === d && st.done.indexOf(+i.getAttribute('data-i')) >= 0; });
    renderWorries();
  }
  function renderWorries() {
    var box = $('#worry-list'); box.innerHTML = '';
    store.getArr('worries').slice(0, 5).forEach(function (w, i) {
      var d = new Date(w.ts);
      box.appendChild(h('div', { class: 'note' }, [
        h('small', { text: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) }),
        h('span', { text: w.text }),
        h('button', { type: 'button', text: 'Elimina', onclick: function () {
          var a = store.getArr('worries'); a.splice(i, 1); store.set('worries', a); renderWorries();
        } })
      ]));
    });
  }

  /* modalità Buonanotte */
  var night = $('#night');
  function openNight() {
    night.hidden = false; document.body.style.overflow = 'hidden';
    if (S.sl.awake) lockScreen(true);
    renderEngine(); updateNight();
  }
  function closeNight() {
    if (night.hidden) return;
    night.hidden = true; document.body.style.overflow = '';
    if (S.sl.awake) lockScreen(false);
    renderEngine();
  }
  function updateNight() {
    if (night.hidden) return;
    var left = E.timerLeft();
    $('#night-sub').textContent = E.timer && left != null
      ? 'Il volume scende dolcemente tra ' + fmtLeft(Math.max(0, left - E.timer.fade)) + '.' : 'Il suono resta acceso.';
  }
  $('#night-down').addEventListener('click', function () { E.setMaster(E.masterV - 0.03); });
  $('#night-up').addEventListener('click', function () { E.setMaster(E.masterV + 0.03); });
  $('#night-wake').addEventListener('click', function () { openBreath({ pattern: 'lunga', minutes: 2, cue: true, dark: true }); });
  $('#night-off').addEventListener('click', function () { E.stop(3); closeNight(); });

  /* ================= DIARIO ================= */
  var WHERE = ['A casa', 'Fuori', 'Al lavoro', 'In silenzio', 'In mezzo al rumore', 'A letto'];
  var dsel = { where: [], sound: 'Nessun suono' };

  function buildDiary() {
    [['d-loud', 'd-loud-o'], ['d-ann', 'd-ann-o'], ['d-str', 'd-str-o']].forEach(function (p) {
      var r = $('#' + p[0]), o = $('#' + p[1]);
      r.addEventListener('input', function () { o.textContent = r.value; });
    });
    var wb = $('#d-where'); wb.innerHTML = '';
    WHERE.forEach(function (w) {
      wb.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: w, onclick: function () {
        var i = dsel.where.indexOf(w); if (i >= 0) dsel.where.splice(i, 1); else dsel.where.push(w);
        this.setAttribute('aria-pressed', String(i < 0));
      } }));
    });
    $('#diary-form').addEventListener('submit', function (e) {
      e.preventDefault();
      addEntry({
        type: 'mood', loud: +$('#d-loud').value, ann: +$('#d-ann').value, str: +$('#d-str').value,
        where: dsel.where.slice(), sound: dsel.sound, note: $('#d-note').value.trim()
      });
      $('#d-note').value = ''; $('#d-saved').textContent = 'Salvato.';
      setTimeout(function () { $('#d-saved').textContent = ''; }, 3000);
      renderDiary();
    });
    $('#s-save').addEventListener('click', function () {
      var bed = $('#s-bed').value, wake = $('#s-wake').value, hrs = parseFloat($('#s-sleep').value);
      if (!bed || !wake || isNaN(hrs)) { $('#s-info').textContent = 'Compila gli orari e le ore dormite.'; return; }
      var b = bed.split(':'), w = wake.split(':');
      var tib = ((+w[0] * 60 + +w[1]) - (+b[0] * 60 + +b[1]) + 1440) % 1440 / 60;
      var eff = tib > 0 ? Math.min(100, Math.round(hrs / tib * 100)) : 0;
      addEntry({ type: 'sleep', bed: bed, wake: wake, hours: hrs, tib: tib, eff: eff });
      $('#s-info').textContent = 'In letto ' + num(tib) + ' ore, dormito ' + num(hrs) + ': efficienza ' + eff + '%. Chi dorme bene sta di solito sopra il 90%, ma una notte sola dice poco: conta la tendenza.';
      renderDiary();
    });
    $('#ex-copy').addEventListener('click', function () {
      var t = summaryText(), info = $('#ex-info');
      function done(m) { info.textContent = m; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done('Copiato. Puoi incollarlo in un messaggio.'); }, function () { fallbackShare(t, done); });
      else fallbackShare(t, done);
    });
    $('#ex-csv').addEventListener('click', function () {
      var csv = toCsv(), info = $('#ex-info');
      var file = null;
      try { file = new File([csv], 'bonaccia-diario.csv', { type: 'text/csv' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Diario di Bonaccia' }).catch(function () {});
      } else {
        var a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'bonaccia-diario.csv' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        info.textContent = 'Fatto.';
      }
    });
    $('#ex-clear').addEventListener('click', function () {
      if (confirm('Cancello tutto: diario, note, mix salvati e taratura. Non si può annullare.')) { store.clearAll(); location.reload(); }
    });
  }
  function fallbackShare(t, done) {
    if (navigator.share) navigator.share({ text: t }).catch(function () {});
    else done('Non riesco a copiare da qui. Seleziona il testo dalle note e copialo a mano.');
  }

  function renderDiarySounds() {
    var box = $('#d-sound'); box.innerHTML = '';
    var names = ['Nessun suono'].concat(C.presets.map(function (p) { return p.name; })).concat(S.mixes.map(function (m) { return m.name; })).concat(['Il mio mix', 'Musica o altro']);
    var seen = {}; names = names.filter(function (n) { if (seen[n]) return false; seen[n] = 1; return true; });
    if (names.indexOf(dsel.sound) < 0) dsel.sound = 'Nessun suono';
    names.forEach(function (n) {
      box.appendChild(h('button', { class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(n === dsel.sound), text: n, onclick: function () {
        dsel.sound = n; $$('#d-sound .chip').forEach(function (c) { c.setAttribute('aria-checked', String(c.textContent === n)); });
      } }));
    });
  }

  function moods() { return diary().filter(function (e) { return e.type === 'mood'; }); }
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

  function renderChart() {
    var box = $('#chart'); box.innerHTML = '';
    var days = [], now = new Date(), i;
    for (i = 13; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); days.push({ d: d, k: dkey(d), ann: [], loud: [] }); }
    var map = {}; days.forEach(function (x) { map[x.k] = x; });
    moods().forEach(function (e) {
      var x = map[dkey(new Date(e.ts))]; if (!x) return;
      if (e.ann != null) x.ann.push(e.ann);
      if (e.loud != null) x.loud.push(e.loud);
    });
    var withData = days.filter(function (x) { return x.ann.length; });
    if (withData.length < 2) {
      box.appendChild(h('p', { class: 'empty', text: 'Il grafico compare quando hai segnato almeno due giorni diversi.' }));
      return;
    }
    var NS = 'http://www.w3.org/2000/svg', W = 320, Hh = 170, L = 26, R = 10, T = 10, Bm = 28;
    function X(i) { return L + (W - L - R) * i / 13; }
    function Y(v) { return T + (Hh - T - Bm) * (1 - v / 10); }
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Disturbo medio per giorno negli ultimi quattordici giorni');
    function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
    [0, 5, 10].forEach(function (v) {
      svg.appendChild(el('line', { class: 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }));
      var t = el('text', { class: 'axis', x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }); t.textContent = v; svg.appendChild(t);
    });
    [0, 6, 13].forEach(function (idx) {
      var t = el('text', { class: 'axis', x: X(idx), y: Hh - 8, 'text-anchor': idx === 0 ? 'start' : idx === 13 ? 'end' : 'middle' });
      t.textContent = days[idx].d.getDate() + '/' + (days[idx].d.getMonth() + 1); svg.appendChild(t);
    });
    function line(key, cls, dotCls) {
      var pts = [];
      days.forEach(function (x, idx) { if (x[key].length) pts.push([X(idx), Y(avg(x[key]))]); });
      if (pts.length > 1) svg.appendChild(el('polyline', { class: cls, points: pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') }));
      pts.forEach(function (p) { svg.appendChild(el('circle', { class: dotCls, cx: p[0], cy: p[1], r: 3.4 })); });
    }
    line('loud', 'l-loud', 'dot-loud');
    line('ann', 'l-ann', 'dot-ann');
    box.appendChild(h('div', { class: 'legend' }, [
      h('span', {}, [h('i'), 'Quanto disturba']), h('span', {}, [h('i', { class: 'dusk' }), 'Quanto si sente'])
    ]));
    box.appendChild(svg);
  }

  function groupAvg(keyFn) {
    var g = {};
    moods().forEach(function (e) {
      if (e.ann == null) return;
      var keys = keyFn(e);
      keys.forEach(function (k) { (g[k] = g[k] || []).push(e.ann); });
    });
    return g;
  }
  function renderInsights() {
    var box = $('#insights'); box.innerHTML = '';
    var snd = groupAvg(function (e) { return e.sound ? [e.sound] : []; });
    var whr = groupAvg(function (e) { return e.where || []; });
    var lines = [];
    Object.keys(snd).filter(function (k) { return snd[k].length >= 2; }).sort(function (a, b) { return avg(snd[a]) - avg(snd[b]); }).forEach(function (k) {
      lines.push(k + ': disturbo medio ' + num(avg(snd[k])) + ' su 10 (' + snd[k].length + ' note)');
    });
    var wl = [];
    ['In silenzio', 'In mezzo al rumore', 'A casa', 'Fuori', 'Al lavoro', 'A letto'].forEach(function (k) {
      if (whr[k] && whr[k].length >= 2) wl.push(k.toLowerCase() + ': ' + num(avg(whr[k])) + ' (' + whr[k].length + ' note)');
    });
    if (!lines.length && !wl.length) {
      box.appendChild(h('p', { class: 'empty', text: 'Con qualche nota in più (almeno due per suono o per luogo) compare qui cosa ti pesa di più e cosa ti dà più pace.' }));
      return;
    }
    if (lines.length) {
      box.appendChild(h('p', { class: 'ins', text: 'Disturbo medio per suono, dal più basso:' }));
      box.appendChild(h('ul', { class: 'ins' }, lines.map(function (t) { return h('li', { text: t }); })));
    }
    if (wl.length) {
      box.appendChild(h('p', { class: 'ins', text: 'Disturbo medio per luogo:' }));
      box.appendChild(h('ul', { class: 'ins' }, wl.map(function (t) { return h('li', { text: t }); })));
    }
    box.appendChild(h('p', { class: 'hint', text: 'Sono medie su poche note: servono a farti un’idea, non a decidere. Il suono più piacevole non è sempre il più utile.' }));
  }

  function renderEntries() {
    var box = $('#entries'); box.innerHTML = '';
    var a = diary().slice().reverse().slice(0, 8);
    if (!a.length) { box.appendChild(h('p', { class: 'empty', text: 'Ancora niente. Le note che salvi compaiono qui.' })); return; }
    a.forEach(function (e) {
      var d = new Date(e.ts), when = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      var body;
      if (e.type === 'sleep') body = 'Notte: in letto ' + num(e.tib) + ' h, dormito ' + num(e.hours) + ' h (efficienza ' + e.eff + '%)';
      else {
        var parts = [];
        if (e.ann != null) parts.push('disturbo ' + e.ann);
        if (e.loud != null) parts.push('volume ' + e.loud);
        if (e.str != null) parts.push('tensione ' + e.str);
        body = parts.join(', ');
        if (e.where && e.where.length) body += ' · ' + e.where.join(', ').toLowerCase();
        if (e.sound) body += ' · ' + e.sound.toLowerCase();
      }
      box.appendChild(h('div', { class: 'note' }, [
        h('small', { text: when }), h('span', { text: body + (e.note ? ' — ' + e.note : '') }),
        h('button', { type: 'button', text: 'Elimina', onclick: function () {
          saveDiary(diary().filter(function (x) { return x.id !== e.id; })); renderDiary();
        } })
      ]));
    });
  }
  function renderDiary() { renderChart(); renderInsights(); renderEntries(); }

  function summaryText() {
    var a = diary();
    if (!a.length) return 'Diario di Bonaccia: nessuna nota ancora.';
    var m = moods(), first = new Date(a[0].ts), last = new Date(a[a.length - 1].ts);
    var out = ['Diario di Bonaccia, dal ' + first.toLocaleDateString('it-IT') + ' al ' + last.toLocaleDateString('it-IT') + ' (' + a.length + ' note)'];
    var an = avg(m.filter(function (e) { return e.ann != null; }).map(function (e) { return e.ann; }));
    var lo = avg(m.filter(function (e) { return e.loud != null; }).map(function (e) { return e.loud; }));
    if (an != null) out.push('Disturbo medio: ' + num(an) + ' su 10.');
    if (lo != null) out.push('Volume percepito medio: ' + num(lo) + ' su 10.');
    var snd = groupAvg(function (e) { return e.sound ? [e.sound] : []; });
    Object.keys(snd).forEach(function (k) { out.push('Con «' + k + '»: disturbo medio ' + num(avg(snd[k])) + ' (' + snd[k].length + ' note)'); });
    out.push('', 'Ultime note:');
    a.slice(-15).forEach(function (e) {
      var d = new Date(e.ts), when = d.toLocaleDateString('it-IT') + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      if (e.type === 'sleep') out.push(when + ' sonno: letto ' + num(e.tib) + ' h, dormito ' + num(e.hours) + ' h (' + e.eff + '%)');
      else out.push(when + ' disturbo ' + e.ann + (e.loud != null ? ', volume ' + e.loud : '') + (e.str != null ? ', tensione ' + e.str : '') + (e.where && e.where.length ? ', ' + e.where.join('/') : '') + (e.sound ? ', suono: ' + e.sound : '') + (e.note ? ' — ' + e.note : ''));
    });
    return out.join('\n');
  }
  function toCsv() {
    function q(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
    var rows = [['data', 'ora', 'tipo', 'disturbo', 'volume', 'tensione', 'luoghi', 'suono', 'nota', 'ore_letto', 'ore_dormite', 'efficienza'].join(',')];
    diary().forEach(function (e) {
      var d = new Date(e.ts);
      rows.push([q(dkey(d)), q(pad(d.getHours()) + ':' + pad(d.getMinutes())), q(e.type), e.ann == null ? '' : e.ann, e.loud == null ? '' : e.loud,
        e.str == null ? '' : e.str, q((e.where || []).join('/')), q(e.sound), q(e.note), e.tib == null ? '' : num(e.tib, 2), e.hours == null ? '' : e.hours, e.eff == null ? '' : e.eff].join(','));
    });
    return '﻿' + rows.join('\n');
  }

  /* ================= CAPIRE ================= */
  function buildCapire() {
    var acc = $('#acc'); acc.innerHTML = '';
    C.capire.forEach(function (c, i) {
      acc.appendChild(h('details', { id: 'cap-' + c.id }, [h('summary', { text: c.title }), h('div', { class: 'body', html: c.html })]));
    });
    renderVersion();
  }

  /* versione e data dell'ultimo aggiornamento (js/version.js, scritto da tools/aggiorna.py) */
  function renderVersion() {
    var el = $('#app-version'), V = B.Version;
    if (!el || !V) return;
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(V.date || '');
    var mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    var quando = m ? parseInt(m[3], 10) + ' ' + mesi[parseInt(m[2], 10) - 1] + ' ' + m[1] + ', ore ' + m[4] + ':' + m[5] : '';
    el.innerHTML = 'Versione ' + V.v + (quando ? '<br>Ultimo aggiornamento: ' + quando : '') +
      '<span class="love">Made with love <span class="heart" aria-hidden="true">♥</span></span>';
  }

  /* ================= navigazione ================= */
  var VIEWS = ['ora', 'suoni', 'calma', 'sonno', 'diario', 'capire'], currentView = null;
  function route() {
    var v = (location.hash || '#ora').slice(1).split('/')[0];
    if (VIEWS.indexOf(v) < 0) v = 'ora';
    if (v === currentView) return;
    currentView = v;
    $$('.view').forEach(function (s) { s.hidden = s.id !== 'v-' + v; });
    $$('#tabs a').forEach(function (a) { if (a.getAttribute('data-tab') === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var sec = $('#v-' + v);
    document.title = (v === 'ora' ? '' : (sec ? sec.getAttribute('data-title') : '') + ' – ') + 'Bonaccia';
    window.scrollTo(0, 0);
    if (v === 'ora') { renderGreeting(); renderZonePanel(); }
    if (v === 'sonno') renderSonno();
    if (v === 'diario') { dsel.sound = soundName(); renderDiarySounds(); renderDiary(); }
    renderEngine(); kickField();
  }
  window.addEventListener('hashchange', route);

  /* ================= avvio ================= */
  E.masterV = clamp(S.master, 0, 1);
  E.source = S.src === 'synth' ? 'synth' : 'real';
  if (!S.layers) { var p0 = presetById('pioggia'); E.setLayers(p0.layers); S.current = 'pioggia'; }
  else E.setLayers(S.layers);
  E.setTitle(S.current && S.current.indexOf('mix:') === 0 ? S.current.slice(4) : (presetById(S.current) ? presetById(S.current).name : 'Il tuo mix'));

  buildPresets(); buildMixer(); buildTimerChips(); renderMixes();
  buildCalma(); renderCalma(); buildSonno(); buildDiary(); buildCapire();
  readColors(); applyTheme();
  route();
  renderEngine();

  setInterval(function () {
    E.tick(); updateNight();
    if (E.playing) {
      renderTimer();
      var left = E.timerLeft(); $('#mini-sub').textContent = E.timer && left != null ? 'Timer: ' + fmtLeft(left) : '';
    }
  }, 1000);

  if (window.matchMedia) {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!S.theme) applyTheme(); }); } catch (e) {}
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
