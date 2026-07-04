(() => {
  'use strict';

  const STORAGE_KEY = 'health-tracker-v1';
  const START_DATE = '2026-05-14';
  const TOTAL_DAYS = 31;
  const SLOTS = ['matin', 'midi', 'soir'];
  const SLOT_LABELS = { matin: 'Matin', midi: 'Midi', soir: 'Soir' };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { entries: {} };
      const p = JSON.parse(raw);
      if (!p.entries) p.entries = {};
      // Normalize crise to number, notes to string
      for (const date in p.entries) {
        for (const slot in p.entries[date]) {
          const e = p.entries[date][slot];
          if (typeof e.crise === 'boolean') e.crise = e.crise ? 3 : 0;
          else if (typeof e.crise !== 'number') e.crise = 0;
          if (typeof e.notes !== 'string') e.notes = '';
          if (typeof e.criseTime !== 'string') e.criseTime = '';
        }
      }
      return p;
    } catch {
      return { entries: {} };
    }
  }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

  function fmtDate(d, opts) {
    return new Intl.DateTimeFormat('fr-FR', opts).format(d);
  }

  const state = loadState();

  // Build day array
  const days = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = addDays(parseKey(START_DATE), i);
    const key = dateKey(d);
    days.push({ date: d, key, entries: state.entries[key] || {} });
  }

  // ---------- Subtitle ----------
  const startStr = fmtDate(parseKey(START_DATE), { day: 'numeric', month: 'long', year: 'numeric' });
  const endStr = fmtDate(addDays(parseKey(START_DATE), TOTAL_DAYS - 1), { day: 'numeric', month: 'long', year: 'numeric' });

  const totalSlots = TOTAL_DAYS * SLOTS.length;
  let filledCount = 0;
  let daysWithData = 0;
  for (const day of days) {
    let any = false;
    for (const s of SLOTS) if (day.entries[s]) { filledCount++; any = true; }
    if (any) daysWithData++;
  }

  const completion = totalSlots ? Math.round((filledCount / totalSlots) * 100) : 0;
  document.getElementById('subtitle').textContent =
    `Période : ${startStr} → ${endStr} · ${daysWithData} jour(s) suivi(s) · ${completion}% de complétion (${filledCount}/${totalSlots} entrées)`;

  // ---------- Summary cards ----------
  let totalNote = 0, totalNoteCount = 0;
  let totalCachet = 0;
  let totalCrise = 0;
  let totalCriseIntensity = 0;
  let maxCrise = 0;

  for (const day of days) {
    for (const s of SLOTS) {
      const e = day.entries[s];
      if (!e) continue;
      totalNote += e.note;
      totalNoteCount++;
      if (e.cachet) totalCachet++;
      if (e.crise > 0) {
        totalCrise++;
        totalCriseIntensity += e.crise;
        if (e.crise > maxCrise) maxCrise = e.crise;
      }
    }
  }

  const avgNote = totalNoteCount ? (totalNote / totalNoteCount) : null;
  const cachetPct = totalNoteCount ? Math.round((totalCachet / totalNoteCount) * 100) : 0;
  const avgCriseIntensity = totalCrise ? (totalCriseIntensity / totalCrise) : null;

  // Week 1 vs week 4 deltas
  function weekAvg(startIdx, endIdx) {
    let s = 0, c = 0;
    for (let i = startIdx; i < endIdx && i < days.length; i++) {
      for (const sl of SLOTS) {
        const e = days[i].entries[sl];
        if (e) { s += e.note; c++; }
      }
    }
    return c ? (s / c) : null;
  }

  const w1 = weekAvg(0, 7);
  const w4 = weekAvg(Math.max(0, TOTAL_DAYS - 7), TOTAL_DAYS);
  let deltaStr = '—';
  if (w1 !== null && w4 !== null) {
    const d = w4 - w1;
    const sign = d > 0 ? '+' : '';
    deltaStr = `${sign}${d.toFixed(2)} pt`;
  }

  const summaryGrid = document.getElementById('summaryGrid');
  function statCard(label, value, sub) {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `
      <div class="stat__label">${label}</div>
      <div class="stat__value">${value}</div>
      ${sub ? `<div class="stat__sub">${sub}</div>` : ''}
    `;
    return div;
  }

  summaryGrid.appendChild(statCard('Note moyenne', avgNote !== null ? avgNote.toFixed(2) : '—', avgNote !== null ? 'sur 5' : ''));
  summaryGrid.appendChild(statCard('Prise de cachet', `${cachetPct}%`, `${totalCachet} / ${totalNoteCount || 0} saisies`));
  summaryGrid.appendChild(statCard(
    'Crises',
    String(totalCrise),
    totalCrise > 0
      ? `force moy. ${avgCriseIntensity.toFixed(1)}/5 · max ${maxCrise}/5`
      : 'aucun épisode'
  ));
  summaryGrid.appendChild(statCard('Évolution', deltaStr, 'sem. 1 → sem. 4'));

  // ---------- Stats table by slot ----------
  const statsBody = document.getElementById('statsBody');
  for (const s of SLOTS) {
    let n = 0, total = 0, ca = 0, cr = 0, crIntensity = 0;
    for (const day of days) {
      const e = day.entries[s];
      if (!e) continue;
      total += e.note; n++;
      if (e.cachet) ca++;
      if (e.crise > 0) { cr++; crIntensity += e.crise; }
    }
    const criseCell = cr > 0
      ? `${cr} · force moy. ${(crIntensity / cr).toFixed(1)}`
      : '0';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${SLOT_LABELS[s]}</td>
      <td class="num">${n ? (total / n).toFixed(2) : '—'}</td>
      <td class="num">${n ? Math.round((ca / n) * 100) + '%' : '—'}</td>
      <td class="num">${criseCell}</td>
      <td class="num">${n} / ${TOTAL_DAYS}</td>
    `;
    statsBody.appendChild(row);
  }

  // ---------- Chart ----------
  function renderChart() {
    const svg = document.getElementById('chart');
    const W = 760, H = 180;
    const padL = 28, padR = 12, padT = 14, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    // daily avg
    const points = days.map((day, i) => {
      let s = 0, c = 0;
      for (const sl of SLOTS) {
        const e = day.entries[sl];
        if (e) { s += e.note; c++; }
      }
      return { i, avg: c ? s / c : null, date: day.date };
    });

    const ns = 'http://www.w3.org/2000/svg';
    const frag = [];

    // gridlines & y labels (1..5)
    for (let y = 1; y <= 5; y++) {
      const yy = padT + innerH - ((y - 1) / 4) * innerH;
      frag.push(`<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="#EAEAEF" stroke-width="1"/>`);
      frag.push(`<text class="chart-axis" x="${padL - 6}" y="${yy + 3}" text-anchor="end">${y}</text>`);
    }

    // x labels (every ~5 days)
    for (let i = 0; i < TOTAL_DAYS; i += 5) {
      const xx = padL + (i / (TOTAL_DAYS - 1)) * innerW;
      const dlabel = fmtDate(days[i].date, { day: 'numeric', month: 'short' });
      frag.push(`<text class="chart-axis" x="${xx}" y="${H - 8}" text-anchor="middle">${dlabel}</text>`);
    }
    // last label
    const xxLast = padL + innerW;
    frag.push(`<text class="chart-axis" x="${xxLast}" y="${H - 8}" text-anchor="end">${fmtDate(days[TOTAL_DAYS - 1].date, { day: 'numeric', month: 'short' })}</text>`);

    // build path segments (skip nulls)
    const pathSegs = [];
    let inSeg = false;
    points.forEach(p => {
      if (p.avg === null) { inSeg = false; return; }
      const x = padL + (p.i / (TOTAL_DAYS - 1)) * innerW;
      const y = padT + innerH - ((p.avg - 1) / 4) * innerH;
      pathSegs.push(`${inSeg ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      inSeg = true;
    });
    if (pathSegs.length) {
      frag.push(`<path d="${pathSegs.join(' ')}" fill="none" stroke="#2E8A72" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
    }

    // data points
    points.forEach(p => {
      if (p.avg === null) return;
      const x = padL + (p.i / (TOTAL_DAYS - 1)) * innerW;
      const y = padT + innerH - ((p.avg - 1) / 4) * innerH;
      frag.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#2E8A72"/>`);
    });

    svg.innerHTML = frag.join('');
  }
  renderChart();

  // ---------- Day-by-day table ----------
  const daysBody = document.getElementById('daysBody');
  for (const day of days) {
    const tr = document.createElement('tr');
    let html = `<td class="date">${fmtDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>`;
    for (const s of SLOTS) {
      const e = day.entries[s];
      if (e) {
        html += `<td class="note">${e.note}</td>`;
        html += `<td>${e.cachet ? 'Oui' : '—'}</td>`;
        html += `<td class="${e.crise > 0 ? 'crise' : ''}">${e.crise > 0 ? `${e.crise}/5${e.criseTime ? `<br><span class="cell-sub">${e.criseTime}</span>` : ''}` : '—'}</td>`;
      } else {
        html += `<td class="empty">—</td><td class="empty">—</td><td class="empty">—</td>`;
      }
    }
    tr.innerHTML = html;
    daysBody.appendChild(tr);
  }

  // ---------- Commentaires ----------
  const commentsBlock = document.getElementById('commentsBlock');
  const commentEntries = [];
  for (const day of days) {
    for (const s of SLOTS) {
      const e = day.entries[s];
      if (e && e.notes && e.notes.trim()) {
        commentEntries.push({
          date: day.date,
          key: day.key,
          slot: s,
          text: e.notes.trim(),
          crise: e.crise || 0,
          criseTime: e.criseTime || '',
        });
      }
    }
  }
  if (commentEntries.length === 0) {
    commentsBlock.innerHTML = '<div class="comments-empty">Aucun commentaire saisi sur la période.</div>';
  } else {
    for (const c of commentEntries) {
      const div = document.createElement('div');
      div.className = 'comment';
      let meta = `${fmtDate(c.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${SLOT_LABELS[c.slot]}`;
      if (c.crise > 0) {
        meta += ` · crise ${c.crise}/5${c.criseTime ? ` à ${c.criseTime}` : ''}`;
      }
      div.innerHTML = `
        <div class="comment__meta">${meta}</div>
        <div class="comment__text"></div>
      `;
      div.querySelector('.comment__text').textContent = c.text;
      commentsBlock.appendChild(div);
    }
  }

  // ====================================================================
  // Continuous log (events + doses + Trimébutine cycles) — the doctor
  // export used to cover ONLY the frozen May window; everything since
  // (état/repas/WC/crise events, medication adherence) now exports too.
  // ====================================================================
  const EVENTS = Array.isArray(state.events) ? state.events.slice().sort((a, b) => a.ts - b.ts) : [];
  const DOSES = (state.doses && typeof state.doses === 'object') ? state.doses : {};
  const TREATMENT = Object.assign(
    { startDate: '2026-07-01', cycleOn: 30, cycleOff: 5, months: 6, doses: ['matin', 'midi', 'soir'], med: 'Trimébutine maléate' },
    state.treatment || {},
  );
  const BRISTOL = { 1: 'billes dures', 2: 'grumeleux', 3: 'fissuré', 4: 'lisse (idéal)', 5: 'morceaux mous', 6: 'bouillie', 7: 'liquide' };
  const SIZES = { leger: 'léger', normal: 'normal', copieux: 'copieux' };
  const TYPE_LABEL = { etat: 'État', repas: 'Repas', wc: 'WC', crise: 'Crise' };

  function logicalKeyOfTs(ts) {
    const d = new Date(ts);
    if (d.getHours() < 4) return dateKey(addDays(d, -1));
    return dateKey(d);
  }
  function fmtClock(ts) {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function evValue(ev) {
    if (ev.type === 'etat') return `${ev.note ?? '—'}/5`;
    if (ev.type === 'wc') return `Bristol ${ev.bristol ?? '—'}`;
    if (ev.type === 'crise') return `${ev.intensity ?? '—'}/5`;
    if (ev.type === 'repas') return SIZES[ev.size] || ev.size || '—';
    return '—';
  }
  function evDetails(ev) {
    const bits = [];
    if (ev.type === 'wc' && ev.bristol) bits.push(BRISTOL[ev.bristol] || '');
    if (ev.type === 'repas' && Array.isArray(ev.tags) && ev.tags.length) bits.push(ev.tags.join(', '));
    if (typeof ev.note === 'number' && ev.type !== 'etat') bits.push(`état ${ev.note}/5`);
    if (typeof ev.douleur === 'number' && ev.douleur > 0) bits.push(`douleur ${ev.douleur}/5`);
    if (typeof ev.stress === 'number' && ev.stress > 0) bits.push(`stress ${ev.stress}/5`);
    if (ev.loperamide) bits.push('Lopéramide pris');
    if (ev.comment && ev.comment.trim()) bits.push(`« ${ev.comment.trim()} »`);
    return bits.filter(Boolean).join(' · ');
  }

  // ---- Continuous summary cards ----
  const evGrid = document.getElementById('evSummaryGrid');
  if (evGrid) {
    const evDays = new Set(EVENTS.map(e => logicalKeyOfTs(e.ts)));
    const notes = EVENTS.map(e => e.note).filter(n => typeof n === 'number' && n > 0);
    const crises = EVENTS.filter(e => e.type === 'crise');
    const lop = crises.filter(e => e.loperamide).length;
    const wc = EVENTS.filter(e => e.type === 'wc' && e.bristol);
    const wcNormal = wc.filter(e => e.bristol >= 3 && e.bristol <= 4).length;
    evGrid.appendChild(statCard('Jours documentés', String(evDays.size), `${EVENTS.length} événements`));
    evGrid.appendChild(statCard('État moyen', notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : '—', 'sur 5'));
    evGrid.appendChild(statCard('Crises', String(crises.length), crises.length ? `force moy. ${(crises.reduce((a, e) => a + (e.intensity || 0), 0) / crises.length).toFixed(1)}/5 · Lopéramide ×${lop}` : 'aucun épisode'));
    evGrid.appendChild(statCard('Transit normal', wc.length ? Math.round(wcNormal / wc.length * 100) + '%' : '—', wc.length ? `${wcNormal} / ${wc.length} passages (Bristol 3-4)` : ''));
  }

  // ---- Trimébutine cycles ----
  const medGrid = document.getElementById('medGrid');
  const cyclesBody = document.getElementById('cyclesBody');
  if (medGrid && cyclesBody) {
    const start = parseKey(TREATMENT.startDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const len = TREATMENT.cycleOn + TREATMENT.cycleOff;
    const perDay = (TREATMENT.doses || []).length || 3;
    let grandTaken = 0, grandExpected = 0;
    for (let c = 0; c < TREATMENT.months; c++) {
      let onPassed = 0, taken = 0;
      for (let i = 0; i < TREATMENT.cycleOn; i++) {
        const d = addDays(start, c * len + i);
        if (d > today) break;
        onPassed++;
        const doses = DOSES[dateKey(d)] || {};
        taken += Math.min(Object.keys(doses).length, perDay);
      }
      if (onPassed === 0) continue;   // cycle not started yet
      const expected = onPassed * perDay;
      grandTaken += taken; grandExpected += expected;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>Cycle ${c + 1}</td>
        <td class="num">${onPassed} / ${TREATMENT.cycleOn}</td>
        <td class="num">${taken} / ${expected}</td>
        <td class="num">${expected ? Math.round(taken / expected * 100) + '%' : '—'}</td>
      `;
      cyclesBody.appendChild(row);
    }
    const startedStr = fmtDate(start, { day: 'numeric', month: 'long', year: 'numeric' });
    medGrid.appendChild(statCard(TREATMENT.med || 'Traitement', grandExpected ? Math.round(grandTaken / grandExpected * 100) + '%' : '—', `observance globale · débuté le ${startedStr}`));
    medGrid.appendChild(statCard('Posologie', `${perDay} / jour`, `cycles ${TREATMENT.cycleOn} j + ${TREATMENT.cycleOff} j de pause`));
    if (grandExpected === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="color:#8A8A93">Traitement pas encore commencé (${startedStr}).</td>`;
      cyclesBody.appendChild(row);
    }
  }

  // ---- Events journal table ----
  const eventsBody = document.getElementById('eventsBody');
  if (eventsBody) {
    if (EVENTS.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5" style="color:#8A8A93">Aucun événement enregistré.</td>`;
      eventsBody.appendChild(row);
    }
    let lastKey = '';
    for (const ev of EVENTS) {
      const key = logicalKeyOfTs(ev.ts);
      const tr = document.createElement('tr');
      const dateCell = key !== lastKey ? fmtDate(new Date(ev.ts), { weekday: 'short', day: 'numeric', month: 'short' }) : '';
      lastKey = key;
      tr.innerHTML = `
        <td class="date">${dateCell}</td>
        <td>${fmtClock(ev.ts)}</td>
        <td>${TYPE_LABEL[ev.type] || ev.type}</td>
        <td class="${ev.type === 'crise' ? 'crise' : 'note'}">${evValue(ev)}</td>
        <td></td>
      `;
      tr.lastElementChild.textContent = evDetails(ev);   // free text — never innerHTML
      eventsBody.appendChild(tr);
    }
  }

  // ---------- Buttons ----------
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  function downloadCsv(rows, filename) {
    const csv = rows.map(r => r.map(v => {
      const str = String(v ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });   // BOM → Excel reads UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById('csvBtn').addEventListener('click', () => {
    // Full legacy fields — douleur/transit/stress/tags/repas were dropped
    // from the old export even though the entries carry them.
    const rows = [['date', 'creneau', 'note', 'cachet', 'crise', 'crise_heure', 'douleur', 'transit', 'stress', 'tags', 'repas', 'commentaire', 'saved_at']];
    for (const day of days) {
      for (const s of SLOTS) {
        const e = day.entries[s];
        if (!e) continue;
        rows.push([
          day.key, s, e.note, e.cachet ? 1 : 0, e.crise || 0, e.criseTime || '',
          e.douleur || '', e.transit || '', e.stress || '',
          Array.isArray(e.tags) ? e.tags.join('|') : '', e.repas || '',
          (e.notes || '').replace(/\r?\n/g, ' '), e.savedAt || '',
        ]);
      }
    }
    downloadCsv(rows, `suivi-sante-${START_DATE}.csv`);
  });

  const csvEventsBtn = document.getElementById('csvEventsBtn');
  if (csvEventsBtn) csvEventsBtn.addEventListener('click', () => {
    const rows = [['date', 'heure', 'type', 'note', 'bristol', 'intensite', 'taille_repas', 'tags', 'douleur', 'stress', 'loperamide', 'commentaire']];
    for (const ev of EVENTS) {
      rows.push([
        logicalKeyOfTs(ev.ts), fmtClock(ev.ts), ev.type,
        ev.note ?? '', ev.bristol ?? '', ev.intensity ?? '',
        ev.size || '', Array.isArray(ev.tags) ? ev.tags.join('|') : '',
        ev.douleur ?? '', ev.stress ?? '', ev.loperamide ? 1 : 0,
        (ev.comment || '').replace(/\r?\n/g, ' '),
      ]);
    }
    // Doses as their own rows
    for (const key of Object.keys(DOSES).sort()) {
      for (const slot of Object.keys(DOSES[key])) {
        const ts = DOSES[key][slot];
        rows.push([key, typeof ts === 'number' ? fmtClock(ts) : '', 'dose_' + slot, '', '', '', '', '', '', '', '', TREATMENT.med || '']);
      }
    }
    downloadCsv(rows, `suivi-sante-evenements.csv`);
  });
})();
