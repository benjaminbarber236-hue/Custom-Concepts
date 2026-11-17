// Screens and actions. Tabs: Today, Schedule, Habits (+ Goals), Spiritual, Journal (+ Settings from the gear).
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
    const agenda = S.agenda(t);
    const nextPlan = agenda.length ? null : L.nextPlan();
    const left = overdue.length + todays.length;

    const old = !db.settings.oldImport && S.oldSummary();
    const oldEv = db.settings.oldEvents !== 'done' && db.settings.oldEvents !== 'skipped' && (S.oldSummary() || {}).events;
    const oldBits = old ? [old.tasks && plural(old.tasks, 'open to-do'), old.workouts && plural(old.workouts, 'workout'), old.events && plural(old.events, 'calendar event')].filter(Boolean) : oldEv ? [plural(oldEv, 'calendar event')] : [];
    const checks = Object.values(db.checks).reduce((s, c) => s + Object.keys(c).length, 0) + Object.keys(db.journal).length + db.entries.length;
    const lb = db.settings.lastBackup;
    const needBackup = !L.DEMO && checks > 25 && (!lb || u.daysBetween(lb.slice(0, 10), t) > 30);

    return `
      <header class="page-head today-head">
        <div><p class="eyebrow">${u.fmt(t, { weekday: 'long' })}</p><h1 class="display">${u.fmt(t, { month: 'long', day: 'numeric' })}</h1></div>
        <a href="#/settings" class="icon-btn" aria-label="Settings">${icon('gear')}</a>
      </header>

      ${oldBits.length ? `<section class="card notice">
        <p><b>Bring over your old data?</b><br>Your old Life Tracker has ${oldBits.join(', ')}. To-dos go into your plan, workouts become an Exercise habit and events go on your Schedule.</p>
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
        <div class="sec-head"><h2>Schedule</h2><button class="count link" data-act="ev-new" data-day="${t}">${icon('plus', 'sm')} Add plan</button></div>
        ${L.agendaHTML(t, agenda) || `<a class="empty slim" href="#/schedule"><p>Nothing scheduled today.${nextPlan ? ` Next: <b class="ink">${esc(nextPlan.item.title)}</b>, ${esc(u.relDay(nextPlan.day))}${nextPlan.item.time ? ' at ' + u.timeText(nextPlan.item.time) : ''}.` : ''}</p></a>`}
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
  // The Habits tab has two sides: habits and goals.
  L.habitsTab = 'habits';
  function viewHabits() {
    const goals = L.habitsTab === 'goals';
    const head = `<header class="page-head"><h1>${goals ? 'Goals' : 'Habits'}</h1><button class="btn primary sm" data-act="${goals ? 'goal-new' : 'habit-new'}">${icon('plus')} New</button></header>
      <div class="seg sp-tabs">${[['habits', 'Habits'], ['goals', 'Goals']].map(([k, l]) => `<label><input type="radio" name="h-tab" value="${k}" data-act="habits-tab" ${L.habitsTab === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
    if (goals) return head + L.goalsHTML();
    const t = u.today();
    const list = S.habits();
    const archived = S.db.habits.filter((h) => h.archived);
    const wk = L.habitWeek || 0;
    const days = Array.from({ length: 7 }, (_, i) => u.addDays(u.weekStart(t), wk * 7 + i)); // Sun–Sat
    return head + (list.length ? u.weekNav(wk, 'hweek') : '') + `
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
    const before = d < h.created; // before the habit was added (can still be filled in)
    const ahead = d > u.today();
    const on = S.isChecked(h, d);
    const due = S.isDue(h, d);
    const cls = on ? 'on' : d > u.today() ? 'ahead' : before ? 'before' : due ? 'due' : 'rest';
    const label = `${u.fmt(d, { weekday: 'long', month: 'short', day: 'numeric' })}: ${on ? 'done' : 'not done'}`;
    return `<button class="day ${cls} ${d === u.today() ? 'is-today' : ''}" data-act="check" data-id="${h.id}" data-day="${d}" ${ahead ? 'disabled' : ''} aria-label="${label}" aria-pressed="${on}">
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
        <div class="heat-wrap"><div class="heat-labels"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span></div><div class="heat">${cells.join('')}</div></div>
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
    const offset = u.dow(first);
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
      ${S.db.entries.filter((x) => x.sentToClaude).map((x) => `<button class="card notice waiting" data-act="edit-entry" data-id="${x.id}">${icon('sparkle')}<span><b>Waiting for Claude’s version</b><small>${KIND_LABEL(x)} · ${u.relDay(x.date)}${x.time ? ' ' + u.timeText(x.time) : ''}. Tap to paste it in.</small></span></button>`).join('')}
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
        <div class="cal">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<b>${x}</b>`).join('')}${cells.join('')}</div>
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

  // What gets sent to the Claude app: cleanup instructions plus the dictation.
  const CLAUDE_MARK = 'Reply with only the cleaned-up text';
  // Instructions for a Claude project (pasted once into the project's instructions).
  const PROJECT_INSTRUCTIONS = `Each message I send is a dream or journal entry I dictated with speech-to-text, often whispered right after waking up, so words may be misheard. Clean it up:
- Fix words that were clearly misheard, using the rest of the story to work out what I said.
- Add punctuation, and paragraph breaks where the scene or topic changes.
- Drop filler words ("um", "like") and false starts.
- Keep my voice, first person, and every detail I mentioned, even strange ones (in a dream they are real content, not mistakes).
- Don't add events, feelings, explanations, interpretations or a title.
- If a word can't be worked out, give your best guess followed by [?].
Reply with only the cleaned-up text so I can copy it.`;
  const projectLink = () => S.db.settings.claudeProject || '';
  // With a project, its instructions do the explaining, so only the entry is sent.
  function claudeMessage(text, e, fd) {
    if (!projectLink()) return claudePrompt(text, e.kind);
    const when = u.fmt(fd.get('date') || u.today(), { weekday: 'long', month: 'long', day: 'numeric' });
    const label = e.kind === 'dream' ? (fd.get('lucid') ? 'Lucid dream' : 'Dream') : 'Journal entry';
    return `${label}, ${when}${fd.get('time') ? ', ' + u.timeText(fd.get('time')) : ''}:\n\n${text}`;
  }
  function claudeURL(message) {
    const base = projectLink() || 'https://claude.ai/new';
    return base + (base.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(message);
  }
  function claudePrompt(text, kind) {
    const what = kind === 'dream' ? 'a dream I dictated right after waking up (speech-to-text, often whispered, so words may be misheard)' : 'a journal entry I dictated (speech-to-text, so words may be misheard)';
    return `Please clean up ${what}.
- Fix words that were clearly misheard, using the rest of the story to work out what I said.
- Add punctuation, and paragraph breaks where the scene or topic changes.
- Drop filler words ("um", "like") and false starts.
- Keep my voice, first person, and every detail I mentioned, even strange ones${kind === 'dream' ? ' (in a dream they are real content, not mistakes)' : ''}.
- Don't add events, feelings, explanations, interpretations or a title.
- If a word can't be worked out, give your best guess followed by [?].
${CLAUDE_MARK} so I can copy it.

---

${text}`;
  }

  // New or existing entry. With `mic`, dictation starts as soon as it opens.
  function entrySheet({ kind, day, entry, mic }) {
    const isNew = !entry;
    const e = entry || { kind, lucid: false, date: day || u.today(), time: nowHM(), text: '' };
    const dream = e.kind === 'dream';
    const dayMood = (S.entry(e.date) || {}).mood || 0;
    let dict = null;
    let raw = e.raw || ''; // what was dictated, kept when Claude cleans it up
    let saved = entry || null; // set once a new entry has been saved (e.g. before going to Claude)
    const fieldsFrom = (fd, text) => ({ text, date: fd.get('date') || u.today(), time: fd.get('time') || '', lucid: dream && !!fd.get('lucid'), raw: raw && raw !== text ? raw : '' });
    function persist(form, extra) {
      const fields = { ...fieldsFrom(new FormData(form), form.text.value.trim()), ...extra };
      if (saved) { Object.assign(saved, fields); S.save(); }
      else saved = S.add('entries', { kind: e.kind, created: new Date().toISOString(), ...fields });
    }
    u.sheet({
      title: isNew ? (dream ? 'Dream' : 'Journal') : KIND_LABEL(e),
      submit: 'Save',
      body: `
        <div class="when"><input type="date" name="date" value="${e.date}" max="${u.today()}" aria-label="Date"><input type="time" name="time" value="${e.time}" aria-label="Time"></div>
        ${dream ? `<label class="toggle"><input type="checkbox" name="lucid" ${e.lucid ? 'checked' : ''}><span class="sw-track"></span><span>Lucid dream <em>(you knew you were dreaming)</em></span></label>` : ''}
        <p class="kb-hint" hidden>${icon('mic')}<span>Tap the <b>mic on your keyboard</b> and speak. Whispering works.</span></p>
        <div class="dictate">
          <textarea name="text" rows="8" placeholder="${dream ? 'What happened in the dream? Places, people, feelings…' : 'What’s on your mind?'}">${esc(e.text)}</textarea>
          <button type="button" class="mic-btn" data-mic aria-label="Start dictation">${icon('mic')}</button>
        </div>
        <p class="mic-status muted small" aria-live="polite"></p>
        <div class="ai-row">
          <button type="button" class="btn sm ai-btn" data-claude>${icon('sparkle')} Copy & open Claude</button>
          <button type="button" class="btn sm" data-paste>Paste Claude’s version</button>
          <button type="button" class="btn sm ghost" data-original ${raw ? '' : 'hidden'}>Show what I said</button>
        </div>
        <p class="ai-status small" aria-live="polite"></p>
        ${u.isIOS ? '<p class="muted small">Or, right here: select the text, then <b>Writing Tools → Proofread</b> (free, built into your iPhone).</p>' : ''}
        ${!dream ? `<fieldset class="field"><legend>Mood that day <em>(optional)</em></legend><div class="mood-pick">${[1, 2, 3, 4, 5].map((i) => `<label class="mood-opt m${i}"><input type="radio" name="mood" value="${i}" ${dayMood === i ? 'checked' : ''}>${face(i)}<span>${MOODS[i]}</span></label>`).join('')}</div></fieldset>` : ''}
      `,
      danger: isNew ? null : { label: 'Delete', run: async () => { if (!(await u.confirm(`Delete this ${KIND_LABEL(e).toLowerCase()} entry?`))) return false; S.remove('entries', e.id); render(); } },
      onMount(form) {
        const btn = form.querySelector('[data-mic]');
        const status = form.querySelector('.mic-status');
        const ta = form.text;
        const hint = form.querySelector('.kb-hint');
        const useKeyboard = () => { btn.hidden = true; hint.hidden = false; ta.focus(); };
        const setState = (st) => {
          btn.classList.toggle('on', st === 'on');
          btn.setAttribute('aria-label', st === 'on' ? 'Stop dictation' : 'Start dictation');
          status.textContent = st === 'on' ? 'Listening… tap the mic again to stop.' : st === 'blocked' ? 'The microphone isn’t allowed here. Use the mic on your keyboard instead.' : st === 'failed' ? 'Voice typing stopped working here. Use the mic on your keyboard instead.' : '';
          if (st === 'blocked' || st === 'failed') useKeyboard();
        };
        dict = u.dictation(ta, setState);
        // Keep the text box in view above the keyboard.
        ta.addEventListener('focus', () => setTimeout(() => ta.scrollIntoView({ block: 'nearest' }), 300));
        btn.onclick = () => { if (dict.on) dict.stop(); else dict.start(); };
        if (!dict) { btn.hidden = true; hint.hidden = false; }
        if (mic && dict) dict.start();
        // Focus right away (inside the tap) so the iPhone keyboard opens, ready for its mic.
        else if (isNew || mic) ta.focus();

        // Free cleanup with the Claude app: share the text with instructions, then paste the answer back.
        const claudeBtn = form.querySelector('[data-claude]');
        const pasteBtn = form.querySelector('[data-paste]');
        const origBtn = form.querySelector('[data-original]');
        const aiStatus = form.querySelector('.ai-status');
        let showingClean = true, cleaned = '', lastSent = '';
        const say = (msg) => { aiStatus.textContent = msg; aiStatus.scrollIntoView({ block: 'nearest' }); };
        claudeBtn.onclick = async () => {
          const text = ta.value.trim();
          if (!text) return say('Say or type something first.');
          if (dict && dict.on) dict.stop();
          // Save first: iOS may close the app while you're in Claude, and nothing should be lost.
          persist(form, { sentToClaude: true });
          pasteBtn.hidden = false;
          const prompt = claudeMessage(text, e, new FormData(form));
          lastSent = prompt;
          ta.blur();
          // Copy and open Claude in the same tap (no share sheet, so it can't go to a contact by
          // mistake). The link also pre-fills the chat; if it doesn't, the copy is ready to paste.
          const copied = u.copyText(prompt);
          window.open(claudeURL(prompt), '_blank', 'noopener');
          const where = projectLink() ? 'your Claude project' : 'Claude';
          say((await copied)
            ? `Copied and opening ${where}. If the chat is empty, paste it there. Send, copy Claude’s reply, then come back and tap “Paste Claude’s version”.`
            : 'Opening Claude. Send the message, copy Claude’s reply, then come back and tap “Paste Claude’s version”.');
        };
        pasteBtn.onclick = async () => {
          let got = '';
          try { got = (await navigator.clipboard.readText()).trim(); } catch (err) { /* not allowed here */ }
          if (!got) { ta.focus(); ta.select(); return say('Press and hold in the box, then tap Paste to replace the text with Claude’s version.'); }
          if (got.includes(CLAUDE_MARK) || (lastSent && got === lastSent.trim())) return say('That’s still the request, not Claude’s answer. In Claude, copy the reply, then try again.');
          const current = ta.value.trim();
          if (!raw || current !== cleaned) raw = current; // keep what you said as the original
          cleaned = got; ta.value = got; showingClean = true;
          origBtn.hidden = false; origBtn.textContent = 'Show what I said';
          persist(form, { sentToClaude: false });
          say('Claude’s version is in. Check it, then Save.');
        };
        origBtn.onclick = () => {
          if (showingClean) { cleaned = ta.value; ta.value = raw; origBtn.textContent = 'Show cleaned-up version'; say('This is what you said. Saving now keeps this version.'); }
          else { ta.value = cleaned; origBtn.textContent = 'Show what I said'; aiStatus.textContent = ''; }
          showingClean = !showingClean;
        };
      },
      onClose() { if (dict) dict.stop(); if (saved && !entry) render(); },
      onSubmit(fd) {
        if (dict) dict.stop();
        const text = (fd.get('text') || '').trim();
        if (!text) { u.toast(isNew ? 'Nothing to save yet.' : 'Write something, or delete the entry.'); return false; }
        const fields = { ...fieldsFrom(fd, text), sentToClaude: false };
        if (saved) { Object.assign(saved, fields); S.save(); }
        else S.add('entries', { kind: e.kind, created: new Date().toISOString(), ...fields });
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
        <div class="sec-head"><h2>Claude project</h2><span class="count ${projectLink() ? 'all' : ''}">${projectLink() ? 'Linked' : 'Not linked'}</span></div>
        <p class="muted small">“Copy & open Claude” on a dream or journal entry can open a project of yours, like “Journal”, instead of a new chat.</p>
        ${projectLink() ? `<p class="small link-shown">${esc(projectLink())}</p><div class="row wrap"><button class="btn sm" data-act="copy-instructions">${icon('copy')} Copy instructions</button><button class="btn sm ghost danger" data-act="unlink-project">Unlink</button></div>`
          : `<form class="ai-key" data-form="claude-project"><input name="url" type="url" inputmode="url" placeholder="https://claude.ai/project/…" autocomplete="off" aria-label="Claude project link"><button class="btn sm primary">Link</button></form>`}
        <ol class="muted small steps">
          <li>In Safari, go to <b>claude.ai</b>, open your <b>Journal</b> project, and copy the address from the address bar (it has <b>/project/</b> in it). Paste it here.</li>
          <li>Tap <b>Copy instructions</b> and paste them into the project’s <b>Instructions</b> in Claude. After that, the app sends just your dream, and Claude knows what to do.</li>
        </ol>
        ${projectLink() ? '' : `<button class="btn sm" data-act="copy-instructions">${icon('copy')} Copy instructions</button>`}
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
        <p class="muted small">Found ${plural(old.tasks, 'open to-do')}, ${plural(old.workouts, 'workout')} and ${plural(old.events, 'calendar event')} from the old version.${st.oldImport === 'done' && st.oldEvents === 'done' ? ' Already brought over.' : ''}</p>
        ${st.oldImport === 'done' && st.oldEvents === 'done' ? '' : `<button class="btn" data-act="old-import">Bring it over</button>`}
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
    async check(el) {
      const h = S.habit(el.dataset.id);
      const d = el.dataset.day;
      if (d > u.today()) return;
      const was = S.isChecked(h, d);
      if (!(await u.confirmDay(d, h.name, was))) return;
      if (!was && d < h.created) h.created = d; // filling in a day from before the habit was added
      const on = S.toggleCheck(h, d);
      if (on && navigator.vibrate) navigator.vibrate(8);
      render();
      if (d === u.today()) u.toast(on ? `${h.name}: done` : `${h.name}: unchecked`, { label: 'Undo', run: () => { S.toggleCheck(h, d); render(); } });
    },
    hweek(el) { L.habitWeek = Math.min(0, (L.habitWeek || 0) + Number(el.dataset.v)); render(); },
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
    async 'copy-instructions'() { u.toast((await u.copyText(PROJECT_INSTRUCTIONS)) ? 'Instructions copied. Paste them into your Claude project’s Instructions.' : 'Couldn’t copy here.'); },
    async 'unlink-project'() { if (!(await u.confirm('Unlink your Claude project? Copy & open Claude will start a new chat instead.', 'Unlink'))) return; S.db.settings.claudeProject = ''; S.save(); render(); },
    'habits-tab'(el) { L.habitsTab = el.value; render(); },
    'habit-edit': (el) => habitForm(S.habit(el.dataset.id)),
    'habit-archive'(el) { const h = S.habit(el.dataset.id); h.archived = !h.archived; S.save(); render(); u.toast(h.archived ? 'Archived. Its history is kept.' : 'Restored'); },
    async 'habit-delete'(el) {
      const h = S.habit(el.dataset.id);
      if (!(await u.confirm(`Delete “${h.name}” and all its history? Archive it instead to keep the history.`))) return;
      S.remove('habits', h.id); go('#/habits');
    },

    'old-import'() { const n = S.importOld(); render(); u.toast(n ? 'Brought over from the old app' : 'Nothing to bring over'); },
    'old-skip'() { if (S.db.settings.oldImport !== 'done') S.db.settings.oldImport = 'skipped'; if (S.db.settings.oldEvents !== 'done') S.db.settings.oldEvents = 'skipped'; S.save(); render(); u.toast('You can still bring it over from Settings.'); },

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
    async erase() { if (!(await u.confirm('Erase everything: habits, goals, plans, schedule, spiritual records, journal and dream entries on this device? This can’t be undone.', 'Erase'))) return; S.reset(); go('#/today'); render(); },
  };

  Object.assign(act, L.acts);
  main.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !main.contains(el) || !act[el.dataset.act]) return;
    if (el.tagName !== 'INPUT') e.preventDefault();
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
    } else if (f.dataset.form === 'claude-project') {
      const url = (fd.get('url') || '').trim();
      const m = url.match(/^https:\/\/claude\.ai\/project\/[\w-]+/);
      if (!m) { u.toast('That isn’t a Claude project link. It should start with https://claude.ai/project/'); return; }
      S.db.settings.claudeProject = m[0]; S.save(); render(); u.toast('Linked. Next, copy the instructions into the project.');
    } else if (L.forms && L.forms[f.dataset.form]) L.forms[f.dataset.form](fd, f);
  });

  // ================= Shell =================
  let route = /^#\//.test(location.hash) ? location.hash : '#/today';
  function go(path) {
    route = path;
    try { if (!L.DEMO) history.pushState(null, '', path); } catch (e) { /* address can't change here; fine */ }
    render();
  }
  window.addEventListener('popstate', () => { route = /^#\//.test(location.hash) ? location.hash : '#/today'; render(); });

  L.views.habitsTab = () => viewHabits();
  const TABS = [['today', 'Today'], ['schedule', 'Schedule'], ['habits', 'Habits'], ['spiritual', 'Spiritual'], ['journal', 'Journal']];
  L.app = { render: () => render(), go: (p) => go(p) };

  function render() {
    const [, view = 'today', id] = route.split('/');
    const views = { today: viewToday, schedule: L.views.schedule, habits: id ? () => viewHabit(id) : viewHabits, goals: () => L.views.goals(id), spiritual: L.views.spiritual, journal: viewJournal, settings: viewSettings };
    const y = window.scrollY;
    main.innerHTML = (views[view] || viewToday)();
    if (render.last === route) window.scrollTo(0, y); else window.scrollTo(0, 0);
    render.last = route;
    const tab = view === 'goals' ? 'habits' : view;
    document.getElementById('tabbar').innerHTML = TABS.map(([k, l]) => `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${l}</span></a>`).join('');
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
  // Updates: when a new version has downloaded and taken over, offer a one-tap refresh.
  if ('serviceWorker' in navigator && !L.DEMO && location.protocol !== 'file:') {
    const hadVersion = !!navigator.serviceWorker.controller; // first install isn't an "update"
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // Phones often resume the app instead of restarting it, so check again when it comes back.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadVersion) showUpdate(); });
  }

  function showUpdate() {
    if (document.getElementById('update-bar')) return;
    const bar = document.createElement('button');
    bar.id = 'update-bar';
    bar.type = 'button';
    bar.innerHTML = `${icon('sparkle')}<span><b>Updated</b> · tap to refresh</span>`;
    bar.onclick = () => location.reload();
    document.body.appendChild(bar);
  }
  L.app.showUpdate = showUpdate;
})();
