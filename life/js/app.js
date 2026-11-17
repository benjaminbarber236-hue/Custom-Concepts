// Screens and actions. Four tabs: Today, Habits, Goals, Journal (+ Settings from the gear).
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;
  const main = document.getElementById('main');
  const MOODS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
  const ENERGY = ['', 'Drained', 'Low', 'Steady', 'Good', 'Charged'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let journalMonth = u.today().slice(0, 7);
  let installEvent = null;

  const face = (m) => {
    const c = (m - 3) * 2.2;
    return `<svg class="face" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><circle class="f" cx="8.6" cy="10" r="1.2"/><circle class="f" cx="15.4" cy="10" r="1.2"/><path d="M8 15.2 Q12 ${15.2 + c} 16 15.2"/></svg>`;
  };
  const pct = (x) => Math.round(x * 100) + '%';
  const num = (n) => (Math.round(n * 10) / 10).toLocaleString();
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ================= Today =================
  function viewToday() {
    const t = u.today();
    const db = S.db;
    const habits = S.habits().filter((h) => S.isDue(h, t));
    const doneH = habits.filter((h) => S.isChecked(h, t)).length;
    const e = S.entry(t) || {};
    const open = db.tasks.filter((x) => !x.done);
    const overdue = open.filter((x) => x.date && x.date < t).sort((a, b) => a.date.localeCompare(b.date));
    const todays = open.filter((x) => x.date === t);
    const doneToday = db.tasks.filter((x) => x.done && x.doneOn === t);
    const later = open.filter((x) => !x.date || x.date > t).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const goals = db.goals.filter((g) => !g.done).slice(0, 3);
    const left = overdue.length + todays.length;

    const old = !db.settings.oldImport && S.oldSummary();
    const oldBits = old ? [old.tasks && plural(old.tasks, 'open to-do'), old.workouts && plural(old.workouts, 'workout')].filter(Boolean) : [];
    const checks = Object.values(db.checks).reduce((s, c) => s + Object.keys(c).length, 0) + Object.keys(db.journal).length;
    const lb = db.settings.lastBackup;
    const needBackup = !L.DEMO && checks > 25 && (!lb || u.daysBetween(lb.slice(0, 10), t) > 30);

    return `
      <header class="page-head today-head">
        <div><p class="eyebrow">${u.fmt(t, { weekday: 'long' })}</p><h1 class="display">${u.fmt(t, { month: 'long', day: 'numeric' })}</h1></div>
        <a href="#/settings" class="icon-btn" aria-label="Settings">${icon('gear')}</a>
      </header>

      ${oldBits.length ? `<section class="card notice">
        <p><b>Bring over your old data?</b><br>Your old Life Tracker has ${oldBits.join(' and ')}. To-dos go into your plan; workouts become an Exercise habit.</p>
        <div class="row"><button class="btn primary sm" data-act="old-import">Bring it over</button><button class="btn ghost sm" data-act="old-skip">Not now</button></div>
      </section>` : ''}

      <section class="card checkin">
        <h2>How are you today?</h2>
        <div class="moods">${[1, 2, 3, 4, 5].map((i) => `<button class="mood m${i} ${e.mood === i ? 'on' : ''}" data-act="mood" data-v="${i}" aria-pressed="${e.mood === i}">${face(i)}<span>${MOODS[i]}</span></button>`).join('')}</div>
        <button class="link note-link" data-act="entry" data-day="${t}">${e.note ? `“${esc(e.note.length > 90 ? e.note.slice(0, 90) + '…' : e.note)}”` : (e.mood ? 'Add a few lines about today' : 'Or write a few lines')}</button>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Habits</h2>${habits.length ? `<span class="count ${doneH === habits.length ? 'all' : ''}">${doneH} of ${habits.length}</span>` : ''}</div>
        ${habits.length ? `<div class="hlist">${habits.map((h) => habitRow(h, t)).join('')}</div>`
          : `<div class="empty"><p>${S.habits().length ? 'Nothing scheduled today.' : 'Small things you want to do regularly.'}</p><button class="btn sm" data-act="habit-new">${icon('plus')} Add a habit</button></div>`}
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Plan</h2>${left ? `<span class="count">${left} left</span>` : (doneToday.length ? '<span class="count all">All done</span>' : '')}</div>
        <form class="quick" data-form="quick"><input name="title" placeholder="Add something for today" autocomplete="off" enterkeyhint="done" aria-label="New plan item"><button class="icon-btn" aria-label="Add">${icon('plus')}</button></form>
        <ul class="tasks">
          ${overdue.map((x) => taskRow(x, `from ${u.relDay(x.date)}`)).join('')}
          ${todays.map((x) => taskRow(x)).join('')}
          ${doneToday.map((x) => taskRow(x)).join('')}
        </ul>
        ${later.length ? `<details class="later"><summary>Coming up · ${later.length}</summary><ul class="tasks">${later.map((x) => taskRow(x, x.date ? u.relDay(x.date) : 'Someday')).join('')}</ul></details>` : ''}
      </section>

      ${goals.length ? `<section class="sec">
        <div class="sec-head"><h2>Goals</h2><a href="#/goals" class="count">See all</a></div>
        <div class="card list">${goals.map((g) => { const p = S.progress(g); return `<a class="goal-mini" href="#/goals/${g.id}"><div class="row"><span>${esc(g.title)}</span><span class="muted">${pct(p.pct)}</span></div><div class="bar"><i style="width:${pct(p.pct)}"></i></div></a>`; }).join('')}</div>
      </section>` : ''}

      ${needBackup ? `<p class="footnote"><a href="#/settings">It’s been a while since your last backup. Save one in Settings.</a></p>` : ''}
    `;
  }

  function habitRow(h, t) {
    const on = S.isChecked(h, t);
    const s = S.streak(h);
    let sub;
    if (h.schedule === 'weekly') sub = `${S.weekCount(h, u.weekStart(t))} of ${h.perWeek} this week`;
    else sub = s ? `${icon('flame', 'sm')} ${plural(s, 'day')}` : u.esc(S.scheduleText(h));
    return `<button class="habit-row ${on ? 'on' : ''}" data-act="check" data-id="${h.id}" data-day="${t}" aria-pressed="${on}">
      <span class="hname">${esc(h.name)}<small>${sub}</small></span><span class="tick">${icon('check')}</span></button>`;
  }

  function taskRow(x, tag) {
    return `<li class="task ${x.done ? 'done' : ''} ${tag && tag.startsWith('from') ? 'late' : ''}">
      <button class="tick-sm" data-act="task-toggle" data-id="${x.id}" aria-label="${x.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button>
      <button class="task-title" data-act="task-edit" data-id="${x.id}">${esc(x.title)}${tag ? `<small>${esc(tag)}</small>` : ''}</button></li>`;
  }

  // ================= Habits =================
  function viewHabits() {
    const t = u.today();
    const list = S.habits();
    const archived = S.db.habits.filter((h) => h.archived);
    const days = Array.from({ length: 7 }, (_, i) => u.addDays(t, i - 6));
    return `
      <header class="page-head"><h1>Habits</h1><button class="btn primary sm" data-act="habit-new">${icon('plus')} New</button></header>
      ${list.length ? list.map((h) => {
        const s = S.streak(h);
        return `<article class="card hcard">
          <a href="#/habits/${h.id}" class="hcard-top">
            <div><h3>${esc(h.name)}</h3><p class="muted">${esc(S.scheduleText(h))}</p></div>
            <div class="streak ${s ? 'hot' : ''}"><b>${s}</b><small>${h.schedule === 'weekly' ? (s === 1 ? 'week' : 'weeks') : (s === 1 ? 'day' : 'days')}</small></div>
          </a>
          <div class="week">${days.map((d) => dayCell(h, d)).join('')}</div>
        </article>`;
      }).join('') : `<div class="empty big"><p>Habits are the small things you want to do regularly, like reading, prayer, exercise or drinking water.</p><button class="btn primary" data-act="habit-new">${icon('plus')} Add your first habit</button></div>`}
      ${archived.length ? `<details class="later"><summary>Archived · ${archived.length}</summary><div class="card list">${archived.map((h) => `<a class="list-row" href="#/habits/${h.id}">${esc(h.name)}<span class="muted">${icon('right')}</span></a>`).join('')}</div></details>` : ''}
    `;
  }

  function dayCell(h, d) {
    const before = d < h.created;
    const on = S.isChecked(h, d);
    const due = S.isDue(h, d);
    const cls = on ? 'on' : before ? 'before' : due ? 'due' : 'rest';
    const label = `${u.fmt(d, { weekday: 'long', month: 'short', day: 'numeric' })}: ${on ? 'done' : 'not done'}`;
    return `<button class="day ${cls} ${d === u.today() ? 'is-today' : ''}" data-act="check" data-id="${h.id}" data-day="${d}" ${before ? 'disabled' : ''} aria-label="${label}" aria-pressed="${on}">
      <span class="dl">${DOW[u.dow(d)].slice(0, 1)}</span><span class="dc">${on ? icon('check') : ''}</span></button>`;
  }

  function viewHabit(id) {
    const h = S.habit(id);
    if (!h) return notFound('#/habits');
    const t = u.today();
    const r = S.rate(h);
    const unit = h.schedule === 'weekly' ? 'weeks' : 'days';
    const start = u.addDays(u.weekStart(t), -7 * 19);
    const cells = [];
    for (let d = start; d <= u.addDays(u.weekStart(t), 6); d = u.addDays(d, 1)) {
      if (d > t) { cells.push('<i class="hm future"></i>'); continue; }
      const on = S.isChecked(h, d);
      const cls = on ? 'on' : d < h.created ? 'before' : S.isDue(h, d) ? 'miss' : 'rest';
      cells.push(`<i class="hm ${cls}" title="${u.fmt(d, { month: 'short', day: 'numeric' })}"></i>`);
    }
    const total = Object.keys(S.db.checks[h.id] || {}).length;
    return `
      <a href="#/habits" class="back">${icon('left')} Habits</a>
      <header class="page-head"><div><h1>${esc(h.name)}</h1><p class="muted">${esc(S.scheduleText(h))} · since ${u.fmt(h.created, { month: 'short', day: 'numeric', year: 'numeric' })}${h.archived ? ' · archived' : ''}</p></div></header>
      <div class="stats">
        <div class="card stat"><b>${S.streak(h)}</b><span>Current streak (${unit})</span></div>
        <div class="card stat"><b>${S.best(h)}</b><span>Best streak (${unit})</span></div>
        <div class="card stat"><b>${r == null ? '–' : pct(r)}</b><span>${h.schedule === 'weekly' ? 'Of target, last 4 weeks' : 'Done, last 30 days'}</span></div>
        <div class="card stat"><b>${total}</b><span>Times done</span></div>
      </div>
      <section class="card">
        <div class="sec-head"><h2>Last 20 weeks</h2></div>
        <div class="heat-wrap"><div class="heat-labels"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span></div><div class="heat">${cells.join('')}</div></div>
        <p class="muted small">Tap the days on the Habits tab to fill in anything you missed.</p>
      </section>
      <div class="actions">
        <button class="btn" data-act="habit-edit" data-id="${h.id}">Edit</button>
        <button class="btn" data-act="habit-archive" data-id="${h.id}">${h.archived ? 'Restore' : 'Archive'}</button>
        <button class="btn ghost danger" data-act="habit-delete" data-id="${h.id}">Delete</button>
      </div>
    `;
  }

  function habitForm(h) {
    const isNew = !h;
    h = h || { name: '', schedule: 'daily', days: [1, 2, 3, 4, 5], perWeek: 3 };
    u.sheet({
      title: isNew ? 'New habit' : 'Edit habit',
      submit: isNew ? 'Add habit' : 'Save',
      body: `
        <label class="field"><span>Name</span><input name="name" value="${esc(h.name)}" placeholder="Read 20 minutes" required autofocus autocomplete="off"></label>
        <fieldset class="field"><legend>How often</legend>
          <div class="seg">${[['daily', 'Every day'], ['days', 'Certain days'], ['weekly', 'Times a week']].map(([v, l]) => `<label><input type="radio" name="schedule" value="${v}" ${h.schedule === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="field" data-show="days"><legend>On these days</legend>
          <div class="dow-pick">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="days" value="${d}" ${(h.days || []).includes(d) ? 'checked' : ''}><span>${DOW[d].slice(0, 2)}</span></label>`).join('')}</div>
        </fieldset>
        <label class="field" data-show="weekly"><span>Times per week</span><input name="perWeek" type="number" inputmode="numeric" min="1" max="7" value="${h.perWeek || 3}"></label>
      `,
      onMount(form) {
        const sync = () => { const v = form.schedule.value; form.querySelectorAll('[data-show]').forEach((el) => (el.hidden = el.dataset.show !== v)); };
        form.addEventListener('change', sync); sync();
      },
      onSubmit(fd) {
        const name = (fd.get('name') || '').trim();
        if (!name) { u.toast('Give the habit a name.'); return false; }
        const schedule = fd.get('schedule');
        const days = fd.getAll('days').map(Number);
        if (schedule === 'days' && !days.length) { u.toast('Pick at least one day.'); return false; }
        const perWeek = Math.max(1, Math.min(7, Number(fd.get('perWeek')) || 3));
        if (isNew) S.add('habits', { name, schedule, days, perWeek, created: u.today(), archived: false });
        else { Object.assign(h, { name, schedule, days, perWeek }); S.save(); }
        render();
      },
    });
  }

  // ================= Goals =================
  function goalCard(g) {
    const p = S.progress(g);
    const pc = S.pace(g);
    const left = g.due ? u.daysBetween(u.today(), g.due) : null;
    const amount = g.kind === 'steps' ? `${p.have} of ${p.want} steps` : `${num(p.have)} of ${num(p.want)} ${esc(g.unit)}`;
    const when = g.done ? `Done ${u.relDay(g.doneOn)}` : g.due ? (left < 0 ? `${plural(-left, 'day')} past due` : left === 0 ? 'Due today' : `${plural(left, 'day')} left`) : '';
    return `<a class="card gcard ${g.done ? 'is-done' : ''}" href="#/goals/${g.id}">
      <div class="row"><h3>${esc(g.title)}</h3><b class="gpct">${pct(p.pct)}</b></div>
      <div class="bar"><i style="width:${pct(p.pct)}"></i></div>
      <div class="row muted small"><span>${amount}</span><span>${when}${pc ? ` · <span class="pace ${pc}">${{ ahead: 'Ahead', on: 'On track', behind: 'Behind' }[pc]}</span>` : ''}</span></div>
    </a>`;
  }

  function viewGoals() {
    const active = S.db.goals.filter((g) => !g.done);
    const done = S.db.goals.filter((g) => g.done);
    return `
      <header class="page-head"><h1>Goals</h1><button class="btn primary sm" data-act="goal-new">${icon('plus')} New</button></header>
      ${active.length ? active.map(goalCard).join('') : `<div class="empty big"><p>Something bigger you’re working toward, like a number to reach (run 100 miles, read 12 books) or a set of steps (plan a trip).</p><button class="btn primary" data-act="goal-new">${icon('plus')} Set a goal</button></div>`}
      ${done.length ? `<details class="later"><summary>Completed · ${done.length}</summary>${done.map(goalCard).join('')}</details>` : ''}
    `;
  }

  function viewGoal(id) {
    const g = S.goal(id);
    if (!g) return notFound('#/goals');
    const p = S.progress(g);
    const t = u.today();
    let body;
    if (g.kind === 'steps') {
      body = `<section class="card">
        <div class="sec-head"><h2>Steps</h2><span class="count">${p.have} of ${p.want}</span></div>
        <ul class="tasks">${g.steps.map((s) => `<li class="task ${s.done ? 'done' : ''}"><button class="tick-sm" data-act="step-toggle" data-id="${g.id}" data-step="${s.id}" aria-label="${s.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button><span class="task-title">${esc(s.title)}</span><button class="icon-btn sm" data-act="step-delete" data-id="${g.id}" data-step="${s.id}" aria-label="Remove step">${icon('x')}</button></li>`).join('')}</ul>
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
      ${log.length ? `<section class="card"><div class="sec-head"><h2>History</h2></div><div class="list">${log.map((l) => `<div class="list-row"><span>${u.relDay(l.date)}</span><span class="row"><b>+${num(l.amount)}</b> <button class="icon-btn sm" data-act="log-delete" data-id="${g.id}" data-log="${l.id}" aria-label="Remove entry">${icon('x')}</button></span></div>`).join('')}</div></section>` : ''}`;
    }
    return `
      <a href="#/goals" class="back">${icon('left')} Goals</a>
      ${goalCard(g).replace('<a class="card gcard', '<div class="card gcard big').replace(/<\/a>$/, '</div>').replace(/href="[^"]*"/, '')}
      ${g.why ? `<p class="why">${esc(g.why)}</p>` : ''}
      ${body}
      <div class="actions">
        <button class="btn" data-act="goal-done" data-id="${g.id}">${g.done ? 'Reopen' : 'Mark complete'}</button>
        <button class="btn" data-act="goal-edit" data-id="${g.id}">Edit</button>
        <button class="btn ghost danger" data-act="goal-delete" data-id="${g.id}">Delete</button>
      </div>
    `;
  }

  function goalForm(g) {
    const isNew = !g;
    g = g || { title: '', why: '', kind: 'count', target: '', unit: '', due: '' };
    u.sheet({
      title: isNew ? 'New goal' : 'Edit goal',
      submit: isNew ? 'Add goal' : 'Save',
      body: `
        <label class="field"><span>Goal</span><input name="title" value="${esc(g.title)}" placeholder="Run 100 miles" required autofocus autocomplete="off"></label>
        ${isNew ? `<fieldset class="field"><legend>Track it by</legend>
          <div class="seg"><label><input type="radio" name="kind" value="count" checked><span>A number</span></label><label><input type="radio" name="kind" value="steps"><span>Steps</span></label></div>
        </fieldset>` : ''}
        <div class="two" data-show="count" ${g.kind === 'steps' ? 'hidden' : ''}>
          <label class="field"><span>Target</span><input name="target" type="number" step="any" inputmode="decimal" min="0" value="${esc(g.target)}" placeholder="100"></label>
          <label class="field"><span>Unit</span><input name="unit" value="${esc(g.unit)}" placeholder="miles" autocomplete="off"></label>
        </div>
        ${isNew ? `<label class="field" data-show="steps" hidden><span>Steps, one per line</span><textarea name="steps" rows="4" placeholder="Pick a date&#10;Book the place&#10;Send invitations"></textarea></label>` : ''}
        <label class="field"><span>Finish by <em>(optional)</em></span><input name="due" type="date" value="${esc(g.due || '')}"></label>
        <label class="field"><span>Why it matters <em>(optional)</em></span><textarea name="why" rows="2" placeholder="A line to keep you going">${esc(g.why)}</textarea></label>
      `,
      onMount(form) {
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
          route = '#/goals/' + ng.id; go(route);
        } else { Object.assign(g, fields); S.save(); }
        render();
      },
    });
  }

  // ================= Journal =================
  function viewJournal() {
    const t = u.today();
    const [y, m] = journalMonth.split('-').map(Number);
    const first = `${journalMonth}-01`;
    const daysIn = new Date(y, m, 0).getDate();
    const offset = (u.dow(first) + 6) % 7;
    const cells = Array.from({ length: offset }, () => '<span></span>');
    const entries = [];
    for (let i = 1; i <= daysIn; i++) {
      const d = `${journalMonth}-${String(i).padStart(2, '0')}`;
      const e = S.entry(d);
      if (e) entries.push([d, e]);
      cells.push(`<button class="cal-day ${e && e.mood ? 'm' + e.mood : ''} ${e ? 'has' : ''} ${d === t ? 'is-today' : ''}" data-act="entry" data-day="${d}" ${d > t ? 'disabled' : ''} aria-label="${u.fmt(d, { month: 'long', day: 'numeric' })}${e && e.mood ? ': ' + MOODS[e.mood] : ''}">${i}${e && e.note ? '<i></i>' : ''}</button>`);
    }
    const moods = entries.filter(([, e]) => e.mood);
    const avg = moods.length ? moods.reduce((s, [, e]) => s + e.mood, 0) / moods.length : 0;
    const canNext = journalMonth < t.slice(0, 7);
    entries.reverse();
    return `
      <header class="page-head"><h1>Journal</h1><button class="btn primary sm" data-act="entry" data-day="${t}">${S.entry(t) ? 'Today’s entry' : `${icon('plus')} Today`}</button></header>
      <section class="card">
        <div class="month-nav">
          <button class="icon-btn" data-act="month" data-v="-1" aria-label="Previous month">${icon('left')}</button>
          <h2>${new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button class="icon-btn" data-act="month" data-v="1" aria-label="Next month" ${canNext ? '' : 'disabled'}>${icon('right')}</button>
        </div>
        <div class="cal"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b>${cells.join('')}</div>
        <div class="legend">${[1, 2, 3, 4, 5].map((i) => `<span><i class="sw m${i}"></i>${MOODS[i]}</span>`).join('')}</div>
        ${moods.length ? `<p class="muted small center">${plural(entries.length, 'entry').replace('entrys', 'entries')} this month · average mood <b class="ink">${MOODS[Math.round(avg)]}</b></p>` : ''}
      </section>
      ${entries.map(([d, e]) => `<button class="card entry" data-act="entry" data-day="${d}">
        <div class="row"><span class="entry-date">${u.relDay(d)}<small>${u.fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })}</small></span>
        <span class="row tags">${e.mood ? `<span class="mood-tag m${e.mood}">${face(e.mood)} ${MOODS[e.mood]}</span>` : ''}${e.energy ? `<span class="muted small">Energy: ${ENERGY[e.energy]}</span>` : ''}</span></div>
        ${e.note ? `<p>${esc(e.note)}</p>` : ''}
      </button>`).join('') || `<div class="empty"><p>No entries this month yet.</p></div>`}
    `;
  }

  function entryForm(day) {
    const e = S.entry(day) || { mood: 0, energy: 0, note: '' };
    const rad = (name, val, label, extra = '') => `<label class="${name}-opt ${name === 'mood' ? 'm' + val : ''}"><input type="radio" name="${name}" value="${val}" ${e[name] === val ? 'checked' : ''}>${extra}<span>${label}</span></label>`;
    u.sheet({
      title: day === u.today() ? 'Today' : u.fmt(day, { weekday: 'long', month: 'long', day: 'numeric' }),
      body: `
        <fieldset class="field"><legend>Mood</legend><div class="mood-pick">${[1, 2, 3, 4, 5].map((i) => rad('mood', i, MOODS[i], face(i))).join('')}</div></fieldset>
        <fieldset class="field"><legend>Energy</legend><div class="seg five">${[1, 2, 3, 4, 5].map((i) => rad('energy', i, ENERGY[i])).join('')}</div></fieldset>
        <label class="field"><span>Notes</span><textarea name="note" rows="6" placeholder="What happened? What are you grateful for?" ${e.note || e.mood ? 'autofocus' : ''}>${esc(e.note)}</textarea></label>
      `,
      danger: S.entry(day) ? { label: 'Delete', run: async () => { if (!(await u.confirm('Delete this journal entry?'))) return false; S.setEntry(day, {}); render(); } } : null,
      onSubmit(fd) {
        S.setEntry(day, { mood: Number(fd.get('mood')) || 0, energy: Number(fd.get('energy')) || 0, note: (fd.get('note') || '').trim() });
        render();
      },
    });
  }

  // ================= Settings =================
  function viewSettings() {
    const st = S.db.settings;
    const old = S.oldSummary();
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `
      <a href="#/today" class="back">${icon('left')} Today</a>
      <header class="page-head"><h1>Settings</h1></header>
      <section class="card">
        <div class="sec-head"><h2>Appearance</h2></div>
        <div class="seg">${[['', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" data-act="theme" ${st.theme === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      </section>
      <section class="card">
        <div class="sec-head"><h2>Backup</h2></div>
        <p class="muted small">Everything is saved on this device only. Save a backup now and then, and use it to move to a new phone.${st.lastBackup ? ` Last backup: ${u.relDay(st.lastBackup.slice(0, 10))}.` : ''}</p>
        <div class="row wrap"><button class="btn" data-act="export">Save backup</button><button class="btn" data-act="import">Restore from backup</button></div>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </section>
      ${!standalone ? `<section class="card">
        <div class="sec-head"><h2>Add to home screen</h2></div>
        ${installEvent ? `<button class="btn primary" data-act="install">Install the app</button>` : `<p class="muted small">${ios ? 'In Safari, tap the Share button, then <b>Add to Home Screen</b>.' : 'In Chrome, tap ⋮ then <b>Install app</b> (or <b>Add to Home screen</b>).'} It then opens full screen and works offline.</p>`}
      </section>` : ''}
      ${old ? `<section class="card">
        <div class="sec-head"><h2>Old Life Tracker</h2></div>
        <p class="muted small">Found ${plural(old.tasks, 'open to-do')} and ${plural(old.workouts, 'workout')} from the old version.${st.oldImport === 'done' ? ' Already brought over.' : ''}</p>
        <button class="btn" data-act="old-import">${st.oldImport === 'done' ? 'Bring over again' : 'Bring it over'}</button>
      </section>` : ''}
      <section class="card">
        <div class="sec-head"><h2>Start over</h2></div>
        <div class="row wrap"><button class="btn" data-act="sample">Load sample data</button><button class="btn ghost danger" data-act="erase">Erase everything</button></div>
      </section>
    `;
  }

  const notFound = (back) => `<div class="empty big"><p>That isn’t here anymore.</p><a class="btn" href="${back}">Go back</a></div>`;

  // ================= Actions =================
  const act = {
    check(el) {
      const h = S.habit(el.dataset.id);
      const on = S.toggleCheck(h, el.dataset.day);
      if (on && navigator.vibrate) navigator.vibrate(8);
      render();
    },
    mood(el) {
      const t = u.today();
      const e = Object.assign({ mood: 0, energy: 0, note: '' }, S.entry(t));
      const v = Number(el.dataset.v);
      e.mood = e.mood === v ? 0 : v;
      S.setEntry(t, e);
      render();
    },
    entry: (el) => entryForm(el.dataset.day),
    month(el) {
      const [y, m] = journalMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + Number(el.dataset.v), 1);
      journalMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      render();
    },

    'task-toggle'(el) {
      const x = S.task(el.dataset.id);
      x.done = !x.done;
      x.doneOn = x.done ? u.today() : null;
      S.save();
      render();
      if (x.done) u.toast('Done', { label: 'Undo', run: () => { x.done = false; x.doneOn = null; S.save(); render(); } });
    },
    'task-edit'(el) {
      const x = S.task(el.dataset.id);
      const t = u.today();
      u.sheet({
        title: 'Plan item',
        body: `<label class="field"><span>What</span><input name="title" value="${esc(x.title)}" required autocomplete="off"></label>
          <label class="field"><span>When</span><input name="date" type="date" value="${x.date || ''}"></label>
          <div class="chips"><button type="button" data-d="${t}">Today</button><button type="button" data-d="${u.addDays(t, 1)}">Tomorrow</button><button type="button" data-d="${u.addDays(u.weekStart(t), 7)}">Next week</button><button type="button" data-d="">Someday</button></div>`,
        onMount(form) { form.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { form.date.value = b.dataset.d; })); },
        danger: { label: 'Delete', run: () => { S.remove('tasks', x.id); render(); u.toast('Deleted', { label: 'Undo', run: () => { S.db.tasks.push(x); S.save(); render(); } }); } },
        onSubmit(fd) {
          const title = (fd.get('title') || '').trim();
          if (!title) return false;
          x.title = title; x.date = fd.get('date') || null; S.save(); render();
        },
      });
    },

    'habit-new': () => habitForm(),
    'habit-edit': (el) => habitForm(S.habit(el.dataset.id)),
    'habit-archive'(el) { const h = S.habit(el.dataset.id); h.archived = !h.archived; S.save(); render(); u.toast(h.archived ? 'Archived. Its history is kept.' : 'Restored'); },
    async 'habit-delete'(el) {
      const h = S.habit(el.dataset.id);
      if (!(await u.confirm(`Delete “${h.name}” and all its history? Archive it instead to keep the history.`))) return;
      S.remove('habits', h.id); go('#/habits');
    },

    'goal-new': () => goalForm(),
    'goal-edit': (el) => goalForm(S.goal(el.dataset.id)),
    'goal-done'(el) {
      const g = S.goal(el.dataset.id);
      g.done = !g.done; g.doneOn = g.done ? u.today() : null; S.save(); render();
      if (g.done) u.toast('Goal complete. Well done!');
    },
    async 'goal-delete'(el) {
      const g = S.goal(el.dataset.id);
      if (!(await u.confirm(`Delete the goal “${g.title}”?`))) return;
      S.remove('goals', g.id); go('#/goals');
    },
    'step-toggle'(el) { const g = S.goal(el.dataset.id); const s = g.steps.find((x) => x.id === el.dataset.step); s.done = !s.done; S.save(); render(); },
    'step-delete'(el) { const g = S.goal(el.dataset.id); g.steps = g.steps.filter((x) => x.id !== el.dataset.step); S.save(); render(); },
    'log-delete'(el) { const g = S.goal(el.dataset.id); g.log = g.log.filter((x) => x.id !== el.dataset.log); S.save(); render(); },

    'old-import'() { const n = S.importOld(); render(); u.toast(n ? 'Brought over from the old app' : 'Nothing to bring over'); },
    'old-skip'() { S.db.settings.oldImport = 'skipped'; S.save(); render(); u.toast('You can still bring it over from Settings.'); },

    theme(el) { S.db.settings.theme = el.value; S.save(); applyTheme(); },
    export() {
      const blob = new Blob([S.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `life-backup-${u.today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      render();
    },
    import() {
      const inp = document.getElementById('import-file');
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        if (!(await u.confirm('Replace everything on this device with this backup?', 'Restore'))) return;
        try { S.importJSON(await f.text()); render(); u.toast('Backup restored'); } catch (e) { u.toast(e.message || 'Could not read that file.'); }
      };
      inp.click();
    },
    async install() { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; render(); },
    async sample() { if (!(await u.confirm('Replace everything with sample data?', 'Load sample'))) return; S.loadSample(); go('#/today'); render(); },
    async erase() { if (!(await u.confirm('Erase all habits, goals, plans and journal entries on this device? This can’t be undone.', 'Erase'))) return; S.reset(); go('#/today'); render(); },
  };

  main.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !main.contains(el) || !act[el.dataset.act]) return;
    if (el.dataset.act !== 'theme') e.preventDefault();
    act[el.dataset.act](el);
  });

  main.addEventListener('submit', (e) => {
    const f = e.target;
    e.preventDefault();
    const fd = new FormData(f);
    if (f.dataset.form === 'quick') {
      const title = (fd.get('title') || '').trim();
      if (!title) return;
      S.add('tasks', { title, date: u.today(), done: false, doneOn: null });
      render();
      main.querySelector('[data-form="quick"] input').focus();
    } else if (f.dataset.form === 'step') {
      const title = (fd.get('title') || '').trim();
      if (!title) return;
      S.goal(f.dataset.id).steps.push({ id: S.uid(), title, done: false });
      S.save(); render();
      main.querySelector('[data-form="step"] input').focus();
    } else if (f.dataset.form === 'log') {
      const amount = Number(fd.get('amount'));
      if (!amount) return;
      const g = S.goal(f.dataset.id);
      g.log.push({ id: S.uid(), date: fd.get('date') || u.today(), amount });
      S.save(); render();
      const p = S.progress(g);
      if (p.pct >= 1 && !g.done) u.toast('You hit your target!', { label: 'Mark complete', run: () => { g.done = true; g.doneOn = u.today(); S.save(); render(); } });
    }
  });

  // ================= Shell =================
  let route = /^#\//.test(location.hash) ? location.hash : '#/today';
  function go(path) {
    route = path;
    try { if (!L.DEMO) history.pushState(null, '', path); } catch (e) { /* address can't change here; fine */ }
    render();
  }
  window.addEventListener('popstate', () => { route = /^#\//.test(location.hash) ? location.hash : '#/today'; render(); });

  const TABS = [['today', 'Today'], ['habits', 'Habits'], ['goals', 'Goals'], ['journal', 'Journal']];

  function render() {
    const [, view = 'today', id] = route.split('/');
    const views = { today: viewToday, habits: id ? () => viewHabit(id) : viewHabits, goals: id ? () => viewGoal(id) : viewGoals, journal: viewJournal, settings: viewSettings };
    const y = window.scrollY;
    main.innerHTML = (views[view] || viewToday)();
    if (render.last === route) window.scrollTo(0, y); else window.scrollTo(0, 0);
    render.last = route;
    document.getElementById('tabbar').innerHTML = TABS.map(([k, l]) => `<a href="#/${k}" class="${view === k ? 'on' : ''}" ${view === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${l}</span></a>`).join('');
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
  // Re-render when the app comes back after midnight so "today" is right.
  let day = u.today();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && u.today() !== day) { day = u.today(); journalMonth = day.slice(0, 7); render(); } });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; if (route === '#/settings') render(); });

  if (L.DEMO) S.loadSample();
  applyTheme();
  render();
  if ('serviceWorker' in navigator && !L.DEMO && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
