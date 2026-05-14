(() => {
  'use strict';

  // ---------- Config ----------
  const STORAGE_KEY = 'health-tracker-v1';
  const START_DATE = '2026-05-14';
  const TOTAL_DAYS = 31;
  const SLOTS = ['matin', 'midi', 'soir'];
  const SLOT_LABELS = { matin: 'Matin', midi: 'Midi', soir: 'Soir' };
  const SLOT_HOURS = { matin: '04h – 12h', midi: '12h – 18h', soir: '18h – 04h' };

  const ICONS = {
    matin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    midi:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/></svg>',
    soir:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    pill:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5a7.07 7.07 0 0 1-10-10l10-10a7.07 7.07 0 0 1 10 10z"/><path d="m8.5 8.5 7 7"/></svg>',
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

  // Migrate boolean crise → number (0 or 3)
  function migrate(state) {
    let changed = false;
    for (const date in state.entries) {
      for (const slot in state.entries[date]) {
        const e = state.entries[date][slot];
        if (typeof e.crise === 'boolean') {
          e.crise = e.crise ? 3 : 0;
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
    const inPeriod = n >= 1 && n <= TOTAL_DAYS;
    const label = inPeriod
      ? `Jour ${n} / ${TOTAL_DAYS}`
      : (n < 1 ? `Suivi commence le ${formatDateLong(parseKey(START_DATE))}` : 'Suivi terminé');
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
      ? { note: initial.note, cachet: !!initial.cachet, crise: typeof initial.crise === 'number' ? initial.crise : (initial.crise ? 3 : 0) }
      : { note: null, cachet: false, crise: 0 };

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
        <div class="note-row">
          <span class="note-row__label">Crise</span>
          <div class="note-dots note-dots--crise" data-dots="crise">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
          </div>
        </div>
        <button type="button" class="toggle toggle--cachet" data-toggle="cachet">
          <span class="toggle__label">${ICONS.pill}<span>Cachet pris</span></span>
          <span class="toggle__switch"></span>
        </button>
        <button type="button" class="slot__delete" data-delete>
          ${ICONS.trash}<span data-delete-label>Supprimer</span>
        </button>
      </div>
    `;

    const noteDots = card.querySelectorAll('[data-dots="note"] .note-dot');
    const criseDots = card.querySelectorAll('[data-dots="crise"] .note-dot');
    const cachetBtn = card.querySelector('[data-toggle="cachet"]');
    const deleteBtn = card.querySelector('[data-delete]');
    const deleteLabel = card.querySelector('[data-delete-label]');
    const noteEl = card.querySelector('[data-note]');
    const tagsEl = card.querySelector('[data-tags]');
    const hoursEl = card.querySelector('[data-hours]');

    function refreshControls() {
      // Note: single-dot selector
      noteDots.forEach(d => {
        d.classList.toggle('note-dot--active', Number(d.dataset.value) === draft.note);
      });
      // Crise: cumulative fill (intensity)
      criseDots.forEach(d => {
        const v = Number(d.dataset.value);
        d.classList.toggle('note-dot--active', draft.crise > 0 && v <= draft.crise);
      });
      cachetBtn.classList.toggle('toggle--on', draft.cachet);
    }

    function refreshSummary() {
      const e = getEntry(key, slot);
      if (e) {
        noteEl.textContent = e.note;
        const tags = [];
        if (e.cachet) tags.push('<span class="slot__tag">Cachet</span>');
        const c = typeof e.crise === 'number' ? e.crise : (e.crise ? 3 : 0);
        if (c > 0) tags.push(`<span class="slot__tag slot__tag--crise">Crise ${c}/5</span>`);
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
      setEntry(key, slot, { note: draft.note, cachet: draft.cachet, crise: draft.crise });
      hasEntry = true;
      card.classList.add('slot--has-entry');
      refreshSummary();
      renderHeatmap();
      flashSaved();
    }

    function resetDeleteState() {
      deleteArmed = false;
      clearTimeout(deleteTimeout);
      deleteBtn.classList.remove('slot__delete--armed');
      deleteLabel.textContent = 'Supprimer';
    }

    let deleteArmed = false;
    let deleteTimeout = null;

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
        draft.crise = (v === draft.crise) ? 0 : v;
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

    // --- Delete with 2-tap confirm ---
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic(12);
      if (!deleteArmed) {
        deleteArmed = true;
        deleteBtn.classList.add('slot__delete--armed');
        deleteLabel.textContent = 'Confirmer la suppression';
        deleteTimeout = setTimeout(resetDeleteState, 3000);
      } else {
        resetDeleteState();
        deleteEntryStorage(key, slot);
        draft = { note: null, cachet: false, crise: 0 };
        hasEntry = false;
        card.classList.remove('slot--has-entry');
        card.classList.remove('slot--compact');
        refreshControls();
        refreshSummary();
        renderHeatmap();
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

    if (!isInPeriod(key)) {
      const msg = document.createElement('div');
      msg.className = 'done-message';
      const n = dayNumber(key);
      msg.textContent = n < 1
        ? `Le suivi commencera le ${formatDateLong(parseKey(START_DATE))}.`
        : 'Période de suivi terminée. Tu peux exporter tes données ci-dessous.';
      container.appendChild(msg);
      return;
    }

    SLOTS.forEach(slot => {
      container.appendChild(buildSlotCard(key, slot));
    });
  }

  function bandColor(note) {
    if (!note) return 'rgba(255,255,255,0.04)';
    const intensity = note / 5;
    const alpha = 0.18 + intensity * 0.6;
    return `rgba(127, 209, 185, ${alpha.toFixed(2)})`;
  }

  function renderHeatmap() {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';
    const todayKey = dateKey(logicalToday());

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = addDays(parseKey(START_DATE), i);
      const key = dateKey(d);
      const dayEntry = state.entries[key] || {};
      let maxCrise = 0;
      SLOTS.forEach(s => {
        const e = dayEntry[s];
        if (e) {
          const c = typeof e.crise === 'number' ? e.crise : (e.crise ? 3 : 0);
          if (c > maxCrise) maxCrise = c;
        }
      });
      const isFuture = d > new Date() && key !== todayKey;
      const isToday = key === todayKey;

      const cell = document.createElement('div');
      cell.className = 'day';
      if (maxCrise > 0) {
        cell.classList.add('day--crise');
        // stronger border for higher intensity
        cell.style.borderColor = `rgba(226, 109, 92, ${(0.3 + maxCrise / 5 * 0.7).toFixed(2)})`;
      }
      if (isToday) cell.classList.add('day--today');
      if (isFuture) cell.classList.add('day--future');
      cell.style.animationDelay = `${i * 14}ms`;
      cell.dataset.date = key;
      cell.title = formatDateLong(d);

      const bands = document.createElement('div');
      bands.className = 'day__bands';
      SLOTS.forEach(s => {
        const band = document.createElement('div');
        band.className = 'day__band';
        const e = dayEntry[s];
        band.style.background = bandColor(e?.note);
        bands.appendChild(band);
      });
      cell.appendChild(bands);

      const num = document.createElement('span');
      num.className = 'day__num';
      num.textContent = d.getDate();
      cell.appendChild(num);

      if (!isFuture) {
        cell.addEventListener('click', () => { haptic(6); openModalFor(key); });
      }

      container.appendChild(cell);
    }
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
  renderHeatmap();
})();
