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
    goals: [],    // { id, title, why, kind: 'count'|'steps', target, unit, log: [{ id, date, amount }], steps: [{ id, title, done }], due, created, done, doneOn }
    journal: {},  // 'YYYY-MM-DD' -> { mood 1-5, energy 1-5 }: the day's check-in
    entries: [],  // { id, kind: 'journal'|'dream', lucid, date, time: 'HH:MM', text, created }
    settings: { theme: '', lastBackup: null, oldImport: '' },
  });

  function normalize(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.settings = Object.assign(base.settings, d.settings);
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
  const isChecked = (h, day) => !!(db.checks[h.id] && db.checks[h.id][day]);
  const isDue = (h, day) => day >= h.created && (h.schedule !== 'days' || h.days.includes(u.dow(day)));

  function toggleCheck(h, day) {
    const c = (db.checks[h.id] = db.checks[h.id] || {});
    if (c[day]) delete c[day]; else c[day] = 1;
    save();
    return !!c[day];
  }

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

  // ---------- Goals ----------
  function progress(g) {
    if (g.kind === 'steps') { const n = g.steps.length; const d = g.steps.filter((s) => s.done).length; return { have: d, want: n, pct: n ? d / n : 0 }; }
    const have = g.log.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    return { have, want: g.target, pct: g.target ? Math.min(1, have / g.target) : 0 };
  }

  // 'ahead' | 'on' | 'behind' | null, by comparing progress with time used up to the due date.
  function pace(g) {
    if (!g.due || g.done) return null;
    const total = u.daysBetween(g.created, g.due);
    if (total <= 0) return null;
    const used = Math.min(1, Math.max(0, u.daysBetween(g.created, u.today()) / total));
    const p = progress(g).pct;
    if (p >= used + 0.1) return 'ahead';
    if (p >= used - 0.05) return 'on';
    return 'behind';
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
    return { tasks: tasks.length, workouts: (d.workouts || []).length };
  }

  // Open to-dos become plan items; logged workouts become check-ins on an "Exercise" habit.
  function importOld() {
    const d = oldData();
    if (!d) return 0;
    let n = 0;
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
    uid, save, isChecked, isDue, toggleCheck, weekCount, streak, best, rate, scheduleText, progress, pace,
    oldSummary, importOld,
    get db() { return db; },
    habits: () => db.habits.filter((h) => !h.archived),
    habit: (id) => db.habits.find((h) => h.id === id),
    goal: (id) => db.goals.find((g) => g.id === id),
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
    reset() { db = empty(); db.settings.oldImport = 'skipped'; save(); },
    loadSample() { db = normalize(L.sample()); save(); },
  };

  L.store = S;
})();
