// Screens and actions. Routes: #/home, #/area/<id>[/<tab>], #/search, #/settings.
(function () {
  const S = LT.store;
  const U = LT.ui;
  const C = LT.C;
  const I = LT.icon;
  const { esc, today, addDays, fmtDate, relDate, fmtTime } = U;
  const main = document.getElementById('main');

  const state = { calMonth: '', calSel: '', calFilter: '', query: '', showPast: false, workoutsShown: 20 };

  // ---------------------------------------------------------------- helpers
  const cvar = (a) => `--c: var(--a-${esc(a.color)})`;
  const dot = (a) => `<i class="dot" style="${cvar(a)}"></i>`;
  const areaOptions = () => S.areas().map((a) => ({ value: a.id, label: a.name, color: a.color }));
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const REPEAT_SHORT = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', yearly: 'Yearly' };
  function repeatText(it) {
    if (!it.repeat) return '';
    let s = REPEAT_SHORT[it.repeat];
    if ((it.repeat === 'weekly' || it.repeat === 'biweekly') && it.date) s += ' on ' + fmtDate(it.date, { weekday: 'long' }) + 's';
    if (it.repeat === 'monthly' && it.date) s += ' on the ' + ordinal(U.parse(it.date).getDate());
    if (it.until) s += ' until ' + fmtDate(it.until, { month: 'short', day: 'numeric', year: 'numeric' });
    return s;
  }
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

  const timeRange = (it) => (it.time ? fmtTime(it.time) + (it.endTime ? '–' + fmtTime(it.endTime) : '') : '');
  const dayHeading = (d) => {
    const r = relDate(d);
    const full = fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
    return r === full ? full : `${r} <span class="muted">· ${fmtDate(d, { month: 'short', day: 'numeric' })}</span>`;
  };
  const firstLine = (s, n = 90) => { const t = String(s || '').trim().split('\n')[0]; return t.length > n ? t.slice(0, n - 1) + '…' : t; };

  // ---------------------------------------------------------------- rows
  function taskRow(t, o = {}) {
    const a = S.area(t.area);
    const td = today();
    const overdue = !t.done && t.date && t.date < td;
    const bits = [];
    if (o.showArea !== false) bits.push(`${dot(a)}${esc(a.name)}`);
    if (t.date && !o.hideDate) bits.push(`<span class="${overdue ? 'overdue' : ''}">${esc(overdue ? 'Due ' + relDate(t.date).replace(/^Yesterday/, 'yesterday') : relDate(t.date))}</span>`);
    if (t.time) bits.push(esc(fmtTime(t.time)));
    if (t.repeat) bits.push(`${I('repeat')} ${esc(REPEAT_SHORT[t.repeat])}`);
    if (t.done && t.doneAt && o.showDone) bits.push('Done ' + esc(relDate(t.doneAt.slice(0, 10))));
    const resched = overdue && o.reschedule ? `<button type="button" class="btn tiny" data-resched="${t.id}">Move</button>` : '';
    return `<div class="item task ${t.done || o.historic ? 'done' : ''}" style="${cvar(a)}">
      <input type="checkbox" class="chk" aria-label="Done" ${t.done || o.historic ? 'checked' : ''} ${o.historic ? 'disabled' : `data-done="${t.id}"`}>
      <div class="grow">
        <a href="#" class="item-title" data-task="${t.id}">${t.important ? I('flag', 'flag') : ''}${esc(t.title)}</a>
        ${bits.length ? `<div class="meta">${bits.join('<span class="sep">·</span>')}</div>` : ''}
        ${t.notes && !o.compact ? `<div class="item-note">${esc(firstLine(t.notes))}</div>` : ''}
      </div>${resched}
    </div>`;
  }

  function eventRow(occ, o = {}) {
    const e = occ.item;
    const a = S.area(e.area);
    const bits = [];
    if (o.showArea !== false) bits.push(`${dot(a)}${esc(a.name)}`);
    if (o.showDate) bits.push(esc(relDate(occ.date)));
    if (e.location) bits.push(esc(e.location));
    if (e.repeat) bits.push(`${I('repeat')}`);
    const past = occ.date < today();
    return `<div class="item ev ${past && o.dimPast ? 'past' : ''}" style="${cvar(a)}">
      <div class="ev-time">${e.time ? `<b>${esc(fmtTime(e.time))}</b>${e.endTime ? `<br>${esc(fmtTime(e.endTime))}` : ''}` : 'All day'}</div>
      <div class="grow ev-body">
        <a href="#" class="item-title" data-event="${e.id}" data-date="${occ.date}">${esc(e.title)}</a>
        ${bits.length ? `<div class="meta">${bits.join('<span class="sep">·</span>')}</div>` : ''}
      </div>
    </div>`;
  }

  function workoutRow(w, o = {}) {
    const a = S.fitnessArea() || S.areas()[0];
    const bits = [];
    if (o.showDate !== false) bits.push(esc(relDate(w.date)));
    if (w.minutes) bits.push(`${esc(w.minutes)} min`);
    if (w.distance) bits.push(`${esc(w.distance)} mi`);
    if (w.effort) bits.push(esc((C.EFFORT.find((x) => x[0] === w.effort) || ['', w.effort])[1]));
    return `<div class="item workout" style="${cvar(a)}">
      <div class="wk-ic">${I('activity')}</div>
      <div class="grow">
        <a href="#" class="item-title" data-workout="${w.id}">${esc(w.type || 'Workout')}</a>
        <div class="meta">${bits.join('<span class="sep">·</span>')}</div>
        ${w.notes ? `<div class="item-note">${esc(firstLine(w.notes))}</div>` : ''}
      </div>
    </div>`;
  }

  function noteCard(n, o = {}) {
    const a = S.area(n.area);
    const body = String(n.body || '').trim();
    return `<a href="#" class="note-card" data-note="${n.id}" style="${cvar(a)}">
      <div class="note-top">${n.pinned ? I('pinned', 'pin-ic') : ''}<strong>${esc(n.title || firstLine(body, 40) || 'Note')}</strong></div>
      ${body && n.title ? `<div class="note-body">${esc(body.length > 220 ? body.slice(0, 219) + '…' : body)}</div>` : ''}
      <div class="meta">${o.showArea !== false ? `${dot(a)}${esc(a.name)}<span class="sep">·</span>` : ''}${n.date ? esc(fmtDate(n.date)) : esc(relDate((n.updatedAt || n.createdAt || '').slice(0, 10)))}</div>
    </a>`;
  }

  // Everything on one day: events, to-dos due (and repeat finishes), workouts, dated notes.
  function dayEntries(day, areaId) {
    const inArea = (x) => !areaId || x.area === areaId;
    const events = S.eventsBetween(day, day).filter((o) => inArea(o.item));
    const tasks = S.all('items').filter((t) => t.kind === 'task' && t.date === day && inArea(t));
    const finished = S.all('items').filter((t) => t.kind === 'task' && inArea(t) && t.history.some((h) => h.date === day));
    const fit = S.fitnessArea();
    const workouts = !areaId || (fit && fit.id === areaId) ? S.all('workouts').filter((w) => w.date === day) : [];
    const notes = S.all('notes').filter((n) => n.date === day && inArea(n));
    return { events, tasks, finished, workouts, notes, count: events.length + tasks.length + finished.length + workouts.length + notes.length };
  }

  function dayList(day, areaId, o = {}) {
    const d = dayEntries(day, areaId);
    // All-day events, then anything with a time in order, then to-dos without a time.
    const timed = [
      ...d.events.map((e) => ({ k: e.item.time || '', html: eventRow(e, o) })),
      ...d.tasks.map((t) => ({ k: t.time || '~', html: taskRow(t, { ...o, hideDate: true, compact: true }) })),
      ...d.finished.map((t) => ({ k: '~~', html: taskRow(t, { ...o, hideDate: true, compact: true, historic: true }) })),
      ...d.workouts.map((w) => ({ k: '~~~', html: workoutRow(w, { showDate: false }) })),
    ].sort((x, y) => x.k.localeCompare(y.k));
    return timed.map((x) => x.html).join('') + d.notes.map((n) => noteCard(n, o)).join('');
  }

  // ---------------------------------------------------------------- forms
  const suggestFor = (areaId) => C.SUGGEST[areaId] || [];

  function taskForm(t = {}) {
    const isNew = !t.id;
    const vals = { area: S.areas()[0].id, ...t };
    U.openForm({
      title: isNew ? 'New to-do' : 'Edit to-do',
      values: vals,
      fields: [
        { name: 'title', label: 'What needs doing?', required: true, list: suggestFor(vals.area), placeholder: 'e.g. Call about the schedule' },
        { name: 'area', label: 'Area', type: 'chips', options: areaOptions() },
        { name: 'date', label: 'Due', type: 'date', quick: [['Today', 0], ['Tomorrow', 1], ['Next week', 7], ['No date', null]] },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
        { name: 'time', label: 'Time', type: 'time', half: true, more: !t.time },
        { name: 'repeat', label: 'Repeat', type: 'select', options: C.REPEATS.map(([v, l]) => ({ value: v, label: l })), half: true, more: !t.repeat },
        { name: 'important', label: 'Important (flag it)', type: 'checkbox', more: !t.important },
      ],
      onDelete: isNew ? null : () => { S.remove('items', t.id); U.toast('To-do deleted'); render(); },
      onSubmit(d) {
        if (d.repeat && !d.date) d.date = today();
        S.upsert('items', { ...t, ...d, kind: 'task', done: t.done || false });
        U.toast(isNew ? 'To-do added' : 'Saved');
        render();
      },
    });
  }

  function eventForm(e = {}) {
    const isNew = !e.id;
    const vals = { area: S.areas()[0].id, date: today(), ...e };
    U.openForm({
      title: isNew ? 'New event' : 'Edit event',
      values: vals,
      intro: !isNew && e.repeat ? '<p class="form-context">Changes apply to every date of this repeating event.</p>' : '',
      fields: [
        { name: 'title', label: 'Event', required: true, list: suggestFor(vals.area), placeholder: 'e.g. Midweek meeting' },
        { name: 'area', label: 'Area', type: 'chips', options: areaOptions() },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'time', label: 'Starts', type: 'time', half: true },
        { name: 'endTime', label: 'Ends', type: 'time', half: true },
        { name: 'repeat', label: 'Repeat', type: 'select', options: C.REPEATS.map(([v, l]) => ({ value: v, label: l })) },
        { name: 'location', label: 'Where', more: !e.location },
        { name: 'until', label: 'Repeat until (optional)', type: 'date', more: !e.until },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, more: !e.notes },
      ],
      onDelete: isNew || e.repeat ? null : () => { S.remove('items', e.id); U.toast('Event deleted'); render(); },
      onSubmit(d) {
        if (d.endTime && d.time && d.endTime < d.time) { U.toast('The end time is before the start time'); return false; }
        if (!d.repeat) d.until = '';
        S.upsert('items', { ...e, ...d, kind: 'event' });
        U.toast(isNew ? 'Event added' : 'Saved');
        if (isNew && d.date) { state.calMonth = d.date.slice(0, 7); state.calSel = d.date; }
        render();
      },
    });
  }

  function noteForm(n = {}) {
    const isNew = !n.id;
    U.openForm({
      title: isNew ? 'New note' : 'Note',
      values: { area: S.areas()[0].id, ...n },
      fields: [
        { name: 'title', label: 'Title', placeholder: 'Optional' },
        { name: 'body', label: 'Note', type: 'textarea', rows: 8 },
        { name: 'area', label: 'Area', type: 'chips', options: areaOptions() },
        { name: 'date', label: 'Show on the calendar on', type: 'date', half: true, more: !n.date },
        { name: 'pinned', label: 'Pin to the Dashboard', type: 'checkbox', more: !n.pinned },
      ],
      onDelete: isNew ? null : () => { S.remove('notes', n.id); U.toast('Note deleted'); render(); },
      onSubmit(d) {
        if (!d.title && !d.body) { U.toast('Write something first'); return false; }
        S.upsert('notes', { ...n, ...d });
        U.toast(isNew ? 'Note saved' : 'Saved');
        render();
      },
    });
  }

  function workoutForm(w = {}) {
    const isNew = !w.id;
    U.openForm({
      title: isNew ? 'Log a workout' : 'Workout',
      values: { date: today(), type: 'Run', ...w },
      fields: [
        { name: 'type', label: 'Type', type: 'chips', options: C.WORKOUT_TYPES },
        { name: 'date', label: 'Date', type: 'date', required: true, quick: [['Today', 0], ['Yesterday', -1]] },
        { name: 'minutes', label: 'Minutes', type: 'number', half: true, step: 1, placeholder: '30' },
        { name: 'distance', label: 'Distance (mi)', type: 'number', half: true, placeholder: 'Optional' },
        { name: 'effort', label: 'How hard?', type: 'chips', options: C.EFFORT },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Weights, route, how it felt…' },
      ],
      onDelete: isNew ? null : () => { S.remove('workouts', w.id); U.toast('Workout deleted'); render(); },
      onSubmit(d) {
        S.upsert('workouts', { ...w, ...d });
        const st = S.weekStats(d.date);
        const goal = S.db.settings.goal.perWeek;
        U.toast(isNew && goal ? `Logged. ${st.count} of ${goal} this week` : 'Saved');
        render();
      },
    });
  }

  function addThing(kind, defaults = {}) {
    if (kind === 'task') taskForm(defaults);
    else if (kind === 'event') eventForm(defaults);
    else if (kind === 'note') noteForm(defaults);
    else if (kind === 'workout') workoutForm(defaults);
  }

  // Event details, opened from a specific date of the event.
  function showEvent(id, day) {
    const e = S.get('items', id);
    if (!e) return;
    const a = S.area(e.area);
    const fit = a.fitness && day <= today();
    U.openInfo(e.title, `
      <div class="ev-detail" style="${cvar(a)}">
        <div class="details">
          <div><span>When</span>${esc(fmtDate(day, { weekday: 'long', month: 'long', day: 'numeric' }))}${e.time ? '<br>' + esc(timeRange(e)) : ' · All day'}</div>
          <div><span>Area</span>${dot(a)}${esc(a.name)}</div>
          ${e.repeat ? `<div><span>Repeats</span>${esc(repeatText(e))}</div>` : ''}
          ${e.location ? `<div><span>Where</span>${U.mapLink(e.location)}</div>` : ''}
        </div>
        ${e.notes ? `<div class="notes pre">${esc(e.notes)}</div>` : ''}
        <div class="detail-actions">
          <button type="button" class="btn primary" data-act="edit">${I('note')} Edit</button>
          ${fit ? `<button type="button" class="btn" data-act="log">${I('activity')} Log as workout</button>` : ''}
          <button type="button" class="btn" data-act="ics">${I('calendarPlus')} Add to phone calendar</button>
          <button type="button" class="btn danger ghost" data-act="delete">Delete</button>
        </div>
      </div>`);
    const dlg = document.getElementById('modal');
    dlg.querySelector('[data-act=edit]').addEventListener('click', () => { U.close(); eventForm(e); });
    dlg.querySelector('[data-act=ics]').addEventListener('click', () => shareICS([e], e.title));
    const log = dlg.querySelector('[data-act=log]');
    if (log) log.addEventListener('click', () => {
      U.close();
      const type = C.WORKOUT_TYPES.find((t) => e.title.toLowerCase().includes(t.toLowerCase())) || 'Other';
      let minutes = '';
      if (e.time && e.endTime) { const m = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)); minutes = m(e.endTime) - m(e.time); }
      workoutForm({ date: day, type, minutes, notes: '' });
    });
    dlg.querySelector('[data-act=delete]').addEventListener('click', () => {
      if (!e.repeat) { U.ask('Delete this event?', () => { S.remove('items', e.id); U.close(); U.toast('Event deleted'); render(); }); return; }
      choose('Delete repeating event', [
        ['only', 'Just this date', fmtDate(day, { weekday: 'long', month: 'short', day: 'numeric' })],
        ['future', 'This and every later date', 'Earlier dates stay'],
        ['all', 'Every date', 'Removes the whole series'],
      ], (v) => {
        if (v === 'only') S.skip(e, day);
        else if (v === 'future') S.endBefore(e, day);
        else S.remove('items', e.id);
        U.toast('Deleted');
        render();
      });
    });
  }

  // A list of big buttons; calls onPick(value).
  function choose(title, options, onPick) {
    U.openInfo(title, `<div class="chooser">${options.map(([v, l, sub]) =>
      `<button type="button" class="chooser-btn" data-v="${esc(v)}"><span>${esc(l)}${sub ? `<em>${esc(sub)}</em>` : ''}</span></button>`).join('')}</div>`);
    document.querySelectorAll('#modal .chooser-btn').forEach((b) => b.addEventListener('click', () => { U.close(); onPick(b.dataset.v); }));
  }

  function reschedule(t) {
    choose(`Move “${t.title}”`, [['0', 'Today'], ['1', 'Tomorrow'], ['7', 'Next week'], ['pick', 'Pick a date…'], ['none', 'No date']], (v) => {
      if (v === 'pick') { taskForm(t); return; }
      t.date = v === 'none' ? '' : addDays(today(), Number(v));
      S.upsert('items', t);
      U.toast(t.date ? 'Moved to ' + relDate(t.date) : 'Moved to No date');
      render();
    });
  }

  // ---------------------------------------------------------------- calendar file (.ics)
  function icsText(events) {
    const z = (s) => s.replace(/-/g, '');
    const t = (s) => s.replace(':', '') + '00';
    const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const fold = (line) => line.match(/.{1,73}/g).join('\r\n ');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const RR = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
    const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Tracker//EN', 'CALSCALE:GREGORIAN'];
    for (const e of events) {
      const area = S.area(e.area);
      out.push('BEGIN:VEVENT', `UID:${e.id}@life-tracker`, `DTSTAMP:${stamp}`);
      if (e.time) {
        out.push(`DTSTART:${z(e.date)}T${t(e.time)}`);
        out.push(e.endTime ? `DTEND:${z(e.date)}T${t(e.endTime)}` : 'DURATION:PT1H');
      } else {
        out.push(`DTSTART;VALUE=DATE:${z(e.date)}`, `DTEND;VALUE=DATE:${z(addDays(e.date, 1))}`);
      }
      if (e.repeat) out.push(`RRULE:${RR[e.repeat]}${e.until ? ';UNTIL=' + z(e.until) + (e.time ? 'T235959' : '') : ''}`);
      for (const s of e.skips || []) out.push(e.time ? `EXDATE:${z(s)}T${t(e.time)}` : `EXDATE;VALUE=DATE:${z(s)}`);
      out.push(fold('SUMMARY:' + escI(e.title)), fold('CATEGORIES:' + escI(area.name)));
      if (e.location) out.push(fold('LOCATION:' + escI(e.location)));
      if (e.notes) out.push(fold('DESCRIPTION:' + escI(e.notes)));
      if (e.time) out.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold('DESCRIPTION:' + escI(e.title)), 'TRIGGER:-PT30M', 'END:VALARM');
      out.push('END:VEVENT');
    }
    out.push('END:VCALENDAR');
    return out.join('\r\n') + '\r\n';
  }

  // On phones, the share sheet hands the file straight to the Calendar app; elsewhere it downloads.
  async function shareICS(events, name) {
    const filename = (name || 'events').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.ics';
    const text = icsText(events);
    if (!LT.DEMO && navigator.canShare) {
      const file = new File([text], filename, { type: 'text/calendar' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
    }
    U.download(filename, text, 'text/calendar');
  }

  // ---------------------------------------------------------------- dashboard
  function viewHome() {
    const td = today();
    const db = S.db;
    const hasData = db.items.length || db.notes.length || db.workouts.length;
    const open = S.openTasks();
    const overdue = open.filter((t) => t.date && t.date < td).sort((a, b) => a.date.localeCompare(b.date));
    const todayN = dayEntries(td).events.length + open.filter((t) => t.date === td).length;

    let html = '';
    if (LT.DEMO) html += `<div class="banner demo">${I('alert')}<span>This is a demo with sample data. Try anything; changes last until you reload.</span></div>`;
    html += `<div class="page-head"><h1>${esc(fmtDate(td, { weekday: 'long', month: 'long', day: 'numeric' }))}</h1>
      <p class="muted">${hasData ? `${todayN ? plural(todayN, 'thing') + ' today' : 'Nothing scheduled today'}${overdue.length ? ` · <span class="overdue">${overdue.length} overdue</span>` : ''}` : 'Welcome. Let’s get everything in one place.'}</p></div>`;

    html += quickAdd({});

    if (!hasData) html += welcome();

    // Needs attention: overdue to-dos and gentle nudges.
    const nudges = attentionNudges();
    if (overdue.length || nudges.length) {
      html += `<section class="panel attention"><h3>${I('alert')} Needs attention</h3>
        ${overdue.map((t) => taskRow(t, { reschedule: true })).join('')}
        ${nudges.join('')}
      </section>`;
    }

    html += calendarPanel();
    html += comingUp();
    html += areaCards();

    const pinned = db.notes.filter((n) => n.pinned).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (pinned.length) html += `<section class="panel"><h3>${I('pinned')} Pinned notes</h3><div class="note-grid">${pinned.map((n) => noteCard(n)).join('')}</div></section>`;

    const undated = open.filter((t) => !t.date).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    if (undated.length) {
      html += `<section class="panel"><h3>${I('inbox')} No date yet <span class="count">${undated.length}</span></h3>
        <p class="small muted hint">Give these a day so they don’t get forgotten.</p>
        ${undated.slice(0, 8).map((t) => taskRow(t, { compact: true })).join('')}
        ${undated.length > 8 ? `<p class="small muted">${undated.length - 8} more in each area’s To do list.</p>` : ''}
      </section>`;
    }

    if (hasData && !LT.DEMO) {
      const last = db.settings.lastBackup;
      if (!last || U.daysBetween(last.slice(0, 10), td) >= C.BACKUP_DAYS) {
        html += `<div class="banner">${I('download')}<span>${last ? `Last backup ${esc(relDate(last.slice(0, 10)))}.` : 'You haven’t made a backup yet.'} Your data lives only on this device. <a href="#/settings">Export a backup</a></span></div>`;
      }
    }
    main.innerHTML = html;
  }

  function quickAdd(defaults) {
    const fit = S.fitnessArea();
    const showWorkout = fit && (!defaults.area || defaults.area === fit.id);
    const data = Object.entries(defaults).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
    return `<div class="quick-actions">
      <button type="button" class="qa" data-add="task" ${data}>${I('checkSquare')}To-do</button>
      <button type="button" class="qa" data-add="event" ${data}>${I('calendarPlus')}Event</button>
      <button type="button" class="qa" data-add="note" ${data}>${I('note')}Note</button>
      ${showWorkout ? `<button type="button" class="qa" data-add="workout" ${defaults.date ? `data-date="${esc(defaults.date)}"` : ''}>${I('activity')}Workout</button>` : ''}
    </div>`;
  }

  function welcome() {
    return `<section class="panel welcome">
      <h2>How it works</h2>
      <ul>
        <li><b>Areas</b>: ${S.areas().map((a) => `${dot(a)}${esc(a.name)}`).join(', ')}. Each has its own tab with to-dos, schedule and notes. Rename them in Settings.</li>
        <li><b>To-dos</b> have a due day. Anything past due shows at the top of the Dashboard until you tick it or move it.</li>
        <li><b>Events</b> go on the calendar and can repeat (like a weekly meeting).</li>
        <li><b>Notes</b> can be pinned here or shown on a calendar day.</li>
        <li><b>Fitness</b> tracks workouts against a weekly goal.</li>
      </ul>
      ${LT.DEMO ? '' : '<button type="button" class="btn" data-sample>Try it with sample data</button>'}
    </section>`;
  }

  function attentionNudges() {
    const td = today();
    const out = [];
    const snooze = S.db.settings.snooze || {};
    const horizon = addDays(td, C.QUIET_DAYS);
    const occ = S.eventsBetween(td, horizon);
    for (const a of S.areas()) {
      if (snooze[a.id] && snooze[a.id] > td) continue;
      const planned = occ.some((o) => o.item.area === a.id) || S.openTasks(a.id).some((t) => t.date && t.date >= td && t.date <= horizon);
      if (!planned) {
        out.push(`<div class="item nudge" style="${cvar(a)}"><div class="nudge-ic">${I(a.icon || 'star')}</div>
          <div class="grow"><b>Nothing planned for ${esc(a.name)}</b><div class="meta">in the next ${C.QUIET_DAYS} days</div></div>
          <div class="col-actions"><button type="button" class="btn tiny" data-add="event" data-area="${a.id}">Plan</button><button type="button" class="btn tiny ghost" data-snooze="${a.id}">Later</button></div></div>`);
      }
    }
    const fit = S.fitnessArea();
    const goal = S.db.settings.goal.perWeek;
    if (fit && goal) {
      const st = S.weekStats(td);
      const left = goal - st.count;
      const daysLeft = 7 - U.parse(td).getDay();
      if (left > 0 && left >= daysLeft) {
        out.push(`<div class="item nudge" style="${cvar(fit)}"><div class="nudge-ic">${I('activity')}</div>
          <div class="grow"><b>${plural(left, 'workout')} to go this week</b><div class="meta">${plural(daysLeft, 'day')} left including today</div></div>
          <button type="button" class="btn tiny" data-add="workout">Log</button></div>`);
      }
    }
    return out;
  }

  function calendarPanel() {
    const td = today();
    const month = state.calMonth || td.slice(0, 7);
    const sel = state.calSel || td;
    const first = month + '-01';
    const start = U.weekStart(first);
    const nextMonth = (() => { const d = U.parse(first); d.setMonth(d.getMonth() + 1); return U.ymd(d); })();
    const end = addDays(U.weekStart(addDays(nextMonth, -1)), 6);
    const filter = state.calFilter;
    const inArea = (x) => !filter || x.area === filter;

    // Dots per day, colored by area: filled for events/workouts, outlined for to-dos.
    const marks = {};
    const mark = (day, area, cls) => { (marks[day] = marks[day] || []).push({ area, cls }); };
    S.eventsBetween(start, end).forEach((o) => { if (inArea(o.item)) mark(o.date, o.item.area, ''); });
    S.all('items').forEach((t) => {
      if (t.kind !== 'task' || !inArea(t)) return;
      if (t.date && t.date >= start && t.date <= end) mark(t.date, t.area, t.done ? 'ring done' : 'ring');
      t.history.forEach((h) => { if (h.date >= start && h.date <= end) mark(h.date, t.area, 'ring done'); });
    });
    const fit = S.fitnessArea();
    if (fit && inArea({ area: fit.id })) S.all('workouts').forEach((w) => { if (w.date >= start && w.date <= end) mark(w.date, fit.id, ''); });
    S.all('notes').forEach((n) => { if (n.date && n.date >= start && n.date <= end && inArea(n)) mark(n.date, n.area, 'bar'); });

    let cells = '';
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const ms = marks[d] || [];
      const seen = new Set();
      const dots = ms.filter((m) => { const k = m.area + m.cls; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4)
        .map((m) => `<b class="${m.cls}" style="${cvar(S.area(m.area))}"></b>`).join('');
      const cls = [d.slice(0, 7) !== month ? 'out' : '', d === td ? 'today' : '', d === sel ? 'sel' : '', d < td ? 'before' : ''].join(' ');
      cells += `<button type="button" class="cal-day ${cls}" data-day="${d}" aria-label="${esc(fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' }))}${ms.length ? ', ' + plural(ms.length, 'item') : ''}"><span>${U.parse(d).getDate()}</span><i>${dots}</i></button>`;
    }
    const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<div class="cal-dow">${x}</div>`).join('');
    const list = dayList(sel, filter);
    const monthName = U.parse(first).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    return `<section class="panel cal" id="calendar">
      <div class="row between cal-head">
        <h2 class="cal-title">${esc(monthName)}</h2>
        <div class="row">
          ${month !== td.slice(0, 7) || sel !== td ? '<button type="button" class="btn tiny ghost" data-cal="today">Today</button>' : ''}
          <button type="button" class="icon-btn" data-cal="-1" aria-label="Previous month">${I('left')}</button>
          <button type="button" class="icon-btn" data-cal="1" aria-label="Next month">${I('right')}</button>
        </div>
      </div>
      <div class="chips" role="group" aria-label="Show areas">
        <button type="button" class="chip ${!filter ? 'on' : ''}" data-calfilter="">All</button>
        ${S.areas().map((a) => `<button type="button" class="chip ${filter === a.id ? 'on' : ''}" data-calfilter="${a.id}">${dot(a)}${esc(a.name)}</button>`).join('')}
      </div>
      <div class="cal-grid">${dows}${cells}</div>
      <div class="cal-agenda">
        <div class="row between"><h3>${dayHeading(sel)}</h3>
          <div class="row gap">
            <button type="button" class="btn tiny" data-add="task" data-date="${sel}" ${filter ? `data-area="${filter}"` : ''}>${I('plus')} To-do</button>
            <button type="button" class="btn tiny" data-add="event" data-date="${sel}" ${filter ? `data-area="${filter}"` : ''}>${I('plus')} Event</button>
            <button type="button" class="btn tiny" data-add="note" data-date="${sel}" ${filter ? `data-area="${filter}"` : ''}>${I('plus')} Note</button>
          </div>
        </div>
        ${list || '<p class="empty">Nothing on this day.</p>'}
      </div>
    </section>`;
  }

  function comingUp() {
    const td = today();
    const to = addDays(td, 7);
    const tasks = S.openTasks().filter((t) => t.date && t.date > td && t.date <= to);
    const events = S.eventsBetween(addDays(td, 1), to);
    const byDay = {};
    events.forEach((o) => { (byDay[o.date] = byDay[o.date] || []).push({ k: o.item.time || '', html: eventRow(o) }); });
    tasks.forEach((t) => { (byDay[t.date] = byDay[t.date] || []).push({ k: t.time || '~', html: taskRow(t, { hideDate: true, compact: true }) }); });
    const days = Object.keys(byDay).sort();
    let shown = 0;
    let html = '';
    for (const d of days) {
      if (shown >= 30) break;
      const rows = byDay[d].sort((a, b) => a.k.localeCompare(b.k));
      shown += rows.length;
      html += `<div class="day-label">${dayHeading(d)}</div>${rows.map((r) => r.html).join('')}`;
    }
    return `<section class="panel"><h3>${I('calendar')} Coming up <span class="small muted norm">next 7 days</span></h3>${html || '<p class="empty">Nothing in the next 7 days yet.</p>'}</section>`;
  }

  function areaCards() {
    const td = today();
    const occ = S.eventsBetween(td, addDays(td, 60));
    return `<section class="area-grid">${S.areas().map((a) => {
      const open = S.openTasks(a.id);
      const od = open.filter((t) => t.date && t.date < td).length;
      const next = occ.find((o) => o.item.area === a.id && (o.date > td || !o.item.time || o.item.time >= new Date().toTimeString().slice(0, 5)));
      let extra = '';
      if (a.fitness) {
        const st = S.weekStats(td);
        const g = S.db.settings.goal.perWeek;
        extra = `<div class="ac-line">${I('activity')} ${st.count}${g ? ` of ${g}` : ''} workouts this week</div>`;
      }
      return `<a class="area-card" href="#/area/${a.id}" style="${cvar(a)}">
        <div class="ac-head">${I(a.icon || 'star')}<strong>${esc(a.name)}</strong></div>
        <div class="ac-line">${open.length ? plural(open.length, 'to-do') : 'No to-dos'}${od ? ` · <span class="overdue">${od} overdue</span>` : ''}</div>
        ${extra}
        <div class="ac-line muted">${next ? `Next: ${esc(next.item.title)}, ${esc(relDate(next.date))}${next.item.time ? ' ' + esc(fmtTime(next.item.time)) : ''}` : 'Nothing scheduled'}</div>
      </a>`;
    }).join('')}</section>`;
  }

  // ---------------------------------------------------------------- area page
  function viewArea(id, tab) {
    const a = S.db.settings.areas.find((x) => x.id === id);
    if (!a) { location.hash = '#/home'; return; }
    const tabs = [['todo', 'To do'], ['schedule', 'Schedule'], ['notes', 'Notes']];
    if (a.fitness) tabs.unshift(['workouts', 'Workouts']);
    tab = tabs.some((t) => t[0] === tab) ? tab : tabs[0][0];
    const open = S.openTasks(a.id);
    const od = open.filter((t) => t.date && t.date < today()).length;
    const counts = { todo: open.length, notes: S.all('notes').filter((n) => n.area === a.id).length };

    let html = `<div class="area-head" style="${cvar(a)}"><div class="area-badge">${I(a.icon || 'star')}</div>
      <div><h1>${esc(a.name)}</h1><p class="muted">${open.length ? plural(open.length, 'to-do') : 'No open to-dos'}${od ? ` · <span class="overdue">${od} overdue</span>` : ''}</p></div></div>`;
    html += quickAdd({ area: a.id });
    html += `<nav class="tabs">${tabs.map(([k, l]) => `<a href="#/area/${a.id}/${k}" class="${k === tab ? 'on' : ''}">${l}${counts[k] ? ` <span class="count">${counts[k]}</span>` : ''}</a>`).join('')}</nav>`;
    if (tab === 'todo') html += areaTodo(a);
    else if (tab === 'schedule') html += areaSchedule(a);
    else if (tab === 'notes') html += areaNotes(a);
    else html += areaWorkouts(a);
    main.innerHTML = html;
  }

  function areaTodo(a) {
    const td = today();
    const wk = addDays(td, 7);
    const open = S.openTasks(a.id).sort((x, y) => (x.date || '9').localeCompare(y.date || '9') || (x.time || '~').localeCompare(y.time || '~'));
    const groups = [
      ['Overdue', open.filter((t) => t.date && t.date < td), { reschedule: true }],
      ['Today', open.filter((t) => t.date === td), {}],
      ['Next 7 days', open.filter((t) => t.date > td && t.date <= wk), {}],
      ['Later', open.filter((t) => t.date > wk), {}],
      ['No date', open.filter((t) => !t.date), {}],
    ];
    let html = '';
    for (const [label, list, o] of groups) {
      if (!list.length) continue;
      html += `<div class="day-label">${label} <span class="count ${label === 'Overdue' ? 'bad' : ''}">${list.length}</span></div>`;
      html += `<div class="panel tight">${list.map((t) => taskRow(t, { showArea: false, ...o })).join('')}</div>`;
    }
    if (!open.length) html += `<div class="panel"><p class="empty">All caught up in ${esc(a.name)}.</p></div>`;
    const done = S.all('items').filter((t) => t.kind === 'task' && t.area === a.id && t.done).sort((x, y) => (y.doneAt || '').localeCompare(x.doneAt || '')).slice(0, 25);
    if (done.length) html += `<details class="panel history"><summary>Done recently</summary>${done.map((t) => taskRow(t, { showArea: false, showDone: true, hideDate: true })).join('')}</details>`;
    return html;
  }

  function areaSchedule(a) {
    const td = today();
    const from = state.showPast ? addDays(td, -30) : td;
    const occ = S.eventsBetween(from, addDays(td, 60)).filter((o) => o.item.area === a.id);
    const byDay = {};
    occ.forEach((o) => { (byDay[o.date] = byDay[o.date] || []).push(o); });
    let html = `<div class="row between"><button type="button" class="btn tiny ghost" data-showpast>${state.showPast ? 'Hide past' : 'Show last 30 days'}</button>
      <button type="button" class="btn tiny" data-ics-area="${a.id}">${I('calendarPlus')} Add all to phone calendar</button></div>`;
    const days = Object.keys(byDay).sort();
    html += `<div class="panel">${days.map((d) => `<div class="day-label">${dayHeading(d)}</div>${byDay[d].map((o) => eventRow(o, { showArea: false, dimPast: true })).join('')}`).join('') || `<p class="empty">Nothing scheduled in the next 60 days.</p>`}</div>`;
    const regular = S.all('items').filter((e) => e.kind === 'event' && e.area === a.id && e.repeat && (!e.until || e.until >= td));
    if (regular.length) {
      html += `<section class="panel"><h3>${I('repeat')} Regular schedule</h3>${regular.map((e) => `<div class="item"><div class="grow">
        <a href="#" class="item-title" data-event="${e.id}" data-date="${S.occursOn(e, td) ? td : S.nextAfter(e, td) || e.date}">${esc(e.title)}</a>
        <div class="meta">${esc(repeatText(e))}${e.time ? `<span class="sep">·</span>${esc(timeRange(e))}` : ''}${e.location ? `<span class="sep">·</span>${esc(e.location)}` : ''}</div></div></div>`).join('')}</section>`;
    }
    return html;
  }

  function areaNotes(a) {
    const notes = S.all('notes').filter((n) => n.area === a.id).sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || (y.updatedAt || '').localeCompare(x.updatedAt || ''));
    return notes.length ? `<div class="note-grid">${notes.map((n) => noteCard(n, { showArea: false })).join('')}</div>`
      : `<div class="panel"><p class="empty">No notes yet. Use notes for meeting points, ideas, lists, anything to remember.</p></div>`;
  }

  function areaWorkouts(a) {
    const td = today();
    const g = S.db.settings.goal;
    const st = S.weekStats(td);
    const pct = (n, of) => Math.min(100, of ? Math.round((n / of) * 100) : 0);
    const streak = S.streak();
    // Last 8 weeks, oldest first.
    const weeks = [];
    for (let i = 7; i >= 0; i--) weeks.push(S.weekStats(addDays(U.weekStart(td), -7 * i)));
    const max = Math.max(g.perWeek || 1, ...weeks.map((w) => w.count));
    const bars = weeks.map((w) => `<div class="bar-col" title="${esc(fmtDate(w.from, { month: 'short', day: 'numeric' }))}: ${plural(w.count, 'workout')}, ${w.minutes} min">
      <div class="bar-track">${g.perWeek ? `<i class="goal-line" style="bottom:${(g.perWeek / max) * 100}%"></i>` : ''}<div class="bar ${g.perWeek && w.count >= g.perWeek ? 'met' : ''}" style="height:${(w.count / max) * 100}%"></div></div>
      <span class="bar-n">${w.count}</span><span class="bar-l">${esc(fmtDate(w.from, { month: 'numeric', day: 'numeric' }))}</span></div>`).join('');

    let html = `<section class="panel fit" style="${cvar(a)}">
      <div class="row between"><h3>This week</h3><a href="#/settings" class="small muted">Goal</a></div>
      <div class="goal-row"><div class="goal-num"><b>${st.count}</b>${g.perWeek ? ` / ${g.perWeek}` : ''}<span>workouts</span></div>
        ${g.perWeek ? `<div class="meter"><span style="width:${pct(st.count, g.perWeek)}%"></span></div>` : ''}</div>
      <div class="goal-row"><div class="goal-num"><b>${st.minutes}</b>${g.minutes ? ` / ${g.minutes}` : ''}<span>minutes</span></div>
        ${g.minutes ? `<div class="meter"><span style="width:${pct(st.minutes, g.minutes)}%"></span></div>` : ''}</div>
      ${streak > 1 ? `<p class="small streak">${I('star')} ${streak} weeks in a row on goal</p>` : ''}
      <div class="bars" aria-label="Workouts per week, last 8 weeks">${bars}</div>
    </section>`;

    const list = S.all('workouts').slice().sort((x, y) => y.date.localeCompare(x.date) || (y.createdAt || '').localeCompare(x.createdAt || ''));
    if (!list.length) return html + '<div class="panel"><p class="empty">No workouts logged yet. Tap Workout above after each one.</p></div>';
    const shown = list.slice(0, state.workoutsShown);
    let wk = '';
    let rows = '';
    for (const w of shown) {
      const ws = U.weekStart(w.date);
      if (ws !== wk) { wk = ws; const s = S.weekStats(ws); rows += `<div class="day-label">Week of ${esc(fmtDate(ws, { month: 'short', day: 'numeric' }))} <span class="count">${s.count} · ${s.minutes} min</span></div>`; }
      rows += workoutRow(w);
    }
    html += `<div class="panel">${rows}${list.length > shown.length ? '<button type="button" class="btn ghost" data-moreworkouts>Show more</button>' : ''}</div>`;
    return html;
  }

  // ---------------------------------------------------------------- search
  function viewSearch() {
    main.innerHTML = `<h1>Search</h1>
      <input type="search" class="search" id="q" placeholder="Search to-dos, events, notes, workouts" value="${esc(state.query)}" autocomplete="off">
      <div id="results"></div>`;
    const q = document.getElementById('q');
    q.addEventListener('input', () => { state.query = q.value; renderResults(); });
    renderResults();
    if (!matchMedia('(pointer: coarse)').matches) q.focus();
  }

  function renderResults() {
    const box = document.getElementById('results');
    const q = state.query.trim().toLowerCase();
    if (!q) { box.innerHTML = '<p class="empty">Type a word to find anything you’ve saved.</p>'; return; }
    const has = (...xs) => xs.some((x) => String(x || '').toLowerCase().includes(q));
    const td = today();
    const tasks = S.all('items').filter((t) => t.kind === 'task' && has(t.title, t.notes)).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
    const events = S.all('items').filter((e) => e.kind === 'event' && has(e.title, e.notes, e.location))
      .map((e) => ({ item: e, date: S.occursOn(e, td) ? td : (e.repeat && S.nextAfter(e, td)) || e.date }));
    const notes = S.all('notes').filter((n) => has(n.title, n.body));
    const workouts = S.all('workouts').filter((w) => has(w.type, w.notes)).sort((a, b) => b.date.localeCompare(a.date));
    const sec = (label, list, fn) => list.length ? `<div class="day-label">${label} <span class="count">${list.length}</span></div><div class="panel tight">${list.slice(0, 30).map(fn).join('')}</div>` : '';
    box.innerHTML = sec('To-dos', tasks, (t) => taskRow(t, { showDone: true }))
      + sec('Events', events, (o) => eventRow(o, { showDate: true }))
      + (notes.length ? `<div class="day-label">Notes <span class="count">${notes.length}</span></div><div class="note-grid">${notes.map((n) => noteCard(n)).join('')}</div>` : '')
      + sec('Workouts', workouts, (w) => workoutRow(w))
      || '<p class="empty">Nothing found.</p>';
  }

  // ---------------------------------------------------------------- settings
  function viewSettings() {
    const st = S.db.settings;
    const last = st.lastBackup;
    main.innerHTML = `<h1>Settings</h1>
      <section class="panel"><h3>Areas</h3>
        <p class="small muted hint">Rename, recolor or reorder them. Each one gets its own tab.</p>
        ${S.areas().map((a, i, arr) => `<div class="item area-row" style="${cvar(a)}"><div class="area-badge sm">${I(a.icon || 'star')}</div>
          <div class="grow"><strong>${esc(a.name)}</strong>${a.fitness ? '<div class="meta">Tracks workouts</div>' : ''}</div>
          <button type="button" class="icon-btn" data-move="${i}:-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${I('up')}</button>
          <button type="button" class="icon-btn" data-move="${i}:1" aria-label="Move down" ${i === arr.length - 1 ? 'disabled' : ''}>${I('down')}</button>
          <button type="button" class="btn tiny" data-editarea="${a.id}">Edit</button></div>`).join('')}
        <button type="button" class="btn" data-editarea="">${I('plus')} Add an area</button>
      </section>

      <section class="panel"><h3>Fitness goal</h3>
        <form id="goalForm" class="form-grid">
          <label class="field half"><span>Workouts per week</span><input name="perWeek" type="number" min="0" step="1" inputmode="numeric" value="${esc(st.goal.perWeek)}"></label>
          <label class="field half"><span>Minutes per week</span><input name="minutes" type="number" min="0" step="5" inputmode="numeric" value="${esc(st.goal.minutes)}"></label>
        </form>
      </section>

      <section class="panel"><h3>Appearance</h3>
        <div class="chips">${[['', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button type="button" class="chip ${st.theme === v ? 'on' : ''}" data-theme-set="${v}">${l}</button>`).join('')}</div>
      </section>

      <section class="panel"><h3>Phone calendar</h3>
        <p class="small muted hint">Copy your events into your phone’s calendar app so you get its alerts. Events with a time get a reminder 30 minutes before. If you change an event here later, add it again.</p>
        <button type="button" class="btn" data-ics-area="">${I('calendarPlus')} Add all events to phone calendar</button>
      </section>

      <section class="panel"><h3>Backup</h3>
        <p class="small muted hint">Everything is saved on this device only. Export a backup now and then and keep the file somewhere safe (iCloud Drive, Google Drive, email). ${last ? `Last backup: ${esc(fmtDate(last.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' }))}.` : 'No backup yet.'}</p>
        <div class="row gap wrap">
          <button type="button" class="btn primary" data-export>${I('download')} Export backup</button>
          <label class="btn">${I('upload')} Import backup<input type="file" accept=".json,application/json" data-import hidden></label>
        </div>
      </section>

      <section class="panel"><h3>Start over</h3>
        <div class="row gap wrap">
          <button type="button" class="btn" data-sample>Load sample data</button>
          <button type="button" class="btn danger" data-erase>Erase everything</button>
        </div>
      </section>`;

    document.getElementById('goalForm').addEventListener('change', (e) => {
      const f = e.currentTarget;
      st.goal = { perWeek: Math.max(0, Number(f.perWeek.value) || 0), minutes: Math.max(0, Number(f.minutes.value) || 0) };
      S.save();
      U.toast('Goal saved');
    });
    const imp = main.querySelector('[data-import]');
    imp.addEventListener('change', () => {
      const file = imp.files[0];
      if (!file) return;
      U.ask('Replace everything on this device with this backup?', async () => {
        try { S.importJSON(await file.text()); applyTheme(); U.toast('Backup restored'); render(); } catch (err) { U.toast(err.message || 'Could not read that file'); }
      }, 'Replace');
      imp.value = '';
    });
  }

  function areaForm(a) {
    const isNew = !a;
    a = a || { id: '', name: '', color: C.COLORS.map((c) => c[0]).find((c) => !S.areas().some((x) => x.color === c)) || 'slate', icon: 'star' };
    const otherFit = S.areas().find((x) => x.fitness && x.id !== a.id);
    U.openForm({
      title: isNew ? 'New area' : 'Edit area',
      values: a,
      fields: [
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Family' },
        { name: 'color', label: 'Color', type: 'chips', options: C.COLORS.map(([v, l]) => ({ value: v, label: l, color: v })) },
        { name: 'icon', label: 'Icon', type: 'chips', options: C.AREA_ICONS.map((v) => ({ value: v, label: v })), cls: 'icon-chips' },
        ...(otherFit ? [] : [{ name: 'fitness', label: 'Track workouts in this area', type: 'checkbox' }]),
      ],
      after(form) { form.querySelectorAll('.icon-chips .choice span').forEach((s) => { s.innerHTML = I(s.textContent); s.setAttribute('aria-label', s.textContent); }); },
      onDelete: isNew || S.areas().length < 2 ? null : () => {
        const to = S.areas().find((x) => x.id !== a.id);
        [...S.all('items'), ...S.all('notes')].forEach((x) => { if (x.area === a.id) x.area = to.id; });
        S.saveAreas(S.areas().filter((x) => x.id !== a.id));
        U.toast(`Deleted. Its items moved to ${to.name}`);
        render();
      },
      intro: !isNew && S.areas().length > 1 ? '<p class="form-context">Deleting an area moves its to-dos, events and notes to the first other area.</p>' : '',
      onSubmit(d) {
        const list = S.areas().slice();
        const obj = { ...a, ...d, fitness: otherFit ? false : !!d.fitness };
        if (isNew) {
          obj.id = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || S.uid();
          if (list.some((x) => x.id === obj.id)) obj.id += '-' + S.uid().slice(-4);
          list.push(obj);
        } else list[list.findIndex((x) => x.id === a.id)] = obj;
        S.saveAreas(list);
        U.toast('Saved');
        render();
      },
    });
  }

  function applyTheme() {
    const t = S.db.settings.theme;
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }

  // ---------------------------------------------------------------- shell & routing
  function renderTabs(route, areaId) {
    const areas = S.areas();
    const tabs = [`<a href="#/home" class="${route === 'home' ? 'on' : ''}">${I('home')}<span>Dashboard</span></a>`]
      .concat(areas.map((a) => `<a href="#/area/${a.id}" class="${areaId === a.id ? 'on' : ''}" style="${cvar(a)}">${I(a.icon || 'star')}<span>${esc(a.name)}</span></a>`));
    const bar = document.getElementById('tabbar');
    bar.style.setProperty('--n', tabs.length);
    bar.innerHTML = tabs.join('');
  }

  function render() {
    const [route, id, tab] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const y = window.scrollY;
    const same = render.last === location.hash;
    if (route === 'area') viewArea(id, tab);
    else if (route === 'search') viewSearch();
    else if (route === 'settings') viewSettings();
    else viewHome();
    renderTabs(route === 'area' ? 'area' : route, route === 'area' ? id : '');
    // Stay put when refreshing the same screen; start at the top on a new one.
    window.scrollTo(0, same ? y : 0);
    render.last = location.hash;
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-task],[data-event],[data-note],[data-workout],[data-add],[data-day],[data-cal],[data-calfilter],[data-resched],[data-snooze],[data-showpast],[data-moreworkouts],[data-ics-area],[data-editarea],[data-move],[data-theme-set],[data-export],[data-sample],[data-erase]');
    if (!el) return;
    const ds = el.dataset;
    if ('task' in ds) { e.preventDefault(); const t = S.get('items', ds.task); if (t) taskForm(t); }
    else if ('event' in ds) { e.preventDefault(); showEvent(ds.event, ds.date); }
    else if ('note' in ds) { e.preventDefault(); const n = S.get('notes', ds.note); if (n) noteForm(n); }
    else if ('workout' in ds) { e.preventDefault(); const w = S.get('workouts', ds.workout); if (w) workoutForm(w); }
    else if ('add' in ds) {
      const defaults = {};
      if (ds.area) defaults.area = ds.area;
      if (ds.date) defaults.date = ds.date;
      addThing(ds.add, defaults);
    } else if ('day' in ds) {
      state.calSel = ds.day;
      if (ds.day.slice(0, 7) !== (state.calMonth || today().slice(0, 7))) state.calMonth = ds.day.slice(0, 7);
      render();
    } else if ('cal' in ds) {
      if (ds.cal === 'today') { state.calMonth = ''; state.calSel = ''; } else {
        const d = U.parse((state.calMonth || today().slice(0, 7)) + '-01');
        d.setMonth(d.getMonth() + Number(ds.cal));
        state.calMonth = U.ymd(d).slice(0, 7);
        state.calSel = state.calMonth === today().slice(0, 7) ? today() : state.calMonth + '-01';
      }
      render();
    } else if ('calfilter' in ds) { state.calFilter = ds.calfilter; render(); }
    else if ('resched' in ds) { const t = S.get('items', ds.resched); if (t) reschedule(t); }
    else if ('snooze' in ds) {
      const st = S.db.settings;
      st.snooze = { ...(st.snooze || {}), [ds.snooze]: addDays(today(), 7) };
      S.save();
      U.toast('Hidden for a week');
      render();
    } else if ('showpast' in ds) { state.showPast = !state.showPast; render(); }
    else if ('moreworkouts' in ds) { state.workoutsShown += 30; render(); }
    else if ('icsArea' in ds) {
      const evs = S.all('items').filter((x) => x.kind === 'event' && (!ds.icsArea || x.area === ds.icsArea));
      if (!evs.length) { U.toast('No events to add yet'); return; }
      shareICS(evs, ds.icsArea ? S.area(ds.icsArea).name + ' events' : 'all events');
    } else if ('editarea' in ds) { areaForm(ds.editarea ? S.areas().find((a) => a.id === ds.editarea) : null); }
    else if ('move' in ds) {
      const [i, dir] = ds.move.split(':').map(Number);
      const list = S.areas().slice();
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      S.saveAreas(list);
      render();
    } else if ('themeSet' in ds) { S.db.settings.theme = ds.themeSet; S.save(); applyTheme(); render(); }
    else if ('export' in ds) {
      U.download(`life-tracker-backup-${today()}.json`, S.exportJSON(), 'application/json');
      U.toast('Backup exported');
      render();
    } else if ('sample' in ds) {
      const go = () => { S.loadSample(); U.toast('Sample data loaded'); location.hash = '#/home'; render(); };
      if (S.db.items.length || S.db.notes.length || S.db.workouts.length) U.ask('Replace everything with sample data?', go, 'Replace'); else go();
    } else if ('erase' in ds) {
      U.ask('Erase all to-dos, events, notes and workouts on this device?', () => { S.reset(); applyTheme(); U.toast('Everything erased'); location.hash = '#/home'; render(); }, 'Erase');
    }
  });

  // Ticking a to-do.
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-done]');
    if (!el) return;
    const t = S.get('items', el.dataset.done);
    if (!t) return;
    if (t.done) { S.reopen(t); U.toast('Marked not done'); render(); return; }
    const undo = S.complete(t);
    const msg = t.done ? 'Done' : `Done. Next: ${relDate(t.date)}`;
    // Let the tick show for a moment before the list re-sorts.
    setTimeout(render, 250);
    U.toast(msg, 'Undo', () => { undo(); render(); });
  });

  window.addEventListener('hashchange', render);

  applyTheme();
  if (LT.DEMO) S.loadSample();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !LT.DEMO) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
