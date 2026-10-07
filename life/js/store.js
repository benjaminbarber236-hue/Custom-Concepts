// Data layer. Everything lives in one JSON blob in localStorage on this device.
// Use Settings → Export backup regularly; Import restores it (or moves it to another device).
(function () {
  const KEY = 'life-tracker-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const U = () => LT.ui;

  // items: to-dos (kind 'task') and calendar events (kind 'event'), both optionally repeating.
  const empty = () => ({
    version: 1,
    items: [],
    notes: [],
    workouts: [],
    settings: { areas: clone(LT.C.DEFAULT_AREAS), goal: clone(LT.C.DEFAULT_GOAL), lastBackup: null, theme: '' },
  });

  function normalize(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.settings = Object.assign(base.settings, d.settings);
    if (!d.settings.areas.length) d.settings.areas = base.settings.areas;
    d.items.forEach((i) => { i.skips = i.skips || []; i.history = i.history || []; });
    return d;
  }

  function load() {
    if (LT.DEMO) return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load data', e);
    }
    return null;
  }

  let db = load() || empty();

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();

  function save() {
    if (LT.DEMO) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      U().toast('Could not save. Storage may be full. Export a backup now.');
    }
  }

  // ---- Repeats ----
  // Does a repeating item fall on `day`? (Ignores skips; see occursOn.)
  function matches(item, day) {
    const start = item.date;
    if (!start || day < start) return false;
    if (item.until && day > item.until) return false;
    if (day === start) return true;
    const P = U().parse;
    const a = P(start), b = P(day);
    const diff = U().daysBetween(start, day);
    switch (item.repeat) {
      case 'daily': return true;
      case 'weekdays': return b.getDay() % 6 !== 0;
      case 'weekly': return diff % 7 === 0;
      case 'biweekly': return diff % 14 === 0;
      case 'monthly': return a.getDate() === b.getDate();
      case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
      default: return false;
    }
  }
  const occursOn = (item, day) => matches(item, day) && !item.skips.includes(day);

  // First date strictly after `day` that the item repeats on (null if it has ended or doesn't repeat).
  function nextAfter(item, day) {
    if (!item.repeat) return null;
    let d = day < item.date ? U().addDays(item.date, -1) : day;
    for (let n = 0; n < 800; n++) {
      d = U().addDays(d, 1);
      if (item.until && d > item.until) return null;
      if (occursOn(item, d)) return d;
    }
    return null;
  }

  // Every event occurrence in [from, to] as { item, date }.
  function eventsBetween(from, to) {
    const out = [];
    for (const it of db.items) {
      if (it.kind !== 'event' || !it.date || it.date > to) continue;
      if (!it.repeat) { if (it.date >= from) out.push({ item: it, date: it.date }); continue; }
      let d = it.date >= from ? it.date : U().addDays(from, -1);
      if (d === it.date && occursOn(it, d)) out.push({ item: it, date: d });
      for (;;) {
        d = nextAfter(it, d);
        if (!d || d > to) break;
        out.push({ item: it, date: d });
      }
    }
    return out.sort((x, y) => (x.date + (x.item.time || '')).localeCompare(y.date + (y.item.time || '')));
  }

  const S = {
    uid,
    get db() { return db; },
    save,
    occursOn,
    nextAfter,
    eventsBetween,

    all: (coll) => db[coll],
    get: (coll, id) => db[coll].find((x) => x.id === id),

    upsert(coll, obj) {
      if (!obj.id) {
        obj.id = uid();
        obj.createdAt = now();
        if (coll === 'items') { obj.skips = obj.skips || []; obj.history = obj.history || []; }
        db[coll].push(obj);
      } else {
        const i = db[coll].findIndex((x) => x.id === obj.id);
        if (i >= 0) db[coll][i] = Object.assign(db[coll][i], obj);
        else db[coll].push(obj);
      }
      const saved = S.get(coll, obj.id);
      saved.updatedAt = now();
      save();
      return saved;
    },

    remove(coll, id) {
      db[coll] = db[coll].filter((x) => x.id !== id);
      save();
    },

    // ---- Areas ----
    areas: () => db.settings.areas,
    area: (id) => db.settings.areas.find((a) => a.id === id) || db.settings.areas[0],
    fitnessArea: () => db.settings.areas.find((a) => a.fitness),
    saveAreas(list) { db.settings.areas = list; save(); },

    // ---- To-dos ----
    openTasks: (areaId) => db.items.filter((i) => i.kind === 'task' && !i.done && (!areaId || i.area === areaId)),

    // Tick off a to-do. A repeating one records the finish and moves to its next date instead.
    // Returns an undo function.
    complete(task) {
      const before = { date: task.date, done: task.done, doneAt: task.doneAt, history: task.history.slice() };
      const t = U().today();
      const next = task.repeat && task.date ? nextAfter(task, task.date > t ? task.date : t) : null;
      if (next) {
        task.history.push({ date: task.date, at: now() });
        task.date = next;
      } else {
        task.done = true;
        task.doneAt = now();
      }
      S.upsert('items', task);
      return () => { Object.assign(task, before); S.upsert('items', task); };
    },

    reopen(task) {
      task.done = false;
      task.doneAt = null;
      S.upsert('items', task);
    },

    // ---- Events ----
    // Remove one date from a repeating event.
    skip(event, day) {
      if (!event.skips.includes(day)) event.skips.push(day);
      S.upsert('items', event);
    },

    // Stop a repeating event before `day`, keeping earlier dates.
    endBefore(event, day) {
      event.until = U().addDays(day, -1);
      if (event.until < event.date) S.remove('items', event.id);
      else S.upsert('items', event);
    },

    // ---- Fitness ----
    // Workouts and minutes in the Monday-start week containing `day`.
    weekStats(day) {
      const from = U().weekStart(day);
      const to = U().addDays(from, 6);
      const list = db.workouts.filter((w) => w.date >= from && w.date <= to);
      return { from, to, count: list.length, minutes: list.reduce((s, w) => s + (Number(w.minutes) || 0), 0), list };
    },

    // Weeks in a row (ending last week, plus this week if already met) that reached the workout goal.
    streak() {
      const goal = db.settings.goal.perWeek || 1;
      let wk = U().weekStart(U().today());
      let n = S.weekStats(wk).count >= goal ? 1 : 0;
      for (;;) {
        wk = U().addDays(wk, -7);
        if (S.weekStats(wk).count >= goal) n++;
        else break;
      }
      return n;
    },

    // ---- Backup ----
    exportJSON() {
      db.settings.lastBackup = now();
      save();
      return JSON.stringify(db, null, 1);
    },

    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.items) || !Array.isArray(d.notes)) throw new Error('Not a backup file from this app');
      db = normalize(d);
      save();
    },

    reset() {
      db = empty();
      save();
    },

    // Replace everything with example data (Settings → Load sample data, and the demo).
    loadSample() {
      db = normalize(LT.sample());
      save();
    },
  };

  LT.store = S;
})();
