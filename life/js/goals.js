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

  // ---------- Repeating goals ----------
  // A number goal can start over every week, month or year (run 15 miles a month).
  const PERIOD_NAME = { week: 'week', month: 'month', year: 'year' };
  const repeating = (g) => g.kind === 'count' && !!PERIOD_NAME[g.repeat];
  function periodOf(rep, day) {
    if (rep === 'week') { const s = u.weekStart(day); return [s, u.addDays(s, 6)]; }
    if (rep === 'month') { const [y, m] = day.split('-').map(Number); return [day.slice(0, 7) + '-01', u.key(new Date(y, m, 0))]; }
    return [day.slice(0, 4) + '-01-01', day.slice(0, 4) + '-12-31'];
  }
  // The stretch of time that currently counts: this period for repeating goals, else start to finish date.
  function span(g) {
    if (!repeating(g)) return { start: g.created, due: g.due };
    const [s, e] = periodOf(g.repeat, u.today());
    return { start: s < g.created ? g.created : s, due: e };
  }
  const sumBetween = (g, a, b) => g.log.filter((l) => l.date >= a && l.date <= b).reduce((n, l) => n + (Number(l.amount) || 0), 0);
  function periodLabel(rep, start) {
    if (rep === 'week') return 'Week of ' + u.fmt(start, { month: 'short', day: 'numeric' });
    if (rep === 'month') return u.fmt(start, { month: 'long', year: start.slice(0, 4) === u.today().slice(0, 4) ? undefined : 'numeric' });
    return start.slice(0, 4);
  }
  // Earlier periods, newest first: { label, have, met }.
  function pastPeriods(g, max = 12) {
    const out = [];
    let [s] = periodOf(g.repeat, u.today());
    for (let i = 0; i < max; i++) {
      const prevEnd = u.addDays(s, -1);
      if (prevEnd < g.created) break;
      [s] = periodOf(g.repeat, prevEnd);
      const have = sumBetween(g, s, prevEnd);
      out.push({ label: periodLabel(g.repeat, s), have, met: have >= g.target });
    }
    return out;
  }

  // ---------- Progress math ----------
  function progress(g) {
    if (g.kind === 'steps') { const n = g.steps.length; const d = g.steps.filter((s) => s.done).length; return { have: d, want: n, pct: n ? d / n : 0 }; }
    const have = repeating(g) ? sumBetween(g, span(g).start, span(g).due) : g.log.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    return { have, want: g.target, pct: g.target ? Math.min(1, have / g.target) : 0 };
  }

  // 'ahead' | 'on' | 'behind' | null: progress compared with the share of time used up.
  function pace(g) {
    const { start, due } = span(g);
    if (!due || g.done) return null;
    const total = u.daysBetween(start, due) + (repeating(g) ? 1 : 0);
    if (total <= 0) return null;
    const used = Math.min(1, Math.max(0, u.daysBetween(start, u.today()) / total));
    const p = progress(g).pct;
    if (p >= used + 0.1) return 'ahead';
    if (p >= used - 0.05) return 'on';
    return 'behind';
  }

  // For number goals with a finish date: how much a week keeps you on time.
  function perWeek(g) {
    const due = span(g).due;
    if (g.kind !== 'count' || !due || g.done) return null;
    const p = progress(g);
    const left = g.target - p.have;
    const days = u.daysBetween(u.today(), due) + 1;
    if (left <= 0 || days <= 0) return null;
    return left / Math.max(1, days / 7);
  }
  L.goalProgress = progress;

  function card(g, big) {
    const p = progress(g);
    const pc = pace(g);
    const due = span(g).due;
    const left = due ? u.daysBetween(u.today(), due) : null;
    const per = repeating(g) ? ` this ${PERIOD_NAME[g.repeat]}` : '';
    const amount = g.kind === 'steps' ? `${p.have} of ${p.want} steps` : `${num(p.have)} of ${num(p.want)} ${esc(g.unit)}${per}`;
    const when = g.done ? `Done ${u.relDay(g.doneOn)}` : repeating(g) ? (left === 0 ? 'Last day' : `${u.plural(left, 'day')} left`) : due ? (left < 0 ? `${u.plural(-left, 'day')} past due` : left === 0 ? 'Due today' : `${u.plural(left, 'day')} left`) : '';
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
      ${repeating(g) && pastPeriods(g).length ? `<section class="card"><div class="sec-head"><h2>Past ${PERIOD_NAME[g.repeat]}s</h2><span class="count">${pastPeriods(g).filter((x) => x.met).length} of ${pastPeriods(g).length} reached</span></div><div class="list">${pastPeriods(g).map((x) => `<div class="list-row"><span>${esc(x.label)}</span><span class="row"><span class="${x.met ? 'met' : 'muted'}">${num(x.have)} of ${num(g.target)}</span>${x.met ? `<span class="met">${icon('check')}</span>` : ''}</span></div>`).join('')}</div></section>` : ''}
      ${log.length ? `<section class="card"><div class="sec-head"><h2>History</h2></div><div class="list">${log.map((l) => `<button class="list-row" data-act="log-edit" data-id="${g.id}" data-log="${l.id}"><span>${u.relDay(l.date)}</span><span class="row"><b>+${num(l.amount)}</b><span class="muted edit-hint">${icon('right')}</span></span></button>`).join('')}</div></section>` : ''}`;
    }
    return `
      <a href="#/habits" class="back" data-goals-back>${icon('left')} Goals</a>
      ${card(g, true)}
      ${g.why ? `<p class="why">${esc(g.why)}</p>` : ''}
      ${body}
      <div class="actions">
        ${repeating(g) ? '' : `<button class="btn" data-act="goal-done" data-id="${g.id}">${g.done ? 'Reopen' : 'Mark complete'}</button>`}
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
        <fieldset class="field" data-show="count" ${g.kind === 'steps' ? 'hidden' : ''}><legend>Starts over</legend>
          <div class="seg">${[['', 'Never'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']].map(([v, l]) => `<label><input type="radio" name="repeat" value="${v}" ${(g.repeat || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        </fieldset>
        ${isNew ? `<label class="field" data-show="steps" hidden><span>Steps, one per line</span><textarea name="steps" rows="4" placeholder="Pick a date&#10;Book the place&#10;Send invitations"></textarea></label>` : ''}
        <label class="field" data-due-row><span>Finish by <em>(optional)</em></span><input name="due" type="date" value="${esc(g.due || '')}"></label>
        <div class="chips" data-due-row><button type="button" data-due="${yearEnd}">This year</button><button type="button" data-due="${monthEnd}">This month</button><button type="button" data-due="${u.addDays(t, 90)}">In 3 months</button><button type="button" data-due="">No date</button></div>
        <label class="field"><span>Why it matters <em>(optional)</em></span><textarea name="why" rows="2" placeholder="A line to keep you going">${esc(g.why)}</textarea></label>
      `,
      onMount(form) {
        form.querySelectorAll('[data-due]').forEach((b) => (b.onclick = () => { form.due.value = b.dataset.due; }));
        const sync = () => {
          const kind = isNew ? form.kind.value : g.kind;
          form.querySelectorAll('[data-show]').forEach((el) => (el.hidden = el.dataset.show !== kind));
          // A goal that starts over has no single finish date.
          const rep = kind === 'count' && form.querySelector('input[name=repeat]:checked') && form.querySelector('input[name=repeat]:checked').value;
          form.querySelectorAll('[data-due-row]').forEach((el) => (el.hidden = !!rep));
        };
        form.addEventListener('change', sync); sync();
      },
      onSubmit(fd) {
        const title = (fd.get('title') || '').trim();
        if (!title) { u.toast('Give the goal a name.'); return false; }
        const kind = isNew ? fd.get('kind') : g.kind;
        const target = Number(fd.get('target'));
        if (kind === 'count' && !(target > 0)) { u.toast('Set a target number.'); return false; }
        const repeat = kind === 'count' ? fd.get('repeat') || '' : '';
        const fields = { title, why: (fd.get('why') || '').trim(), due: repeat ? null : fd.get('due') || null, target: kind === 'count' ? target : 0, unit: (fd.get('unit') || '').trim(), repeat };
        if (repeat && !isNew && g.created > periodOf(repeat, u.today())[0]) fields.created = periodOf(repeat, u.today())[0]; // count this whole period
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
      if (repeating(g) && progress(g).pct >= 1) u.toast(`Target reached for this ${PERIOD_NAME[g.repeat]}!`);
      else if (progress(g).pct >= 1 && !g.done) u.toast('You hit your target!', { label: 'Mark complete', run: () => { g.done = true; g.doneOn = u.today(); S.save(); app().render(); } });
      else u.toast(`Added ${num(amount)} ${g.unit}`);
    },
  });

  // "Goals" back link returns to the Goals side of the Habits tab.
  document.addEventListener('click', (e) => { if (e.target.closest('[data-goals-back]')) L.habitsTab = 'goals'; }, true);
})();
