// Screens and actions. Tabs: Plan, Steps, Land, Cabins, Money (+ Settings from the gear).
(function () {
  const u = L.u, S = L.store, P = L.plan, esc = u.esc, icon = u.icon;
  const main = document.getElementById('main');
  let installEvent = null;
  let openPhases = null; // phase ids shown open on the Steps tab

  const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString();
  const pct = (x) => Math.round(x * 100) + '%';
  const bar = (x, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.min(100, Math.round(x * 100))}%"></i></div>`;
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[$,\s]/g, '')); return isFinite(n) ? n : 0; };
  const phaseName = (id) => (P.PHASES.find((p) => p.id === id) || {}).name || '';
  const catName = (k) => (P.BUDGET.find(([c]) => c === k) || [, 'Other'])[1];
  const statusName = (k) => (P.LAND_STATUS.find(([s]) => s === k) || [, ''])[1];
  const dueText = (d) => { if (!d) return ''; const n = u.daysBetween(u.today(), d); return n < 0 ? `Overdue · ${u.relDay(d)}` : `Due ${u.relDay(d)}`; };
  const head = (title, sub, right = '') => `<header class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${right}</header>`;

  function stepRow(s, showPhase) {
    const late = !s.done && s.due && s.due < u.today();
    const bits = [showPhase && phaseName(s.phase), !s.done && s.due && dueText(s.due), s.done && s.doneOn && 'Done ' + u.relDay(s.doneOn), s.notes && 'Notes'].filter(Boolean);
    return `<li class="task ${s.done ? 'done' : ''} ${late ? 'late' : ''}">
      <button class="tick-sm" data-act="step-tick" data-id="${s.id}" aria-label="${s.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button>
      <button class="task-title" data-act="step-edit" data-id="${s.id}"><span>${esc(s.title)}</span>${bits.length ? `<small>${esc(bits.join(' · '))}</small>` : ''}</button>
    </li>`;
  }

  // ================= Plan (home) =================
  function viewPlan() {
    const db = S.db, t = u.today();
    const all = S.overall();
    const cur = S.currentPhase();
    const curIdx = cur ? P.PHASES.indexOf(cur) : P.PHASES.length;
    const next = S.nextSteps(3);
    const soon = db.steps.filter((s) => !s.done && s.due && u.daysBetween(t, s.due) <= 14 && !next.includes(s)).sort((a, b) => a.due.localeCompare(b.due));
    const est = S.estimateTotal(), sp = S.spent();
    const land = S.ourLand();
    const looking = db.land.filter((l) => l.status !== 'passed' && l.status !== 'bought').length;
    const cabinPct = db.cabins.length ? db.cabins.reduce((n, c) => n + S.stagesDone(c), 0) / (db.cabins.length * P.CABIN_STAGES.length) : 0;
    const lb = db.settings.lastBackup;
    const touched = db.steps.filter((s) => s.done).length + db.expenses.length + db.land.length;
    const needBackup = !L.DEMO && S.mode === 'local' && touched > 10 && (!lb || u.daysBetween(lb.slice(0, 10), t) > 30);
    const target = (d, label) => { if (!d) return ''; const n = u.daysBetween(t, d); return `<span>${label} <b>${u.fmt(d, { month: 'short', year: 'numeric' })}</b> <em>${n >= 0 ? u.plural(n, 'day') + ' to go' : 'passed'}</em></span>`; };

    return `
      <header class="page-head today-head">
        <div><p class="eyebrow">${land ? esc(land.name) : 'Land & cabins'}</p><h1 class="display">${esc(db.project.name)}</h1></div>
        <a href="#/settings" class="icon-btn" aria-label="Settings">${icon('gear')}</a>
      </header>

      ${needBackup ? `<section class="card notice"><p><b>Save a backup.</b> Your plan lives only on this phone. Keep a copy somewhere safe.</p><div class="row"><button class="btn primary sm" data-act="backup">Save backup</button></div></section>` : ''}

      <section class="card progress">
        <div class="row"><div><p class="muted small">Whole project</p><b class="big-pct">${pct(all.pct)}</b></div>
          <div class="right"><p class="muted small">${u.plural(all.done, 'step')} of ${all.total}</p>${cur ? `<p class="ink">Now: ${esc(cur.name)}</p>` : '<p class="ink">All done!</p>'}</div></div>
        ${bar(all.pct)}
        <ol class="phase-dots" aria-label="Phases">${P.PHASES.map((ph, i) => `<li class="${i < curIdx ? 'done' : i === curIdx ? 'now' : ''}" title="${esc(ph.name)}"></li>`).join('')}</ol>
        ${db.project.landBy || db.project.openBy ? `<div class="targets">${target(db.project.landBy, 'Buy land by')}${target(db.project.openBy, 'Open by')}</div>` : `<button class="link small" data-act="project">Set target dates</button>`}
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Next up</h2><a href="#/steps" class="count">All steps</a></div>
        ${next.length ? `<div class="card list"><ul class="tasks">${next.map((s) => stepRow(s, true)).join('')}</ul></div>` : `<div class="empty slim">Every step is done. Time to enjoy the cabins.</div>`}
      </section>

      ${soon.length ? `<section class="sec"><div class="sec-head"><h2>Due soon</h2><span class="count">${soon.length}</span></div>
        <div class="card list"><ul class="tasks">${soon.map((s) => stepRow(s, true)).join('')}</ul></div></section>` : ''}

      <section class="stats">
        <a href="#/money" class="card stat"><b>${money(sp)}</b><span>spent of ${est ? money(est) : 'no budget yet'}</span>${est ? bar(sp / est, 'thin') : ''}</a>
        <a href="#/land" class="card stat"><b>${land ? (land.acres || '–') + ' ac' : looking}</b><span>${land ? statusName(land.status) : looking === 1 ? 'property in view' : 'properties in view'}</span></a>
        <a href="#/cabins" class="card stat"><b>${db.cabins.length}</b><span>cabins · ${pct(cabinPct)} built</span>${bar(cabinPct, 'thin')}</a>
        <a href="#/money" class="card stat"><b>${est ? money(Math.max(0, est - sp)) : '–'}</b><span>left in the budget</span></a>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Your team</h2><button class="count link" data-act="person-new">${icon('plus', 'sm')} Add</button></div>
        ${db.team.length ? `<div class="card list">${db.team.map((p) => `<div class="list-row">
            <button class="member" data-act="person-edit" data-id="${p.id}"><span class="block">${esc(p.name || p.role)}</span><small class="muted">${esc([p.name && p.role, p.phone, p.email, p.notes].filter(Boolean).join(' · '))}</small></button>
            <span class="contact">${p.phone ? `<a class="icon-btn sm" href="tel:${esc(p.phone)}" aria-label="Call">${icon('phone')}</a>` : ''}${p.email ? `<a class="icon-btn sm" href="mailto:${esc(p.email)}" aria-label="Email">${icon('mail')}</a>` : ''}</span>
          </div>`).join('')}</div>` : `<div class="empty slim">Keep the people helping you here: land agent, lender, surveyor, builder and more.</div>`}
      </section>`;
  }

  // ================= Steps =================
  function viewSteps() {
    const all = S.overall();
    const cur = S.currentPhase();
    if (!openPhases) openPhases = new Set(cur ? [cur.id] : []);
    return `${head('Steps', `${u.plural(all.done, 'step')} done of ${all.total} · ${pct(all.pct)}`)}
      ${P.PHASES.map((ph, i) => {
        const pr = S.phaseProgress(ph.id);
        const steps = S.phaseSteps(ph.id);
        const done = pr.total && pr.done === pr.total;
        return `<details class="card phase ${done ? 'is-done' : ''} ${cur && cur.id === ph.id ? 'is-now' : ''}" data-phase="${ph.id}" ${openPhases.has(ph.id) ? 'open' : ''}>
          <summary>
            <span class="ph-num">${done ? icon('check') : i + 1}</span>
            <span class="ph-text"><b>${esc(ph.name)}</b><small>${pr.done} of ${pr.total}${cur && cur.id === ph.id ? ' · you are here' : ''}</small></span>
            <span class="ph-bar">${bar(pr.pct, 'thin')}</span>
          </summary>
          <p class="muted small blurb">${esc(ph.blurb)}</p>
          ${ph.cabins ? `<div class="mini-cabins">${S.db.cabins.map((c) => `<a href="#/cabins/${c.id}" class="mini-cabin"><span><b>${esc(c.name)}</b><small>${esc(S.cabinStage(c))}</small></span>${bar(S.stagesDone(c) / P.CABIN_STAGES.length, 'thin')}</a>`).join('')}</div>` : ''}
          ${steps.length ? `<ul class="tasks">${steps.map((s) => stepRow(s)).join('')}</ul>` : ''}
          <button class="btn sm ghost add-step" data-act="step-new" data-phase="${ph.id}">${icon('plus')} Add a step</button>
        </details>`;
      }).join('')}
      <p class="footnote">Every step can be edited or deleted. Tap a step for notes and a due date.</p>`;
  }

  function stepSheet(s, phase) {
    const isNew = !s;
    s = s || { title: '', notes: '', due: '', phase };
    u.sheet({
      title: isNew ? 'New step' : 'Step',
      submit: isNew ? 'Add step' : 'Save',
      body: `
        <label class="field"><span>Step</span><input name="title" value="${esc(s.title)}" ${isNew ? 'autofocus' : ''} placeholder="e.g. Call the county about septic rules"></label>
        <label class="field"><span>Phase</span><select name="phase">${P.PHASES.map((p) => `<option value="${p.id}" ${p.id === s.phase ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Due date <em>(optional)</em></span><input name="due" type="date" value="${esc(s.due)}"></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="4" placeholder="Who to call, what they said, prices, links…">${esc(s.notes)}</textarea></label>
        ${!isNew && /lender/i.test(s.title) ? `<a href="#/lenders" class="btn sm" data-close>${icon('phone')} Open lender questions</a>` : ''}
        ${!isNew && s.due ? `<button type="button" class="btn sm" data-ics>${icon('schedule')} Add to phone calendar</button>` : ''}`,
      onMount(form) {
        const b = form.querySelector('[data-ics]');
        if (b) b.onclick = () => u.download('step.ics', u.ics({ title: s.title, date: s.due, notes: s.notes }), 'text/calendar');
      },
      onSubmit(fd) {
        const title = (fd.get('title') || '').trim();
        if (!title) { u.toast('Give the step a name.'); return false; }
        const v = { title, phase: fd.get('phase'), due: fd.get('due') || '', notes: (fd.get('notes') || '').trim() };
        if (isNew) S.add('steps', Object.assign(v, { done: false, doneOn: '' })); else { Object.assign(s, v); S.save(); }
        if (openPhases) openPhases.add(v.phase);
        render();
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        const r = S.remove('steps', s.id); render();
        u.toast('Step deleted', { label: 'Undo', run: () => { S.restore('steps', r); render(); } });
      } },
    });
  }

  // ================= Land =================
  const STATUS_ORDER = ['bought', 'contract', 'offer', 'visited', 'watching', 'passed'];
  function viewLand() {
    const list = S.db.land.slice().sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (b.rating || 0) - (a.rating || 0));
    return `${head('Land', 'Properties you are looking at, side by side.', `<button class="btn primary sm" data-act="land-new">${icon('plus')} Add</button>`)}
      ${list.length ? list.map((l) => {
        const score = S.landScore(l);
        const ppa = l.price && l.acres ? money(l.price / l.acres) + '/ac' : '';
        return `<a href="#/land/${l.id}" class="card land-card st-${l.status}">
          <div class="row"><b class="grow">${esc(l.name)}</b><span class="pill">${esc(statusName(l.status))}</span></div>
          <p class="muted small">${[l.place, l.acres && l.acres + ' acres', l.price && money(l.price), ppa].filter(Boolean).map(esc).join(' · ')}</p>
          <div class="row"><span class="stars">${stars(l.rating)}</span><span class="small ${score >= 7 ? 'ink' : 'muted'}">${score} of ${P.LAND_CHECKS.length} checks</span></div>
        </a>`;
      }).join('') : `<div class="empty big">${icon('land')}<p>Add each piece of land you find. Track the price, acres, and whether it has road access, power, water and the right zoning for several cabins.</p><button class="btn primary" data-act="land-new">Add a property</button></div>`}`;
  }
  const stars = (n) => [1, 2, 3, 4, 5].map((i) => `<i class="${i <= (n || 0) ? 'on' : ''}">${icon('star')}</i>`).join('');

  function viewLandOne(id) {
    const l = S.find('land', id);
    if (!l) return viewLand();
    const ppa = l.price && l.acres ? money(l.price / l.acres) : '–';
    const perCabin = l.price && S.db.cabins.length ? money(l.price / S.db.cabins.length) : '–';
    return `<a href="#/land" class="back">${icon('left')} Land</a>
      ${head(l.name, esc([l.place, l.added && 'Added ' + u.relDay(l.added)].filter(Boolean).join(' · ')), `<button class="icon-btn" data-act="land-edit" data-id="${l.id}" aria-label="Edit">${icon('pen')}</button>`)}
      <div class="seg status-seg" role="group" aria-label="Status">${P.LAND_STATUS.map(([k, n]) => `<label><input type="radio" name="st" value="${k}" ${l.status === k ? 'checked' : ''} data-act="land-status" data-id="${l.id}"><span>${n}</span></label>`).join('')}</div>
      <section class="stats">
        <div class="card stat"><b>${l.price ? money(l.price) : '–'}</b><span>asking price</span></div>
        <div class="card stat"><b>${l.acres || '–'}</b><span>acres</span></div>
        <div class="card stat"><b>${ppa}</b><span>per acre</span></div>
        <div class="card stat"><b>${perCabin}</b><span>land cost per cabin</span></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Checklist</h2><span class="count">${S.landScore(l)} of ${P.LAND_CHECKS.length}</span></div>
        <div class="card list">${P.LAND_CHECKS.map(([k, n]) => {
          const v = l.checks[k] || '';
          return `<div class="list-row"><span>${esc(n)}</span><button class="tri ${v}" data-act="land-check" data-id="${l.id}" data-k="${k}" aria-label="${esc(n)}: ${v || 'not sure'}">${v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}</button></div>`;
        }).join('')}</div>
        <p class="muted small center">Tap to switch between Not sure, Yes and No.</p>
      </section>
      <section class="card"><div class="row"><span class="muted small">Your rating</span><span class="stars big">${[1, 2, 3, 4, 5].map((i) => `<button data-act="land-rate" data-id="${l.id}" data-v="${i}" class="${i <= (l.rating || 0) ? 'on' : ''}" aria-label="${i} stars">${icon('star')}</button>`).join('')}</span></div></section>
      ${l.notes ? `<section class="card"><p class="pre">${esc(l.notes)}</p></section>` : ''}
      ${l.url ? `<a class="btn" href="${esc(/^https?:/i.test(l.url) ? l.url : 'https://' + l.url)}" target="_blank" rel="noopener">${icon('link')} Open listing</a>` : ''}`;
  }

  function landSheet(l) {
    const isNew = !l;
    l = l || { name: '', place: '', acres: '', price: '', url: '', notes: '', status: 'watching', checks: {}, rating: 0 };
    u.sheet({
      title: isNew ? 'New property' : 'Edit property',
      submit: isNew ? 'Add property' : 'Save',
      body: `
        <label class="field"><span>Name or address</span><input name="name" value="${esc(l.name)}" ${isNew ? 'autofocus' : ''} placeholder="e.g. Bear Creek Rd, 14 acres"></label>
        <label class="field"><span>County / area</span><input name="place" value="${esc(l.place)}"></label>
        <div class="two">
          <label class="field"><span>Acres</span><input name="acres" inputmode="decimal" value="${esc(l.acres)}"></label>
          <label class="field"><span>Price</span><input name="price" inputmode="decimal" value="${l.price ? esc(l.price) : ''}" placeholder="$"></label>
        </div>
        <label class="field"><span>Listing link</span><input name="url" type="url" inputmode="url" value="${esc(l.url)}" placeholder="https://"></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="4" placeholder="Slope, views, road, neighbors, what the agent said…">${esc(l.notes)}</textarea></label>`,
      onSubmit(fd) {
        const name = (fd.get('name') || '').trim();
        if (!name) { u.toast('Give the property a name.'); return false; }
        const v = { name, place: (fd.get('place') || '').trim(), acres: num(fd.get('acres')) || '', price: num(fd.get('price')) || '', url: (fd.get('url') || '').trim(), notes: (fd.get('notes') || '').trim() };
        if (isNew) { const x = S.add('land', Object.assign(l, v, { added: u.today() })); go('#/land/' + x.id); } else { Object.assign(l, v); S.save(); render(); }
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        if (!(await u.confirm(`Delete ${l.name}?`))) return false;
        S.remove('land', l.id); go('#/land');
      } },
    });
  }

  // ================= Cabins =================
  function viewCabins() {
    const db = S.db;
    const est = db.cabins.reduce((n, c) => n + (Number(c.estimate) || 0), 0);
    const sqft = db.cabins.reduce((n, c) => n + (Number(c.sqft) || 0), 0);
    return `${head('Cabins', [u.plural(db.cabins.length, 'cabin'), sqft && sqft.toLocaleString() + ' sq ft total', est && money(est) + ' to build'].filter(Boolean).join(' · '), `<button class="btn primary sm" data-act="cabin-new">${icon('plus')} Add</button>`)}
      ${db.cabins.map((c) => {
        const d = S.stagesDone(c), sp = S.cabinSpent(c.id);
        return `<a href="#/cabins/${c.id}" class="card cabin-card">
          <div class="row"><b class="grow">${esc(c.name)}</b><span class="small muted">${d} of ${P.CABIN_STAGES.length}</span></div>
          <p class="muted small">${esc([c.style, c.sqft && c.sqft + ' sq ft', c.beds && u.plural(Number(c.beds), 'bed'), c.baths && c.baths + ' bath'].filter(Boolean).join(' · ') || 'Tap to add size and style')}</p>
          ${bar(d / P.CABIN_STAGES.length)}
          <div class="row small"><span class="ink">${esc(S.cabinStage(c))}</span><span class="muted">${c.estimate ? `${money(sp)} of ${money(c.estimate)}` : sp ? money(sp) + ' spent' : ''}</span></div>
        </a>`;
      }).join('') || `<div class="empty big">${icon('cabins')}<p>Add the cabins you plan to build.</p><button class="btn primary" data-act="cabin-new">Add a cabin</button></div>`}`;
  }

  function viewCabin(id) {
    const c = S.find('cabins', id);
    if (!c) return viewCabins();
    const sp = S.cabinSpent(c.id);
    const ex = S.db.expenses.filter((e) => e.cabin === c.id).sort((a, b) => b.date.localeCompare(a.date));
    const nextI = P.CABIN_STAGES.findIndex((_, i) => !c.stages[i]);
    return `<a href="#/cabins" class="back">${icon('left')} Cabins</a>
      ${head(c.name, esc([c.style, c.sqft && c.sqft + ' sq ft', c.beds && u.plural(Number(c.beds), 'bedroom'), c.baths && u.plural(Number(c.baths), 'bath')].filter(Boolean).join(' · ')), `<button class="icon-btn" data-act="cabin-edit" data-id="${c.id}" aria-label="Edit">${icon('pen')}</button>`)}
      <section class="stats">
        <div class="card stat"><b>${pct(S.stagesDone(c) / P.CABIN_STAGES.length)}</b><span>built · ${esc(S.cabinStage(c))}</span></div>
        <div class="card stat"><b>${money(sp)}</b><span>${c.estimate ? 'spent of ' + money(c.estimate) : 'spent'}</span>${c.estimate ? bar(sp / c.estimate, 'thin' + (sp > c.estimate ? ' over' : '')) : ''}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Build stages</h2></div>
        <div class="card list"><ul class="tasks">${P.CABIN_STAGES.map((n, i) => `<li class="task ${c.stages[i] ? 'done' : ''} ${i === nextI ? 'next' : ''}">
          <button class="tick-sm" data-act="stage" data-id="${c.id}" data-i="${i}" aria-label="${esc(n)}">${icon('check')}</button>
          <button class="task-title" data-act="stage" data-id="${c.id}" data-i="${i}"><span>${esc(n)}</span>${c.stages[i] ? `<small>${u.fmt(c.stages[i], { month: 'short', day: 'numeric', year: 'numeric' })}</small>` : i === nextI ? '<small class="ink">Next</small>' : ''}</button>
        </li>`).join('')}</ul></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Costs for this cabin</h2><button class="count link" data-act="expense-new" data-cabin="${c.id}" data-cat="build">${icon('plus', 'sm')} Add</button></div>
        ${ex.length ? `<div class="card list">${ex.map(expenseRow).join('')}</div>` : '<div class="empty slim">Nothing spent on this cabin yet.</div>'}
      </section>
      ${c.notes ? `<section class="card"><p class="pre">${esc(c.notes)}</p></section>` : ''}`;
  }

  function cabinSheet(c) {
    const isNew = !c;
    c = c || S.newCabin('Cabin ' + (S.db.cabins.length + 1));
    u.sheet({
      title: isNew ? 'New cabin' : 'Edit cabin',
      submit: isNew ? 'Add cabin' : 'Save',
      body: `
        <label class="field"><span>Name</span><input name="name" value="${esc(c.name)}"></label>
        <label class="field"><span>Style or plan</span><input name="style" value="${esc(c.style)}" placeholder="e.g. A-frame, kit cabin, modern"></label>
        <div class="chips">${['A-frame', 'Log cabin', 'Modern cabin', 'Tiny home', 'Barndominium', 'Prefab'].map((x) => `<button type="button" data-chip="${x}">${x}</button>`).join('')}</div>
        <div class="three">
          <label class="field"><span>Sq ft</span><input name="sqft" inputmode="numeric" value="${esc(c.sqft)}"></label>
          <label class="field"><span>Beds</span><input name="beds" inputmode="numeric" value="${esc(c.beds)}"></label>
          <label class="field"><span>Baths</span><input name="baths" inputmode="decimal" value="${esc(c.baths)}"></label>
        </div>
        <label class="field"><span>Estimated cost to build</span><input name="estimate" inputmode="decimal" value="${c.estimate ? esc(c.estimate) : ''}" placeholder="$"></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="4" placeholder="Layout ideas, features, builder quotes…">${esc(c.notes)}</textarea></label>`,
      onMount(form) { form.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => { form.style.value = b.dataset.chip; })); },
      onSubmit(fd) {
        const v = { name: (fd.get('name') || '').trim() || c.name, style: (fd.get('style') || '').trim(), sqft: num(fd.get('sqft')) || '', beds: num(fd.get('beds')) || '', baths: num(fd.get('baths')) || '', estimate: num(fd.get('estimate')), notes: (fd.get('notes') || '').trim() };
        Object.assign(c, v);
        if (isNew) { S.db.cabins.push(c); S.save(); go('#/cabins/' + c.id); } else { S.save(); render(); }
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        if (!(await u.confirm(`Delete ${c.name}? Its costs stay in Money.`))) return false;
        S.remove('cabins', c.id); S.db.expenses.forEach((e) => { if (e.cabin === c.id) e.cabin = ''; }); S.save(); go('#/cabins');
      } },
    });
  }

  // ================= Money =================
  function expenseRow(e) {
    const c = e.cabin && S.find('cabins', e.cabin);
    return `<button class="list-row" data-act="expense-edit" data-id="${e.id}"><span class="grow"><span class="block">${esc(e.title)}</span><small class="muted">${esc([u.relDay(e.date), catName(e.cat), c && c.name].filter(Boolean).join(' · '))}</small></span><b>${money(e.amount)}</b></button>`;
  }

  function viewMoney() {
    const db = S.db;
    const est = S.estimateTotal(), sp = S.spent();
    const cabinEst = db.cabins.reduce((n, c) => n + (Number(c.estimate) || 0), 0);
    const recent = db.expenses.slice().sort((a, b) => b.date.localeCompare(a.date) || 0);
    const over = est && sp > est;
    return `${head('Money', 'Your budget and everything you spend.', `<button class="btn primary sm" data-act="expense-new">${icon('plus')} Expense</button>`)}
      <section class="card money-sum">
        <div class="row"><div><p class="muted small">Spent so far</p><b class="big-pct">${money(sp)}</b></div><div class="right"><p class="muted small">Budget</p><b class="mid">${est ? money(est) : '–'}</b></div></div>
        ${est ? bar(sp / est, over ? 'over' : '') : ''}
        <p class="small ${over ? 'overdue' : 'muted'}">${est ? (over ? `${money(sp - est)} over budget` : `${money(est - sp)} left`) : 'Tap a line below to set your estimate.'}</p>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Budget</h2><span class="count">Tap a line to set it</span></div>
        <div class="card list">${P.BUDGET.map(([k, n]) => {
          const e = Number(db.budget[k]) || 0, s = S.spent(k);
          return `<button class="list-row budget-row" data-act="budget" data-k="${k}">
            <span class="grow"><span class="block">${esc(n)}</span>${e ? bar(s / e, 'thin' + (s > e ? ' over' : '')) : ''}${k === 'build' && cabinEst ? `<small class="muted">Cabin estimates add up to ${money(cabinEst)}</small>` : ''}</span>
            <span class="amt"><b>${money(s)}</b><small class="muted">${e ? 'of ' + money(e) : 'no estimate'}</small></span>
          </button>`;
        }).join('')}</div>
      </section>
      ${L.lenders.moneyCard()}
      <section class="sec">
        <div class="sec-head"><h2>Expenses</h2><span class="count">${db.expenses.length}</span></div>
        ${recent.length ? `<div class="card list">${recent.map(expenseRow).join('')}</div>` : '<div class="empty slim">Log every cost as you go: tests, fees, deposits, materials. It adds up fast.</div>'}
      </section>
      ${db.expenses.length ? `<button class="btn ghost sm center-btn" data-act="csv">Export expenses (CSV)</button>` : ''}`;
  }

  function budgetSheet(k) {
    u.sheet({
      title: catName(k),
      submit: 'Save',
      body: `<label class="field"><span>Estimate</span><input name="v" inputmode="decimal" value="${S.db.budget[k] ? esc(S.db.budget[k]) : ''}" placeholder="$" autofocus></label>
        <p class="muted small">Spent so far: <b>${money(S.spent(k))}</b></p>`,
      onSubmit(fd) { S.db.budget[k] = num(fd.get('v')); S.save(); render(); },
    });
  }

  function expenseSheet(e, preset = {}) {
    const isNew = !e;
    e = e || { title: '', amount: '', date: u.today(), cat: preset.cat || 'tests', cabin: preset.cabin || '' };
    u.sheet({
      title: isNew ? 'New expense' : 'Expense',
      submit: isNew ? 'Add expense' : 'Save',
      body: `
        <label class="field"><span>What for</span><input name="title" value="${esc(e.title)}" ${isNew ? 'autofocus' : ''} placeholder="e.g. Perc test"></label>
        <div class="two">
          <label class="field"><span>Amount</span><input name="amount" inputmode="decimal" value="${e.amount ? esc(e.amount) : ''}" placeholder="$"></label>
          <label class="field"><span>Date</span><input name="date" type="date" value="${esc(e.date)}"></label>
        </div>
        <label class="field"><span>Budget line</span><select name="cat">${P.BUDGET.map(([k, n]) => `<option value="${k}" ${k === e.cat ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="field"><span>For a cabin <em>(optional)</em></span><select name="cabin"><option value="">Whole property</option>${S.db.cabins.map((c) => `<option value="${c.id}" ${c.id === e.cabin ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`,
      onSubmit(fd) {
        const title = (fd.get('title') || '').trim(), amount = num(fd.get('amount'));
        if (!title || !amount) { u.toast('Add what it was for and the amount.'); return false; }
        const v = { title, amount, date: fd.get('date') || u.today(), cat: fd.get('cat'), cabin: fd.get('cabin') || '' };
        if (isNew) S.add('expenses', v); else { Object.assign(e, v); S.save(); }
        render();
        if (isNew) u.toast(`${money(amount)} added`);
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        const r = S.remove('expenses', e.id); render();
        u.toast('Expense deleted', { label: 'Undo', run: () => { S.restore('expenses', r); render(); } });
      } },
    });
  }

  // ================= Team =================
  function personSheet(p) {
    const isNew = !p;
    p = p || { role: '', name: '', phone: '', email: '', notes: '' };
    u.sheet({
      title: isNew ? 'Add someone' : (p.name || p.role),
      submit: isNew ? 'Add' : 'Save',
      body: `
        <label class="field"><span>Role</span><input name="role" value="${esc(p.role)}" placeholder="e.g. Surveyor"></label>
        <div class="chips">${P.ROLES.map((r) => `<button type="button" data-chip="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <label class="field"><span>Name or company</span><input name="name" value="${esc(p.name)}"></label>
        <div class="two">
          <label class="field"><span>Phone</span><input name="phone" type="tel" value="${esc(p.phone)}"></label>
          <label class="field"><span>Email</span><input name="email" type="email" value="${esc(p.email)}"></label>
        </div>
        <label class="field"><span>Notes</span><input name="notes" value="${esc(p.notes)}" placeholder="Quote, what they said…"></label>`,
      onMount(form) { form.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => { form.role.value = b.dataset.chip; form.name.focus(); })); },
      onSubmit(fd) {
        const v = Object.fromEntries(['role', 'name', 'phone', 'email', 'notes'].map((k) => [k, (fd.get(k) || '').trim()]));
        if (!v.role && !v.name) { u.toast('Add a role or a name.'); return false; }
        if (isNew) S.add('team', v); else { Object.assign(p, v); S.save(); }
        render();
      },
      danger: isNew ? null : { label: 'Remove', run: async () => { const r = S.remove('team', p.id); render(); u.toast('Removed', { label: 'Undo', run: () => { S.restore('team', r); render(); } }); } },
    });
  }

  // ================= Settings =================
  function viewSettings() {
    const s = S.db.settings, th = s.theme;
    return `<a href="#/plan" class="back">${icon('left')} Plan</a>
      ${head('Settings')}
      <section class="card sec">
        <div class="row"><span><b class="block">${esc(S.db.project.name)}</b><small class="muted">${S.db.project.landBy ? 'Land by ' + u.fmt(S.db.project.landBy, { month: 'short', year: 'numeric' }) : 'No target dates'}</small></span><button class="btn sm" data-act="project">Edit</button></div>
      </section>
      <section class="card sec">
        <h2>Look</h2>
        <div class="seg">${[['', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${th === v ? 'checked' : ''} data-act="theme"><span>${l}</span></label>`).join('')}</div>
      </section>
      <section class="card sec">
        <h2>Your data</h2>
        <p class="muted small">${S.mode === 'live' ? 'Saved to your Claude account. It syncs between your phone and computer when you open this page from either one. A backup file is still a good idea now and then.' : 'Everything is saved on this phone, in this browser only. Save a backup now and then.'}${s.lastBackup ? ` Last backup: ${u.relDay(s.lastBackup.slice(0, 10))}.` : ''}</p>
        <div class="actions"><button class="btn primary sm" data-act="backup">Save backup</button><button class="btn sm" data-act="restore">Restore backup</button></div>
      </section>
      ${installEvent ? `<section class="card sec"><h2>Home screen</h2><button class="btn sm" data-act="install">Add to home screen</button></section>` : ''}
      <section class="card sec">
        <h2>Start over</h2>
        <div class="actions"><button class="btn sm" data-act="sample">Load sample data</button><button class="btn sm danger" data-act="erase">Erase everything</button></div>
        <p class="muted small">Erasing brings back the starting step list with nothing checked off.</p>
      </section>`;
  }

  function projectSheet() {
    const p = S.db.project;
    u.sheet({
      title: 'Project',
      body: `
        <label class="field"><span>Project name</span><input name="name" value="${esc(p.name)}"></label>
        <div class="two">
          <label class="field"><span>Buy land by</span><input name="landBy" type="date" value="${esc(p.landBy)}"></label>
          <label class="field"><span>Cabins open by</span><input name="openBy" type="date" value="${esc(p.openBy)}"></label>
        </div>`,
      onSubmit(fd) { p.name = (fd.get('name') || '').trim() || 'Cabin Project'; p.landBy = fd.get('landBy') || ''; p.openBy = fd.get('openBy') || ''; S.save(); render(); },
    });
  }

  // ================= Actions =================
  const act = {
    'step-tick'(el) { const s = S.find('steps', el.dataset.id); const done = S.toggleStep(s); render(); if (done && S.phaseProgress(s.phase).pct === 1) u.toast(`${phaseName(s.phase)}: phase complete!`); },
    'step-edit'(el) { stepSheet(S.find('steps', el.dataset.id)); },
    'step-new'(el) { stepSheet(null, el.dataset.phase); },
    'land-new'() { landSheet(); },
    'land-edit'(el) { landSheet(S.find('land', el.dataset.id)); },
    'land-status'(el) { const l = S.find('land', el.dataset.id); l.status = el.value; S.save(); render(); },
    'land-check'(el) { const l = S.find('land', el.dataset.id), k = el.dataset.k; const nx = { '': 'yes', yes: 'no', no: '' }[l.checks[k] || '']; if (nx) l.checks[k] = nx; else delete l.checks[k]; S.save(); render(); },
    'land-rate'(el) { const l = S.find('land', el.dataset.id), v = Number(el.dataset.v); l.rating = l.rating === v ? 0 : v; S.save(); render(); },
    'cabin-new'() { cabinSheet(); },
    'cabin-edit'(el) { cabinSheet(S.find('cabins', el.dataset.id)); },
    stage(el) { S.toggleStage(S.find('cabins', el.dataset.id), Number(el.dataset.i)); render(); },
    budget(el) { budgetSheet(el.dataset.k); },
    'expense-new'(el) { expenseSheet(null, { cabin: el.dataset.cabin, cat: el.dataset.cat }); },
    'expense-edit'(el) { expenseSheet(S.find('expenses', el.dataset.id)); },
    'person-new'() { personSheet(); },
    'person-edit'(el) { personSheet(S.find('team', el.dataset.id)); },
    project() { projectSheet(); },
    theme(el) { S.db.settings.theme = el.value; S.save(); applyTheme(); },
    csv() {
      const q = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
      const rows = [['Date', 'What', 'Amount', 'Budget line', 'Cabin']].concat(S.db.expenses.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.title, e.amount, catName(e.cat), (S.find('cabins', e.cabin) || {}).name || '']));
      u.download('cabin-expenses.csv', rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
    },
    async backup() { if (await u.download(`cabins-backup-${u.today()}.json`, S.exportJSON(), 'application/json')) { render(); u.toast('Backup saved'); } },
    start() { S.startPlan(); render(); u.toast('Your plan is ready'); },
    restore() {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (!(await u.confirm('Replace everything on this phone with the backup?', 'Restore'))) return;
        try { S.importJSON(await f.text()); applyTheme(); render(); u.toast('Backup restored'); } catch (e) { u.toast(e.message || 'Could not read that file.'); }
      };
      inp.click();
    },
    async install() { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; render(); },
    async sample() { if (!(await u.confirm('Replace everything with sample data?', 'Load sample'))) return; S.loadSample(); openPhases = null; go('#/plan'); },
    async erase() { if (!(await u.confirm('Erase everything: steps, land, cabins, budget, expenses and team? This can’t be undone.', 'Erase'))) return; S.reset(); openPhases = null; applyTheme(); go('#/plan'); },
  };

  Object.assign(act, L.lenders.acts);
  main.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !main.contains(el) || !act[el.dataset.act]) return;
    if (el.tagName !== 'INPUT') e.preventDefault();
    act[el.dataset.act](el);
  });
  // Remember which phases are open on the Steps tab.
  main.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.phase || !openPhases) return;
    if (d.open) openPhases.add(d.dataset.phase); else openPhases.delete(d.dataset.phase);
  }, true);

  // ================= Shell =================
  let route = /^#\//.test(location.hash) ? location.hash : '#/plan';
  function go(path) {
    route = path;
    try { if (!L.DEMO) history.pushState(null, '', path); } catch (e) { /* address can't change here; fine */ }
    render();
  }
  window.addEventListener('popstate', () => { route = /^#\//.test(location.hash) ? location.hash : '#/plan'; render(); });

  L.app = { render: () => render(), go: (p) => go(p) };
  const TABS = [['plan', 'Plan'], ['steps', 'Steps'], ['land', 'Land'], ['cabins', 'Cabins'], ['money', 'Money']];

  function render() {
    const [, view = 'plan', id] = route.split('/');
    const views = {
      plan: viewPlan, steps: viewSteps, money: viewMoney, settings: viewSettings,
      land: id ? () => viewLandOne(id) : viewLand,
      cabins: id ? () => viewCabin(id) : viewCabins,
      lenders: id ? () => L.lenders.viewOne(id) : L.lenders.viewList,
    };
    const y = window.scrollY;
    main.innerHTML = !S.loaded ? viewLoading() : S.isEmpty() ? viewStart() : (S.stale ? staleNote() : '') + (views[view] || viewPlan)();
    if (render.last === route) window.scrollTo(0, y); else window.scrollTo(0, 0);
    render.last = route;
    if (view === 'lenders') L.lenders.afterRender();
    const tab = { settings: 'plan', lenders: 'money' }[view] || view;
    document.getElementById('tabbar').hidden = !S.loaded || S.isEmpty();
    document.getElementById('tabbar').innerHTML = TABS.map(([k, l]) => `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${l}</span></a>`).join('');
  }

  function viewLoading() {
    return `<div class="loading" role="status"><span class="welcome-art">${icon('cabins')}</span><p class="muted">Opening your cabin plan…</p></div>`;
  }
  function staleNote() {
    return `<p class="card notice small">Can't reach your saved plan right now, so this may be out of date. Changes you make will save when the connection comes back.</p>`;
  }
  function viewStart() {
    const n = P.PHASES.reduce((t, p) => t + p.steps.length, 0);
    return `<section class="welcome">
        <div class="welcome-art" aria-hidden="true">${icon('cabins')}</div>
        <p class="eyebrow">Land & cabins</p>
        <h1 class="display">Plan your cabins, step by step</h1>
        <p class="muted">From saving for the land to welcoming your first guests: ${n} steps in 8 phases, 4 cabins to track, and a budget. It saves to your Claude account, so it's on your phone and your computer.</p>
      </section>
      <ol class="phase-list">${P.PHASES.map((ph, i) => `<li><span class="ph-num">${i + 1}</span><span><b>${esc(ph.name)}</b><small>${u.plural(ph.steps.length, 'step')}</small></span></li>`).join('')}</ol>
      <div class="welcome-actions">
        <button class="btn primary big" data-act="start">Start my plan</button>
        <button class="link small" data-act="restore">Or restore a backup</button>
      </div>`;
  }

  function applyTheme() {
    const th = S.db.settings.theme;
    if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme;
  }

  // Page changes are handled here rather than by the browser following links, so the app also
  // works inside preview frames where changing the address isn't allowed.
  window.addEventListener('hashchange', () => { if (location.hash && location.hash !== route) { route = location.hash; render(); } });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
  let day = u.today();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && u.today() !== day) { day = u.today(); render(); } });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; if (route === '#/settings') render(); });

  L.app.applyTheme = applyTheme;
  if (L.DEMO) S.loadSample();
  applyTheme();
  const inArtifact = !!(window.claude && typeof window.claude.use === 'function');
  if (inArtifact) S.mode = 'loading', S.loaded = false;
  render();
  S.connect().then(() => { applyTheme(); render(); });
  if (!inArtifact && 'serviceWorker' in navigator && !L.DEMO && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
