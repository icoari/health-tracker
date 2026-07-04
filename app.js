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
    mic:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>',
  };

  const WORKER_BASE = 'https://bob.jz7w76ry59.workers.dev';

  // ---------- Event types (post-treatment continuous log) ----------
  // The day's calendar colour comes from « état » events (note 1-5).
  const EVENT_TYPES = {
    etat:  { label: 'État',  icon: 'etat'  },
    repas: { label: 'Repas', icon: 'meal'  },
    wc:    { label: 'WC',    icon: 'wc'    },
    crise: { label: 'Crise', icon: 'crise' },
  };

  // ---------- Treatment plan (Trimébutine, cycles 30j ON / 5j OFF) ----------
  // Prescribed 2026-06-29: 1 cp matin/midi/soir au cours des repas, par cycles
  // de 30 jours avec 5 jours de pause entre les cycles, sur ~6 mois.
  const TREATMENT_DEFAULTS = {
    med: 'Trimébutine maléate',
    rescue: 'Lopéramide',
    startDate: '2026-07-01',
    cycleOn: 30,
    cycleOff: 5,
    months: 6,
    doses: ['matin', 'midi', 'soir'],
    times: { matin: '08:00', midi: '12:30', soir: '19:30' },
    reminders: true,
  };

  // ---------- Haptics ----------
  function haptic(duration = 8) {
    try { if (navigator.vibrate) navigator.vibrate(duration); } catch {}
  }

  // ---------- Storage ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed.entries) parsed.entries = {};
      if (!Array.isArray(parsed.events)) parsed.events = [];   // event log (v2)
      if (!parsed.doses || typeof parsed.doses !== 'object') parsed.doses = {};  // medication log (v3)
      if (!parsed.treatment) parsed.treatment = { ...TREATMENT_DEFAULTS };
      return parsed;
    } catch {
      return freshState();
    }
  }

  function freshState() {
    return { version: 3, startDate: START_DATE, entries: {}, events: [], doses: {}, treatment: { ...TREATMENT_DEFAULTS } };
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

  // Tell the Bob Worker that the EVENING was logged so the 23h reminder skips
  // today. Only fired for evening-time activity — a 9 a.m. entry silencing
  // the evening reminder was exactly the bug the slot gating exists to avoid.
  function pingWorker(date) {
    const h = new Date().getHours();
    if (h < 18 && h >= 4) return;          // not evening (logical day: 18h→4h)
    if (date !== dateKey(logicalToday())) return;   // backdated entry — not "tonight"
    const token = authToken();
    if (!token) return;
    fetch(`${WORKER_BASE}/health/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ date, slot: 'soir' }),
    }).catch(() => {});
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
      // note = état rating; carried by état events AND optionally by any
      // repas/wc/crise — all feed the day's colour.
      if (typeof ev.note === 'number' && ev.note > 0) { noteSum += ev.note; noteN++; }
      if (ev.type === 'crise') hasCrise = true;
      if (ev.type === 'wc' && ev.bristol >= 6) hasCrise = true;   // liquide ≈ crise
      if (ev.comment && ev.comment.trim()) hasComment = true;
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

  // ---------- Treatment / medication helpers ----------
  function getTreatment() {
    const t = state.treatment || {};
    return {
      ...TREATMENT_DEFAULTS,
      ...t,
      times: { ...TREATMENT_DEFAULTS.times, ...(t.times || {}) },
      doses: Array.isArray(t.doses) && t.doses.length ? t.doses : TREATMENT_DEFAULTS.doses,
    };
  }

  // Phase of a day relative to the cycle: 'before' | 'on' | 'off' | 'done'.
  function cycleInfo(key) {
    const t = getTreatment();
    const diff = Math.floor((parseKey(key) - parseKey(t.startDate)) / 86400000);
    if (diff < 0) return { phase: 'before', cycle: 0, day: 0, total: t.cycleOn };
    const len = t.cycleOn + t.cycleOff;
    const cycle = Math.floor(diff / len) + 1;
    if (cycle > t.months) return { phase: 'done', cycle, day: 0, total: 0 };
    const inCycle = diff % len;
    if (inCycle < t.cycleOn) return { phase: 'on', cycle, day: inCycle + 1, total: t.cycleOn };
    return { phase: 'off', cycle, day: inCycle - t.cycleOn + 1, total: t.cycleOff };
  }

  function isOnDay(key) { return cycleInfo(key).phase === 'on'; }

  function dosesForKey(key) { return state.doses[key] || {}; }
  function takenSlots(key) { return Object.keys(dosesForKey(key)); }

  function setDose(key, slot, on, ts) {
    if (!state.doses[key]) state.doses[key] = {};
    if (on) state.doses[key][slot] = (typeof ts === 'number' && isFinite(ts)) ? ts : Date.now();
    else delete state.doses[key][slot];
    if (Object.keys(state.doses[key]).length === 0) delete state.doses[key];
    saveState(state);
    medPing(key);
  }

  // Observance over [from,to]: taken doses / expected doses on ON-days only.
  // For TODAY, only doses whose scheduled time has passed count as expected —
  // otherwise the % reads 1/3 at 8 a.m. with the matin dose duly taken.
  function adherence(fromKey, toKey) {
    const t = getTreatment();
    const todayK = dateKey(logicalToday());
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    let cursor = parseKey(fromKey);
    const end = parseKey(toKey);
    let taken = 0, expected = 0;
    while (cursor <= end) {
      const k = dateKey(cursor);
      if (k <= todayK && cycleInfo(k).phase === 'on') {
        const dueSlots = k === todayK
          ? t.doses.filter(s => (t.times[s] || '00:00') <= nowHHMM)
          : t.doses;
        expected += dueSlots.length;
        taken += Math.min(takenSlots(k).length, t.doses.length);
      }
      cursor = addDays(cursor, 1);
    }
    // A dose taken ahead of schedule can make taken > expected today — clamp.
    taken = Math.min(taken, expected);
    return { taken, expected, pct: expected ? Math.round(taken / expected * 100) : null };
  }

  // A day "counts" as documented if it has any symptom entry/event OR a dose.
  function isDocumented(key) {
    if (state.entries[key] && Object.keys(state.entries[key]).length) return true;
    if (eventsForKey(key).length) return true;
    if (state.doses[key] && Object.keys(state.doses[key]).length) return true;
    return false;
  }

  // Completeness over the treatment span so far: documented days / elapsed
  // days, plus the current consecutive-day streak. No guilt — just visibility.
  function completeness() {
    const startK = getTreatment().startDate;
    const todayK = dateKey(logicalToday());
    if (todayK < startK) return { documented: 0, elapsed: 0, streak: 0 };
    let cur = parseKey(startK);
    const end = parseKey(todayK);
    let elapsed = 0, documented = 0;
    while (cur <= end) { if (isDocumented(dateKey(cur))) documented++; elapsed++; cur = addDays(cur, 1); }
    // Streak: today not yet documented shouldn't zero an unbroken run every
    // morning — start the walk at yesterday in that case.
    let streak = 0, d = parseKey(todayK);
    if (!isDocumented(todayK)) d = addDays(d, -1);
    while (dateKey(d) >= startK && isDocumented(dateKey(d))) { streak++; d = addDays(d, -1); }
    return { documented, elapsed, streak };
  }

  function authToken() {
    try {
      const raw = localStorage.getItem('bob-sync-v1');
      return raw ? (JSON.parse(raw).authToken || null) : null;
    } catch { return null; }
  }

  // Tell the Worker which doses are already taken today (suppresses the
  // reminder for a dose once it's logged). Best-effort.
  function medPing(key) {
    const token = authToken();
    if (!token) return;
    fetch('https://bob.jz7w76ry59.workers.dev/health/med', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ date: key, taken: takenSlots(key) }),
    }).catch(() => {});
  }

  // Push the treatment schedule so the reminder cron knows the times, the
  // cycle, and whether reminders are on. Best-effort, fired on init + edits.
  function pushTreatmentConfig() {
    const token = authToken();
    if (!token) return;
    const t = getTreatment();
    fetch('https://bob.jz7w76ry59.workers.dev/health/treatment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        startDate: t.startDate, cycleOn: t.cycleOn, cycleOff: t.cycleOff,
        months: t.months, doses: t.doses, times: t.times, enabled: !!t.reminders,
      }),
    }).catch(() => {});
  }

  // ---------- Rendering ----------
  function renderHeader() {
    const today = logicalToday();
    const key = dateKey(today);
    document.getElementById('dateLabel').textContent = formatDateLong(today);
    const info = cycleInfo(key);
    let label;
    if (info.phase === 'before') {
      label = `Traitement dès le ${formatDateLong(parseKey(getTreatment().startDate))}`;
    } else if (info.phase === 'on') {
      label = `Cycle ${info.cycle} · jour ${info.day} / ${info.total}`;
    } else if (info.phase === 'off') {
      label = `Pause · jour ${info.day} / ${info.total}`;
    } else {
      label = 'Traitement terminé';
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
      autoTimer = setTimeout(close, 14000);   // leave time to add details / adjust the hour
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

    function toHHMM(ts) {
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // Confirmation line with an editable time — tap to adjust if you're
    // logging after the fact.
    function confirmBlock(label) {
      const ev = (state.events || []).find(e => e.id === lastId);
      const hhmm = toHHMM(ev ? ev.ts : Date.now());
      return `<div class="cap-confirm">
        <span class="cap-confirm__check">✓</span>
        <span>${escapeHtml(label)} à</span>
        <input type="time" class="cap-time" value="${hhmm}" data-time aria-label="Heure">
      </div>`;
    }

    function wireTime(scope) {
      const input = scope.querySelector('[data-time]');
      if (!input) return;
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('change', () => {
        const cur = (state.events || []).find(e => e.id === lastId);
        if (!cur || !input.value) return;
        const [hh, mm] = input.value.split(':').map(Number);
        // Anchor on the LOGICAL day being viewed, not the event's calendar
        // date: a post-midnight event edited to 22:30 must stay on this
        // logical day (its calendar date is key+1), and a daytime event
        // edited to 02:00 belongs to key+1 calendar (logical day flips at 4h).
        const d = parseKey(key);
        if (hh < 4) d.setDate(d.getDate() + 1);
        d.setHours(hh, mm, 0, 0);
        updateEvent(lastId, { ts: d.getTime() });
        refresh();
        armAutoClose();
      });
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
          // Visual selection: WC = single (it's a category), the scales fill
          // up to the chosen value.
          const single = activeType === 'wc';
          d.parentElement.querySelectorAll('.cap-dot').forEach(x => {
            const xv = Number(x.dataset.v);
            x.classList.toggle('cap-dot--active', single ? xv === v : xv <= v);
          });
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
    // The non-état types now also capture an « état » (note) so the day gets
    // more mood data points; all types accept a free-text comment.
    function afterEtat(v) {
      const after = picker.querySelector('[data-after]');
      after.innerHTML = `
        ${confirmBlock(`État ${v}/5`)}
        <div class="cap-extra">
          ${fieldRow('Douleur ventre', 'douleur')}
          ${fieldRow('Stress', 'stress')}
        </div>
        ${commentRow()}`;
      wireTime(after); wireFields(after); wireComment(after);
    }
    function afterCrise(v) {
      const after = picker.querySelector('[data-after]');
      const ev = (state.events || []).find(e => e.id === lastId);
      after.innerHTML = `
        ${confirmBlock(`Crise ${v}/5`)}
        <div class="cap-extra">${fieldRow('État', 'note')}</div>
        <button type="button" class="cap-toggle ${ev?.loperamide ? 'cap-toggle--on' : ''}" data-lop>${ICONS.pill}<span>Lopéramide pris</span></button>
        ${commentRow()}`;
      wireTime(after); wireFields(after); wireComment(after);
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
      after.innerHTML = `
        ${confirmBlock(`Bristol ${v} · ${BRISTOL_LABELS[v]}`)}
        <div class="cap-extra">${fieldRow('État', 'note')}</div>
        ${commentRow()}`;
      wireTime(after); wireFields(after); wireComment(after);
    }
    function afterRepas() {
      const after = picker.querySelector('[data-after]');
      const ev = (state.events || []).find(e => e.id === lastId);
      const tags = ev?.tags || [];
      after.innerHTML = `
        ${confirmBlock('Repas')}
        <div class="cap-tags">
          ${MEAL_TAGS.map(t => `<button type="button" class="cap-tag ${tags.includes(t) ? 'cap-tag--active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
        <div class="cap-extra">${fieldRow('État', 'note')}</div>
        ${commentRow()}`;
      wireTime(after); wireFields(after); wireComment(after);
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

    // A labelled 1-5 dot row bound to an event field (douleur, stress, note…)
    function fieldRow(label, field) {
      let h = `<div class="cap-extra__row"><span>${escapeHtml(label)}</span><div class="cap-dots cap-dots--mini" data-field="${field}">`;
      for (let i = 1; i <= 5; i++) h += `<button type="button" class="cap-dot cap-dot--mini" data-v="${i}">${i}</button>`;
      return h + '</div></div>';
    }
    function wireFields(scope) {
      scope.querySelectorAll('[data-field]').forEach(row => {
        const field = row.dataset.field;
        const cur = (state.events || []).find(e => e.id === lastId);
        const curV = cur && typeof cur[field] === 'number' ? cur[field] : 0;
        const mark = (val) => row.querySelectorAll('.cap-dot').forEach(x =>
          x.classList.toggle('cap-dot--active', val > 0 && Number(x.dataset.v) <= val));
        mark(curV);   // reflect stored value (matters when editing)
        row.querySelectorAll('.cap-dot').forEach(d => {
          d.addEventListener('click', () => {
            haptic(6);
            const v = Number(d.dataset.v);
            const c = (state.events || []).find(e => e.id === lastId);
            const newVal = c && c[field] === v ? 0 : v;
            updateEvent(lastId, { [field]: newVal });
            mark(newVal);
            refresh(); armAutoClose();
          });
        });
      });
    }

    // Optional free-text comment on the entry.
    function commentRow() {
      return `<input type="text" class="cap-comment" data-comment placeholder="Commentaire (optionnel)…">`;
    }
    function wireComment(scope) {
      const inp = scope.querySelector('[data-comment]');
      if (!inp) return;
      const cur = (state.events || []).find(e => e.id === lastId);
      inp.value = (cur && cur.comment) || '';
      inp.addEventListener('click', (e) => e.stopPropagation());
      let t;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { updateEvent(lastId, { comment: inp.value.trim() }); refresh(); }, 500);
        armAutoClose();
      });
      inp.addEventListener('blur', () => { updateEvent(lastId, { comment: inp.value.trim() }); refresh(); });
    }

    // Mark the primary control (dots or sizes) for a known value — used when
    // re-opening an entry to edit it.
    function markPrimary(value) {
      const single = activeType === 'wc';
      const cont = picker.querySelector('.cap-dots');
      if (cont) cont.querySelectorAll('.cap-dot').forEach(x => {
        const xv = Number(x.dataset.v);
        x.classList.toggle('cap-dot--active', single ? xv === value : xv <= value);
      });
      picker.querySelectorAll('.cap-size').forEach(x => x.classList.toggle('cap-size--active', x.dataset.size === value));
    }

    // Re-open an existing event to modify its value / details / time.
    function openForEdit(ev) {
      activeType = ev.type; lastId = ev.id;
      grid.querySelectorAll('.cap-btn').forEach(b => b.classList.toggle('cap-btn--active', b.dataset.cap === ev.type));
      picker.hidden = false;
      renderPicker();
      if (ev.type === 'repas') { markPrimary(ev.size); afterRepas(); }
      else {
        const field = ev.type === 'etat' ? 'note' : ev.type === 'wc' ? 'bristol' : 'intensity';
        const v = ev[field];
        if (typeof v === 'number') markPrimary(v);
        if (ev.type === 'etat') afterEtat(v);
        else if (ev.type === 'wc') afterWc(v);
        else afterCrise(v);
      }
      picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      armAutoClose();
    }

    grid.querySelectorAll('[data-cap]').forEach(b => {
      b.addEventListener('click', () => {
        haptic(8);
        if (activeType === b.dataset.cap) { close(); return; }
        openType(b.dataset.cap);
      });
    });

    return {
      openForEdit,
      // Open a type's picker programmatically (used by ?log= deep links).
      openType: (t) => { if (EVENT_TYPES[t]) openType(t); },
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');   // values reach attribute contexts (value="…")
  }

  // ---------- Today / day timeline ----------
  function eventSummary(ev) {
    let main;
    if (ev.type === 'etat') {
      const bits = [`État ${ev.note}/5`];
      if (ev.douleur > 0) bits.push(`douleur ${ev.douleur}`);
      if (ev.stress > 0) bits.push(`stress ${ev.stress}`);
      main = bits.join(' · ');
    } else if (ev.type === 'repas') {
      const size = MEAL_SIZES.find(m => m.id === ev.size)?.label || 'Repas';
      const tags = (ev.tags || []).length ? ' · ' + ev.tags.join(', ') : '';
      main = `${size}${tags}`;
    } else if (ev.type === 'wc') {
      main = `Bristol ${ev.bristol} · ${BRISTOL_LABELS[ev.bristol]}`;
    } else if (ev.type === 'crise') {
      main = `Crise ${ev.intensity}/5${ev.loperamide ? ' · Lopéramide' : ''}`;
    } else {
      main = ev.type;
    }
    // état captured inside a non-état event
    if (ev.type !== 'etat' && typeof ev.note === 'number' && ev.note > 0) main += ` · état ${ev.note}`;
    return main;
  }

  function isBadEvent(ev) {
    return (ev.type === 'crise') || (ev.type === 'wc' && (ev.bristol >= 6 || ev.bristol <= 2));
  }

  let undoTimer = null;
  function renderTimeline(host, key, refresh, onEdit) {
    // Merge the event log with the day's medication doses so the feed shows
    // EVERYTHING that happened — cachets included — newest first.
    const doseMap = dosesForKey(key);
    const items = [
      ...eventsForKey(key).map(ev => ({ ts: ev.ts, kind: 'event', ev })),
      ...Object.keys(doseMap).map(slot => ({
        ts: typeof doseMap[slot] === 'number' ? doseMap[slot] : tsForKey(key),
        kind: 'dose', slot,
      })),
    ].sort((a, b) => b.ts - a.ts);

    if (items.length === 0) {
      // Keep the undo bar in the empty state too — deleting the LAST entry of
      // a day must still offer « Annuler ».
      host.innerHTML = '<div class="timeline__empty">Aucune entrée. Tape un bouton ci-dessus.</div>'
        + '<div class="tl-undo" data-undo hidden></div>';
      return;
    }

    const rowHtml = (it) => {
      if (it.kind === 'dose') {
        return `
        <div class="tl-row tl-row--dose" data-dose-slot="${it.slot}">
          <span class="tl-row__time">${fmtClock(it.ts)}</span>
          <span class="tl-row__icon">${ICONS.pill}</span>
          <span class="tl-row__main"><span class="tl-row__text">Cachet ${SLOT_LABELS[it.slot] || it.slot}</span></span>
          <button class="tl-row__del" data-dose-del="${it.slot}" type="button" aria-label="Retirer">${ICONS.trash}</button>
        </div>`;
      }
      const ev = it.ev;
      const comment = ev.comment ? `<span class="tl-row__note">${escapeHtml(ev.comment)}</span>` : '';
      return `
      <div class="tl-row tl-row--${ev.type} ${isBadEvent(ev) ? 'tl-row--bad' : ''}" data-id="${ev.id}">
        <span class="tl-row__time">${fmtClock(ev.ts)}</span>
        <span class="tl-row__icon">${ICONS[EVENT_TYPES[ev.type].icon]}</span>
        <span class="tl-row__main">
          <span class="tl-row__text">${escapeHtml(eventSummary(ev))}</span>
          ${comment}
        </span>
        <button class="tl-row__del" data-del="${ev.id}" type="button" aria-label="Supprimer">${ICONS.trash}</button>
      </div>`;
    };

    host.innerHTML = `<div class="timeline__list">${items.map(rowHtml).join('')}</div>
      <div class="tl-undo" data-undo hidden></div>`;

    host.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(12);
        const removed = removeEvent(b.dataset.del);
        refresh();
        if (removed) showUndo(host, removed, refresh);
      });
    });

    // Un-take a dose straight from the feed.
    host.querySelectorAll('[data-dose-del]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(12);
        setDose(key, b.dataset.doseDel, false);
        refresh();
      });
    });

    // Tap an event row (not the trash) to re-open it for editing. Dose rows
    // aren't editable — they only carry data-dose-slot, not data-id.
    if (onEdit) {
      host.querySelectorAll('.tl-row[data-id]').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('[data-del]')) return;
          const ev = (state.events || []).find(x => x.id === row.dataset.id);
          if (ev) { haptic(6); onEdit(ev); }
        });
      });
    }
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
  // Initialised here (not just in initMonthView) so renderHeatmap is safe
  // even if it runs before init wiring — an undefined month threw an
  // Invalid-Date RangeError that silently killed the calendar + stats.
  let viewYear = logicalToday().getFullYear();
  let viewMonth = logicalToday().getMonth();
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

      // Medication overlay (new 6-month plan, cycles 30j/5j).
      const ci = cycleInfo(key);
      let dosesTaken = 0, dosesNeed = 0;
      if (ci.phase === 'off') {
        cell.classList.add('day--pause');
      } else if (ci.phase === 'on') {
        dosesNeed = getTreatment().doses.length;
        dosesTaken = Math.min(takenSlots(key).length, dosesNeed);
        // Past days: 0 = missed (red), some = partial (amber), all = full.
        // The old ordering made any past 1/3 or 2/3 day read as a full miss.
        if (dosesTaken >= dosesNeed) cell.classList.add('day--dose-full');
        else if (dosesTaken > 0) cell.classList.add('day--dose-partial');
        else if (!isFuture && key < todayKey) cell.classList.add('day--dose-missed');
      }
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
      if (ci.phase === 'on') tip.push(`prises ${dosesTaken}/${dosesNeed}`);
      else if (ci.phase === 'off') tip.push('pause traitement');
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
    // « Traitement » = the CURRENT plan (Trimébutine cycles), not the frozen
    // legacy May window. Default to it once the plan has started.
    const todayK = dateKey(logicalToday());
    if (todayK < getTreatment().startDate) statsRange = 'last30';
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
      // The current Trimébutine plan. Before it starts, fall back to the
      // legacy May window so the tab never shows an empty future range.
      const start = getTreatment().startDate;
      if (todayK >= start) return { from: start, to: todayK };
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
    const adh = adherence(from, to);
    const comp = completeness();
    const compHtml = comp.elapsed ? `
      <div class="stats-card__complete">
        <span class="stats-card__complete-main">${comp.documented} / ${comp.elapsed}<span class="stats-card__complete-unit"> jours documentés</span></span>
        ${comp.streak ? `<span class="stats-card__complete-streak">série ${comp.streak} j</span>` : ''}
      </div>` : '';
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
        // état rating carried by any event type
        if (typeof ev.note === 'number' && ev.note > 0) { sum += ev.note; n++; }
        if (ev.douleur > 0) { douleurSum += ev.douleur; douleurN++; }
        if (ev.type === 'crise') {
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
      container.innerHTML = compHtml + '<div class="stats-card__empty">Pas encore de données. Enregistre ta première entrée pour voir la tendance.</div>';
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
        if (typeof ev.note === 'number' && ev.note > 0) {
          const d = new Date(ev.ts);
          // 0-4h events belong to the END of the logical day — order them
          // after the evening, not before the morning.
          const h = d.getHours() + d.getMinutes() / 60;
          pts.push({ t: h < 4 ? h + 24 : h, note: ev.note });
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
      ${compHtml}
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
        ${adh.pct != null ? `<span class="stats-card__sec-item">Observance<strong>${adh.pct}% · ${adh.taken}/${adh.expected}</strong></span>` : ''}
        <span class="stats-card__sec-item">Crises<strong>${totalCrise}${totalCrise > 0 ? ` · ${(totalCriseIntensity / totalCrise).toFixed(1)}/5` : ''}</strong></span>
        ${totalCachet > 0 ? `<span class="stats-card__sec-item">Lopéramide<strong>${totalCachet}</strong></span>` : ''}
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
      // Continuous-log day → medication card + quick capture + timeline.
      const medEl = document.createElement('div');
      container.appendChild(medEl);
      const capEl = document.createElement('div');
      container.appendChild(capEl);
      const tl = document.createElement('div');
      tl.className = 'timeline';
      container.appendChild(tl);
      let cap;
      const refreshModal = () => {
        renderMedCard(medEl, key, refreshModal);
        renderTimeline(tl, key, refreshModal, (ev) => cap.openForEdit(ev));
        renderHeatmap();
        renderStats();
      };
      cap = quickCapture(capEl, key, refreshModal);
      refreshModal();
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

  // ---------- Medication card (the daily ritual) ----------
  function renderMedCard(host, key, refresh) {
    if (!host) return;
    const t = getTreatment();
    const info = cycleInfo(key);
    host.classList.add('med-card');

    // Status line
    let status, sub;
    if (info.phase === 'before') {
      status = 'Traitement à venir';
      sub = `Commence le ${formatDateLong(parseKey(t.startDate))}`;
    } else if (info.phase === 'done') {
      status = 'Traitement terminé';
      sub = `${t.months} cycles accomplis — bravo`;
    } else if (info.phase === 'off') {
      status = `Pause · jour ${info.day} / ${info.total}`;
      sub = 'Aucune prise pendant la pause de 5 jours';
    } else {
      status = `Cycle ${info.cycle} · jour ${info.day} / ${info.total}`;
      const taken = takenSlots(key).length;
      sub = `${t.med} · ${taken} / ${t.doses.length} prise${t.doses.length > 1 ? 's' : ''} aujourd'hui`;
    }

    // Dose buttons only on ON-days.
    let dosesHtml = '';
    if (info.phase === 'on') {
      const taken = dosesForKey(key);
      dosesHtml = `<div class="med-doses">${t.doses.map(slot => {
        const on = !!taken[slot];
        // Early doses were stored as `true` (no timestamp) — fmtClock(true)
        // would print the epoch ("01:00"). Fall back to the scheduled time.
        const tm = (on && typeof taken[slot] === 'number') ? fmtClock(taken[slot]) : (t.times[slot] || '');
        return `<button type="button" class="med-dose ${on ? 'med-dose--taken' : ''}" data-dose="${slot}">
          <span class="med-dose__icon">${ICONS[slot] || ICONS.pill}</span>
          <span class="med-dose__label">${SLOT_LABELS[slot] || slot}</span>
          <span class="med-dose__state">${on ? '✓ ' + tm : tm}</span>
        </button>`;
      }).join('')}</div>`;
    } else if (info.phase === 'off') {
      // During the LAST cycle's pause there is no next cycle — don't promise
      // a reprise that never comes.
      const repriseDate = addDays(parseKey(key), info.total - info.day + 1);
      const nextOn = cycleInfo(dateKey(repriseDate)).phase === 'on';
      dosesHtml = nextOn
        ? `<div class="med-pause">${ICONS.pill}<span>Reprise le ${formatDateLong(repriseDate)}</span></div>`
        : `<div class="med-pause">${ICONS.pill}<span>Dernière pause — fin du traitement ensuite</span></div>`;
    }

    host.innerHTML = `
      <div class="med-card__head">
        <div class="med-card__status">
          <span class="med-card__title">${status}</span>
          <span class="med-card__sub">${escapeHtml(sub)}</span>
        </div>
        <button type="button" class="med-card__gear" data-med-settings aria-label="Réglages traitement">${ICONS.notes}</button>
      </div>
      ${dosesHtml}
      <div class="med-settings" data-med-panel hidden>
        <div class="med-settings__row">
          <label class="med-settings__toggle"><input type="checkbox" data-rem ${t.reminders ? 'checked' : ''}> Rappels push aux heures de repas</label>
        </div>
        <div class="med-settings__times">
          ${t.doses.map(slot => `<label class="med-settings__time"><span>${SLOT_LABELS[slot] || slot}</span><input type="time" data-time-slot="${slot}" value="${t.times[slot] || ''}"></label>`).join('')}
        </div>
        <div class="med-settings__hint">Les rappels sautent les jours de pause et les prises déjà faites.</div>
      </div>
    `;

    // Dose toggles
    host.querySelectorAll('[data-dose]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic(12);
        const slot = btn.dataset.dose;
        const on = !dosesForKey(key)[slot];
        setDose(key, slot, on);
        refresh();
      });
    });

    // Settings panel
    const gear = host.querySelector('[data-med-settings]');
    const panel = host.querySelector('[data-med-panel]');
    gear?.addEventListener('click', (e) => { e.stopPropagation(); haptic(4); panel.hidden = !panel.hidden; });
    panel?.addEventListener('click', (e) => e.stopPropagation());
    host.querySelector('[data-rem]')?.addEventListener('change', (e) => {
      if (!state.treatment) state.treatment = { ...TREATMENT_DEFAULTS };
      state.treatment.reminders = e.target.checked;
      saveState(state);
      pushTreatmentConfig();
    });
    host.querySelectorAll('[data-time-slot]').forEach(inp => {
      inp.addEventListener('change', () => {
        if (!inp.value) return;
        if (!state.treatment) state.treatment = { ...TREATMENT_DEFAULTS };
        if (!state.treatment.times) state.treatment.times = { ...getTreatment().times };
        state.treatment.times[inp.dataset.timeSlot] = inp.value;
        saveState(state);
        pushTreatmentConfig();
        refresh();
      });
    });
  }

  // ========================================================================
  // Voice logging — speak your day, an LLM turns it into structured events.
  //   record → Whisper (/transcribe) → LLM (/llm) → preview → commit.
  // Config (LLM endpoint/key) is read from Bob's settings (same origin).
  // ========================================================================
  const SYSTEM_PARSE = `Tu convertis une phrase dictée par Nicolas (suivi de santé digestive, en français) en événements structurés.

Types possibles :
- "etat" : état général. note 1-5 (1=très mauvais, 3=moyen, 5=très bien). Optionnel : douleur 1-5, stress 1-5.
- "repas" : un repas. size "leger"|"normal"|"copieux". Optionnel : tags (sous-ensemble exact de : Amandes, Gras, Épicé, Lactose, Café, Alcool, Sucré, Cru, Resto).
- "wc" : passage aux toilettes. bristol 1-7 (1-2 dur, 3-4 normal, 5 mou, 6 bouillie, 7 liquide).
- "crise" : crise/poussée douloureuse. intensity 1-5. loperamide:true si un Lopéramide a été pris.
- "dose" : prise d'un comprimé du traitement. slot "matin"|"midi"|"soir" ("j'ai pris mon cachet du midi", "j'ai bien pris mes 3 prises" → trois doses).

Moment de chaque événement (ajoute si dit) :
- "time" : heure approximative "HH:MM" sur 24h. Repères : "ce matin"≈08:00, "midi"≈12:30, "cet après-midi"≈15:00, "ce soir"≈20:00, "cette nuit"≈02:00.
- "day" : "today" par défaut, ou "yesterday" si la personne parle d'hier.

Règles :
- Déduis les valeurs du langage : "je vais bien"→etat note 4-5 ; "grosse crise"→intensity 4-5 ; "c'était liquide"→bristol 7 ; "repas copieux"→size copieux.
- Une phrase peut donner plusieurs événements, à des moments différents.
- "comment" : la partie pertinente de la phrase (aliments précis, contexte) qui n'entre pas dans les champs.
- Si un repas cite un aliment listé dans les tags, ajoute le tag ; sinon garde le détail dans comment.
- N'invente rien : si une info n'est pas dite, omets le champ.
- Réponds UNIQUEMENT en JSON valide, sans texte ni Markdown autour :
{"events":[{"type":"etat","note":4,"time":"08:00","comment":"..."},{"type":"dose","slot":"matin"}]}`;

  function getLlmConfig() {
    try {
      const st = JSON.parse(localStorage.getItem('cockpit-v3') || 'null');
      return st?.settings?.llm || null;
    } catch { return null; }
  }

  function pickMime() {
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
    for (const m of cands) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {} }
    return '';
  }

  // Shared mic stream — acquired once, reused across recordings (no re-prompt),
  // released after idle so the mic indicator doesn't linger.
  let sharedMic = null, micReleaseTimer = null;
  async function acquireMicShared() {
    if (micReleaseTimer) { clearTimeout(micReleaseTimer); micReleaseTimer = null; }
    if (sharedMic && sharedMic.getAudioTracks().some(t => t.readyState === 'live')) return sharedMic;
    sharedMic = await navigator.mediaDevices.getUserMedia({ audio: true });
    return sharedMic;
  }
  function scheduleMicReleaseShared() {
    if (micReleaseTimer) clearTimeout(micReleaseTimer);
    micReleaseTimer = setTimeout(() => {
      try { sharedMic?.getTracks().forEach(t => t.stop()); } catch {}
      sharedMic = null; micReleaseTimer = null;
    }, 90000);
  }

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const s = fr.result || ''; const c = s.indexOf(','); res(c >= 0 ? s.slice(c + 1) : s); };
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  async function transcribeAudio(blob) {
    const token = authToken();
    if (!token) throw new Error('Sauvegarde cloud requise');
    const audio = await blobToBase64(blob);
    const r = await fetch(`${WORKER_BASE}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ audio, language: 'fr' }),
    });
    if (!r.ok) throw new Error('transcription HTTP ' + r.status);
    return ((await r.json()).text || '').trim();
  }

  async function parseHealthText(transcript) {
    const cfg = getLlmConfig();
    const token = authToken();
    if (!token) throw new Error('Sauvegarde cloud requise');
    if (!cfg || !cfg.endpoint || !cfg.apiKey) throw new Error('Assistant non configuré (Réglages de Bob)');
    const format = cfg.format || 'openai';
    const body = format === 'anthropic'
      ? { model: cfg.model || 'claude-sonnet-4-5', max_tokens: 800, temperature: 0, system: SYSTEM_PARSE, messages: [{ role: 'user', content: transcript }] }
      : { model: cfg.model, temperature: 0, max_tokens: 800, messages: [{ role: 'system', content: SYSTEM_PARSE }, { role: 'user', content: transcript }] };
    const r = await fetch(`${WORKER_BASE}/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-LLM-Endpoint': cfg.endpoint,
        'X-LLM-Key': cfg.apiKey,
        'X-LLM-Auth-Style': cfg.authStyle || 'bearer',
        'X-LLM-Format': format,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('IA HTTP ' + r.status);
    const data = await r.json();
    const text = format === 'anthropic'
      ? (Array.isArray(data.content) ? data.content : []).filter(b => b.type === 'text').map(b => b.text).join('')
      : (data.choices?.[0]?.message?.content || '');
    return extractEvents(text);
  }

  function extractEvents(text) {
    let raw = (text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    // Be lenient: grab the first {...} block if the model added prose.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) raw = m[0];
    let obj;
    try { obj = JSON.parse(raw); } catch { throw new Error('réponse IA illisible'); }
    const list = Array.isArray(obj) ? obj : (Array.isArray(obj.events) ? obj.events : []);
    return list.map(sanitizeEvent).filter(Boolean);
  }

  function sanitizeEvent(e) {
    if (!e) return null;
    const isDose = e.type === 'dose';
    if (!isDose && !EVENT_TYPES[e.type]) return null;
    // Below-range values (0, negatives) mean "absent/invalid" — return
    // undefined instead of promoting them to 1 (that invented Bristol-1 or
    // douleur-1 data the user never said).
    const clamp = (v, a, b) => (typeof v === 'number' && isFinite(v) && Math.round(v) >= a)
      ? Math.min(b, Math.round(v)) : undefined;
    const out = { type: e.type };
    if (typeof e.comment === 'string' && e.comment.trim()) out.comment = e.comment.trim().slice(0, 300);
    // When it happened (optional) — drives the event timestamp / day at commit.
    if (typeof e.time === 'string' && /^\d{1,2}:\d{2}$/.test(e.time)) out.time = e.time;
    if (e.day === 'yesterday') out.day = 'yesterday';

    if (isDose) {
      if (!['matin', 'midi', 'soir'].includes(e.slot)) return null;
      out.slot = e.slot;
      delete out.comment;   // a dose has no free text
      return out;
    }
    const note = clamp(e.note, 1, 5);
    if (note) out.note = note;
    if (e.type === 'etat') {
      if (!out.note) out.note = 3;
      const d = clamp(e.douleur, 1, 5); if (d) out.douleur = d;
      const s = clamp(e.stress, 1, 5); if (s) out.stress = s;
    } else if (e.type === 'repas') {
      const sizes = MEAL_SIZES.map(m => m.id);
      out.size = sizes.includes(e.size) ? e.size : 'normal';
      out.tags = Array.isArray(e.tags) ? e.tags.filter(t => MEAL_TAGS.includes(t)) : [];
    } else if (e.type === 'wc') {
      const b = clamp(e.bristol, 1, 7);
      if (!b) return null;
      out.bristol = b;
    } else if (e.type === 'crise') {
      out.intensity = clamp(e.intensity, 1, 5) || 3;
      if (e.loperamide === true) out.loperamide = true;
    }
    return out;
  }

  function voicePreviewText(e) {
    let s = e.type === 'dose' ? `Cachet ${SLOT_LABELS[e.slot] || e.slot}` : eventSummary(e);
    if (e.comment) s += ` · « ${e.comment} »`;
    const when = [];
    if (e.day === 'yesterday') when.push('hier');
    if (e.time) when.push(e.time);
    if (when.length) s = `${when.join(' ')} — ${s}`;
    return s;
  }

  function renderVoiceBar(host, key, refresh, opts = {}) {
    if (!host) return;
    host.classList.add('voicebar');
    let mediaRec = null, chunks = [], micStream = null;
    let stage = 'idle';          // idle | recording | working | preview | error
    let parsed = [], transcript = '', msg = '';

    async function beginRecord() {
      micStream = await acquireMicShared();
      const mime = pickMime();
      mediaRec = mime ? new MediaRecorder(micStream, { mimeType: mime }) : new MediaRecorder(micStream);
      chunks = [];
      mediaRec.addEventListener('dataavailable', (e) => { if (e.data && e.data.size) chunks.push(e.data); });
      mediaRec.start();
    }
    function endRecord() {
      return new Promise((res) => {
        mediaRec.addEventListener('stop', () => {
          // Keep the shared stream alive (released on idle) — no re-prompt.
          scheduleMicReleaseShared();
          res(new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' }));
        }, { once: true });
        try { mediaRec.stop(); } catch { res(new Blob()); }
      });
    }
    const fail = (m) => { stage = 'error'; msg = m; draw(); };

    async function start() {
      if (!('mediaDevices' in navigator) || !window.MediaRecorder) { fail('Micro non disponible sur cet appareil'); return; }
      try { await beginRecord(); stage = 'recording'; draw(); }
      catch (e) { fail('Micro refusé : ' + (e.message || e)); }
    }

    async function stopAndProcess() {
      stage = 'working'; msg = 'Transcription…'; draw();
      let blob;
      try { blob = await endRecord(); } catch { return fail('Enregistrement échoué'); }
      if (!blob.size) return fail('Aucun son capté');
      try { transcript = await transcribeAudio(blob); } catch (e) { return fail('Transcription : ' + (e.message || e)); }
      if (!transcript) return fail('Rien entendu');
      stage = 'working'; msg = 'Analyse…'; draw();
      try { parsed = await parseHealthText(transcript); } catch (e) { return fail('Analyse : ' + (e.message || e)); }
      stage = 'preview'; draw();
    }

    function commit() {
      for (const e of parsed) {
        const dayKey = e.day === 'yesterday' ? dateKey(addDays(parseKey(key), -1)) : key;
        // A spoken hour maps to a timestamp on the LOGICAL day: hours before
        // 04h belong to the next calendar date ("cette nuit vers 02h" said on
        // logical day D happened on calendar D+1) — logicalKeyOfTs flips at 4h.
        const tsForSpoken = (hhmm) => {
          const [hh, mm] = hhmm.split(':').map(Number);
          const d = parseKey(dayKey);
          if (hh < 4) d.setDate(d.getDate() + 1);
          d.setHours(hh, mm, 0, 0);
          return d.getTime();
        };
        if (e.type === 'dose') { setDose(dayKey, e.slot, true, e.time ? tsForSpoken(e.time) : undefined); continue; }
        const data = { ...e };
        delete data.type; delete data.time; delete data.day;
        const ev = addEvent(e.type, data, dayKey);
        // Backdate to the spoken hour if given (else now/noon via tsForKey).
        if (e.time && ev) updateEvent(ev.id, { ts: tsForSpoken(e.time) });
      }
      haptic(16);
      stage = 'idle'; parsed = []; transcript = '';
      draw();
      refresh();
    }

    function draw() {
      if (stage === 'idle') {
        host.innerHTML = `<button class="voice-btn" data-act="start" type="button"><span class="voice-btn__icon">${ICONS.mic}</span><span>Décris ta journée à voix haute</span></button>`;
      } else if (stage === 'recording') {
        host.innerHTML = `<button class="voice-btn voice-btn--rec" data-act="stop" type="button"><span class="voice-btn__icon">${ICONS.mic}</span><span>Enregistrement… tape pour arrêter</span></button>`;
      } else if (stage === 'working') {
        host.innerHTML = `<div class="voice-working"><span class="voice-spin"></span>${escapeHtml(msg)}</div>`;
      } else if (stage === 'error') {
        host.innerHTML = `<div class="voice-error">${escapeHtml(msg)}</div><button class="voice-btn" data-act="start" type="button"><span class="voice-btn__icon">${ICONS.mic}</span><span>Réessayer</span></button>`;
      } else if (stage === 'preview') {
        const chips = parsed.map((e, i) => {
          const icon = e.type === 'dose' ? ICONS.pill : ICONS[EVENT_TYPES[e.type].icon];
          return `<div class="voice-ev"><span class="voice-ev__icon">${icon}</span><span class="voice-ev__txt">${escapeHtml(voicePreviewText(e))}</span><button class="voice-ev__rm" data-rm="${i}" type="button" aria-label="Retirer">${ICONS.close}</button></div>`;
        }).join('');
        host.innerHTML = `
          <div class="voice-preview">
            <div class="voice-preview__transcript">« ${escapeHtml(transcript)} »</div>
            <div class="voice-preview__list">${chips || '<div class="voice-preview__empty">Rien à enregistrer là-dedans.</div>'}</div>
            <div class="voice-preview__actions">
              <button class="voice-cancel" data-act="cancel" type="button">Annuler</button>
              <button class="voice-save" data-act="save" type="button" ${parsed.length ? '' : 'disabled'}>Enregistrer${parsed.length ? ` (${parsed.length})` : ''}</button>
            </div>
          </div>`;
      }
      wire();
    }

    function wire() {
      host.querySelector('[data-act="start"]')?.addEventListener('click', (e) => { e.stopPropagation(); haptic(8); start(); });
      host.querySelector('[data-act="stop"]')?.addEventListener('click', (e) => { e.stopPropagation(); haptic(8); stopAndProcess(); });
      host.querySelector('[data-act="cancel"]')?.addEventListener('click', (e) => { e.stopPropagation(); stage = 'idle'; parsed = []; transcript = ''; draw(); });
      host.querySelector('[data-act="save"]')?.addEventListener('click', (e) => { e.stopPropagation(); commit(); });
      host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); parsed.splice(Number(b.dataset.rm), 1); draw();
      }));
    }

    draw();

    // Arrived via a "Dicter" shortcut → try to start recording right away.
    // If the browser demands an explicit in-frame gesture, fall back silently
    // to the idle button (one extra tap), no scary error.
    if (opts.autostart) {
      beginRecord().then(() => { stage = 'recording'; draw(); }).catch(() => { stage = 'idle'; draw(); });
    }
  }

  // ---------- Today capture + timeline ----------
  function renderToday() {
    const key = dateKey(logicalToday());
    const medHost = document.getElementById('medCard');
    const capHost = document.getElementById('capture');
    const tlHost = document.getElementById('timeline');
    if (!capHost || !tlHost) return;

    let cap;
    const refreshToday = () => {
      renderMedCard(medHost, key, refreshToday);
      renderTimeline(tlHost, key, refreshToday, (ev) => cap.openForEdit(ev));
      renderHeatmap();
      renderStats();
    };
    cap = quickCapture(capHost, key, refreshToday);
    refreshToday();

    // Voice logging bar — wired ONCE (it owns its own record/preview state):
    // renderToday also runs on closeModal, and re-rendering the bar mid-flight
    // would orphan a live recorder (mic stuck on) and reset the preview.
    const voiceAuto = new URLSearchParams(location.search).get('voice') === '1';
    const voiceHost = document.getElementById('voiceBar');
    if (voiceHost && !voiceHost.dataset.wired) {
      voiceHost.dataset.wired = '1';
      renderVoiceBar(voiceHost, key, refreshToday, { autostart: voiceAuto });
      if (voiceAuto) setTimeout(() => voiceHost.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

    // Deep links from notifications / home-screen shortcuts:
    //   ?dose=matin|midi|soir     → mark that dose taken (med reminder « Pris »)
    //   ?log=wc|repas|etat|crise  → open that capture picker
    // Consumed once, then stripped from the URL — renderToday re-runs on every
    // closeModal, and replaying ?dose= would re-add a dose the user removed
    // (?voice=1 would even re-arm the mic without a gesture).
    const params = new URLSearchParams(location.search);
    const dose = params.get('dose');
    if (dose && getTreatment().doses.includes(dose) && isOnDay(key)) {
      if (!dosesForKey(key)[dose]) setDose(key, dose, true);
      refreshToday();
      if (medHost) {
        medHost.classList.add('med-card--flash');
        setTimeout(() => medHost.classList.remove('med-card--flash'), 1600);
        medHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    const logType = params.get('log');
    if (logType) setTimeout(() => cap.openType(logType), 150);
    if (location.search) {
      const theme = params.get('theme');
      history.replaceState(null, '', location.pathname + (theme ? `?theme=${encodeURIComponent(theme)}` : ''));
    }
  }

  // ---------- Init ----------
  renderHeader();
  initMonthView();   // wires nav + confirms viewYear/viewMonth before any render
  initRangeTabs();
  renderToday();     // renders med card + capture + timeline + heatmap + stats
  pushTreatmentConfig();   // keep the Worker's reminder schedule in sync
})();
