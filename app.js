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
  const MEAL_TAGS = ['Gras', 'Épicé', 'Lactose', 'Gluten', 'Café', 'Alcool', 'Sucré', 'Cru', 'FODMAP', 'Resto'];

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
  };

  // ---------- Haptics ----------
  function haptic(duration = 8) {
    try { if (navigator.vibrate) navigator.vibrate(duration); } catch {}
  }

  // ---------- Storage ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, startDate: START_DATE, entries: {} };
      const parsed = JSON.parse(raw);
      if (!parsed.entries) parsed.entries = {};
      return parsed;
    } catch {
      return { version: 1, startDate: START_DATE, entries: {} };
    }
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

  function isInPeriod(key) {
    const n = dayNumber(key);
    return n >= 1 && n <= TOTAL_DAYS;
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
    if (slot === 'soir') pingWorker(key, slot);
  }

  // Tell the Bob Worker that a slot was filled so the evening cron reminder
  // skips today. Best-effort, silent failure on offline / no sync.
  function pingWorker(date, slot) {
    try {
      const raw = localStorage.getItem('bob-sync-v1');
      const sync = raw ? JSON.parse(raw) : null;
      if (!sync?.authToken) return;
      fetch('https://bob.jz7w76ry59.workers.dev/health/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sync.authToken },
        body: JSON.stringify({ date, slot }),
      }).catch(() => {});
    } catch {}
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
        }
      : { note: null, cachet: false, crise: 0, criseTime: '', notes: '', douleur: 0, transit: 0, stress: 0, tags: [] };

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
          <div class="reveal-block__content" data-reveal="meal">
            <div class="tag-chips" data-tags-box>
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
      if (draft.note === null) return;
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
    let mealOpen = draft.tags.length > 0;
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
        draft = { note: null, cachet: false, crise: 0, criseTime: '', notes: '', douleur: 0, transit: 0, stress: 0, tags: [] };
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

  function renderToday() {
    const today = logicalToday();
    const key = dateKey(today);
    const container = document.getElementById('slotsToday');
    container.innerHTML = '';

    // Continuous tracking: today is always editable, before or after the
    // treatment window. Only block dates before the very first day.
    if (dayNumber(key) < 1) {
      const msg = document.createElement('div');
      msg.className = 'done-message';
      msg.textContent = `Le suivi commencera le ${formatDateLong(parseKey(START_DATE))}.`;
      container.appendChild(msg);
      return;
    }

    SLOTS.forEach(slot => {
      container.appendChild(buildSlotCard(key, slot));
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
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';
    const todayKey = dateKey(logicalToday());
    const logicalLimit = addDays(parseKey(todayKey), 1);

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
      const dayEntry = state.entries[key] || {};
      const isFuture = d >= logicalLimit;
      const isToday = key === todayKey;
      const beforeStart = key < START_DATE;

      const cell = document.createElement('div');
      cell.className = 'day';
      if (isToday) cell.classList.add('day--today');
      if (isFuture || beforeStart) cell.classList.add('day--future');
      if (isTreatmentDay(key)) cell.classList.add('day--treatment');
      cell.style.animationDelay = `${i * 10}ms`;
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
          if (c > 0) {
            band.classList.add('day__band--crise');
            band.dataset.criseLevel = c;
          }
          if (e.notes && e.notes.trim()) {
            band.classList.add('day__band--comment');
          }
          let line = `${SLOT_LABELS[s]} · ${e.note}/5`;
          if (e.cachet) line += ' · cachet';
          if (c > 0) line += ` · crise ${c}/5${e.criseTime ? ' à ' + e.criseTime : ''}`;
          if (e.douleur > 0) line += ` · douleur ${e.douleur}/5`;
          if (e.transit > 0) line += ` · Bristol ${e.transit}`;
          if (e.notes && e.notes.trim()) line += ' · commentaire';
          tipLines.push(line);
        }
        bands.appendChild(band);
      });

      cell.appendChild(bands);
      cell.title = tipLines.join('\n');

      const num = document.createElement('span');
      num.className = 'day__num';
      num.textContent = i;
      cell.appendChild(num);

      if (!isFuture && !beforeStart) {
        cell.addEventListener('click', () => { haptic(6); openModalFor(key); });
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
      container.innerHTML = '<div class="stats-card__empty">Pas encore de données enregistrées. Saisis ton premier créneau pour voir la tendance apparaître ici.</div>';
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

    // Streak (consecutive days at the end with all 3 slots filled)
    let streak = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].count === 3) streak++;
      else break;
    }

    const cachetPct = totalNoteCount ? Math.round((totalCachet / totalNoteCount) * 100) : 0;

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

    // ---- Second sparkline: every individual slot note in chronological order
    const slotNotes = [];
    for (const day of series) {
      const dayE = state.entries[day.key] || {};
      SLOTS.forEach(s => {
        const e = dayE[s];
        if (e && typeof e.note === 'number') slotNotes.push(e.note);
      });
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
        <span class="stats-card__sec-item">Série<strong>${streak} j</strong></span>
        <span class="stats-card__sec-item">Cachets<strong>${cachetPct}%</strong></span>
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
    SLOTS.forEach(slot => {
      container.appendChild(buildSlotCard(key, slot, { highlightCurrent: false, expandIfEmpty: true }));
    });
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

  // ---------- Init ----------
  renderHeader();
  renderToday();
  initMonthView();
  initRangeTabs();
  renderHeatmap();
  renderStats();
})();
