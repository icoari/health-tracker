(() => {
  'use strict';

  // ---------- Theme (synced with Bob via ?theme= URL param) ----------
  (function applyTheme() {
    const params = new URLSearchParams(location.search);
    let t = params.get('theme'); // 'light' | 'dark' | 'auto' | null
    if (t === 'auto' || !t) {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    if (t === 'light') document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');
  })();

  // ---------- Config ----------
  const STORAGE_KEY = 'health-tracker-v1';
  const START_DATE = '2026-05-14';     // début du traitement — base du rapport médecin
  const TOTAL_DAYS = 31;               // période de traitement (vue figée pour le médecin)
  const SLOTS = ['matin', 'midi', 'soir'];
  const SLOT_LABELS = { matin: 'Matin', midi: 'Midi', soir: 'Soir' };
  const SLOT_HOURS = { matin: '04h – 12h', midi: '12h – 18h', soir: '18h – 04h' };

  // Échelle de Bristol — standard clinique pour le transit. 3-4 = normal.
  const BRISTOL_LABELS = {
    1: 'Billes dures', 2: 'Grumeleux', 3: 'Fissuré',
    4: 'Lisse — idéal', 5: 'Morceaux mous', 6: 'Bouillie', 7: 'Liquide',
  };

  // Tags repas / contexte — la base de la recherche de déclencheurs.
  // « Amandes » a son propre tag : expérience ON/OFF/ON concluante à confirmer.
  const MEAL_TAGS = ['Amandes', 'Gras', 'Épicé', 'Lactose', 'Café', 'Alcool', 'Sucré', 'Cru', 'Resto'];

  // Taille du repas — le déclencheur principal identifié est la QUANTITÉ
  // (réflexe gastro-colique : plus l'estomac se distend, plus le côlon réagit).
  const MEAL_SIZES = [
    { id: 'leger',   label: 'Léger' },
    { id: 'normal',  label: 'Normal' },
    { id: 'copieux', label: 'Copieux' },
  ];

  const ICONS = {
    matin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    midi:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/></svg>',
    soir:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    pill:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5a7.07 7.07 0 0 1-10-10l10-10a7.07 7.07 0 0 1 10 10z"/><path d="m8.5 8.5 7 7"/></svg>',
    crise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    sympt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    meal:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="7" x2="19" y2="7"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="17" x2="14" y2="17"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    etat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><line x1="9" y1="9.5" x2="9.01" y2="9.5"/><line x1="15" y1="9.5" x2="15.01" y2="9.5"/></svg>',
    wc:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5C9 7 5.5 10.5 5.5 14a6.5 6.5 0 0 0 13 0c0-3.5-3.5-7-6.5-11.5z"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  // ---------- Event types (post-treatment continuous log) ----------
  // The day's calendar colour comes from « état » events (note 1-5).
  const EVENT_TYPES = {
    etat:  { label: 'État',  icon: 'etat'  },
    repas: { label: 'Repas', icon: 'meal'  },
    wc:    { label: 'WC',    icon: 'wc'    },
    crise: { label: 'Crise', icon: 'crise' },
  };

  // ---------- Haptics ----------
  function haptic(duration = 8) {
    try { if (navigator.vibrate) navigator.vibrate(duration); } catch {}
  }

  // ---------- Storage ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 2, startDate: START_DATE, entries: {}, events: [] };
      const parsed = JSON.parse(raw);
      if (!parsed.entries) parsed.entries = {};
      if (!Array.isArray(parsed.events)) parsed.events = [];   // event log (v2)
      return parsed;
    } catch {
      return { version: 2, startDate: START_DATE, entries: {}, events: [] };
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Storage failed', e);
    }
  }

  // Migrate boolean crise → number, ensure notes / criseTime are strings
  function migrate(state) {
    let changed = false;
    for (const date in state.entries) {
      for (const slot in state.entries[date]) {
        const e = state.entries[date][slot];
        if (typeof e.crise === 'boolean') {
          e.crise = e.crise ? 3 : 0;
          changed = true;
        }
        if (typeof e.notes !== 'string') {
          e.notes = '';
          changed = true;
        }
        if (typeof e.criseTime !== 'string') {
          e.criseTime = '';
          changed = true;
        }
      }
    }
    if (changed) saveState(state);
  }

  // ---------- Date utils ----------
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function dayNumber(key) {
    const start = parseKey(START_DATE);
    const cur = parseKey(key);
    const diff = Math.floor((cur - start) / 86400000);
    return diff + 1;
  }

  // Last day of the treatment phase (inclusive).
  function treatmentEndKey() {
    return dateKey(addDays(parseKey(START_DATE), TOTAL_DAYS - 1));
  }

  function isTreatmentDay(key) {
    return key >= START_DATE && key <= treatmentEndKey();
  }

  function formatDateLong(d) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(d);
  }

  function logicalToday() {
    const now = new Date();
    if (now.getHours() < 4) return addDays(now, -1);
    return now;
  }

  function currentSlot() {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return 'matin';
    if (h >= 12 && h < 18) return 'midi';
    return 'soir';
  }

  // ---------- State helpers ----------
  let state = loadState();
  migrate(state);

  function getEntry(key, slot) {
    return state.entries[key]?.[slot] || null;
  }

  function setEntry(key, slot, data) {
    if (!state.entries[key]) state.entries[key] = {};
    state.entries[key][slot] = { ...data, savedAt: new Date().toISOString() };
    saveState(state);
    // Only the soir slot silences the 23h reminder — pinging on every save
    // let an evening edit of the matin slot cancel the reminder wrongly.
    if (slot === 'soir') pingWorker(key);
  }

  // Tell the Bob Worker that something was logged today so the evening cron
  // reminder skips today. Best-effort, silent on offline / no sync.
  function pingWorker(date) {
    try {
      const raw = localStorage.getItem('bob-sync-v1');
      const sync = raw ? JSON.parse(raw) : null;
      if (!sync?.authToken) return;
      fetch('https://bob.jz7w76ry59.workers.dev/health/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sync.authToken },
        body: JSON.stringify({ date, slot: 'soir' }),
      }).catch(() => {});
    } catch {}
  }

  // ---------- Event log helpers ----------
  // A timestamp belongs to a logical day that flips at 04h (like the slots).
  function logicalKeyOfTs(ts) {
    const d = new Date(ts);
    if (d.getHours() < 4) return dateKey(addDays(d, -1));
    return dateKey(d);
  }

  // Timestamp to assign a new event for a given logical day: now if it's
  // today, else noon of that date (so it lands on the right day).
  function tsForKey(key) {
    if (key === dateKey(logicalToday())) return Date.now();
    const d = parseKey(key); d.setHours(12, 0, 0, 0); return d.getTime();
  }

  function eventsForKey(key) {
    return (state.events || [])
      .filter(e => logicalKeyOfTs(e.ts) === key)
      .sort((a, b) => a.ts - b.ts);
  }

  function addEvent(type, data, key) {
    if (!Array.isArray(state.events)) state.events = [];
    const ev = { id: uid(), ts: tsForKey(key), type, ...data };
    state.events.push(ev);
    saveState(state);
    pingWorker(key);
    return ev;
  }

  function updateEvent(id, patch) {
    const ev = (state.events || []).find(e => e.id === id);
    if (ev) { Object.assign(ev, patch); saveState(state); }
    return ev;
  }

  function removeEvent(id) {
    if (!Array.isArray(state.events)) return null;
    const i = state.events.findIndex(e => e.id === id);
    if (i < 0) return null;
    const [ev] = state.events.splice(i, 1);
    saveState(state);
    return ev;
  }

  function fmtClock(ts) {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Unified per-day rollup merging legacy slots + the event log. The calendar
  // colour and the markers read from here.
  function dayData(key) {
    let noteSum = 0, noteN = 0, hasCrise = false, hasComment = false, count = 0;
    const slots = state.entries[key];
    if (slots) {
      for (const s of SLOTS) {
        const e = slots[s];
        if (!e) continue;
        count++;
        if (typeof e.note === 'number') { noteSum += e.note; noteN++; }
        const c = typeof e.crise === 'number' ? e.crise : (e.crise ? 3 : 0);
        if (c > 0) hasCrise = true;
        if (e.notes && e.notes.trim()) hasComment = true;
      }
    }
    for (const ev of eventsForKey(key)) {
      count++;
      if (ev.type === 'etat' && typeof ev.note === 'number') { noteSum += ev.note; noteN++; }
      if (ev.type === 'crise') hasCrise = true;
      if (ev.type === 'wc' && ev.bristol >= 6) hasCrise = true;   // liquide ≈ crise
      if (ev.note_text && ev.note_text.trim()) hasComment = true;
    }
    return { avg: noteN ? noteSum / noteN : null, hasCrise, hasComment, count };
  }

  function deleteEntryStorage(key, slot) {
    if (!state.entries[key]) return;
    delete state.entries[key][slot];
    if (Object.keys(state.entries[key]).length === 0) {
      delete state.entries[key];
    }
    saveState(state);
  }

  // ---------- Rendering ----------
  function renderHeader() {
    const today = logicalToday();
    const key = dateKey(today);
    document.getElementById('dateLabel').textContent = formatDateLong(today);
    const n = dayNumber(key);
    let label;
    if (n < 1) {
      label = `Suivi commence le ${formatDateLong(parseKey(START_DATE))}`;
    } else if (n <= TOTAL_DAYS) {
      label = `Traitement · jour ${n} / ${TOTAL_DAYS}`;
    } else {
      label = `Suivi continu · J+${n - TOTAL_DAYS} après traitement`;
    }
    document.getElementById('progressLabel').textContent = label;
  }

  function buildSlotCard(key, slot, options = {}) {
    const { highlightCurrent = true, expandIfEmpty = false } = options;
    const initial = getEntry(key, slot);
    const isToday = key === dateKey(logicalToday());
    const isCurrent = isToday && slot === currentSlot() && highlightCurrent;

    let hasEntry = !!initial;
    // Compact by default unless this is the active slot we want to keep open
    const startsCompact = hasEntry || !(isCurrent || expandIfEmpty);

    let draft = initial
      ? {
          note: initial.note,
          cachet: !!initial.cachet,
          crise: typeof initial.crise === 'number' ? initial.crise : (initial.crise ? 3 : 0),
          criseTime: typeof initial.criseTime === 'string' ? initial.criseTime : '',
          notes: typeof initial.notes === 'string' ? initial.notes : '',
          douleur: typeof initial.douleur === 'number' ? initial.douleur : 0,
          transit: typeof initial.transit === 'number' ? initial.transit : 0,
          stress: typeof initial.stress === 'number' ? initial.stress : 0,
          tags: Array.isArray(initial.tags) ? [...initial.tags] : [],
          repas: typeof initial.repas === 'string' ? initial.repas : '',
        }
      : { note: null, cachet: false, crise: 0, criseTime: '', notes: '', douleur: 0, transit: 0, stress: 0, tags: [], repas: '' };

    const card = document.createElement('article');
    card.className = 'slot';
    card.dataset.slot = slot;
    card.dataset.date = key;
    if (hasEntry) card.classList.add('slot--has-entry');
    if (startsCompact) card.classList.add('slot--compact');
    if (isCurrent && !hasEntry) card.classList.add('slot--current');

    card.innerHTML = `
      <div class="slot__head">
        <span class="slot__icon">${ICONS[slot]}</span>
        <span class="slot__label">${SLOT_LABELS[slot]}</span>
        <span class="slot__summary">
          <span class="slot__note" data-note></span>
          <span class="slot__tags" data-tags></span>
        </span>
        <span class="slot__hours" data-hours>${SLOT_HOURS[slot]}</span>
      </div>
      <div class="slot__body">
        <div class="note-row">
          <span class="note-row__label">Note</span>
          <div class="note-dots" data-dots="note">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
          </div>
        </div>
        <button type="button" class="toggle toggle--cachet" data-toggle="cachet">
          <span class="toggle__label">${ICONS.pill}<span>Cachet pris</span></span>
          <span class="toggle__switch"></span>
        </button>
        <div class="reveal-block">
          <button type="button" class="toggle toggle--crise" data-toggle="crise">
            <span class="toggle__label">${ICONS.crise}<span>Crise</span></span>
            <span class="toggle__switch"></span>
          </button>
          <div class="reveal-block__content" data-reveal="crise">
            <div class="note-dots note-dots--crise" data-dots="crise">
              ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
            </div>
            <div class="time-row">
              <span class="time-row__label">Heure</span>
              <input type="time" class="time-input" data-crise-time>
            </div>
          </div>
        </div>
        <div class="reveal-block">
          <button type="button" class="toggle toggle--sympt" data-toggle="sympt">
            <span class="toggle__label">${ICONS.sympt}<span>Symptômes</span></span>
            <span class="toggle__switch"></span>
          </button>
          <div class="reveal-block__content reveal-block__content--tall" data-reveal="sympt">
            <div class="note-row">
              <span class="note-row__label">Douleur</span>
              <div class="note-dots note-dots--crise" data-dots="douleur">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
              </div>
            </div>
            <div class="note-row" style="margin-top:12px">
              <span class="note-row__label">Transit</span>
              <div class="note-dots note-dots--bristol" data-dots="transit">
                ${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" class="note-dot note-dot--sm" data-value="${n}">${n}</button>`).join('')}
              </div>
            </div>
            <div class="bristol-caption" data-bristol-caption>Échelle de Bristol · 3-4 = normal</div>
            <div class="note-row" style="margin-top:12px">
              <span class="note-row__label">Stress</span>
              <div class="note-dots" data-dots="stress">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="reveal-block">
          <button type="button" class="toggle toggle--meal" data-toggle="meal">
            <span class="toggle__label">${ICONS.meal}<span>Repas</span></span>
            <span class="toggle__switch"></span>
          </button>
          <div class="reveal-block__content reveal-block__content--tall" data-reveal="meal">
            <div class="note-row">
              <span class="note-row__label">Taille</span>
              <div class="size-chips" data-size-box>
                ${MEAL_SIZES.map(m => `<button type="button" class="tag-chip" data-size="${m.id}">${m.label}</button>`).join('')}
              </div>
            </div>
            <div class="tag-chips" data-tags-box style="margin-top:12px">
              ${MEAL_TAGS.map(t => `<button type="button" class="tag-chip" data-tag="${t}">${t}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="reveal-block">
          <button type="button" class="toggle toggle--notes" data-toggle="notes">
            <span class="toggle__label">${ICONS.notes}<span>Commentaire</span></span>
            <span class="toggle__switch"></span>
          </button>
          <div class="reveal-block__content" data-reveal="notes">
            <textarea class="notes-input" rows="3" placeholder="Ressenti, contexte, déclencheur suspect…" data-notes></textarea>
          </div>
        </div>
      </div>
      <button type="button" class="slot__delete" data-delete title="Supprimer cette entrée" aria-label="Supprimer">
        ${ICONS.trash}
      </button>
    `;

    const noteDots = card.querySelectorAll('[data-dots="note"] .note-dot');
    const criseDots = card.querySelectorAll('[data-dots="crise"] .note-dot');
    const douleurDots = card.querySelectorAll('[data-dots="douleur"] .note-dot');
    const transitDots = card.querySelectorAll('[data-dots="transit"] .note-dot');
    const stressDots = card.querySelectorAll('[data-dots="stress"] .note-dot');
    const tagChips = card.querySelectorAll('[data-tag]');
    const sizeChips = card.querySelectorAll('[data-size]');
    const cachetBtn = card.querySelector('[data-toggle="cachet"]');
    const criseBtn = card.querySelector('[data-toggle="crise"]');
    const symptBtn = card.querySelector('[data-toggle="sympt"]');
    const mealBtn = card.querySelector('[data-toggle="meal"]');
    const notesBtn = card.querySelector('[data-toggle="notes"]');
    const criseReveal = card.querySelector('[data-reveal="crise"]');
    const symptReveal = card.querySelector('[data-reveal="sympt"]');
    const mealReveal = card.querySelector('[data-reveal="meal"]');
    const notesReveal = card.querySelector('[data-reveal="notes"]');
    const bristolCaption = card.querySelector('[data-bristol-caption]');
    const notesInput = card.querySelector('[data-notes]');
    const criseTimeInput = card.querySelector('[data-crise-time]');
    const deleteBtn = card.querySelector('[data-delete]');
    const noteEl = card.querySelector('[data-note]');
    const tagsEl = card.querySelector('[data-tags]');

    notesInput.value = draft.notes || '';
    criseTimeInput.value = draft.criseTime || '';

    function refreshControls() {
      noteDots.forEach(d => {
        d.classList.toggle('note-dot--active', Number(d.dataset.value) === draft.note);
      });
      criseDots.forEach(d => {
        const v = Number(d.dataset.value);
        d.classList.toggle('note-dot--active', draft.crise > 0 && v <= draft.crise);
      });
      douleurDots.forEach(d => {
        const v = Number(d.dataset.value);
        d.classList.toggle('note-dot--active', draft.douleur > 0 && v <= draft.douleur);
      });
      transitDots.forEach(d => {
        d.classList.toggle('note-dot--active', Number(d.dataset.value) === draft.transit);
      });
      stressDots.forEach(d => {
        const v = Number(d.dataset.value);
        d.classList.toggle('note-dot--active', draft.stress > 0 && v <= draft.stress);
      });
      tagChips.forEach(c => {
        c.classList.toggle('tag-chip--active', draft.tags.includes(c.dataset.tag));
      });
      sizeChips.forEach(c => {
        c.classList.toggle('tag-chip--active', draft.repas === c.dataset.size);
      });
      if (bristolCaption) {
        bristolCaption.textContent = draft.transit > 0
          ? `Bristol ${draft.transit} · ${BRISTOL_LABELS[draft.transit]}`
          : 'Échelle de Bristol · 3-4 = normal';
      }
      cachetBtn.classList.toggle('toggle--on', draft.cachet);
      criseBtn.classList.toggle('toggle--on', draft.crise > 0);
      criseReveal.classList.toggle('reveal-block__content--open', draft.crise > 0);
      symptBtn.classList.toggle('toggle--on', symptOpen);
      symptReveal.classList.toggle('reveal-block__content--open', symptOpen);
      mealBtn.classList.toggle('toggle--on', mealOpen);
      mealReveal.classList.toggle('reveal-block__content--open', mealOpen);
      notesBtn.classList.toggle('toggle--on', notesOpen);
      notesReveal.classList.toggle('reveal-block__content--open', notesOpen);
    }

    function refreshSummary() {
      const e = getEntry(key, slot);
      if (e) {
        noteEl.textContent = e.note;
        const tags = [];
        if (e.cachet) tags.push('<span class="slot__tag">Cachet</span>');
        const c = typeof e.crise === 'number' ? e.crise : (e.crise ? 3 : 0);
        if (c > 0) tags.push(`<span class="slot__tag slot__tag--crise">Crise ${c}/5</span>`);
        if (e.douleur > 0) tags.push(`<span class="slot__tag slot__tag--crise">Douleur ${e.douleur}</span>`);
        if (e.transit >= 6 || (e.transit >= 1 && e.transit <= 2)) tags.push(`<span class="slot__tag slot__tag--crise">B${e.transit}</span>`);
        else if (e.transit > 0) tags.push(`<span class="slot__tag">B${e.transit}</span>`);
        if (e.repas === 'copieux') tags.push('<span class="slot__tag">Copieux</span>');
        if (Array.isArray(e.tags) && e.tags.length) tags.push(`<span class="slot__tag slot__tag--notes">${e.tags.length} tag${e.tags.length > 1 ? 's' : ''}</span>`);
        if (e.notes && e.notes.trim()) tags.push('<span class="slot__tag slot__tag--notes">Note</span>');
        tagsEl.innerHTML = tags.join('');
      } else {
        noteEl.textContent = '';
        tagsEl.innerHTML = '';
      }
    }

    function flashSaved() {
      card.classList.add('slot--saved');
      setTimeout(() => card.classList.remove('slot--saved'), 700);
    }

    function commit() {
      if (draft.note === null) {
        // Make the missing-note state visible — the secondary fields look
        // saved but nothing persists without a note.
        const row = card.querySelector('[data-dots="note"]');
        if (row) {
          row.classList.remove('note-dots--required');
          void row.offsetWidth;   // restart the animation
          row.classList.add('note-dots--required');
        }
        return;
      }
      setEntry(key, slot, {
        note: draft.note,
        cachet: draft.cachet,
        crise: draft.crise,
        criseTime: draft.crise > 0 ? (draft.criseTime || '') : '',
        notes: (draft.notes || '').trim(),
        douleur: draft.douleur,
        transit: draft.transit,
        stress: draft.stress,
        tags: [...draft.tags],
        repas: draft.repas || '',
      });
      hasEntry = true;
      card.classList.add('slot--has-entry');
      refreshSummary();
      renderHeatmap();
      renderStats();
      flashSaved();
    }

    function resetDeleteState() {
      deleteArmed = false;
      clearTimeout(deleteTimeout);
      deleteBtn.classList.remove('slot__delete--armed');
    }

    let deleteArmed = false;
    let deleteTimeout = null;
    let notesOpen = !!(draft.notes && draft.notes.trim());
    let symptOpen = draft.douleur > 0 || draft.transit > 0 || draft.stress > 0;
    let mealOpen = draft.tags.length > 0 || !!draft.repas;
    let notesDebounce = null;

    // --- Note dots ---
    noteDots.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(8);
        draft.note = Number(d.dataset.value);
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    // --- Crise dots ---
    criseDots.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(8);
        const v = Number(d.dataset.value);
        const wasOff = draft.crise === 0;
        draft.crise = (v === draft.crise) ? 0 : v;
        if (draft.crise === 0) {
          draft.criseTime = '';
          criseTimeInput.value = '';
        } else if (wasOff && !draft.criseTime) {
          const now = new Date();
          draft.criseTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          criseTimeInput.value = draft.criseTime;
        }
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    // --- Cachet toggle ---
    cachetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(8);
      draft.cachet = !draft.cachet;
      resetDeleteState();
      refreshControls();
      commit();
    });

    // --- Crise toggle ---
    criseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(8);
      if (draft.crise > 0) {
        draft.crise = 0;
        draft.criseTime = '';
        criseTimeInput.value = '';
      } else {
        draft.crise = 1;
        if (!draft.criseTime) {
          const now = new Date();
          draft.criseTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          criseTimeInput.value = draft.criseTime;
        }
      }
      resetDeleteState();
      refreshControls();
      commit();
    });

    // --- Crise time input ---
    criseTimeInput.addEventListener('click', (e) => e.stopPropagation());
    criseTimeInput.addEventListener('change', (e) => {
      e.stopPropagation();
      draft.criseTime = criseTimeInput.value;
      if (draft.note !== null) commit();
    });

    // --- Douleur / Transit / Stress dots ---
    douleurDots.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(8);
        const v = Number(d.dataset.value);
        draft.douleur = (v === draft.douleur) ? 0 : v;
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    transitDots.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(8);
        const v = Number(d.dataset.value);
        draft.transit = (v === draft.transit) ? 0 : v;
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    stressDots.forEach(d => {
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(8);
        const v = Number(d.dataset.value);
        draft.stress = (v === draft.stress) ? 0 : v;
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    // --- Tag chips ---
    tagChips.forEach(c => {
      c.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(6);
        const t = c.dataset.tag;
        const i = draft.tags.indexOf(t);
        if (i >= 0) draft.tags.splice(i, 1);
        else draft.tags.push(t);
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    // --- Taille du repas (single-select, re-tap to clear) ---
    sizeChips.forEach(c => {
      c.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(6);
        const v = c.dataset.size;
        draft.repas = (draft.repas === v) ? '' : v;
        resetDeleteState();
        refreshControls();
        commit();
      });
    });

    // --- Symptômes / Repas toggles (expand/collapse only) ---
    symptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(8);
      symptOpen = !symptOpen;
      resetDeleteState();
      refreshControls();
    });

    mealBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(8);
      mealOpen = !mealOpen;
      resetDeleteState();
      refreshControls();
    });

    // --- Notes toggle (expand/collapse only, never destructive) ---
    notesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(8);
      notesOpen = !notesOpen;
      resetDeleteState();
      refreshControls();
      if (notesOpen) setTimeout(() => notesInput.focus(), 240);
    });

    // --- Notes textarea ---
    notesInput.addEventListener('click', (e) => e.stopPropagation());
    notesInput.addEventListener('input', (e) => {
      e.stopPropagation();
      draft.notes = notesInput.value;
      clearTimeout(notesDebounce);
      notesDebounce = setTimeout(() => {
        if (draft.note !== null) commit();
      }, 700);
    });
    notesInput.addEventListener('blur', () => {
      clearTimeout(notesDebounce);
      if (draft.note !== null) commit();
    });

    // --- Delete with 2-tap confirm ---
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(12);
      if (!deleteArmed) {
        deleteArmed = true;
        deleteBtn.classList.add('slot__delete--armed');
        deleteTimeout = setTimeout(resetDeleteState, 3000);
      } else {
        resetDeleteState();
        deleteEntryStorage(key, slot);
        draft = { note: null, cachet: false, crise: 0, criseTime: '', notes: '', douleur: 0, transit: 0, stress: 0, tags: [], repas: '' };
        notesInput.value = '';
        criseTimeInput.value = '';
        notesOpen = false;
        symptOpen = false;
        mealOpen = false;
        hasEntry = false;
        card.classList.remove('slot--has-entry');
        card.classList.remove('slot--compact');
        refreshControls();
        refreshSummary();
        renderHeatmap();
        renderStats();
        haptic(20);
      }
    });

    // --- Tap to expand a compact card (filled or empty) ---
    card.addEventListener('click', () => {
      if (!card.classList.contains('slot--compact')) return;
      card.classList.remove('slot--compact');
    });

    refreshControls();
    refreshSummary();

    return card;
  }

  // ========================================================================
  // Quick capture — one entry in a couple of taps. Tap a type, tap a value,
  // it's saved with a timestamp. Optional details amend the just-saved entry.
  // ========================================================================
  const BRISTOL_HUE = { 1: 6, 2: 28, 3: 138, 4: 138, 5: 95, 6: 28, 7: 6 };  // 3-4 green, extremes red

  function quickCapture(host, key, refresh) {
    host.classList.add('capture');
    host.innerHTML = `
      <div class="capture__grid">
        ${Object.entries(EVENT_TYPES).map(([id, t]) =>
          `<button class="cap-btn cap-btn--${id}" data-cap="${id}" type="button">
             <span class="cap-btn__icon">${ICONS[t.icon]}</span>
             <span class="cap-btn__label">${t.label}</span>
           </button>`).join('')}
      </div>
      <div class="cap-picker" data-picker hidden></div>
    `;
    const grid = host.querySelector('.capture__grid');
    const picker = host.querySelector('[data-picker]');
    let activeType = null, lastId = null, autoTimer = null;

    function armAutoClose() {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(close, 6000);
    }
    function close() {
      clearTimeout(autoTimer);
      activeType = null; lastId = null;
      picker.hidden = true; picker.innerHTML = '';
      grid.querySelectorAll('.cap-btn').forEach(b => b.classList.remove('cap-btn--active'));
    }

    function dots(n, cls = '') {
      let h = `<div class="cap-dots ${cls}">`;
      for (let i = 1; i <= n; i++) h += `<button type="button" class="cap-dot" data-v="${i}">${i}</button>`;
      return h + '</div>';
    }

    function confirmLine(text) {
      return `<div class="cap-confirm"><span class="cap-confirm__check">✓</span> ${escapeHtml(text)}</div>`;
    }

    function openType(type) {
      activeType = type; lastId = null;
      grid.querySelectorAll('.cap-btn').forEach(b => b.classList.toggle('cap-btn--active', b.dataset.cap === type));
      picker.hidden = false;
      renderPicker();
      armAutoClose();
    }

    function renderPicker() {
      if (activeType === 'etat') {
        picker.innerHTML = `
          <div class="cap-picker__head"><span>Comment tu te sens ?</span>${closeBtn()}</div>
          ${dots(5, 'cap-dots--scale')}
          <div data-after></div>`;
      } else if (activeType === 'wc') {
        picker.innerHTML = `
          <div class="cap-picker__head"><span>Type de selle (Bristol)</span>${closeBtn()}</div>
          ${dots(7, 'cap-dots--bristol')}
          <div class="cap-hint">1-2 dur · 3-4 idéal · 6-7 liquide</div>
          <div data-after></div>`;
      } else if (activeType === 'crise') {
        picker.innerHTML = `
          <div class="cap-picker__head"><span>Intensité de la crise</span>${closeBtn()}</div>
          ${dots(5, 'cap-dots--crise')}
          <div data-after></div>`;
      } else if (activeType === 'repas') {
        picker.innerHTML = `
          <div class="cap-picker__head"><span>Quantité du repas</span>${closeBtn()}</div>
          <div class="cap-sizes">
            ${MEAL_SIZES.map(m => `<button type="button" class="cap-size" data-size="${m.id}">${m.label}</button>`).join('')}
          </div>
          <div data-after></div>`;
      }
      wirePicker();
    }

    function closeBtn() { return `<button type="button" class="cap-x" data-close aria-label="Fermer">${ICONS.close}</button>`; }

    function wirePicker() {
      picker.querySelector('[data-close]')?.addEventListener('click', close);

      // primary value dots
      // First tap creates the entry; re-tapping a different value AMENDS it
      // (changing your mind makes no duplicate).
      picker.querySelectorAll('.cap-dot').forEach(d => {
        d.addEventListener('click', () => {
          haptic(10);
          const v = Number(d.dataset.v);
          const field = activeType === 'etat' ? 'note' : activeType === 'wc' ? 'bristol' : 'intensity';
          if (lastId) updateEvent(lastId, { [field]: v });
          else { const ev = addEvent(activeType, { [field]: v }, key); lastId = ev.id; }
          if (activeType === 'etat')  afterEtat(v);
          else if (activeType === 'wc')    afterWc(v);
          else if (activeType === 'crise') afterCrise(v);
          refresh();
          armAutoClose();
        });
      });

      // meal sizes
      picker.querySelectorAll('.cap-size').forEach(b => {
        b.addEventListener('click', () => {
          haptic(10);
          const size = b.dataset.size;
          if (!lastId) { const ev = addEvent('repas', { size, tags: [] }, key); lastId = ev.id; }
          else updateEvent(lastId, { size });
          picker.querySelectorAll('.cap-size').forEach(x => x.classList.toggle('cap-size--active', x === b));
          afterRepas();
          refresh();
          armAutoClose();
        });
      });
    }

    // ---- post-primary "amend last entry" panels ----
    function afterEtat(v) {
      const after = picker.querySelector('[data-after]');
      after.innerHTML = `
        ${confirmLine(`État ${v}/5 enregistré à ${fmtClock(Date.now())}`)}
        <div class="cap-extra">
          <div class="cap-extra__row"><span>Douleur ventre</span>${dotsMini('douleur')}</div>
          <div class="cap-extra__row"><span>Stress</span>${dotsMini('stress')}</div>
        </div>`;
      wireMini(after);
    }
    function afterCrise(v) {
      const after = picker.querySelector('[data-after]');
      after.innerHTML = `
        ${confirmLine(`Crise ${v}/5 enregistrée à ${fmtClock(Date.now())}`)}
        <button type="button" class="cap-toggle" data-lop>${ICONS.pill}<span>Lopéramide pris</span></button>`;
      after.querySelector('[data-lop]').addEventListener('click', (e) => {
        haptic(8);
        const on = !e.currentTarget.classList.contains('cap-toggle--on');
        e.currentTarget.classList.toggle('cap-toggle--on', on);
        updateEvent(lastId, { loperamide: on });
        refresh(); armAutoClose();
      });
    }
    function afterWc(v) {
      const after = picker.querySelector('[data-after]');
      after.innerHTML = confirmLine(`Bristol ${v} · ${BRISTOL_LABELS[v]} — ${fmtClock(Date.now())}`);
    }
    function afterRepas() {
      const after = picker.querySelector('[data-after]');
      const ev = (state.events || []).find(e => e.id === lastId);
      const tags = ev?.tags || [];
      after.innerHTML = `
        ${confirmLine(`Repas enregistré à ${fmtClock(ev ? ev.ts : Date.now())}`)}
        <div class="cap-tags">
          ${MEAL_TAGS.map(t => `<button type="button" class="cap-tag ${tags.includes(t) ? 'cap-tag--active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>`;
      after.querySelectorAll('[data-tag]').forEach(b => {
        b.addEventListener('click', () => {
          haptic(6);
          const cur = (state.events || []).find(e => e.id === lastId);
          if (!cur) return;
          const arr = Array.isArray(cur.tags) ? [...cur.tags] : [];
          const t = b.dataset.tag;
          const i = arr.indexOf(t);
          if (i >= 0) arr.splice(i, 1); else arr.push(t);
          updateEvent(lastId, { tags: arr });
          b.classList.toggle('cap-tag--active');
          refresh(); armAutoClose();
        });
      });
    }

    function dotsMini(field) {
      let h = `<div class="cap-dots cap-dots--mini" data-mini="${field}">`;
      for (let i = 1; i <= 5; i++) h += `<button type="button" class="cap-dot cap-dot--mini" data-v="${i}">${i}</button>`;
      return h + '</div>';
    }
    function wireMini(scope) {
      scope.querySelectorAll('[data-mini]').forEach(row => {
        const field = row.dataset.mini;
        row.querySelectorAll('.cap-dot').forEach(d => {
          d.addEventListener('click', () => {
            haptic(6);
            const v = Number(d.dataset.v);
            const cur = (state.events || []).find(e => e.id === lastId);
            const newVal = cur && cur[field] === v ? 0 : v;
            updateEvent(lastId, { [field]: newVal });
            row.querySelectorAll('.cap-dot').forEach(x =>
              x.classList.toggle('cap-dot--active', newVal > 0 && Number(x.dataset.v) <= newVal));
            refresh(); armAutoClose();
          });
        });
      });
    }

    grid.querySelectorAll('[data-cap]').forEach(b => {
      b.addEventListener('click', () => {
        haptic(8);
        if (activeType === b.dataset.cap) { close(); return; }
        openType(b.dataset.cap);
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------- Today / day timeline ----------
  function eventSummary(ev) {
    if (ev.type === 'etat') {
      const bits = [`État ${ev.note}/5`];
      if (ev.douleur > 0) bits.push(`douleur ${ev.douleur}`);
      if (ev.stress > 0) bits.push(`stress ${ev.stress}`);
      return bits.join(' · ');
    }
    if (ev.type === 'repas') {
      const size = MEAL_SIZES.find(m => m.id === ev.size)?.label || 'Repas';
      const tags = (ev.tags || []).length ? ' · ' + ev.tags.join(', ') : '';
      return `${size}${tags}`;
    }
    if (ev.type === 'wc') return `Bristol ${ev.bristol} · ${BRISTOL_LABELS[ev.bristol]}`;
    if (ev.type === 'crise') return `Crise ${ev.intensity}/5${ev.loperamide ? ' · Lopéramide' : ''}`;
    return ev.type;
  }

  function isBadEvent(ev) {
    return (ev.type === 'crise') || (ev.type === 'wc' && (ev.bristol >= 6 || ev.bristol <= 2));
  }

  let undoTimer = null;
  function renderTimeline(host, key, refresh) {
    const evs = eventsForKey(key).slice().reverse();   // newest first
    if (evs.length === 0) {
      host.innerHTML = '<div class="timeline__empty">Aucune entrée. Tape un bouton ci-dessus.</div>';
      return;
    }
    host.innerHTML = `<div class="timeline__list">${evs.map(ev => `
      <div class="tl-row tl-row--${ev.type} ${isBadEvent(ev) ? 'tl-row--bad' : ''}" data-id="${ev.id}">
        <span class="tl-row__time">${fmtClock(ev.ts)}</span>
        <span class="tl-row__icon">${ICONS[EVENT_TYPES[ev.type].icon]}</span>
        <span class="tl-row__text">${escapeHtml(eventSummary(ev))}</span>
        <button class="tl-row__del" data-del="${ev.id}" type="button" aria-label="Supprimer">${ICONS.trash}</button>
      </div>`).join('')}</div>
      <div class="tl-undo" data-undo hidden></div>`;

    host.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        haptic(12);
        const removed = removeEvent(b.dataset.del);
        refresh();
        if (removed) showUndo(host, removed, refresh);
      });
    });
  }

  function showUndo(host, removed, refresh) {
    const bar = host.querySelector('[data-undo]');
    if (!bar) return;
    bar.hidden = false;
    bar.innerHTML = `<span>Entrée supprimée</span><button type="button" data-restore>Annuler</button>`;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { bar.hidden = true; }, 5000);
    bar.querySelector('[data-restore]').addEventListener('click', () => {
      if (!Array.isArray(state.events)) state.events = [];
      state.events.push(removed);
      saveState(state);
      clearTimeout(undoTimer);
      refresh();
    });
  }

  // Color scale: 1 = red (bad), 5 = green (good)
  function bandColor(note) {
    if (!note) return '';
    const isLight = document.body.classList.contains('theme-light');
    const hues = { 1: 6, 2: 28, 3: 50, 4: 95, 5: 138 };
    const hue = hues[note] ?? 50;
    const s = isLight ? 70 : 58;
    const l = isLight ? 56 : 46;
    const a = isLight ? 0.62 : 0.58;
    return `hsla(${hue}, ${s}%, ${l}%, ${a})`;
  }

  // ---------- Calendar (month view, navigable) ----------
  let viewYear, viewMonth;   // initialised at startup to the logical today
  let calView = 'month';     // 'month' | 'treatment' (legacy doctor view)

  function initMonthView() {
    const t = logicalToday();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    document.getElementById('monthPrev').addEventListener('click', () => {
      haptic(4);
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderHeatmap();
    });
    document.getElementById('monthNext').addEventListener('click', () => {
      haptic(4);
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderHeatmap();
    });
    document.getElementById('calViewToggle').addEventListener('click', () => {
      haptic(6);
      calView = calView === 'month' ? 'treatment' : 'month';
      const btn = document.getElementById('calViewToggle');
      btn.textContent = calView === 'month' ? 'Vue traitement' : 'Vue mensuelle';
      btn.classList.toggle('month-nav__toggle--active', calView === 'treatment');
      const showNav = calView === 'month';
      document.getElementById('monthPrev').style.display = showNav ? '' : 'none';
      document.getElementById('monthNext').style.display = showNav ? '' : 'none';
      renderHeatmap();
    });
  }

  // Legacy 31-day strip — the exact view used during the treatment, kept
  // verbatim for the doctor consultation.
  function renderTreatmentStrip(container, todayKey, logicalLimit) {
    document.getElementById('monthLabel').textContent = `Traitement · ${formatDateLong(parseKey(START_DATE))} → ${formatDateLong(parseKey(treatmentEndKey()))}`;
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = addDays(parseKey(START_DATE), i);
      const key = dateKey(d);
      const dayEntry = state.entries[key] || {};
      const isFuture = d >= logicalLimit;
      const isToday = key === todayKey;

      const cell = document.createElement('div');
      cell.className = 'day';
      if (isToday) cell.classList.add('day--today');
      if (isFuture) cell.classList.add('day--future');
      cell.style.animationDelay = `${i * 14}ms`;
      cell.dataset.date = key;

      const bands = document.createElement('div');
      bands.className = 'day__bands';
      const tipLines = [formatDateLong(d)];

      SLOTS.forEach(s => {
        const band = document.createElement('div');
        band.className = 'day__band';
        const e = dayEntry[s];
        if (e) {
          const bg = bandColor(e.note);
          if (bg) band.style.background = bg;
          const c = typeof e.crise === 'number' ? e.crise : (e.crise ? 3 : 0);
          if (c > 0) band.classList.add('day__band--crise');
          if (e.notes && e.notes.trim()) band.classList.add('day__band--comment');
          let line = `${SLOT_LABELS[s]} · ${e.note}/5`;
          if (e.cachet) line += ' · cachet';
          if (c > 0) line += ` · crise ${c}/5${e.criseTime ? ' à ' + e.criseTime : ''}`;
          tipLines.push(line);
        }
        bands.appendChild(band);
      });

      cell.appendChild(bands);
      cell.title = tipLines.join('\n');

      const num = document.createElement('span');
      num.className = 'day__num';
      num.textContent = d.getDate();
      cell.appendChild(num);

      if (!isFuture) {
        cell.addEventListener('click', (e) => { e.stopPropagation(); haptic(6); openModalFor(key); });
      }
      container.appendChild(cell);
    }
    document.getElementById('monthLegend').innerHTML = '';
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';
    const todayKey = dateKey(logicalToday());
    const logicalLimit = addDays(parseKey(todayKey), 1);

    if (calView === 'treatment') {
      renderTreatmentStrip(container, todayKey, logicalLimit);
      return;
    }

    document.getElementById('monthLabel').textContent =
      new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1));

    // Calendar-aligned grid: pad to the Monday of the first week.
    const first = new Date(viewYear, viewMonth, 1);
    const padDays = (first.getDay() + 6) % 7;   // 0 = Monday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let p = 0; p < padDays; p++) {
      const pad = document.createElement('div');
      pad.className = 'day day--pad';
      container.appendChild(pad);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      const key = dateKey(d);
      const isFuture = d >= logicalLimit;
      const isToday = key === todayKey;
      const beforeStart = key < START_DATE;
      const data = dayData(key);

      const cell = document.createElement('div');
      cell.className = 'day';
      if (isToday) cell.classList.add('day--today');
      if (isFuture || beforeStart) cell.classList.add('day--future');
      if (isTreatmentDay(key)) cell.classList.add('day--treatment');
      cell.style.animationDelay = `${i * 10}ms`;
      cell.dataset.date = key;

      // Single fill from the day's unified état colour.
      const bands = document.createElement('div');
      bands.className = 'day__bands';
      const band = document.createElement('div');
      band.className = 'day__band';
      const rounded = data.avg != null ? Math.round(data.avg) : 0;
      const bg = bandColor(rounded);
      if (bg) band.style.background = bg;
      if (data.hasCrise) band.classList.add('day__band--crise');
      if (data.hasComment) band.classList.add('day__band--comment');
      bands.appendChild(band);
      cell.appendChild(bands);

      // Tooltip
      const tip = [formatDateLong(d)];
      if (data.avg != null) tip.push(`état moyen ${data.avg.toFixed(1)}/5`);
      if (data.hasCrise) tip.push('crise');
      if (data.count) tip.push(`${data.count} entrée${data.count > 1 ? 's' : ''}`);
      cell.title = tip.join(' · ');

      const num = document.createElement('span');
      num.className = 'day__num';
      num.textContent = i;
      cell.appendChild(num);

      if (!isFuture && !beforeStart) {
        cell.addEventListener('click', (e) => { e.stopPropagation(); haptic(6); openModalFor(key); });
      }

      container.appendChild(cell);
    }

    // Legend: only when the visible month overlaps the treatment window.
    const legendEl = document.getElementById('monthLegend');
    const monthStartKey = dateKey(new Date(viewYear, viewMonth, 1));
    const monthEndKey = dateKey(new Date(viewYear, viewMonth, daysInMonth));
    const overlapsTreatment = monthStartKey <= treatmentEndKey() && monthEndKey >= START_DATE;
    legendEl.innerHTML = overlapsTreatment
      ? '<span class="month__legend-dot"></span> période de traitement'
      : '';
  }

  // ---------- Stats trend card ----------
  let statsRange = 'treatment';   // 'treatment' | 'last30' | 'all'

  function initRangeTabs() {
    const el = document.getElementById('rangeTabs');
    if (!el) return;
    // Default to the most relevant range: treatment while it's running,
    // last-30-days afterwards.
    if (dayNumber(dateKey(logicalToday())) > TOTAL_DAYS) statsRange = 'last30';
    const tabs = [
      { id: 'treatment', label: 'Traitement' },
      { id: 'last30', label: '30 jours' },
      { id: 'all', label: 'Tout' },
    ];
    el.innerHTML = tabs.map(t =>
      `<button class="range-tab ${statsRange === t.id ? 'range-tab--active' : ''}" data-range="${t.id}" type="button">${t.label}</button>`
    ).join('');
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-range]');
      if (!btn) return;
      haptic(4);
      statsRange = btn.dataset.range;
      el.querySelectorAll('.range-tab').forEach(b =>
        b.classList.toggle('range-tab--active', b.dataset.range === statsRange));
      renderStats();
    });
  }

  function statsDateRange() {
    const todayK = dateKey(logicalToday());
    if (statsRange === 'treatment') {
      return { from: START_DATE, to: treatmentEndKey() < todayK ? treatmentEndKey() : todayK };
    }
    if (statsRange === 'last30') {
      const from = dateKey(addDays(parseKey(todayK), -29));
      return { from: from < START_DATE ? START_DATE : from, to: todayK };
    }
    return { from: START_DATE, to: todayK };
  }

  function renderStats() {
    const container = document.getElementById('statsCard');
    if (!container) return;

    const { from, to } = statsDateRange();
    const series = [];
    let cursor = parseKey(from);
    const end = parseKey(to);
    while (cursor <= end) {
      const k = dateKey(cursor);
      const dayE = state.entries[k] || {};
      let sum = 0, n = 0, cachet = 0, crise = 0, criseInt = 0;
      let douleurSum = 0, douleurN = 0, transitNormal = 0, transitAbnormal = 0;
      // Legacy treatment slots
      SLOTS.forEach(s => {
        const e = dayE[s];
        if (!e) return;
        sum += e.note; n++;
        if (e.cachet) cachet++;
        if (e.crise > 0) { crise++; criseInt += e.crise; }
        if (typeof e.douleur === 'number' && e.douleur > 0) { douleurSum += e.douleur; douleurN++; }
        if (typeof e.transit === 'number' && e.transit > 0) {
          if (e.transit >= 3 && e.transit <= 4) transitNormal++;
          else transitAbnormal++;
        }
      });
      // Continuous event log
      for (const ev of eventsForKey(k)) {
        if (ev.type === 'etat') {
          if (typeof ev.note === 'number') { sum += ev.note; n++; }
          if (ev.douleur > 0) { douleurSum += ev.douleur; douleurN++; }
        } else if (ev.type === 'crise') {
          crise++; criseInt += ev.intensity || 0;
          if (ev.loperamide) cachet++;
        } else if (ev.type === 'wc' && ev.bristol > 0) {
          if (ev.bristol >= 3 && ev.bristol <= 4) transitNormal++;
          else transitAbnormal++;
        }
      }
      series.push({ key: k, avg: n ? sum / n : null, count: n, cachet, crise, criseInt, douleurSum, douleurN, transitNormal, transitAbnormal });
      cursor = addDays(cursor, 1);
    }

    let totalNote = 0, totalNoteCount = 0;
    let totalCachet = 0, totalCrise = 0, totalCriseIntensity = 0;
    let totalDouleurSum = 0, totalDouleurN = 0, totalTransitNormal = 0, totalTransitAbnormal = 0;
    for (const day of series) {
      totalNote += (day.avg ?? 0) * day.count;
      totalNoteCount += day.count;
      totalCachet += day.cachet;
      totalCrise += day.crise;
      totalCriseIntensity += day.criseInt;
      totalDouleurSum += day.douleurSum;
      totalDouleurN += day.douleurN;
      totalTransitNormal += day.transitNormal;
      totalTransitAbnormal += day.transitAbnormal;
    }

    if (totalNoteCount === 0) {
      container.innerHTML = '<div class="stats-card__empty">Pas encore de données. Enregistre ta première entrée pour voir la tendance.</div>';
      return;
    }

    const avgNote = totalNote / totalNoteCount;

    // Delta: avg of first 3 days with data vs last 3 days with data
    const daysWithData = series.filter(d => d.avg !== null);
    let deltaText = '—';
    let deltaCls = '';
    if (daysWithData.length >= 6) {
      const earlyN = Math.max(3, Math.floor(daysWithData.length / 3));
      const lateN = earlyN;
      const early = daysWithData.slice(0, earlyN);
      const late = daysWithData.slice(-lateN);
      const earlyAvg = early.reduce((a, d) => a + d.avg, 0) / early.length;
      const lateAvg = late.reduce((a, d) => a + d.avg, 0) / late.length;
      const delta = lateAvg - earlyAvg;
      const sign = delta > 0 ? '+' : (delta < 0 ? '' : '');
      deltaText = `${delta > 0 ? '↗' : delta < 0 ? '↘' : '→'} ${sign}${delta.toFixed(1)}`;
      if (delta < -0.2) deltaCls = 'stats-card__delta--neg';
      else if (delta > 0.2) deltaCls = '';
      else deltaCls = 'stats-card__delta--neutral';
    }

    // Streak: consecutive days at the end with at least one note logged.
    // (Treatment days had 3 slots; continuous days have a variable count —
    // "any entry that day" is the meaningful continuity measure now.)
    let streak = 0;
    for (let si = series.length - 1; si >= 0; si--) {
      if (series[si].avg !== null) streak++;
      else break;
    }


    // Build sparkline path
    const W = 100, H = 60, padY = 6;
    const innerH = H - padY * 2;
    const total = series.length;
    let path = '';
    let lastPoint = null;
    let inSeg = false;
    series.forEach((d, i) => {
      if (d.avg === null) { inSeg = false; return; }
      const x = total === 1 ? W / 2 : (i / (total - 1)) * W;
      const y = padY + innerH - ((d.avg - 1) / 4) * innerH;
      path += `${inSeg ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)} `;
      inSeg = true;
      lastPoint = { x, y };
    });

    const dotMarkup = lastPoint
      ? `<circle cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="1.8" fill="var(--accent)" />`
      : '';

    // ---- Second sparkline: every individual note (slots + état events) in
    // chronological order ----
    const SLOT_PSEUDO_H = { matin: 8, midi: 13, soir: 20 };
    const slotNotes = [];
    for (const day of series) {
      const pts = [];
      const dayE = state.entries[day.key] || {};
      SLOTS.forEach(s => {
        const e = dayE[s];
        if (e && typeof e.note === 'number') pts.push({ t: SLOT_PSEUDO_H[s], note: e.note });
      });
      for (const ev of eventsForKey(day.key)) {
        if (ev.type === 'etat' && typeof ev.note === 'number') {
          pts.push({ t: new Date(ev.ts).getHours() + new Date(ev.ts).getMinutes() / 60, note: ev.note });
        }
      }
      pts.sort((a, b) => a.t - b.t).forEach(p => slotNotes.push(p.note));
    }
    let rawPath = '';
    let rawLastPoint = null;
    if (slotNotes.length > 0) {
      slotNotes.forEach((v, i) => {
        const x = slotNotes.length === 1 ? W / 2 : (i / (slotNotes.length - 1)) * W;
        const y = padY + innerH - ((v - 1) / 4) * innerH;
        rawPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
        rawLastPoint = { x, y };
      });
    }
    const rawDot = rawLastPoint
      ? `<circle cx="${rawLastPoint.x.toFixed(2)}" cy="${rawLastPoint.y.toFixed(2)}" r="1.8" fill="var(--accent)" />`
      : '';
    const gridLines = [1, 2, 3, 4, 5].map(n => {
      const y = padY + innerH - ((n - 1) / 4) * innerH;
      return `<line x1="0" x2="${W}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" stroke="var(--border)" stroke-width="0.4" />`;
    }).join('');

    container.innerHTML = `
      <div class="stats-card__top">
        <div class="stats-card__main">
          <span class="stats-card__value">${avgNote.toFixed(1)}<span class="stats-card__value-unit">/ 5</span></span>
          <span class="stats-card__caption">note moyenne</span>
        </div>
        <span class="stats-card__delta ${deltaCls}">${deltaText}</span>
      </div>
      <svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${gridLines}
        ${path ? `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />` : ''}
        ${dotMarkup}
      </svg>
      <div class="stats-card__sparkline-label">Moyenne par jour</div>
      ${slotNotes.length > 0 ? `
        <svg class="sparkline sparkline--secondary" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          ${gridLines}
          <path d="${rawPath}" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.85" />
          ${rawDot}
        </svg>
        <div class="stats-card__sparkline-label">Toutes les notes (${slotNotes.length} saisies)</div>
      ` : ''}
      <div class="stats-card__secondary">
        <span class="stats-card__sec-item">Suivi<strong>${streak} j</strong></span>
        <span class="stats-card__sec-item">Crises<strong>${totalCrise}${totalCrise > 0 ? ` · ${(totalCriseIntensity / totalCrise).toFixed(1)}/5` : ''}</strong></span>
        ${totalDouleurN > 0 ? `<span class="stats-card__sec-item">Douleur<strong>${(totalDouleurSum / totalDouleurN).toFixed(1)}/5</strong></span>` : ''}
        ${(totalTransitNormal + totalTransitAbnormal) > 0 ? `<span class="stats-card__sec-item">Transit normal<strong>${Math.round(totalTransitNormal / (totalTransitNormal + totalTransitAbnormal) * 100)}%</strong></span>` : ''}
      </div>
    `;
  }

  // ---------- Modal (edit any day) ----------
  let modalDateKey = null;

  function openModalFor(key) {
    modalDateKey = key;
    const d = parseKey(key);
    document.getElementById('modalTitle').textContent = formatDateLong(d);
    const container = document.getElementById('slotsModal');
    container.innerHTML = '';

    if (isTreatmentDay(key)) {
      // Treatment-era day → the original 3-slot editor (doctor data).
      SLOTS.forEach(slot => {
        container.appendChild(buildSlotCard(key, slot, { highlightCurrent: false, expandIfEmpty: true }));
      });
    } else {
      // Continuous-log day → quick capture + that day's timeline.
      const cap = document.createElement('div');
      container.appendChild(cap);
      const tl = document.createElement('div');
      tl.className = 'timeline';
      container.appendChild(tl);
      const refreshModal = () => {
        renderTimeline(tl, key, refreshModal);
        renderHeatmap();
        renderStats();
      };
      quickCapture(cap, key, refreshModal);
      renderTimeline(tl, key, refreshModal);
    }
    document.getElementById('modalBackdrop').classList.add('modal-backdrop--open');
  }

  function closeModal() {
    const wasModalDate = modalDateKey;
    document.getElementById('modalBackdrop').classList.remove('modal-backdrop--open');
    modalDateKey = null;
    renderHeatmap();
    renderStats();
    if (wasModalDate === dateKey(logicalToday())) renderToday();
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ---------- Outside tap → collapse expanded cards ----------
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.slot:not(.slot--compact)').forEach(card => {
      if (card.contains(e.target)) return;
      card.classList.add('slot--compact');
    });
  });

  // ---------- Modal: open all empty slots expanded by default ----------
  // (override default behavior — see openModalFor)

  // ---------- Today capture + timeline ----------
  function renderToday() {
    const key = dateKey(logicalToday());
    const capHost = document.getElementById('capture');
    const tlHost = document.getElementById('timeline');
    if (!capHost || !tlHost) return;

    if (dayNumber(key) < 1) {
      capHost.innerHTML = '';
      tlHost.innerHTML = `<div class="timeline__empty">Le suivi commencera le ${formatDateLong(parseKey(START_DATE))}.</div>`;
      return;
    }

    const refreshToday = () => {
      renderTimeline(tlHost, key, refreshToday);
      renderHeatmap();
      renderStats();
    };
    quickCapture(capHost, key, refreshToday);
    renderTimeline(tlHost, key, refreshToday);
  }

  // ---------- Init ----------
  renderHeader();
  renderToday();
  initMonthView();
  initRangeTabs();
  renderHeatmap();
  renderStats();
})();
