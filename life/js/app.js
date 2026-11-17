// Screens and actions. Four tabs: Today, Habits, Goals, Journal (+ Settings from the gear).
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;
  const main = document.getElementById('main');
  const MOODS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let journalMonth = u.today().slice(0, 7);
  let journalDay = u.today();
  let journalFilter = 'all';
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
    const dreamsToday = S.entriesOn(t, 'dream').length;
    const notesToday = S.entriesOn(t, 'journal').length;
    const open = db.tasks.filter((x) => !x.done);
    const overdue = open.filter((x) => x.date && x.date < t).sort((a, b) => a.date.localeCompare(b.date));
    const todays = open.filter((x) => x.date === t);
    const doneToday = db.tasks.filter((x) => x.done && x.doneOn === t);
    const later = open.filter((x) => !x.date || x.date > t).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const goals = db.goals.filter((g) => !g.done).slice(0, 3);
    const left = overdue.length + todays.length;

    const old = !db.settings.oldImport && S.oldSummary();
    const oldBits = old ? [old.tasks && plural(old.tasks, 'open to-do'), old.workouts && plural(old.workouts, 'workout')].filter(Boolean) : [];
    const checks = Object.values(db.checks).reduce((s, c) => s + Object.keys(c).length, 0) + Object.keys(db.journal).length + db.entries.length;
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
        <div class="quick-rec">
          <button class="chip-btn" data-act="new-entry" data-kind="dream" data-mic="1">${icon('mic')} Dream${dreamsToday ? ` · ${dreamsToday}` : ''}</button>
          <button class="chip-btn" data-act="new-entry" data-kind="journal" data-mic="1">${icon('mic')} Journal${notesToday ? ` · ${notesToday}` : ''}</button>
        </div>
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
  const KIND_LABEL = (e) => (e.kind === 'dream' ? (e.lucid ? 'Lucid dream' : 'Dream') : 'Journal');
  const KIND_CLS = (e) => (e.kind === 'dream' ? (e.lucid ? 'lucid' : 'dream') : 'journal');
  const timeText = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const nowHM = () => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };

  function viewJournal() {
    const t = u.today();
    if (!journalDay.startsWith(journalMonth)) journalDay = journalMonth === t.slice(0, 7) ? t : `${journalMonth}-01`;
    const [y, m] = journalMonth.split('-').map(Number);
    const first = `${journalMonth}-01`;
    const daysIn = new Date(y, m, 0).getDate();
    const offset = (u.dow(first) + 6) % 7;
    const show = (e) => journalFilter === 'all' || (journalFilter === 'dream' ? e.kind === 'dream' : e.kind === 'journal');
    const cells = Array.from({ length: offset }, () => '<span></span>');
    let monthCount = 0;
    for (let i = 1; i <= daysIn; i++) {
      const d = `${journalMonth}-${String(i).padStart(2, '0')}`;
      const list = S.entriesOn(d).filter(show);
      monthCount += list.length;
      const kinds = ['journal', 'dream', 'lucid'].filter((k) => list.some((e) => KIND_CLS(e) === k));
      cells.push(`<button class="cal-day ${d === t ? 'is-today' : ''} ${d === journalDay ? 'sel' : ''}" data-act="pick-day" data-day="${d}" ${d > t ? 'disabled' : ''} aria-label="${u.fmt(d, { month: 'long', day: 'numeric' })}${kinds.length ? ': ' + kinds.join(', ') : ''}" aria-pressed="${d === journalDay}">
        <span>${i}</span><span class="marks">${kinds.map((k) => `<i class="k-${k}"></i>`).join('')}</span></button>`);
    }
    const canNext = journalMonth < t.slice(0, 7);
    const dayList = S.entriesOn(journalDay).filter(show);
    const mood = (S.entry(journalDay) || {}).mood;
    return `
      <header class="page-head"><h1>Journal</h1></header>
      <div class="rec-buttons">
        <button class="rec-btn dream" data-act="new-entry" data-kind="dream" data-mic="1">${icon('moon')}<span><b>Dream</b><small>Speak it as you wake</small></span>${icon('mic', 'mic')}</button>
        <button class="rec-btn journal" data-act="new-entry" data-kind="journal" data-mic="1">${icon('pen')}<span><b>Journal</b><small>Talk or type</small></span>${icon('mic', 'mic')}</button>
      </div>
      <section class="card">
        <div class="month-nav">
          <button class="icon-btn" data-act="month" data-v="-1" aria-label="Previous month">${icon('left')}</button>
          <h2>${new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button class="icon-btn" data-act="month" data-v="1" aria-label="Next month" ${canNext ? '' : 'disabled'}>${icon('right')}</button>
        </div>
        <div class="seg filter">${[['all', 'All'], ['journal', 'Journal'], ['dream', 'Dreams']].map(([v, l]) => `<label><input type="radio" name="jf" value="${v}" data-act="filter" ${journalFilter === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<b>${x}</b>`).join('')}${cells.join('')}</div>
        <div class="legend"><span><i class="sw k-journal"></i>Journal</span><span><i class="sw k-dream"></i>Dream</span><span><i class="sw k-lucid"></i>Lucid dream</span></div>
        <p class="muted small center">${monthCount ? `${monthCount} ${monthCount === 1 ? 'entry' : 'entries'} this month` : 'No entries this month yet'}</p>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>${journalDay === t ? 'Today' : u.fmt(journalDay, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>${mood ? `<span class="mood-tag m${mood}">${face(mood)} ${MOODS[mood]}</span>` : ''}</div>
        ${dayList.length ? dayList.map(entryCard).join('') : `<div class="empty"><p>Nothing written ${journalDay === t ? 'yet today' : 'this day'}.</p>
          <div class="row"><button class="btn sm" data-act="new-entry" data-kind="dream" data-day="${journalDay}">${icon('moon')} Add dream</button><button class="btn sm" data-act="new-entry" data-kind="journal" data-day="${journalDay}">${icon('pen')} Add entry</button></div></div>`}
      </section>
    `;
  }

  function entryCard(e) {
    return `<button class="card entry k-${KIND_CLS(e)}" data-act="edit-entry" data-id="${e.id}">
      <div class="row"><span class="kind-tag">${icon(e.kind === 'dream' ? (e.lucid ? 'sparkle' : 'moon') : 'pen')} ${KIND_LABEL(e)}</span><span class="muted small">${timeText(e.time)}</span></div>
      <p>${esc(e.text)}</p></button>`;
  }

  // New or existing entry. With `mic`, dictation starts as soon as it opens.
  function entrySheet({ kind, day, entry, mic }) {
    const isNew = !entry;
    const e = entry || { kind, lucid: false, date: day || u.today(), time: nowHM(), text: '' };
    const dream = e.kind === 'dream';
    const dayMood = (S.entry(e.date) || {}).mood || 0;
    let dict = null;
    u.sheet({
      title: isNew ? (dream ? 'Dream' : 'Journal') : KIND_LABEL(e),
      submit: 'Save',
      body: `
        <div class="when"><input type="date" name="date" value="${e.date}" max="${u.today()}" aria-label="Date"><input type="time" name="time" value="${e.time}" aria-label="Time"></div>
        ${dream ? `<label class="toggle"><input type="checkbox" name="lucid" ${e.lucid ? 'checked' : ''}><span class="sw-track"></span><span>Lucid dream <em>(you knew you were dreaming)</em></span></label>` : ''}
        <div class="dictate">
          <textarea name="text" rows="8" placeholder="${dream ? 'What happened in the dream? Places, people, feelings…' : 'What’s on your mind?'}">${esc(e.text)}</textarea>
          <button type="button" class="mic-btn" data-mic aria-label="Start dictation">${icon('mic')}</button>
        </div>
        <p class="mic-status muted small" aria-live="polite"></p>
        ${!dream ? `<fieldset class="field"><legend>Mood that day <em>(optional)</em></legend><div class="mood-pick">${[1, 2, 3, 4, 5].map((i) => `<label class="mood-opt m${i}"><input type="radio" name="mood" value="${i}" ${dayMood === i ? 'checked' : ''}>${face(i)}<span>${MOODS[i]}</span></label>`).join('')}</div></fieldset>` : ''}
      `,
      danger: isNew ? null : { label: 'Delete', run: async () => { if (!(await u.confirm(`Delete this ${KIND_LABEL(e).toLowerCase()} entry?`))) return false; S.remove('entries', e.id); render(); } },
      onMount(form) {
        const btn = form.querySelector('[data-mic]');
        const status = form.querySelector('.mic-status');
        const ta = form.text;
        const setState = (st) => {
          btn.classList.toggle('on', st === 'on');
          btn.setAttribute('aria-label', st === 'on' ? 'Stop dictation' : 'Start dictation');
          status.textContent = st === 'on' ? 'Listening… tap the mic again to stop.' : st === 'blocked' ? 'The microphone isn’t available here. Allow it in your browser settings, or tap the mic on your keyboard.' : '';
        };
        dict = u.dictation(ta, setState);
        btn.onclick = () => {
          if (!dict) { status.textContent = 'Tap the text box, then the mic on your keyboard to dictate.'; ta.focus(); return; }
          if (dict.on) dict.stop(); else dict.start();
        };
        if (mic && dict) dict.start();
        else if (isNew) setTimeout(() => ta.focus(), 60);
      },
      onClose() { if (dict) dict.stop(); },
      onSubmit(fd) {
        if (dict) dict.stop();
        const text = (fd.get('text') || '').trim();
        if (!text) { u.toast(isNew ? 'Nothing to save yet.' : 'Write something, or delete the entry.'); return false; }
        const fields = { text, date: fd.get('date') || u.today(), time: fd.get('time') || '', lucid: dream && !!fd.get('lucid') };
        if (isNew) S.add('entries', { kind: e.kind, created: new Date().toISOString(), ...fields });
        else { Object.assign(e, fields); S.save(); }
        if (!dream && fd.get('mood')) { const j = Object.assign({ mood: 0, energy: 0 }, S.entry(fields.date)); j.mood = Number(fd.get('mood')); S.setEntry(fields.date, j); }
        journalDay = fields.date; journalMonth = fields.date.slice(0, 7);
        render();
        u.toast(isNew ? `${KIND_LABEL(fields.lucid ? { kind: 'dream', lucid: true } : e)} saved` : 'Saved');
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
      const e = Object.assign({ mood: 0, energy: 0 }, S.entry(t));
      const v = Number(el.dataset.v);
      e.mood = e.mood === v ? 0 : v;
      S.setEntry(t, e);
      render();
    },
    'new-entry': (el) => entrySheet({ kind: el.dataset.kind, day: el.dataset.day, mic: !!el.dataset.mic }),
    'edit-entry': (el) => entrySheet({ entry: S.entryById(el.dataset.id) }),
    'pick-day'(el) { journalDay = el.dataset.day; render(); },
    filter(el) { journalFilter = el.value; render(); },
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
    async erase() { if (!(await u.confirm('Erase all habits, goals, plans, journal and dream entries on this device? This can’t be undone.', 'Erase'))) return; S.reset(); go('#/today'); render(); },
  };

  main.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !main.contains(el) || !act[el.dataset.act]) return;
    if (el.dataset.act !== 'theme' && el.dataset.act !== 'filter') e.preventDefault();
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
