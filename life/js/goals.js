// Goals (inside the Habits tab): a number to reach by a date (run 100 miles this year) or a set
// of steps (plan the reunion), with progress, pace and what's needed each week.
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;
  L.views = L.views || {};
  L.acts = L.acts || {};
  L.forms = L.forms || {};
  const app = () => L.app;

  const num = (n) => (Math.round(n * 10) / 10).toLocaleString();
  const pct = (x) => Math.round(x * 100) + '%';

  // ---------- Progress math ----------
  function progress(g) {
    if (g.kind === 'steps') { const n = g.steps.length; const d = g.steps.filter((s) => s.done).length; return { have: d, want: n, pct: n ? d / n : 0 }; }
    const have = g.log.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    return { have, want: g.target, pct: g.target ? Math.min(1, have / g.target) : 0 };
  }

  // 'ahead' | 'on' | 'behind' | null: progress compared with the share of time used up.
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

  // For number goals with a finish date: how much a week keeps you on time.
  function perWeek(g) {
    if (g.kind !== 'count' || !g.due || g.done) return null;
    const p = progress(g);
    const left = g.target - p.have;
    const days = u.daysBetween(u.today(), g.due) + 1;
    if (left <= 0 || days <= 0) return null;
    return left / Math.max(1, days / 7);
  }
  L.goalProgress = progress;

  function card(g, big) {
    const p = progress(g);
    const pc = pace(g);
    const left = g.due ? u.daysBetween(u.today(), g.due) : null;
    const amount = g.kind === 'steps' ? `${p.have} of ${p.want} steps` : `${num(p.have)} of ${num(p.want)} ${esc(g.unit)}`;
    const when = g.done ? `Done ${u.relDay(g.doneOn)}` : g.due ? (left < 0 ? `${u.plural(-left, 'day')} past due` : left === 0 ? 'Due today' : `${u.plural(left, 'day')} left`) : '';
    const pw = perWeek(g);
    const inner = `
      <div class="row"><h3>${esc(g.title)}</h3><b class="gpct">${pct(p.pct)}</b></div>
      <div class="bar"><i style="width:${pct(p.pct)}"></i></div>
      <div class="row muted small"><span>${amount}</span><span>${when}${pc ? ` · <span class="pace ${pc}">${{ ahead: 'Ahead', on: 'On track', behind: 'Behind' }[pc]}</span>` : ''}</span></div>
      ${pw && big ? `<p class="small need">About <b>${num(pw)} ${esc(g.unit)} a week</b> finishes it on time.</p>` : ''}`;
    return big ? `<div class="card gcard big">${inner}</div>` : `<a class="card gcard ${g.done ? 'is-done' : ''}" href="#/goals/${g.id}">${inner}</a>`;
  }

  // ---------- List (Habits tab → Goals) ----------
  L.goalsHTML = function () {
    const active = S.db.goals.filter((g) => !g.done);
    const done = S.db.goals.filter((g) => g.done);
    return `
      ${active.length ? active.map((g) => card(g)).join('') : `<div class="empty big"><p>Something bigger you’re working toward: a number to reach (run 100 miles this year, read 12 books) or a set of steps (plan a trip).</p><button class="btn primary" data-act="goal-new">${icon('plus')} Set a goal</button></div>`}
      ${done.length ? `<details class="later"><summary>Completed · ${done.length}</summary>${done.map((g) => card(g)).join('')}</details>` : ''}`;
  };

  // ---------- One goal ----------
  L.views.goals = function (id) {
    const g = S.db.goals.find((x) => x.id === id);
    if (!id || !g) { L.habitsTab = 'goals'; return L.views.habitsTab(); }
    const p = progress(g);
    const t = u.today();
    let body;
    if (g.kind === 'steps') {
      body = `<section class="card">
        <div class="sec-head"><h2>Steps</h2><span class="count">${p.have} of ${p.want}</span></div>
        <ul class="tasks">${g.steps.map((s) => `<li class="task ${s.done ? 'done' : ''}"><button class="tick-sm" data-act="step-toggle" data-id="${g.id}" data-step="${s.id}" aria-label="${s.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button><button class="task-title" data-act="step-edit" data-id="${g.id}" data-step="${s.id}">${esc(s.title)}</button></li>`).join('')}</ul>
        <form class="quick" data-form="step" data-id="${g.id}"><input name="title" placeholder="Add a step" autocomplete="off" aria-label="New step"><button class="icon-btn" aria-label="Add">${icon('plus')}</button></form>
      </section>`;
    } else {
      const log = g.log.slice().sort((a, b) => b.date.localeCompare(a.date));
      body = `<section class="card">
        <div class="sec-head"><h2>Add progress</h2></div>
        <form class="log-form" data-form="log" data-id="${g.id}">
          <input name="amount" type="number" step="any" inputmode="decimal" placeholder="0" aria-label="Amount" required>
          <span class="muted">${esc(g.unit)}</span>
          <input name="date" type="date" value="${t}" max="${t}" aria-label="Date">
          <button class="btn primary sm">Add</button>
        </form>
      </section>
      ${log.length ? `<section class="card"><div class="sec-head"><h2>History</h2></div><div class="list">${log.map((l) => `<button class="list-row" data-act="log-edit" data-id="${g.id}" data-log="${l.id}"><span>${u.relDay(l.date)}</span><span class="row"><b>+${num(l.amount)}</b><span class="muted edit-hint">${icon('right')}</span></span></button>`).join('')}</div></section>` : ''}`;
    }
    return `
      <a href="#/habits" class="back" data-goals-back>${icon('left')} Goals</a>
      ${card(g, true)}
      ${g.why ? `<p class="why">${esc(g.why)}</p>` : ''}
      ${body}
      <div class="actions">
        <button class="btn" data-act="goal-done" data-id="${g.id}">${g.done ? 'Reopen' : 'Mark complete'}</button>
        <button class="btn" data-act="goal-edit" data-id="${g.id}">Edit</button>
        <button class="btn ghost danger" data-act="goal-delete" data-id="${g.id}">Delete</button>
      </div>`;
  };

  // ---------- Add / edit ----------
  function goalForm(g) {
    const isNew = !g;
    g = g || { title: '', why: '', kind: 'count', target: '', unit: '', due: '' };
    const t = u.today();
    const yearEnd = `${t.slice(0, 4)}-12-31`;
    const [y, m] = t.split('-').map(Number);
    const monthEnd = u.key(new Date(y, m, 0));
    u.sheet({
      title: isNew ? 'New goal' : 'Edit goal',
      submit: isNew ? 'Add goal' : 'Save',
      body: `
        <label class="field"><span>Goal</span><input name="title" value="${esc(g.title)}" placeholder="Run 100 miles this year" autocomplete="off" ${isNew ? 'autofocus' : ''}></label>
        ${isNew ? `<fieldset class="field"><legend>Track it by</legend>
          <div class="seg"><label><input type="radio" name="kind" value="count" checked><span>A number</span></label><label><input type="radio" name="kind" value="steps"><span>Steps</span></label></div>
        </fieldset>` : ''}
        <div class="two" data-show="count" ${g.kind === 'steps' ? 'hidden' : ''}>
          <label class="field"><span>Target</span><input name="target" type="number" step="any" inputmode="decimal" min="0" value="${esc(g.target)}" placeholder="100"></label>
          <label class="field"><span>Unit</span><input name="unit" value="${esc(g.unit)}" placeholder="miles" autocomplete="off"></label>
        </div>
        ${isNew ? `<label class="field" data-show="steps" hidden><span>Steps, one per line</span><textarea name="steps" rows="4" placeholder="Pick a date&#10;Book the place&#10;Send invitations"></textarea></label>` : ''}
        <label class="field"><span>Finish by <em>(optional)</em></span><input name="due" type="date" value="${esc(g.due || '')}"></label>
        <div class="chips"><button type="button" data-due="${yearEnd}">This year</button><button type="button" data-due="${monthEnd}">This month</button><button type="button" data-due="${u.addDays(t, 90)}">In 3 months</button><button type="button" data-due="">No date</button></div>
        <label class="field"><span>Why it matters <em>(optional)</em></span><textarea name="why" rows="2" placeholder="A line to keep you going">${esc(g.why)}</textarea></label>
      `,
      onMount(form) {
        form.querySelectorAll('[data-due]').forEach((b) => (b.onclick = () => { form.due.value = b.dataset.due; }));
        if (!isNew) return;
        const sync = () => { const v = form.kind.value; form.querySelectorAll('[data-show]').forEach((el) => (el.hidden = el.dataset.show !== v)); };
        form.addEventListener('change', sync); sync();
      },
      onSubmit(fd) {
        const title = (fd.get('title') || '').trim();
        if (!title) { u.toast('Give the goal a name.'); return false; }
        const kind = isNew ? fd.get('kind') : g.kind;
        const target = Number(fd.get('target'));
        if (kind === 'count' && !(target > 0)) { u.toast('Set a target number.'); return false; }
        const fields = { title, why: (fd.get('why') || '').trim(), due: fd.get('due') || null, target: kind === 'count' ? target : 0, unit: (fd.get('unit') || '').trim() };
        if (isNew) {
          const steps = kind === 'steps' ? (fd.get('steps') || '').split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ id: S.uid(), title: s, done: false })) : [];
          const ng = S.add('goals', { ...fields, kind, log: [], steps, created: u.today(), done: false, doneOn: null });
          app().go('#/goals/' + ng.id);
        } else { Object.assign(g, fields); S.save(); app().render(); }
      },
    });
  }

  const goal = (id) => S.db.goals.find((x) => x.id === id);
  Object.assign(L.acts, {
    'goal-new': () => goalForm(),
    'goal-edit': (el) => goalForm(goal(el.dataset.id)),
    'goal-done'(el) {
      const g = goal(el.dataset.id);
      g.done = !g.done; g.doneOn = g.done ? u.today() : null; S.save(); app().render();
      if (g.done) u.toast('Goal complete. Well done!');
    },
    async 'goal-delete'(el) {
      const g = goal(el.dataset.id);
      if (!(await u.confirm(`Delete the goal “${g.title}”?`))) return;
      S.remove('goals', g.id); L.habitsTab = 'goals'; app().go('#/habits');
    },
    'step-toggle'(el) { const g = goal(el.dataset.id); const s = g.steps.find((x) => x.id === el.dataset.step); s.done = !s.done; S.save(); app().render(); },
    // Editing a step or a progress entry opens a sheet; Delete there asks first.
    'step-edit'(el) {
      const g = goal(el.dataset.id);
      const s = g.steps.find((x) => x.id === el.dataset.step);
      u.sheet({
        title: 'Step',
        body: `<label class="field"><span>Step</span><input name="title" value="${esc(s.title)}" autocomplete="off"></label>`,
        danger: { label: 'Delete', run: async () => { if (!(await u.confirm('Delete this step?'))) return false; g.steps = g.steps.filter((x) => x !== s); S.save(); app().render(); } },
        onSubmit(fd) { const t = (fd.get('title') || '').trim(); if (!t) return false; s.title = t; S.save(); app().render(); },
      });
    },
    'log-edit'(el) {
      const g = goal(el.dataset.id);
      const l = g.log.find((x) => x.id === el.dataset.log);
      u.sheet({
        title: 'Progress entry',
        body: `<div class="two"><label class="field"><span>Amount${g.unit ? ` (${esc(g.unit)})` : ''}</span><input name="amount" type="number" step="any" inputmode="decimal" value="${l.amount}"></label>
          <label class="field"><span>Date</span><input name="date" type="date" value="${l.date}" max="${u.today()}"></label></div>`,
        danger: { label: 'Delete', run: async () => { if (!(await u.confirm('Delete this entry?'))) return false; g.log = g.log.filter((x) => x !== l); S.save(); app().render(); } },
        onSubmit(fd) { const a = Number(fd.get('amount')); if (!a) { u.toast('Enter an amount.'); return false; } l.amount = a; l.date = fd.get('date') || l.date; S.save(); app().render(); },
      });
    },
  });

  Object.assign(L.forms, {
    step(fd, f) {
      const title = (fd.get('title') || '').trim();
      if (!title) return;
      goal(f.dataset.id).steps.push({ id: S.uid(), title, done: false });
      S.save(); app().render();
      document.querySelector('[data-form="step"] input').focus();
    },
    log(fd, f) {
      const amount = Number(fd.get('amount'));
      if (!amount) return;
      const g = goal(f.dataset.id);
      g.log.push({ id: S.uid(), date: fd.get('date') || u.today(), amount });
      S.save(); app().render();
      if (progress(g).pct >= 1 && !g.done) u.toast('You hit your target!', { label: 'Mark complete', run: () => { g.done = true; g.doneOn = u.today(); S.save(); app().render(); } });
      else u.toast(`Added ${num(amount)} ${g.unit}`);
    },
  });

  // "Goals" back link returns to the Goals side of the Habits tab.
  document.addEventListener('click', (e) => { if (e.target.closest('[data-goals-back]')) L.habitsTab = 'goals'; }, true);
})();
