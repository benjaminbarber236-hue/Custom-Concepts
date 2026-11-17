// Data layer: one JSON blob in localStorage, on this device only.
(function () {
  const KEY = 'cabins-v1';
  const u = L.u, P = L.plan;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const stepsFrom = (ph) => ph.steps.map(([title, notes]) => ({ id: uid(), phase: ph.id, title, notes: notes || '', due: '', done: false, doneOn: '' }));

  // Line items: [section, [[item, low, high]]] -> sections with ids. Blank prices when `priced` is false.
  const sectionsFrom = (tpl, priced = true) => tpl.map(([name, items]) => ({ id: uid(), name, items: items.map(([n, lo, hi]) => ({ id: uid(), name: n, low: priced ? lo : 0, high: priced ? hi : 0 })) }));

  function defaultPlans() {
    return [
      { id: uid(), name: '32×34 Duplex', kind: 'duplex', units: 2, sqft: 1088, beds: 1, baths: 1, notes: 'Owner-builder, sawmill Douglas fir framing and ceilings, slab on grade with radiant heat, metal roof, Hardie siding. Alpine, Wyoming. 2 units of about 544 sq ft, each 1 bed / 1 bath.', sections: sectionsFrom(P.DUPLEX) },
      { id: uid(), name: 'Single cabin', kind: 'cabin', units: 1, sqft: '', beds: 1, baths: 1, notes: 'Same parts as the duplex, not priced yet. Tap a line to fill in its price.', sections: sectionsFrom(P.DUPLEX, false) },
    ];
  }

  function fresh() {
    return {
      version: 2,
      project: { name: 'Cabin Project', landBy: '', openBy: '', units: 4 },
      steps: P.PHASES.flatMap(stepsFrom), // { id, phase, title, notes, due, done, doneOn }
      plans: defaultPlans(),  // { id, name, kind: 'duplex'|'cabin'|'other', units, sqft, beds, baths, notes, sections: [{ id, name, items: [{ id, name, low, high }] }] }
      buildings: [],          // { id, name, plan: planId|'', stages: { stageName: 'YYYY-MM-DD' }, notes }
      land: [],    // { id, name, place, acres, price, url, status, checks: {}, rating, notes, added }
      budget: Object.fromEntries(P.BUDGET.map(([k]) => [k, 0])), // category -> estimate
      expenses: [], // { id, date, title, amount, cat, building, section }
      team: [],    // { id, role, name, phone, email, notes }
      settings: { theme: '', lastBackup: null },
    };
  }

  // Version 1 had "cabins" with numbered stages and a hired-builder step list.
  function upgrade(d) {
    if ((d.version || 1) >= 2) return d;
    const old = d.cabins || [];
    const OLD_STAGES = ['Plans chosen', 'Permit approved', 'Foundation', 'Framing', 'Roof, windows & doors', 'Plumbing & electrical', 'Inspections passed', 'Insulation & walls', 'Floors, kitchen & bath', 'Final inspection', 'Furnished', 'Ready for guests'];
    const rename = { 'Plans chosen': 'Plan chosen', 'Final inspection': 'Final inspection', 'Permit approved': 'Permit approved' };
    const untouched = (c) => /^Cabin \d+$/.test(c.name) && !c.sqft && !c.style && !c.estimate && !c.notes && !Object.keys(c.stages || {}).length;
    d.buildings = old.filter((c) => !untouched(c)).map((c) => {
      const stages = {};
      for (const [i, date] of Object.entries(c.stages || {})) { const n = rename[OLD_STAGES[i]]; if (n) stages[n] = date; }
      const facts = [c.style, c.sqft && c.sqft + ' sq ft', c.beds && c.beds + ' bed', c.baths && c.baths + ' bath', c.estimate && 'estimate $' + Number(c.estimate).toLocaleString()].filter(Boolean).join(' · ');
      return { id: c.id, name: c.name, plan: '', stages, notes: [facts, c.notes].filter(Boolean).join('\n') };
    });
    delete d.cabins;
    (d.expenses || []).forEach((e) => { e.building = e.cabin || ''; e.section = ''; delete e.cabin; if (e.cat === 'build' && !e.building) e.building = ''; });
    if (d.budget && 'build' in d.budget === false) d.budget.build = 0;
    // Drop the hired-builder steps nobody touched, then add the new owner-builder steps that are missing.
    d.steps = (d.steps || []).filter((s) => !(P.RETIRED.includes(s.title) && !s.done && !s.notes.trim() && !s.due) || P.PHASES.some((ph) => ph.steps.some(([t]) => t === s.title)));
    for (const ph of P.PHASES) {
      for (const st of stepsFrom(ph)) if (!d.steps.some((s) => s.title === st.title)) {
        const last = d.steps.map((s) => s.phase).lastIndexOf(ph.id);
        d.steps.splice(last < 0 ? d.steps.length : last + 1, 0, st);
      }
    }
    d.steps.forEach((s) => { if (s.title === 'Set a rough total budget: land + site work + 4 cabins + 10–15% reserve') s.title = 'Set a rough total budget: land + site work + buildings + tools + 10–15% reserve'; });
    d.version = 2;
    return d;
  }

  function normalize(d) {
    upgrade(d);
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
  if (!L.DEMO) save();

  // ---------- Steps ----------
  const phaseSteps = (pid) => db.steps.filter((s) => s.phase === pid);
  function phaseProgress(pid) {
    const s = phaseSteps(pid);
    const ph = P.PHASES.find((p) => p.id === pid);
    let done = s.filter((x) => x.done).length, total = s.length;
    if (ph && ph.cabins) for (const b of db.buildings) { done += stagesDone(b); total += P.CABIN_STAGES.length; }
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

  // ---------- Plans & buildings ----------
  const sectionTotal = (sec) => sec.items.reduce((t, i) => ({ low: t.low + (Number(i.low) || 0), high: t.high + (Number(i.high) || 0) }), { low: 0, high: 0 });
  function planTotal(p) {
    if (!p) return { low: 0, high: 0 };
    return p.sections.reduce((t, s) => { const x = sectionTotal(s); return { low: t.low + x.low, high: t.high + x.high }; }, { low: 0, high: 0 });
  }
  const planFor = (b) => (b && b.plan ? db.plans.find((p) => p.id === b.plan) : null);
  const stagesDone = (b) => P.CABIN_STAGES.filter((n) => b.stages[n]).length;
  const buildingStage = (b) => { const i = P.CABIN_STAGES.findIndex((n) => !b.stages[n]); return i < 0 ? 'Done' : i === 0 ? 'Not started' : P.CABIN_STAGES[i - 1]; };
  function toggleStage(b, name) { if (b.stages[name]) delete b.stages[name]; else b.stages[name] = u.today(); save(); }
  // Low–high to build every building that has a plan.
  const buildingsTotal = () => db.buildings.reduce((t, b) => { const x = planTotal(planFor(b)); return { low: t.low + x.low, high: t.high + x.high }; }, { low: 0, high: 0 });
  const unitsPlanned = () => db.buildings.reduce((n, b) => n + ((planFor(b) || {}).units || 0), 0);
  function copyPlan(p, name) {
    const c = JSON.parse(JSON.stringify(p));
    c.id = uid(); c.name = name || p.name + ' (copy)';
    c.sections.forEach((s) => { s.id = uid(); s.items.forEach((i) => (i.id = uid())); });
    db.plans.push(c); save(); return c;
  }

  // ---------- Money ----------
  const sum = (list) => list.reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const spent = (cat) => sum(db.expenses.filter((e) => !cat || e.cat === cat));
  const buildingSpent = (id, section) => sum(db.expenses.filter((e) => e.building === id && (!section || e.section === section)));
  const estimateTotal = () => Object.values(db.budget).reduce((n, v) => n + (Number(v) || 0), 0);
  const sectionNames = () => [...new Set(db.plans.flatMap((p) => p.sections.map((s) => s.name)))];

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
    if (!d || !Array.isArray(d.steps) || !(Array.isArray(d.buildings) || Array.isArray(d.cabins))) throw new Error('That file is not a Cabins backup.');
    db = normalize(d); S.db = db; save();
  }
  function reset() { db = fresh(); S.db = db; save(); }
  function loadSample() { db = normalize(L.sample(fresh(), uid)); S.db = db; save(); }

  const S = {
    db, uid, save, phaseSteps, phaseProgress, overall, currentPhase, nextSteps, toggleStep,
    sectionTotal, planTotal, planFor, stagesDone, buildingStage, toggleStage, buildingsTotal, unitsPlanned, copyPlan,
    spent, buildingSpent, estimateTotal, sectionNames, landScore, ourLand,
    add, remove, restore, find, exportJSON, importJSON, reset, loadSample,
  };
  L.store = S;
})();
