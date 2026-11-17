// Build tab: plans (line-item cost estimates) compared side by side, and the buildings you'll build.
// A building can stay "not decided" until you pick a duplex, a cabin or another plan.
(function () {
  const u = L.u, S = L.store, P = L.plan, esc = u.esc, icon = u.icon;
  const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString();
  const range = (t) => (!t.high && !t.low ? 'Not priced' : t.low === t.high ? money(t.low) : `${money(t.low)} – ${money(t.high)}`);
  const kRange = (t) => { const k = (n) => (n >= 1000 ? '$' + (Math.round(n / 100) / 10).toLocaleString() + 'k' : money(n)); return !t.high ? 'Not priced' : t.low === t.high ? k(t.low) : `${k(t.low)}–${k(t.high)}`; };
  const bar = (x, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.min(100, Math.round(x * 100))}%"></i></div>`;
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[$,\s]/g, '')); return isFinite(n) ? n : 0; };
  const KINDS = [['duplex', 'Duplex'], ['cabin', 'Cabin'], ['other', 'Other']];
  const kindName = (k) => (KINDS.find(([x]) => x === k) || [, 'Other'])[1];
  const planFacts = (p) => [p.units && u.plural(Number(p.units), 'unit'), p.sqft && Number(p.sqft).toLocaleString() + ' sq ft', p.beds && `${p.beds} bed / ${p.baths || 0} bath${Number(p.units) > 1 ? ' each' : ''}`].filter(Boolean).join(' · ');
  const go = (p) => L.app.go(p), render = () => L.app.render();

  // ================= Build tab =================
  function viewBuild() {
    const db = S.db;
    const want = Number(db.project.units) || 1;
    const tot = S.buildingsTotal();
    const planned = S.unitsPlanned();
    return `<header class="page-head"><div><h1>Build</h1><p class="muted">Duplexes or cabins? Compare the plans, then track each building.</p></div></header>

      <section class="sec">
        <div class="sec-head"><h2>Compare plans</h2><button class="count link" data-act="plan-new">${icon('plus', 'sm')} New plan</button></div>
        <div class="card want">
          <span>Units you want</span>
          <span class="stepper-row"><button data-act="units" data-d="-1" aria-label="Fewer">−</button><b>${want}</b><button data-act="units" data-d="1" aria-label="More">+</button></span>
        </div>
        ${db.plans.map((p) => {
          const t = S.planTotal(p), units = Number(p.units) || 1, sq = Number(p.sqft) || 0;
          const n = Math.ceil(want / units);
          return `<a href="#/plans/${p.id}" class="card plan-card k-${p.kind}">
            <div class="row"><b class="grow">${esc(p.name)}</b><span class="pill">${kindName(p.kind)}</span></div>
            <p class="muted small">${esc(planFacts(p))}</p>
            ${t.high ? `<div class="plan-nums">
              <span><b>${kRange(t)}</b><small>per building</small></span>
              <span><b>${kRange({ low: t.low / units, high: t.high / units })}</b><small>per unit</small></span>
              ${sq ? `<span><b>$${Math.round(t.low / sq)}–${Math.round(t.high / sq)}</b><small>per sq ft</small></span>` : ''}
            </div>
            <p class="small for-units">For ${u.plural(want, 'unit')}: <b>${u.plural(n, 'building')}</b> · <b>${range({ low: t.low * n, high: t.high * n })}</b>${n * units > want ? ` <span class="muted">(${n * units} units)</span>` : ''}</p>` : `<p class="small muted">Not priced yet. Tap to add prices.</p>`}
          </a>`;
        }).join('')}
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Your buildings</h2><button class="count link" data-act="bld-new">${icon('plus', 'sm')} Add</button></div>
        ${db.buildings.length ? `<p class="muted small sum-line">${u.plural(planned, 'unit')} planned of ${want}${tot.high ? ` · ${range(tot)} to build` : ''}</p>` : ''}
        ${db.buildings.map((b) => {
          const p = S.planFor(b), d = S.stagesDone(b), sp = S.buildingSpent(b.id), t = S.planTotal(p);
          return `<a href="#/build/${b.id}" class="card cabin-card">
            <div class="row"><b class="grow">${esc(b.name)}</b><span class="small muted">${d} of ${P.CABIN_STAGES.length}</span></div>
            <p class="small ${p ? 'muted' : 'undecided'}">${p ? esc(p.name + ' · ' + planFacts(p)) : 'Duplex or cabin? Not decided yet'}</p>
            ${bar(d / P.CABIN_STAGES.length)}
            <div class="row small"><span class="ink">${esc(S.buildingStage(b))}</span><span class="muted">${t.high ? `${money(sp)} of ${kRange(t)}` : sp ? money(sp) + ' spent' : ''}</span></div>
          </a>`;
        }).join('') || `<div class="empty">${icon('cabins')}<p>Add each building you plan to put on the land. You can leave it as "not decided" until you choose a duplex or a cabin.</p><button class="btn primary sm" data-act="bld-new">Add a building</button></div>`}
      </section>`;
  }

  // ================= One plan =================
  function viewPlan(id) {
    const p = S.find('plans', id);
    if (!p) return viewBuild();
    const t = S.planTotal(p), units = Number(p.units) || 1, sq = Number(p.sqft) || 0;
    const used = S.db.buildings.filter((b) => b.plan === p.id).length;
    return `<a href="#/build" class="back">${icon('left')} Build</a>
      <header class="page-head"><div><h1>${esc(p.name)}</h1><p class="muted">${esc(planFacts(p)) || kindName(p.kind)}</p></div><button class="icon-btn" data-act="plan-edit" data-id="${p.id}" aria-label="Edit">${icon('pen')}</button></header>
      <section class="card total-card">
        <p class="muted small">Estimated cost per building</p>
        <b class="big-pct">${range(t)}</b>
        <div class="plan-nums">
          <span><b>${kRange({ low: t.low / units, high: t.high / units })}</b><small>per unit</small></span>
          ${sq && t.high ? `<span><b>$${Math.round(t.low / sq)}–${Math.round(t.high / sq)}</b><small>per sq ft</small></span>` : ''}
          <span><b>${used}</b><small>${used === 1 ? 'building uses it' : 'buildings use it'}</small></span>
        </div>
      </section>
      ${p.sections.map((s) => {
        const st = S.sectionTotal(s);
        return `<section class="card list est-sec">
          <button class="est-head" data-act="sec-edit" data-plan="${p.id}" data-id="${s.id}"><b>${esc(s.name)}</b><span>${range(st)}</span></button>
          ${s.items.map((i) => `<button class="list-row est-item" data-act="item-edit" data-plan="${p.id}" data-sec="${s.id}" data-id="${i.id}">
            <span class="grow">${esc(i.name)}</span><span class="amt-r ${!i.high && !i.low ? 'muted' : ''}">${range({ low: Number(i.low) || 0, high: Number(i.high) || 0 })}</span>
          </button>`).join('')}
          <button class="link small add-item" data-act="item-new" data-plan="${p.id}" data-sec="${s.id}">${icon('plus', 'sm')} Add a line</button>
        </section>`;
      }).join('')}
      <div class="actions center-actions">
        <button class="btn sm" data-act="sec-new" data-plan="${p.id}">${icon('plus')} Add a section</button>
        <button class="btn sm" data-act="plan-copy" data-id="${p.id}">${icon('copy')} Copy plan</button>
      </div>
      ${p.notes ? `<section class="card"><p class="pre">${esc(p.notes)}</p></section>` : ''}`;
  }

  function planSheet(p) {
    const isNew = !p;
    p = p || { name: '', kind: 'cabin', units: 1, sqft: '', beds: 1, baths: 1, notes: '', sections: [] };
    const others = S.db.plans;
    u.sheet({
      title: isNew ? 'New plan' : 'Edit plan',
      submit: isNew ? 'Add plan' : 'Save',
      body: `
        <label class="field"><span>Name</span><input name="name" value="${esc(p.name)}" ${isNew ? 'autofocus' : ''} placeholder="e.g. 24×28 cabin with loft"></label>
        <div class="seg">${KINDS.map(([k, n]) => `<label><input type="radio" name="kind" value="${k}" ${p.kind === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <div class="two">
          <label class="field"><span>Units in the building</span><input name="units" inputmode="numeric" value="${esc(p.units)}"></label>
          <label class="field"><span>Total sq ft</span><input name="sqft" inputmode="numeric" value="${esc(p.sqft)}"></label>
        </div>
        <div class="two">
          <label class="field"><span>Beds per unit</span><input name="beds" inputmode="numeric" value="${esc(p.beds)}"></label>
          <label class="field"><span>Baths per unit</span><input name="baths" inputmode="decimal" value="${esc(p.baths)}"></label>
        </div>
        ${isNew && others.length ? `<label class="field"><span>Start from</span><select name="from"><option value="">Blank</option>${others.map((o) => `<option value="${o.id}">Same lines as ${esc(o.name)} (no prices)</option><option value="${o.id}:priced">Copy of ${esc(o.name)} (with prices)</option>`).join('')}</select></label>` : ''}
        <label class="field"><span>Notes</span><textarea name="notes" rows="3">${esc(p.notes)}</textarea></label>`,
      onMount(form) { form.kind.forEach((r) => r.addEventListener('change', () => { if (r.checked && isNew) form.units.value = r.value === 'duplex' ? 2 : 1; })); },
      onSubmit(fd) {
        const name = (fd.get('name') || '').trim();
        if (!name) { u.toast('Give the plan a name.'); return false; }
        const v = { name, kind: fd.get('kind') || 'other', units: num(fd.get('units')) || 1, sqft: num(fd.get('sqft')) || '', beds: num(fd.get('beds')) || '', baths: num(fd.get('baths')) || '', notes: (fd.get('notes') || '').trim() };
        if (!isNew) { Object.assign(p, v); S.save(); render(); return; }
        const [fromId, priced] = String(fd.get('from') || '').split(':');
        const src = fromId && S.find('plans', fromId);
        let np;
        if (src) {
          np = S.copyPlan(src, name);
          Object.assign(np, v);
          if (!priced) np.sections.forEach((s) => s.items.forEach((i) => { i.low = 0; i.high = 0; }));
          S.save();
        } else np = S.add('plans', Object.assign(v, { sections: [{ id: S.uid(), name: 'Materials', items: [] }] }));
        go('#/plans/' + np.id);
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        const used = S.db.buildings.filter((b) => b.plan === p.id);
        if (!(await u.confirm(`Delete the ${p.name} plan?${used.length ? ` ${u.plural(used.length, 'building')} using it will go back to "not decided".` : ''}`))) return false;
        used.forEach((b) => (b.plan = ''));
        S.remove('plans', p.id); go('#/build');
      } },
    });
  }

  function sectionSheet(p, s) {
    const isNew = !s;
    u.sheet({
      title: isNew ? 'New section' : 'Section',
      submit: isNew ? 'Add section' : 'Save',
      body: `<label class="field"><span>Name</span><input name="name" value="${esc(s ? s.name : '')}" autofocus placeholder="e.g. Decks & porches"></label>`,
      onSubmit(fd) {
        const name = (fd.get('name') || '').trim();
        if (!name) return false;
        if (isNew) p.sections.push({ id: S.uid(), name, items: [] }); else s.name = name;
        S.save(); render();
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        if (s.items.length && !(await u.confirm(`Delete ${s.name} and its ${u.plural(s.items.length, 'line')}?`))) return false;
        p.sections = p.sections.filter((x) => x !== s); S.save(); render();
      } },
    });
  }

  function itemSheet(p, s, it) {
    const isNew = !it;
    it = it || { name: '', low: 0, high: 0 };
    u.sheet({
      title: isNew ? 'New line' : 'Line',
      submit: isNew ? 'Add line' : 'Save',
      body: `
        <label class="field"><span>What</span><textarea name="name" rows="2" ${isNew ? 'autofocus' : ''}>${esc(it.name)}</textarea></label>
        <div class="two">
          <label class="field"><span>Low</span><input name="low" inputmode="decimal" value="${it.low ? esc(it.low) : ''}" placeholder="$"></label>
          <label class="field"><span>High <em>(optional)</em></span><input name="high" inputmode="decimal" value="${it.high && it.high !== it.low ? esc(it.high) : ''}" placeholder="$"></label>
        </div>
        <label class="field"><span>Section</span><select name="sec">${p.sections.map((x) => `<option value="${x.id}" ${x === s ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`,
      onSubmit(fd) {
        const name = (fd.get('name') || '').trim();
        if (!name) { u.toast('Say what the line is for.'); return false; }
        const low = num(fd.get('low')), high = Math.max(num(fd.get('high')) || low, low);
        Object.assign(it, { name, low, high });
        const to = p.sections.find((x) => x.id === fd.get('sec')) || s;
        if (isNew) { it.id = S.uid(); to.items.push(it); } else if (to !== s) { s.items = s.items.filter((x) => x !== it); to.items.push(it); }
        S.save(); render();
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        const i = s.items.indexOf(it); s.items.splice(i, 1); S.save(); render();
        u.toast('Line deleted', { label: 'Undo', run: () => { s.items.splice(i, 0, it); S.save(); render(); } });
      } },
    });
  }

  // ================= One building =================
  function viewBuilding(id) {
    const b = S.find('buildings', id);
    if (!b) return viewBuild();
    const p = S.planFor(b), t = S.planTotal(p);
    const sp = S.buildingSpent(b.id);
    const ex = S.db.expenses.filter((e) => e.building === b.id).sort((a, c) => c.date.localeCompare(a.date));
    const nextI = P.CABIN_STAGES.findIndex((n) => !b.stages[n]);
    const loose = ex.filter((e) => !e.section || !p || !p.sections.some((s) => s.name === e.section));
    return `<a href="#/build" class="back">${icon('left')} Build</a>
      <header class="page-head"><div><h1>${esc(b.name)}</h1><p class="${p ? 'muted' : 'undecided'}">${p ? esc(p.name + ' · ' + planFacts(p)) : 'Duplex or cabin? Not decided yet'}</p></div><button class="icon-btn" data-act="bld-edit" data-id="${b.id}" aria-label="Edit">${icon('pen')}</button></header>
      ${p ? '' : `<button class="btn primary" data-act="bld-edit" data-id="${b.id}">Choose a plan</button>`}
      <section class="stats">
        <div class="card stat"><b>${Math.round(S.stagesDone(b) / P.CABIN_STAGES.length * 100)}%</b><span>built · ${esc(S.buildingStage(b))}</span></div>
        <div class="card stat"><b>${money(sp)}</b><span>${t.high ? 'spent of ' + kRange(t) : 'spent'}</span>${t.high ? bar(sp / t.high, 'thin' + (sp > t.high ? ' over' : '')) : ''}</div>
      </section>
      ${p && t.high ? `<section class="sec">
        <div class="sec-head"><h2>Spent by part</h2><a href="#/plans/${p.id}" class="count">See the plan</a></div>
        <div class="card list">${p.sections.map((s) => {
          const st = S.sectionTotal(s), got = S.buildingSpent(b.id, s.name);
          return `<div class="list-row budget-row"><span class="grow"><span class="block">${esc(s.name)}</span>${st.high ? bar(got / st.high, 'thin' + (got > st.high ? ' over' : '')) : ''}</span>
            <span class="amt"><b>${money(got)}</b><small class="muted">of ${kRange(st)}</small></span></div>`;
        }).join('')}${loose.length ? `<div class="list-row"><span class="grow muted">Other</span><b>${money(loose.reduce((n, e) => n + (Number(e.amount) || 0), 0))}</b></div>` : ''}</div>
      </section>` : ''}
      <section class="sec">
        <div class="sec-head"><h2>Build stages</h2><span class="count">${S.stagesDone(b)} of ${P.CABIN_STAGES.length}</span></div>
        <div class="card list"><ul class="tasks">${P.CABIN_STAGES.map((n, i) => `<li class="task ${b.stages[n] ? 'done' : ''} ${i === nextI ? 'next' : ''}">
          <button class="tick-sm" data-act="stage" data-id="${b.id}" data-i="${i}" aria-label="${esc(n)}">${icon('check')}</button>
          <button class="task-title" data-act="stage" data-id="${b.id}" data-i="${i}"><span>${esc(n)}</span>${b.stages[n] ? `<small>${u.fmt(b.stages[n], { month: 'short', day: 'numeric', year: 'numeric' })}</small>` : i === nextI ? '<small class="ink">Next</small>' : ''}</button>
        </li>`).join('')}</ul></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Expenses</h2><button class="count link" data-act="expense-new" data-building="${b.id}" data-cat="build">${icon('plus', 'sm')} Add</button></div>
        ${ex.length ? `<div class="card list">${ex.map(L.expenseRow).join('')}</div>` : '<div class="empty slim">Nothing spent on this building yet.</div>'}
      </section>
      ${b.notes ? `<section class="card"><p class="pre">${esc(b.notes)}</p></section>` : ''}`;
  }

  function buildingSheet(b) {
    const isNew = !b;
    const letter = String.fromCharCode(65 + S.db.buildings.length);
    b = b || { name: 'Building ' + letter, plan: '', stages: {}, notes: '' };
    u.sheet({
      title: isNew ? 'New building' : 'Edit building',
      submit: isNew ? 'Add building' : 'Save',
      body: `
        <label class="field"><span>Name</span><input name="name" value="${esc(b.name)}"></label>
        <fieldset class="field"><legend>Plan</legend>
          <div class="pick-list">
            <label><input type="radio" name="plan" value="" ${!b.plan ? 'checked' : ''}><span><b>Not decided yet</b><small>Pick later</small></span></label>
            ${S.db.plans.map((p) => `<label><input type="radio" name="plan" value="${p.id}" ${b.plan === p.id ? 'checked' : ''}><span><b>${esc(p.name)}</b><small>${esc(planFacts(p))} · ${kRange(S.planTotal(p))}</small></span></label>`).join('')}
          </div>
        </fieldset>
        <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="Where it sits, what to build first…">${esc(b.notes)}</textarea></label>`,
      onSubmit(fd) {
        Object.assign(b, { name: (fd.get('name') || '').trim() || b.name, plan: fd.get('plan') || '', notes: (fd.get('notes') || '').trim() });
        if (b.plan) b.stages['Plan chosen'] = b.stages['Plan chosen'] || u.today(); else delete b.stages['Plan chosen'];
        if (isNew) { const x = S.add('buildings', b); go('#/build/' + x.id); } else { S.save(); render(); }
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        if (!(await u.confirm(`Delete ${b.name}? Its expenses stay in Money.`))) return false;
        S.remove('buildings', b.id); S.db.expenses.forEach((e) => { if (e.building === b.id) e.building = ''; }); S.save(); go('#/build');
      } },
    });
  }

  const planOf = (el) => S.find('plans', el.dataset.plan);
  const secOf = (p, el) => p.sections.find((s) => s.id === (el.dataset.sec || el.dataset.id));
  L.build = {
    views: { build: viewBuild, plan: viewPlan, building: viewBuilding },
    acts: {
      units(el) { const p = S.db.project; p.units = Math.max(1, (Number(p.units) || 1) + Number(el.dataset.d)); S.save(); render(); },
      'plan-new'() { planSheet(); },
      'plan-edit'(el) { planSheet(S.find('plans', el.dataset.id)); },
      'plan-copy'(el) { const c = S.copyPlan(S.find('plans', el.dataset.id)); go('#/plans/' + c.id); u.toast('Copied. Rename it with the pencil.'); },
      'sec-new'(el) { sectionSheet(planOf(el)); },
      'sec-edit'(el) { const p = planOf(el); sectionSheet(p, secOf(p, el)); },
      'item-new'(el) { const p = planOf(el); itemSheet(p, secOf(p, el)); },
      'item-edit'(el) { const p = planOf(el), s = secOf(p, el); itemSheet(p, s, s.items.find((i) => i.id === el.dataset.id)); },
      'bld-new'() { buildingSheet(); },
      'bld-edit'(el) { buildingSheet(S.find('buildings', el.dataset.id)); },
      stage(el) { S.toggleStage(S.find('buildings', el.dataset.id), P.CABIN_STAGES[Number(el.dataset.i)]); render(); },
    },
    money, range, kRange,
  };
})();
