// Schedule: plans with a time and place (dinner, movies, Bible study…), a month calendar,
// and the day's agenda, which also includes meetings and other Spiritual items.
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;
  L.views = L.views || {};
  L.acts = L.acts || {};
  const app = () => L.app;

  const CATS = [['social', 'Social'], ['spiritual', 'Spiritual'], ['work', 'Work'], ['personal', 'Personal']];
  const REPEATS = [['', 'Doesn’t repeat'], ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['daily', 'Every day'], ['weekdays', 'Weekdays'], ['yearly', 'Every year']];
  const SUGGEST = [['Dinner', 'social'], ['Movies', 'social'], ['Bible study', 'spiritual'], ['Hang out', 'social'], ['Family worship', 'spiritual'], ['Coffee', 'social'], ['Appointment', 'personal'], ['Work', 'work']];
  let month = u.today().slice(0, 7);
  let day = u.today();

  // ---------- Agenda rows (also used on Today) ----------
  function row(it, d) {
    const sub = [it.end && it.time ? `until ${u.timeText(it.end)}` : '', it.place, it.who].filter(Boolean).map(esc).join(' · ');
    const past = d < u.today() || (d === u.today() && it.time && it.time < u.nowHM());
    const check = it.type === 'meeting'
      ? `<button class="ag-check ${it.attended ? 'on' : ''}" data-act="meet-attend" data-key="${it.key}" data-day="${d}" aria-pressed="${it.attended}" aria-label="Attended ${esc(it.title)}">${icon('check')}<span>${it.attended ? 'Went' : 'Went?'}</span></button>`
      : it.type === 'part' ? `<span class="ag-flag ${it.prepared ? 'on' : ''}">${it.prepared ? 'Prepared' : 'Prepare'}</span>`
      : it.reminder ? `<button class="ag-check ${it.done ? 'on' : ''}" data-act="rem-done" data-id="${it.id}" aria-pressed="${it.done}" aria-label="Mark ${esc(it.title)} done">${icon('check')}<span>${it.done ? 'Done' : 'Done?'}</span></button>` : '';
    return `<div class="ag-row c-${it.cat} ${(past && it.type !== 'meeting' && !it.reminder) || it.done ? 'past' : ''} ${it.reminder ? 'is-reminder' : ''} ${it.done ? 'is-done' : ''}">
      <button class="ag-main" data-act="ag-open" data-type="${it.type}" data-id="${it.id || ''}" data-day="${d}">
        <span class="ag-time">${it.time ? u.timeText(it.time) : 'Any time'}</span>
        <span class="ag-text"><b>${it.reminder ? icon('bell', 'sm') + ' ' : ''}${esc(it.title)}${it.repeat ? ' <small class="rep" title="Repeats">↻</small>' : ''}</b>${sub ? `<small>${sub}</small>` : ''}</span>
      </button>${check}</div>`;
  }

  L.agendaHTML = (d, list) => {
    list = list || S.agenda(d);
    return list.length ? `<div class="agenda card">${list.map((it) => row(it, d)).join('')}</div>` : '';
  };

  // Next few plans after today (skips the regular weekly meetings so they don't crowd it out).
  function upcoming(days) {
    const t = u.today();
    const out = [];
    const seen = new Set(); // repeating plans: only their next date
    for (let i = 1; i <= days; i++) {
      const d = u.addDays(t, i);
      const list = S.agenda(d).filter((it) => {
        if (it.type !== 'event' && it.type !== 'part' && it.type !== 'rv') return false;
        if (!it.repeat) return true;
        if (seen.has(it.id)) return false;
        seen.add(it.id); return true;
      });
      if (list.length) out.push([d, list]);
    }
    return out;
  }
  L.nextPlan = () => { const n = upcoming(14)[0]; return n ? { day: n[0], item: n[1][0] } : null; };

  // ---------- Schedule tab ----------
  L.views.schedule = function () {
    const t = u.today();
    if (!day.startsWith(month)) day = month === t.slice(0, 7) ? t : month + '-01';
    const grid = u.monthGrid(month, (d, i) => {
      const cats = [...new Set(S.agenda(d).map((it) => it.cat))];
      return `<button class="cal-day ${d === t ? 'is-today' : ''} ${d === day ? 'sel' : ''} ${d < t ? 'before' : ''}" data-act="sched-pick" data-day="${d}" aria-pressed="${d === day}" aria-label="${u.fmt(d, { month: 'long', day: 'numeric' })}">
        <span>${i}</span><span class="marks">${CATS.filter(([c]) => cats.includes(c)).map(([c]) => `<i class="c-${c}"></i>`).join('')}</span></button>`;
    });
    const list = S.agenda(day);
    const tasks = S.db.tasks.filter((x) => x.date === day);
    const up = upcoming(21);
    return `
      <header class="page-head"><h1>Schedule</h1><span class="head-acts"><button class="btn sm" data-act="rem-new" data-day="${day >= t ? day : t}">${icon('bell')} Reminder</button><button class="btn primary sm" data-act="ev-new" data-day="${day >= t ? day : t}">${icon('plus')} Add plan</button></span></header>
      <section class="card">
        <div class="month-nav">
          <button class="icon-btn" data-act="sched-month" data-v="-1" aria-label="Previous month">${icon('left')}</button>
          <h2>${u.monthName(month)}</h2>
          <button class="icon-btn" data-act="sched-month" data-v="1" aria-label="Next month">${icon('right')}</button>
        </div>
        ${grid}
        <div class="legend">${CATS.map(([c, l]) => `<span><i class="sw c-${c}"></i>${l}</span>`).join('')}</div>
        ${month !== t.slice(0, 7) || day !== t ? `<div class="center"><button class="link small" data-act="sched-today">Back to today</button></div>` : ''}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>${day === t ? 'Today' : u.fmt(day, { weekday: 'long', month: 'long', day: 'numeric' })}</h2><span class="head-acts"><button class="count link" data-act="rem-new" data-day="${day}">${icon('bell', 'sm')} Reminder</button><button class="count link" data-act="ev-new" data-day="${day}">${icon('plus', 'sm')} Add</button></span></div>
        ${L.agendaHTML(day, list) || `<div class="empty"><p>Nothing planned${day === t ? ' today' : ''}.</p></div>`}
        ${tasks.length ? `<div class="card list"><p class="muted small list-label">To-dos</p><ul class="tasks">${tasks.map((x) => `<li class="task ${x.done ? 'done' : ''}"><button class="tick-sm" data-act="task-toggle" data-id="${x.id}" aria-label="${x.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button><button class="task-title" data-act="task-edit" data-id="${x.id}">${esc(x.title)}</button></li>`).join('')}</ul></div>` : ''}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Coming up</h2><span class="count">next 3 weeks · weekly plans shown once</span></div>
        ${up.length ? up.map(([d, l]) => `<div class="up-day"><p class="up-date">${u.relDay(d)}<small>${u.fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })}</small></p>${L.agendaHTML(d, l)}</div>`).join('') : `<div class="empty"><p>No plans yet. Add plans here.</p><button class="btn sm" data-act="ev-new">${icon('plus')} Add plan</button></div>`}
      </section>
    `;
  };

  // ---------- Add / edit a plan ----------
  function eventSheet(ev, onDay) {
    const isNew = !ev;
    const e = ev || { title: '', date: onDay || u.today(), time: '', end: '', place: '', notes: '', cat: 'social', repeat: '' };
    const occurrence = !isNew && e.repeat && onDay ? onDay : null;
    u.sheet({
      title: isNew ? 'New plan' : 'Edit plan',
      submit: isNew ? 'Add to schedule' : 'Save',
      body: `
        <label class="field"><span>What</span><input name="title" value="${esc(e.title)}" placeholder="Dinner with Sam" autocomplete="off" ${isNew ? 'autofocus' : ''}></label>
        ${isNew ? `<div class="chips">${SUGGEST.map(([t, c]) => `<button type="button" data-t="${t}" data-c="${c}">${t}</button>`).join('')}</div>` : ''}
        <fieldset class="field"><legend>Kind</legend><div class="seg cats">${CATS.map(([c, l]) => `<label class="c-${c}"><input type="radio" name="cat" value="${c}" ${e.cat === c ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <div class="two">
          <label class="field"><span>Date</span><input name="date" type="date" value="${e.date}"></label>
          <label class="field"><span>Repeats</span><select name="repeat">${REPEATS.map(([v, l]) => `<option value="${v}" ${e.repeat === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="two">
          <label class="field"><span>Starts</span><input name="time" type="time" value="${e.time}"></label>
          <label class="field"><span>Ends <em>(optional)</em></span><input name="end" type="time" value="${e.end || ''}"></label>
        </div>
        <label class="field"><span>Where <em>(optional)</em></span><input name="place" value="${esc(e.place)}" placeholder="Olive Garden on Main St" autocomplete="off"></label>
        <label class="field"><span>Notes <em>(optional)</em></span><textarea name="notes" rows="2" placeholder="Who’s coming, what to bring…">${esc(e.notes)}</textarea></label>
        ${!isNew ? `<div class="row wrap">
          <button type="button" class="btn sm" data-ics>${icon('schedule')} Add to phone calendar</button>
          ${occurrence ? `<button type="button" class="btn sm ghost" data-skip>Skip ${esc(u.relDay(occurrence))} only</button>` : ''}
        </div>` : '<p class="muted small">After saving, open it again to add it to your phone’s calendar for a reminder.</p>'}
      `,
      onMount(form) {
        form.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => {
          form.title.value = b.dataset.t;
          form.querySelector(`input[name=cat][value=${b.dataset.c}]`).checked = true;
          form.title.focus();
        }));
        const ics = form.querySelector('[data-ics]');
        if (ics) ics.onclick = () => { u.download(`${e.title.replace(/[^\w ]+/g, '').trim() || 'plan'}.ics`, u.ics(e), 'text/calendar'); u.toast('Opening in your calendar…'); };
        const skip = form.querySelector('[data-skip]');
        if (skip) skip.onclick = () => { e.skips.push(occurrence); S.save(); document.getElementById('sheet').close(); app().render(); u.toast('Skipped that date', { label: 'Undo', run: () => { e.skips = e.skips.filter((x) => x !== occurrence); S.save(); app().render(); } }); };
      },
      danger: isNew ? null : { label: 'Delete', run: async () => {
        if (!(await u.confirm(e.repeat ? `Delete “${e.title}” and all its repeats?` : `Delete “${e.title}”?`))) return false;
        S.remove('events', e.id); app().render();
      } },
      onSubmit(fd) {
        const title = (fd.get('title') || '').trim();
        if (!title) { u.toast('What’s the plan?'); return false; }
        const fields = { title, date: fd.get('date') || u.today(), time: fd.get('time') || '', end: fd.get('end') || '', place: (fd.get('place') || '').trim(), notes: (fd.get('notes') || '').trim(), cat: fd.get('cat') || 'personal', repeat: fd.get('repeat') || '' };
        if (isNew) S.add('events', { ...fields, until: '', skips: [] });
        else { Object.assign(e, fields); S.save(); }
        day = fields.date; month = day.slice(0, 7);
        app().render();
        u.toast(isNew ? `Added for ${u.relDay(fields.date)}` : 'Saved');
      },
    });
  }
  L.eventSheet = eventSheet;

  // ---------- Reminders ----------
  // A quick "remind me to…" at a time. The app can't alert by itself, so the reminder is also
  // handed to the phone's Calendar with an alert right at that time.
  function reminderSheet(r, onDay) {
    const isNew = !r;
    const t = u.today();
    const soon = () => { const n = new Date(Date.now() + 60 * 60000); return `${String(n.getHours()).padStart(2, '0')}:00`; };
    const e = r || { title: '', date: onDay || t, time: (onDay || t) === t ? soon() : '09:00', notes: '' };
    const send = (x) => { if (!x.time) return u.toast('Add a time to get an alert.'); u.download(`${x.title.replace(/[^\w ]+/g, '').trim() || 'reminder'}.ics`, u.ics({ ...x, alarm: 0 }), 'text/calendar'); };
    u.sheet({
      title: isNew ? 'New reminder' : 'Reminder',
      submit: isNew ? 'Set reminder' : 'Save',
      body: `
        <label class="field"><span>Remind me to</span><input name="title" value="${esc(e.title)}" placeholder="Call the bank about the loan" autocomplete="off" ${isNew ? 'autofocus' : ''}></label>
        <div class="two">
          <label class="field"><span>Day</span><input name="date" type="date" value="${e.date}"></label>
          <label class="field"><span>Time</span><input name="time" type="time" value="${e.time}"></label>
        </div>
        <div class="chips"><button type="button" data-rd="${t}">Today</button><button type="button" data-rd="${u.addDays(t, 1)}">Tomorrow</button><button type="button" data-rt="${soon()}">In an hour</button><button type="button" data-rt="20:00">Tonight</button></div>
        ${isNew ? `<label class="toggle plain"><input type="checkbox" name="alert" checked><span class="sw-track"></span><span>Alert on my phone <em>(adds it to your Calendar)</em></span></label>`
          : `<div class="row wrap"><button type="button" class="btn sm" data-alert>${icon('bell')} Add alert to my Calendar</button></div>`}
        <label class="field"><span>Note <em>(optional)</em></span><input name="notes" value="${esc(e.notes || '')}" autocomplete="off"></label>
      `,
      onMount(form) {
        form.querySelectorAll('[data-rd]').forEach((b) => (b.onclick = () => { form.date.value = b.dataset.rd; }));
        form.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = () => { form.time.value = b.dataset.rt; }));
        const al = form.querySelector('[data-alert]');
        if (al) al.onclick = () => send({ title: form.title.value.trim() || e.title, date: form.date.value, time: form.time.value, notes: form.notes.value });
      },
      danger: isNew ? null : { label: 'Delete', run: async () => { if (!(await u.confirm(`Delete the reminder “${e.title}”?`))) return false; S.remove('events', e.id); app().render(); } },
      onSubmit(fd, form) {
        const title = (fd.get('title') || '').trim();
        if (!title) { u.toast('What should we remind you about?'); return false; }
        const fields = { title, date: fd.get('date') || t, time: fd.get('time') || '', notes: (fd.get('notes') || '').trim() };
        if (isNew) S.add('events', { ...fields, end: '', place: '', cat: 'personal', repeat: '', until: '', skips: [], reminder: true, done: false });
        else { Object.assign(e, fields); S.save(); }
        app().render();
        if (isNew && fd.get('alert')) send(fields);
        else u.toast(isNew ? `Reminder set for ${u.relDay(fields.date)}${fields.time ? ' at ' + u.timeText(fields.time) : ''}` : 'Saved');
      },
    });
  }
  L.reminderSheet = reminderSheet;

  Object.assign(L.acts, {
    'ev-new': (el) => eventSheet(null, el.dataset.day),
    'rem-new': (el) => reminderSheet(null, el.dataset.day),
    'rem-done'(el) {
      const r = S.event(el.dataset.id);
      r.done = !r.done; S.save(); app().render();
      if (r.done) u.toast('Done', { label: 'Undo', run: () => { r.done = false; S.save(); app().render(); } });
    },
    'sched-pick'(el) { day = el.dataset.day; app().render(); },
    'sched-month'(el) { month = u.shiftMonth(month, Number(el.dataset.v)); app().render(); },
    'sched-today'() { day = u.today(); month = day.slice(0, 7); app().render(); },
    'meet-attend'(el) {
      const k = el.dataset.day + ':' + el.dataset.key;
      const a = S.db.spiritual.attended;
      if (a[k]) delete a[k]; else a[k] = 1;
      S.save(); app().render();
    },
    'ag-open'(el) {
      const { type, id } = el.dataset;
      if (type === 'event' && S.event(id) && S.event(id).reminder) reminderSheet(S.event(id));
      else if (type === 'event') eventSheet(S.event(id), el.dataset.day);
      else if (type === 'part') L.partSheet(S.sp('parts', id));
      else if (type === 'rv') L.rvSheet(S.sp('rvs', id));
      else if (type === 'fsm') { L.spTab('group'); app().go('#/spiritual'); }
      else { L.spTab('meetings'); app().go('#/spiritual'); }
    },
  });
})();
