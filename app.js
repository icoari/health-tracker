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
    crise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  };

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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }

  function formatDateMedium(d) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }

  // The "logical today" treats 00h-04h as still belonging to the previous day's "soir"
  function logicalToday() {
    const now = new Date();
    if (now.getHours() < 4) {
      return addDays(now, -1);
    }
    return now;
  }

  function currentSlot() {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return 'matin';
    if (h >= 12 && h < 18) return 'midi';
    return 'soir';
  }

  // ---------- Rendering ----------
  let state = loadState();
  let modalDateKey = null;

  function getEntry(key, slot) {
    return state.entries[key]?.[slot] || null;
  }

  function setEntry(key, slot, data) {
    if (!state.entries[key]) state.entries[key] = {};
    state.entries[key][slot] = { ...data, savedAt: new Date().toISOString() };
    saveState(state);
  }

  function renderHeader() {
    const today = logicalToday();
    const key = dateKey(today);
    document.getElementById('dateLabel').textContent = formatDateLong(today);
    const n = dayNumber(key);
    const inPeriod = n >= 1 && n <= TOTAL_DAYS;
    const label = inPeriod
      ? `Jour ${n} / ${TOTAL_DAYS}`
      : (n < 1 ? `Suivi commence le ${formatDateMedium(parseKey(START_DATE))}` : 'Suivi terminé');
    document.getElementById('progressLabel').textContent = label;
  }

  function buildSlotCard(key, slot, options = {}) {
    const entry = getEntry(key, slot);
    const isToday = key === dateKey(logicalToday());
    const isCurrent = isToday && slot === currentSlot() && options.highlightCurrent !== false;

    const card = document.createElement('article');
    card.className = 'slot';
    if (entry) card.classList.add('slot--filled');
    if (isCurrent && !entry) card.classList.add('slot--current');
    card.dataset.slot = slot;
    card.dataset.date = key;

    // Initial state (draft, mutable before validation)
    let draft = entry
      ? { note: entry.note, cachet: !!entry.cachet, crise: !!entry.crise }
      : { note: null, cachet: false, crise: false };

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
          <div class="note-dots" data-dots>
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="note-dot" data-value="${n}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="toggle-row">
          <button type="button" class="toggle toggle--cachet" data-toggle="cachet">
            <span class="toggle__label">${ICONS.pill}<span>Cachet</span></span>
            <span class="toggle__switch"></span>
          </button>
          <button type="button" class="toggle toggle--crise" data-toggle="crise">
            <span class="toggle__label">${ICONS.crise}<span>Crise</span></span>
            <span class="toggle__switch"></span>
          </button>
        </div>
        <button type="button" class="slot__validate">Valider</button>
      </div>
    `;

    const dots = card.querySelectorAll('.note-dot');
    const cachetBtn = card.querySelector('[data-toggle="cachet"]');
    const criseBtn = card.querySelector('[data-toggle="crise"]');
    const validateBtn = card.querySelector('.slot__validate');
    const noteEl = card.querySelector('[data-note]');
    const tagsEl = card.querySelector('[data-tags]');
    const hoursEl = card.querySelector('[data-hours]');

    function refreshControls() {
      dots.forEach(d => {
        d.classList.toggle('note-dot--active', Number(d.dataset.value) === draft.note);
      });
      cachetBtn.classList.toggle('toggle--on', draft.cachet);
      criseBtn.classList.toggle('toggle--on', draft.crise);
      validateBtn.classList.toggle('slot__validate--ready', draft.note !== null);
      validateBtn.textContent = entry ? 'Mettre à jour' : 'Valider';
    }

    function refreshSummary() {
      const e = getEntry(key, slot);
      if (e) {
        noteEl.textContent = e.note;
        const tags = [];
        if (e.cachet) tags.push('<span class="slot__tag">Cachet</span>');
        if (e.crise) tags.push('<span class="slot__tag slot__tag--crise">Crise</span>');
        tagsEl.innerHTML = tags.join('');
        hoursEl.style.display = 'none';
      } else {
        hoursEl.style.display = '';
      }
    }

    dots.forEach(d => {
      d.addEventListener('click', () => {
        draft.note = Number(d.dataset.value);
        refreshControls();
      });
    });

    cachetBtn.addEventListener('click', () => {
      draft.cachet = !draft.cachet;
      refreshControls();
    });

    criseBtn.addEventListener('click', () => {
      draft.crise = !draft.crise;
      refreshControls();
    });

    validateBtn.addEventListener('click', () => {
      if (draft.note === null) return;
      setEntry(key, slot, { note: draft.note, cachet: draft.cachet, crise: draft.crise });
      card.classList.add('slot--filled');
      refreshSummary();
      renderHeatmap();
    });

    // Re-open filled card to edit
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('slot--filled')) return;
      // ignore clicks inside body (which is hidden anyway)
      card.classList.remove('slot--filled');
      hoursEl.style.display = '';
      const cur = getEntry(key, slot);
      if (cur) {
        draft = { note: cur.note, cachet: !!cur.cachet, crise: !!cur.crise };
      }
      refreshControls();
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
        ? `Le suivi commencera le ${formatDateMedium(parseKey(START_DATE))}.`
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
    // 1 → muted gray-green, 5 → vivid accent
    const intensity = note / 5; // 0.2 → 1
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
      const hasCrise = SLOTS.some(s => dayEntry[s]?.crise);
      const isFuture = d > new Date() && key !== todayKey;
      const isToday = key === todayKey;

      const cell = document.createElement('div');
      cell.className = 'day';
      if (hasCrise) cell.classList.add('day--crise');
      if (isToday) cell.classList.add('day--today');
      if (isFuture) cell.classList.add('day--future');
      cell.style.animationDelay = `${i * 14}ms`;
      cell.dataset.date = key;
      cell.title = formatDateMedium(d);

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
        cell.addEventListener('click', () => openModalFor(key));
      }

      container.appendChild(cell);
    }
  }

  // ---------- Modal (edit any past day) ----------
  function openModalFor(key) {
    modalDateKey = key;
    const d = parseKey(key);
    document.getElementById('modalTitle').textContent = formatDateLong(d);
    const container = document.getElementById('slotsModal');
    container.innerHTML = '';
    SLOTS.forEach(slot => {
      container.appendChild(buildSlotCard(key, slot, { highlightCurrent: false }));
    });
    document.getElementById('modalBackdrop').classList.add('modal-backdrop--open');
  }

  function closeModal() {
    document.getElementById('modalBackdrop').classList.remove('modal-backdrop--open');
    modalDateKey = null;
    renderHeatmap();
    // If modal was for today, refresh today's section too
    if (modalDateKey === dateKey(logicalToday())) renderToday();
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ---------- Init ----------
  renderHeader();
  renderToday();
  renderHeatmap();
})();
