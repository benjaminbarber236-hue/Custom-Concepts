// Data layer. Two ways to keep the data:
// - "live": opened as a claude.ai artifact, everything is saved to your Claude account (the artifact's
//   database) and syncs between your devices. One document per step, property, cabin, expense and person,
//   plus meta/main for the project, budget and settings.
// - "local": anywhere else (GitHub Pages, a file), one JSON blob in this browser's localStorage.
(function () {
  const KEY = 'cabins-v1';
  const u = L.u, P = L.plan;
  const COLLS = ['steps', 'cabins', 'land', 'expenses', 'team', 'lenders'];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function fresh() {
    const steps = [];
    P.PHASES.forEach((ph) => ph.steps.forEach(([title, notes]) => steps.push({ id: uid(), n: steps.length, phase: ph.id, title, notes: notes || '', due: '', done: false, doneOn: '' })));
    return {
      version: 1,
      project: { name: 'Cabin Project', landBy: '', openBy: '' },
      steps,       // { id, n, phase, title, notes, due, done, doneOn }
      cabins: [1, 2, 3, 4].map((n) => newCabin('Cabin ' + n, n - 1)),
      land: [],    // { id, name, place, acres, price, url, status, checks: {}, rating, notes, added }
      budget: Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), // category -> estimate
      expenses: [], // { id, date, title, amount, cat, cabin }
      team: [],    // { id, role, name, phone, email, notes }
      lenders: [], // { id, name, person, phone, email, when, checks: { q1: 1 }, answers: { q1: '...' } }
      settings: { theme: '', lastBackup: null },
    };
  }
  const blank = () => Object.assign(fresh(), { steps: [], cabins: [] });

  function newCabin(name, n) {
    return { id: uid(), n: n == null ? Date.now() : n, name, sqft: '', beds: '', baths: '', style: '', estimate: 0, stages: {}, notes: '' };
  }

  function normalize(d) {
    const base = fresh();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.project = Object.assign(base.project, d.project);
    d.settings = Object.assign(base.settings, d.settings);
    d.budget = Object.assign(Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), d.budget);
    d.steps.forEach((s, i) => { if (s.n == null) s.n = i; });
    d.cabins.forEach((c, i) => { if (c.n == null) c.n = i; });
    return d;
  }

  const S = { mode: 'local', loaded: true, stale: false };
  let db;

  // ---------- Local mode ----------
  function loadLocal() {
    if (L.DEMO) return null;
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { console.error(e); }
    return null;
  }

  // ---------- Live mode (claude.ai artifact database) ----------
  let store = null;           // the db capability
  const synced = {};          // path -> JSON last confirmed by the store
  const queue = new Map();    // path -> body | null (delete), waiting to be written
  let flushTimer = null, writing = false, warned = false;
  const meta = () => ({ version: db.version, project: db.project, budget: db.budget, settings: db.settings });

  function desired() {
    const out = { 'meta/main': JSON.stringify(meta()) };
    for (const c of COLLS) for (const x of db[c]) out[c + '/' + x.id] = JSON.stringify(x);
    return out;
  }
  function flush() {
    flushTimer = null;
    const want = desired();
    for (const [p, j] of Object.entries(want)) if (synced[p] !== j) queue.set(p, j);
    for (const p of Object.keys(synced)) if (!(p in want)) queue.set(p, null);
    pump();
  }
  async function pump() {
    if (writing) return;
    writing = true;
    while (queue.size) {
      const [path, j] = queue.entries().next().value;
      queue.delete(path);
      if (j !== null && synced[path] === j) continue;
      try {
        if (j === null) { await store.doc(path).delete(); delete synced[path]; } else { await store.doc(path).set(JSON.parse(j)); synced[path] = j; }
      } catch (e) {
        if (!warned) { warned = true; u.toast(e && e.code === 'quota_exceeded' ? 'Storage is full. Delete some old expenses.' : 'Could not save just now. Trying again…'); setTimeout(() => (warned = false), 30000); }
        if (e && (e.code === 'invalid_argument' || e.code === 'quota_exceeded' || e.code === 'revoked')) continue;
        writing = false; setTimeout(save, 5000); return;
      }
    }
    writing = false;
  }
  // A local change not yet sent: an incoming copy must not overwrite it.
  const dirty = (path, j) => queue.has(path) || (flushTimer && synced[path] !== j);

  let renderQueued = false;
  function rerender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      // Don't redraw under someone typing on the page; catch up when they leave the field.
      const a = document.activeElement;
      if (a && a.closest && a.closest('#main') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { a.addEventListener('blur', rerender, { once: true }); return; }
      if (L.app) L.app.render();
    });
  }

  function applyCollection(c, snap) {
    const list = db[c];
    const seen = new Set();
    for (const d of snap.docs) {
      seen.add(d.id);
      const path = c + '/' + d.id, body = Object.assign({}, d.data(), { id: d.id }), j = JSON.stringify(body);
      const cur = list.find((x) => x.id === d.id);
      if (cur && dirty(path, JSON.stringify(cur))) continue;
      synced[path] = j;
      if (cur) { for (const k of Object.keys(cur)) if (!(k in body)) delete cur[k]; Object.assign(cur, JSON.parse(j)); } else list.push(JSON.parse(j));
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const path = c + '/' + list[i].id;
      if (!seen.has(list[i].id) && path in synced && !queue.has(path)) { list.splice(i, 1); delete synced[path]; }
    }
    if (c === 'steps' || c === 'cabins') list.sort((a, b) => (a.n || 0) - (b.n || 0));
  }

  async function connect() {
    if (L.DEMO || !(window.claude && typeof window.claude.use === 'function')) return false;
    S.mode = 'loading'; S.loaded = false;
    let cap = null;
    try { cap = await window.claude.use('db'); } catch (e) { cap = null; }
    window.claude.use('downloads').then((d) => { L.downloads = d; }).catch(() => {});
    if (!cap) { S.mode = 'local'; S.loaded = true; return false; }
    store = cap; S.mode = 'live';
    db = blank(); S.db = db;
    const got = {};
    const timer = setTimeout(() => { if (!S.loaded) { S.stale = true; S.loaded = true; rerender(); } }, 10000);
    const done = (key, fromCache) => {
      if (!fromCache) got[key] = true;
      if (COLLS.every((c) => got[c]) && got.meta) { if (!S.loaded || S.stale) { S.loaded = true; S.stale = false; clearTimeout(timer); } }
      rerender();
    };
    const fail = (e) => { console.error(e); S.stale = true; S.loaded = true; clearTimeout(timer); rerender(); };
    for (const c of COLLS) store.collection(c).onSnapshot((snap) => { applyCollection(c, snap); done(c, snap.metadata.fromCache); }, fail);
    store.doc('meta/main').onSnapshot((s) => {
      if (s.exists) {
        const body = s.data(), j = JSON.stringify(body);
        if (!dirty('meta/main', JSON.stringify(meta()))) {
          synced['meta/main'] = j;
          const m = JSON.parse(j);
          db.version = m.version || 1;
          db.project = Object.assign(fresh().project, m.project);
          db.budget = Object.assign(Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), m.budget);
          db.settings = Object.assign(fresh().settings, m.settings);
          if (L.app && L.app.applyTheme) L.app.applyTheme();
        }
      }
      S.hasMeta = s.exists || S.hasMeta;
      done('meta', s.metadata.fromCache);
    }, fail);
    return true;
  }

  function save() {
    if (L.DEMO) return;
    if (S.mode === 'live') { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 300); return; }
    if (S.mode !== 'local') return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { u.toast('Could not save. Save a backup now.'); }
  }

  // Live and nothing there yet: the page offers to start the plan.
  const isEmpty = () => S.mode === 'live' && S.loaded && !S.stale && !S.hasMeta && !db.steps.length && !db.cabins.length;
  function startPlan() { const f = fresh(); for (const k of Object.keys(f)) db[k] = f[k]; S.hasMeta = true; save(); }

  // ---------- Steps ----------
  const phaseSteps = (pid) => db.steps.filter((s) => s.phase === pid);
  function phaseProgress(pid) {
    const s = phaseSteps(pid);
    const ph = P.PHASES.find((p) => p.id === pid);
    let done = s.filter((x) => x.done).length, total = s.length;
    if (ph && ph.cabins) for (const c of db.cabins) { done += stagesDone(c); total += P.CABIN_STAGES.length; }
    return { done, total, pct: total ? done / total : 0 };
  }
  function overall() {
    let done = 0, total = 0;
    for (const ph of P.PHASES) { const p = phaseProgress(ph.id); done += p.done; total += p.total; }
    return { done, total, pct: total ? done / total : 0 };
  }
  const currentPhase = () => P.PHASES.find((ph) => phaseProgress(ph.id).pct < 1) || null;
  const nextSteps = (n) => {
    const order = P.PHASES.map((p) => p.id);
    return db.steps.filter((s) => !s.done).sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase)).slice(0, n);
  };
  function toggleStep(s) { s.done = !s.done; s.doneOn = s.done ? u.today() : ''; save(); return s.done; }

  // ---------- Cabins ----------
  const stagesDone = (c) => P.CABIN_STAGES.filter((_, i) => c.stages[i]).length;
  const cabinStage = (c) => { const i = P.CABIN_STAGES.findIndex((_, j) => !c.stages[j]); return i < 0 ? 'Ready for guests' : i === 0 ? 'Not started' : P.CABIN_STAGES[i - 1]; };
  function toggleStage(c, i) { if (c.stages[i]) delete c.stages[i]; else c.stages[i] = u.today(); save(); }

  // ---------- Money ----------
  const spent = (cat) => db.expenses.filter((e) => !cat || e.cat === cat).reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const cabinSpent = (id) => db.expenses.filter((e) => e.cabin === id).reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const estimateTotal = () => Object.values(db.budget).reduce((n, v) => n + (Number(v) || 0), 0);

  // ---------- Land ----------
  const landScore = (l) => P.LAND_CHECKS.filter(([k]) => l.checks[k] === 'yes').length;
  const ourLand = () => db.land.find((l) => l.status === 'bought') || db.land.find((l) => l.status === 'contract') || null;

  // ---------- Generic ----------
  function add(list, item) {
    item.id = uid();
    if (list === 'steps' || list === 'cabins') item.n = db[list].reduce((m, x) => Math.max(m, x.n || 0), -1) + 1;
    db[list].push(item); save(); return item;
  }
  function remove(list, id) { const i = db[list].findIndex((x) => x.id === id); if (i < 0) return null; const [x] = db[list].splice(i, 1); save(); return { item: x, index: i }; }
  function restore(list, r) { if (!r) return; db[list].splice(r.index, 0, r.item); save(); }
  const find = (list, id) => db[list].find((x) => x.id === id);

  // ---------- Backup ----------
  function exportJSON() { db.settings.lastBackup = new Date().toISOString(); save(); return JSON.stringify(db, null, 2); }
  function replaceAll(d) { for (const k of Object.keys(d)) db[k] = d[k]; S.hasMeta = true; save(); }
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.steps) || !Array.isArray(d.cabins)) throw new Error('That file is not a Cabins backup.');
    replaceAll(normalize(d));
  }
  function reset() { replaceAll(fresh()); }
  function loadSample() { replaceAll(normalize(L.sample(fresh(), uid))); }

  db = loadLocal() || fresh();
  Object.assign(S, {
    db, uid, save, connect, isEmpty, startPlan, newCabin, phaseSteps, phaseProgress, overall, currentPhase, nextSteps, toggleStep,
    stagesDone, cabinStage, toggleStage, spent, cabinSpent, estimateTotal, landScore, ourLand,
    add, remove, restore, find, exportJSON, importJSON, reset, loadSample,
  });
  L.store = S;
})();
