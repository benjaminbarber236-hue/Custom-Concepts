// Data layer: one JSON blob in localStorage, on this device only.
(function () {
  const KEY = 'cabins-v1';
  const u = L.u, P = L.plan;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function fresh() {
    const steps = [];
    P.PHASES.forEach((ph) => ph.steps.forEach(([title, notes]) => steps.push({ id: uid(), phase: ph.id, title, notes: notes || '', due: '', done: false, doneOn: '' })));
    return {
      version: 1,
      project: { name: 'Cabin Project', landBy: '', openBy: '' },
      steps,       // { id, phase, title, notes, due, done, doneOn }
      cabins: [1, 2, 3, 4].map((n) => newCabin('Cabin ' + n)),
      land: [],    // { id, name, place, acres, price, url, status, checks: {}, rating, notes, added }
      budget: Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), // category -> estimate
      expenses: [], // { id, date, title, amount, cat, cabin }
      team: [],    // { id, role, name, phone, email, notes }
      settings: { theme: '', lastBackup: null },
    };
  }

  function newCabin(name) {
    return { id: uid(), name, sqft: '', beds: '', baths: '', style: '', estimate: 0, stages: {}, notes: '' };
  }

  function normalize(d) {
    const base = fresh();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.project = Object.assign(base.project, d.project);
    d.settings = Object.assign(base.settings, d.settings);
    d.budget = Object.assign(Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), d.budget);
    return d;
  }

  function load() {
    if (L.DEMO) return null;
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { console.error(e); }
    return null;
  }

  let db = load() || fresh();
  let saveWarned = false;
  function save() {
    if (L.DEMO) return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { if (!saveWarned) { saveWarned = true; u.toast('Could not save. Save a backup now.'); } }
  }
  if (!L.DEMO && !localStorage.getItem(KEY)) save();

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
  // The phase you're in: the first one that still has open steps.
  const currentPhase = () => P.PHASES.find((ph) => phaseProgress(ph.id).pct < 1) || null;
  // Next open steps in plan order.
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
  function add(list, item) { item.id = uid(); db[list].push(item); save(); return item; }
  function remove(list, id) { const i = db[list].findIndex((x) => x.id === id); if (i < 0) return null; const [x] = db[list].splice(i, 1); save(); return { item: x, index: i }; }
  function restore(list, r) { if (!r) return; db[list].splice(r.index, 0, r.item); save(); }
  const find = (list, id) => db[list].find((x) => x.id === id);

  // ---------- Backup ----------
  function exportJSON() { db.settings.lastBackup = new Date().toISOString(); save(); return JSON.stringify(db, null, 2); }
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.steps) || !Array.isArray(d.cabins)) throw new Error('That file is not a Cabins backup.');
    db = normalize(d); S.db = db; save();
  }
  function reset() { db = fresh(); S.db = db; save(); }
  function loadSample() { db = normalize(L.sample(fresh(), uid)); S.db = db; save(); }

  const S = {
    db, uid, save, newCabin, phaseSteps, phaseProgress, overall, currentPhase, nextSteps, toggleStep,
    stagesDone, cabinStage, toggleStage, spent, cabinSpent, estimateTotal, landScore, ourLand,
    add, remove, restore, find, exportJSON, importJSON, reset, loadSample,
  };
  L.store = S;
})();
