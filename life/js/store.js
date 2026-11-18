// Data layer: one JSON blob in localStorage, on this device only.
(function () {
  const KEY = 'life-v2';
  const OLD_KEY = 'life-tracker-v1';
  const u = L.u;

  const empty = () => ({
    version: 2,
    habits: [],   // { id, name, schedule: 'daily'|'days'|'weekly', days: [0-6], perWeek, created, archived }
    checks: {},   // habitId -> { 'YYYY-MM-DD': 1 }
    tasks: [],    // { id, title, date|null, done, doneOn }
    goals: [],    // kept from earlier versions; no longer shown
    journal: {},  // 'YYYY-MM-DD' -> { mood 1-5, energy 1-5 }: the day's check-in
    entries: [],  // { id, kind: 'journal'|'dream', lucid, date, time: 'HH:MM', text, created }
    events: [],   // { id, title, date, time, end, place, notes, cat: 'social'|'spiritual'|'work'|'personal', repeat, until, skips: [] }
    spiritual: spiritualDefaults(),
    settings: { theme: '', lastBackup: null, oldImport: '', oldEvents: '' },
  });

  function spiritualDefaults() {
    return {
      meetings: { midweek: { day: 4, time: '19:00' }, weekend: { day: 0, time: '10:00' }, place: 'Kingdom Hall' },
      attended: {},   // 'YYYY-MM-DD:midweek' -> 1
      parts: [],      // { id, date, title, assistant, notes, prepared }
      service: [],    // { id, date, minutes, notes }
      studies: {},    // 'YYYY-MM' -> Bible studies conducted that month
      serviceGoal: 0, // hours a month (0 = no goal)
      rvs: [],        // return visits { id, name, where, phone, notes, last, next }
      group: { name: '', overseer: '', overseerPhone: '', assistant: '', assistantPhone: '' },
      fsm: [],        // meetings for field service { id, day, time, place, conductor }
      members: [],    // { id, name, phone }
      otherGroups: [], // other field service groups { id, name, overseer, overseerPhone, assistant, assistantPhone, meets, members, notes }
      reading: {},    // daily Bible reading 'YYYY-MM-DD' -> 1
      readingAt: '',  // where I'm reading now
      study: [],      // personal study sessions { id, date, topic, minutes, notes }
    };
  }

  function normalize(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.settings = Object.assign(base.settings, d.settings);
    d.spiritual = Object.assign(base.spiritual, d.spiritual);
    d.spiritual.meetings = Object.assign(spiritualDefaults().meetings, d.spiritual.meetings);
    d.spiritual.group = Object.assign(spiritualDefaults().group, d.spiritual.group);
    d.events.forEach((e) => { e.skips = e.skips || []; });
    // Earlier versions kept one note per day on the check-in; move those into journal entries.
    for (const [day, j] of Object.entries(d.journal)) {
      if (j.note && j.note.trim()) d.entries.push({ id: uid(), kind: 'journal', lucid: false, date: day, time: '', text: j.note.trim(), created: new Date().toISOString() });
      delete j.note;
      if (!j.mood && !j.energy) delete d.journal[day];
    }
    return d;
  }

  function load() {
    if (L.DEMO) return null;
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { console.error(e); }
    return null;
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let db = load() || empty();

  function save() {
    if (L.DEMO) return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { u.toast('Could not save. Export a backup now.'); }
  }

  // ---------- Habits ----------
  // Times a day: a habit can need several check-ins a day (perDay); checks hold the count.
  const target = (h) => (h.schedule === 'weekly' ? 1 : Math.max(1, Number(h.perDay) || 1));
  const count = (h, day) => Number(db.checks[h.id] && db.checks[h.id][day]) || 0;
  const isChecked = (h, day) => count(h, day) >= target(h);
  function setCount(h, day, n) {
    const c = (db.checks[h.id] = db.checks[h.id] || {});
    n = Math.max(0, Math.min(target(h), n));
    if (n) c[day] = n; else delete c[day];
    save();
    return n;
  }
  const isDue = (h, day) => day >= h.created && (h.schedule !== 'days' || h.days.includes(u.dow(day)));

  // Whole day on/off: done (all times) or nothing.
  function toggleCheck(h, day) { return setCount(h, day, isChecked(h, day) ? 0 : target(h)) > 0; }

  const weekCount = (h, wk) => { let n = 0; for (let i = 0; i < 7; i++) if (isChecked(h, u.addDays(wk, i))) n++; return n; };

  // Current streak: days (or weeks, for "times a week") in a row. Today/this week only counts once done,
  // so an unfinished today never breaks the streak.
  function streak(h) {
    const t = u.today();
    let n = 0;
    if (h.schedule === 'weekly') {
      let wk = u.weekStart(t);
      if (weekCount(h, wk) >= h.perWeek) n++;
      for (wk = u.addDays(wk, -7); wk >= u.weekStart(h.created) && weekCount(h, wk) >= h.perWeek; wk = u.addDays(wk, -7)) n++;
      return n;
    }
    let d = t;
    if (!(isDue(h, d) && isChecked(h, d))) d = u.addDays(d, -1);
    for (let i = 0; i < 3660 && d >= h.created; i++, d = u.addDays(d, -1)) {
      if (!isDue(h, d)) continue;
      if (isChecked(h, d)) n++; else break;
    }
    return n;
  }

  function best(h) {
    const t = u.today();
    let run = 0, top = 0;
    if (h.schedule === 'weekly') {
      for (let wk = u.weekStart(h.created); wk <= t; wk = u.addDays(wk, 7)) {
        if (weekCount(h, wk) >= h.perWeek) top = Math.max(top, ++run); else if (wk !== u.weekStart(t)) run = 0;
      }
      return top;
    }
    for (let d = h.created; d <= t; d = u.addDays(d, 1)) {
      if (!isDue(h, d)) continue;
      if (isChecked(h, d)) top = Math.max(top, ++run); else if (d !== t) run = 0;
    }
    return top;
  }

  // Share of the last 30 days' due days that were done (for "times a week": share of the target met).
  function rate(h) {
    const t = u.today();
    if (h.schedule === 'weekly') {
      let got = 0, want = 0;
      for (let i = 1; i <= 4; i++) { const wk = u.addDays(u.weekStart(t), -7 * i); if (wk < u.weekStart(h.created)) break; got += Math.min(weekCount(h, wk), h.perWeek); want += h.perWeek; }
      return want ? got / want : null;
    }
    let got = 0, want = 0;
    for (let i = 0; i < 30; i++) {
      const d = u.addDays(t, -i);
      if (d < h.created) break;
      if (!isDue(h, d)) continue;
      if (i === 0 && !isChecked(h, d)) continue; // today isn't over yet
      want++; if (isChecked(h, d)) got++;
    }
    return want ? got / want : null;
  }

  function scheduleText(h) {
    if (h.schedule === 'weekly') return `${h.perWeek}× a week`;
    if (h.schedule === 'days') {
      const names = [1, 2, 3, 4, 5, 6, 0].filter((d) => h.days.includes(d)).map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
      if (names.length === 5 && !h.days.includes(0) && !h.days.includes(6)) return 'Weekdays';
      return names.join(', ');
    }
    return 'Every day';
  }
  const scheduleFull = (h) => scheduleText(h) + (target(h) > 1 ? ` · ${target(h)}× a day` : '');

  // ---------- Schedule ----------
  // Does a (possibly repeating) event happen on `day`?
  function occursOn(e, day) {
    if (!e.date || day < e.date || (e.until && day > e.until) || e.skips.includes(day)) return false;
    if (day === e.date) return true;
    const diff = u.daysBetween(e.date, day);
    const a = u.parse(e.date), b = u.parse(day);
    switch (e.repeat) {
      case 'daily': return true;
      case 'weekdays': return b.getDay() % 6 !== 0;
      case 'weekly': return diff % 7 === 0;
      case 'biweekly': return diff % 14 === 0;
      case 'monthly': return a.getDate() === b.getDate();
      case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
      default: return false;
    }
  }

  const MEETING_NAMES = { midweek: 'Midweek meeting', weekend: 'Weekend meeting' };

  // Everything on the calendar for one day, sorted by time: your events, congregation meetings,
  // meetings for field service, your meeting parts and planned return visits.
  function agenda(day) {
    const out = [];
    const sp = db.spiritual;
    const dw = u.dow(day);
    for (const e of db.events) if (occursOn(e, day)) out.push({ type: 'event', id: e.id, title: e.title, time: e.time, end: e.end, place: e.place, cat: e.cat || 'personal', repeat: !!e.repeat, reminder: !!e.reminder, done: !!e.done });
    for (const key of ['midweek', 'weekend']) {
      const m = sp.meetings[key];
      if (m.day === dw) out.push({ type: 'meeting', key, title: MEETING_NAMES[key], time: m.time, place: sp.meetings.place, cat: 'spiritual', attended: !!sp.attended[day + ':' + key] });
    }
    for (const f of sp.fsm) if (Number(f.day) === dw) out.push({ type: 'fsm', id: f.id, title: 'Meeting for field service', time: f.time, place: f.place, who: f.conductor, cat: 'spiritual' });
    for (const p of sp.parts) if (p.date === day) {
      const m = ['midweek', 'weekend'].map((k) => sp.meetings[k]).find((x) => x.day === dw);
      out.push({ type: 'part', id: p.id, title: 'My part: ' + p.title, time: m ? m.time : '', cat: 'spiritual', prepared: p.prepared });
    }
    for (const r of sp.rvs) if (r.next === day) out.push({ type: 'rv', id: r.id, title: 'Return visit: ' + r.name, time: '', place: r.where, cat: 'spiritual' });
    return out.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00') || (a.type === 'part') - (b.type === 'part'));
  }

  // Meetings on or before today in the month, and how many were marked attended.
  function attendance(month) {
    const sp = db.spiritual;
    const t = u.today();
    let held = 0, went = 0;
    for (let d = month + '-01'; d.startsWith(month) && d <= t; d = u.addDays(d, 1)) {
      for (const key of ['midweek', 'weekend']) if (sp.meetings[key].day === u.dow(d)) { held++; if (sp.attended[d + ':' + key]) went++; }
    }
    return { held, went };
  }

  const serviceMinutes = (month) => db.spiritual.service.filter((s) => s.date.startsWith(month)).reduce((n, s) => n + (Number(s.minutes) || 0), 0);

  function readingStreak() {
    const r = db.spiritual.reading;
    let d = u.today(), n = 0;
    if (!r[d]) d = u.addDays(d, -1);
    while (r[d]) { n++; d = u.addDays(d, -1); }
    return n;
  }

  // ---------- Old Life Tracker ----------
  function oldData() {
    if (L.DEMO) return null;
    try { const d = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); return d && Array.isArray(d.items) ? d : null; } catch (e) { return null; }
  }

  function oldSummary() {
    const d = oldData();
    if (!d) return null;
    const tasks = d.items.filter((i) => i.kind === 'task' && !i.done);
    return { tasks: tasks.length, workouts: (d.workouts || []).length, events: d.items.filter((i) => i.kind === 'event').length };
  }

  // Open to-dos become plan items, workouts become check-ins on an "Exercise" habit, and
  // calendar events come over to the Schedule (each part only once).
  function importOld() {
    const d = oldData();
    if (!d) return 0;
    let n = 0;
    if (db.settings.oldEvents !== 'done') {
      const cat = { work: 'work', congregation: 'spiritual', recreation: 'social', fitness: 'personal' };
      for (const i of d.items) {
        if (i.kind !== 'event' || !i.date) continue;
        db.events.push({ id: uid(), title: i.title, date: i.date, time: i.time || '', end: i.endTime || '', place: i.location || '', notes: i.notes || '', cat: cat[i.area] || 'personal', repeat: i.repeat || '', until: i.until || '', skips: i.skips || [] });
        n++;
      }
      db.settings.oldEvents = 'done';
    }
    if (db.settings.oldImport === 'done') { save(); return n; }
    for (const i of d.items) {
      if (i.kind !== 'task' || i.done) continue;
      db.tasks.push({ id: uid(), title: i.title, date: i.date || null, done: false, doneOn: null });
      n++;
    }
    const w = d.workouts || [];
    if (w.length) {
      const first = w.map((x) => x.date).sort()[0];
      const h = { id: uid(), name: 'Exercise', schedule: 'weekly', days: [], perWeek: (d.settings && d.settings.goal && d.settings.goal.perWeek) || 3, created: first, archived: false };
      db.habits.push(h);
      db.checks[h.id] = {};
      w.forEach((x) => (db.checks[h.id][x.date] = 1));
      n += w.length;
    }
    db.settings.oldImport = 'done';
    save();
    return n;
  }

  const S = {
    uid, save, isChecked, isDue, toggleCheck, target, count, setCount, scheduleFull, weekCount, streak, best, rate, scheduleText,
    occursOn, agenda, attendance, serviceMinutes, readingStreak, MEETING_NAMES,
    oldSummary, importOld,
    get db() { return db; },
    habits: () => db.habits.filter((h) => !h.archived),
    habit: (id) => db.habits.find((h) => h.id === id),
    event: (id) => db.events.find((e) => e.id === id),
    sp: (coll, id) => db.spiritual[coll].find((x) => x.id === id),
    spAdd(coll, obj) { obj.id = uid(); db.spiritual[coll].push(obj); save(); return obj; },
    spRemove(coll, id) { db.spiritual[coll] = db.spiritual[coll].filter((x) => x.id !== id); save(); },
    task: (id) => db.tasks.find((t) => t.id === id),

    add(coll, obj) { obj.id = uid(); db[coll].push(obj); save(); return obj; },
    remove(coll, id) { db[coll] = db[coll].filter((x) => x.id !== id); if (coll === 'habits') delete db.checks[id]; save(); },

    entry: (day) => db.journal[day] || null,
    // Written entries for a day, earliest first. `kind` 'dream' includes lucid dreams.
    entriesOn: (day, kind) => db.entries.filter((e) => e.date === day && (!kind || e.kind === kind)).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    entryById: (id) => db.entries.find((e) => e.id === id),
    setEntry(day, e) {
      if (!e.mood && !e.energy) delete db.journal[day];
      else db.journal[day] = e;
      save();
    },

    exportJSON() { db.settings.lastBackup = new Date().toISOString(); save(); return JSON.stringify(db, null, 1); },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || d.version !== 2 || !Array.isArray(d.habits)) throw new Error('This is not a backup from this app.');
      db = normalize(d); save();
    },
    reset() { db = empty(); db.settings.oldImport = 'skipped'; db.settings.oldEvents = 'skipped'; save(); },
    loadSample() { db = normalize(L.sample()); save(); },
  };

  L.store = S;
})();
