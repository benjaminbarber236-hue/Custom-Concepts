// Spiritual tab: Meetings (times, attendance, my parts), Service (time, Bible studies, report,
// return visits), Field service group (overseer, meetings for field service, members) and
// Personal study (daily Bible reading and a study log).
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;
  L.views = L.views || {};
  L.acts = L.acts || {};
  L.forms = L.forms || {};
  const app = () => L.app;
  const sp = () => S.db.spiritual;

  const TABS = [['meetings', 'Meetings'], ['service', 'Service'], ['group', 'Group'], ['study', 'Study']];
  const PARTS = ['Bible reading', 'Starting a conversation', 'Following up', 'Making disciples', 'Explaining your beliefs', 'Talk', 'Spiritual gems', 'Treasures talk', 'Public talk', 'Reader', 'Prayer', 'Householder'];
  const TOPICS = ['Meeting prep', 'Watchtower study', 'Bible reading', 'Research', 'Book study', 'Family worship'];
  let tab = 'meetings';
  let month = u.today().slice(0, 7);
  L.spTab = (t) => { tab = t; };

  const tel = (p) => String(p || '').replace(/[^\d+]/g, '');
  const contact = (phone) => phone ? `<span class="contact"><a class="icon-btn sm" href="tel:${tel(phone)}" aria-label="Call">${icon('phone')}</a><a class="icon-btn sm txt" href="sms:${tel(phone)}" aria-label="Text">Text</a></span>` : '';
  // Next date (today or later) falling on weekday `dw`.
  const nextOn = (dw) => { let d = u.today(); while (u.dow(d) !== dw) d = u.addDays(d, 1); return d; };

  // Small form sheet from a field list.
  function formSheet({ title, fields, values = {}, onSave, onDelete, submit }) {
    u.sheet({
      title, submit: submit || 'Save',
      body: fields.map((f) => {
        const v = values[f.name] != null ? values[f.name] : (f.value != null ? f.value : '');
        const label = `<span>${esc(f.label)}${f.optional ? ' <em>(optional)</em>' : ''}</span>`;
        if (f.type === 'select') return `<label class="field">${label}<select name="${f.name}">${f.options.map(([ov, ol]) => `<option value="${ov}" ${String(v) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></label>`;
        if (f.type === 'textarea') return `<label class="field">${label}<textarea name="${f.name}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
        if (f.type === 'check') return `<label class="toggle plain"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span class="sw-track"></span><span>${esc(f.label)}</span></label>`;
        if (f.type === 'chips') return `<div class="chips" data-for="${f.for}">${f.options.map((o) => `<button type="button" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
        return `<label class="field">${label}<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.type === 'tel' ? 'inputmode="tel"' : ''} ${f.step ? `step="${f.step}"` : ''} autocomplete="off"></label>`;
      }).join(''),
      onMount(form) { form.querySelectorAll('.chips[data-for] [data-v]').forEach((b) => (b.onclick = () => { form[b.parentNode.dataset.for].value = b.dataset.v; })); },
      danger: onDelete ? { label: 'Delete', run: async () => { if (!(await u.confirm('Delete this?'))) return false; onDelete(); app().render(); } } : null,
      onSubmit(fd, form) {
        const out = {};
        fields.forEach((f) => { if (!f.name) return; out[f.name] = f.type === 'check' ? !!fd.get(f.name) : (fd.get(f.name) || '').toString().trim(); });
        if (onSave(out, form) === false) return false;
        app().render();
      },
    });
  }

  // ================= Meetings =================
  function meetings() {
    const s = sp();
    const t = u.today();
    const ws = u.weekStart(t);
    const week = ['midweek', 'weekend'].filter((k) => s.meetings[k].day >= 0).map((k) => {
      const d = u.addDays(ws, s.meetings[k].day);
      const went = !!s.attended[d + ':' + k];
      return `<div class="list-row"><span><b>${S.MEETING_NAMES[k]}</b><small class="muted block">${u.relDay(d)} · ${u.timeText(s.meetings[k].time)}</small></span>
        ${d <= t ? `<button class="ag-check ${went ? 'on' : ''}" data-act="meet-attend" data-key="${k}" data-day="${d}" aria-pressed="${went}">${icon('check')}<span>${went ? 'Went' : 'Went?'}</span></button>` : '<span class="muted small">Coming up</span>'}</div>`;
    }).join('');
    const a = S.attendance(t.slice(0, 7));
    const parts = s.parts.slice().sort((x, y) => x.date.localeCompare(y.date));
    const next = parts.filter((p) => p.date >= t);
    const past = parts.filter((p) => p.date < t).reverse();
    const mt = (k) => s.meetings[k].day < 0 ? 'None' : `${u.DOW_LONG[s.meetings[k].day]} ${u.timeText(s.meetings[k].time)}`;
    return `
      <section class="card">
        <div class="sec-head"><h2>This week</h2>${a.held ? `<span class="count">${u.monthName(t.slice(0, 7), false)}: ${a.went} of ${a.held} attended</span>` : ''}</div>
        <div class="list">${week || '<p class="muted small">Set your meeting times below.</p>'}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>My parts</h2><button class="count link" data-act="part-new">${icon('plus', 'sm')} Add part</button></div>
        ${next.length ? next.map(partCard).join('') : `<div class="empty"><p>No upcoming parts. When you get an assignment, add it here so it shows on your schedule.</p></div>`}
        ${past.length ? `<details class="later"><summary>Past parts · ${past.length}</summary>${past.map(partCard).join('')}</details>` : ''}
      </section>
      <section class="card">
        <div class="sec-head"><h2>Meeting times</h2><button class="count link" data-act="meet-times">Edit</button></div>
        <div class="list">
          <div class="list-row"><span>Midweek</span><span class="muted">${mt('midweek')}</span></div>
          <div class="list-row"><span>Weekend</span><span class="muted">${mt('weekend')}</span></div>
          ${s.meetings.place ? `<div class="list-row"><span>Where</span><span class="muted">${esc(s.meetings.place)}</span></div>` : ''}
        </div>
      </section>`;
  }

  function partCard(p) {
    return `<div class="card part ${p.prepared ? 'ready' : ''}">
      <button class="part-main" data-act="part-edit" data-id="${p.id}">
        <span class="part-date">${u.relDay(p.date)}<small>${u.fmt(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}</small></span>
        <span class="part-text"><b>${esc(p.title)}</b>${p.assistant ? `<small>with ${esc(p.assistant)}</small>` : ''}${p.notes ? `<small>${esc(p.notes)}</small>` : ''}</span>
      </button>
      <button class="ag-check ${p.prepared ? 'on' : ''}" data-act="part-ready" data-id="${p.id}" aria-pressed="${!!p.prepared}">${icon('check')}<span>${p.prepared ? 'Ready' : 'Ready?'}</span></button>
    </div>`;
  }

  L.partSheet = function (p) {
    const isNew = !p;
    const s = sp();
    formSheet({
      title: isNew ? 'New part' : 'Part',
      submit: isNew ? 'Add part' : 'Save',
      values: p || { date: s.meetings.midweek.day >= 0 ? nextOn(s.meetings.midweek.day) : u.today() },
      fields: [
        { name: 'title', label: 'Part', placeholder: 'Bible reading' },
        { type: 'chips', for: 'title', options: PARTS },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'assistant', label: 'With (assistant or householder)', optional: true, placeholder: 'Sister Lopez' },
        { name: 'notes', label: 'Notes', type: 'textarea', optional: true, placeholder: 'Study point, scripture, setting…' },
        { name: 'prepared', label: 'I’ve prepared it', type: 'check' },
      ],
      onSave(v) {
        if (!v.title) { u.toast('Which part?'); return false; }
        if (isNew) S.spAdd('parts', v); else { Object.assign(p, v); S.save(); }
      },
      onDelete: isNew ? null : () => S.spRemove('parts', p.id),
    });
  };

  // ================= Service =================
  function service() {
    const s = sp();
    const t = u.today();
    const min = S.serviceMinutes(month);
    const goal = Number(s.serviceGoal) || 0;
    const studies = s.studies[month] || 0;
    const log = s.service.filter((x) => x.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
    const rvs = s.rvs.slice().sort((a, b) => (a.next || '9999').localeCompare(b.next || '9999'));
    const isNow = month === t.slice(0, 7);
    return `
      <section class="card report">
        <div class="month-nav">
          <button class="icon-btn" data-act="svc-month" data-v="-1" aria-label="Previous month">${icon('left')}</button>
          <h2>${u.monthName(month)}</h2>
          <button class="icon-btn" data-act="svc-month" data-v="1" aria-label="Next month" ${isNow ? 'disabled' : ''}>${icon('right')}</button>
        </div>
        <div class="report-nums">
          <div><b>${min ? u.hrs(min) : '0h'}</b><span>in the ministry${goal ? ` · goal ${goal}h` : ''}</span></div>
          <div class="stepper"><button data-act="studies" data-v="-1" aria-label="One fewer Bible study">−</button><b>${studies}</b><button data-act="studies" data-v="1" aria-label="One more Bible study">+</button><span>Bible studies</span></div>
        </div>
        ${goal ? `<div class="bar"><i style="width:${Math.min(100, Math.round((min / 60 / goal) * 100))}%"></i></div>` : ''}
        <div class="row wrap"><button class="btn sm primary" data-act="svc-copy">${icon('copy')} Copy report</button><button class="btn sm" data-act="svc-goal">${goal ? 'Change goal' : 'Set hour goal'}</button></div>
      </section>
      <section class="card">
        <div class="sec-head"><h2>Log time</h2></div>
        <form class="log-form" data-form="svc">
          <input name="hours" type="number" step="0.25" min="0" inputmode="decimal" placeholder="1.5" aria-label="Hours" required>
          <span class="muted">hrs</span>
          <input name="date" type="date" value="${isNow ? t : month + '-01'}" max="${t}" aria-label="Date">
          <button class="btn primary sm">Add</button>
        </form>
        <input class="plain-input" name="svc-note" id="svc-note" placeholder="Note (optional): territory, who you worked with…" autocomplete="off">
        ${log.length ? `<div class="list">${log.map((x) => `<div class="list-row"><span>${u.relDay(x.date)}${x.notes ? `<small class="muted block">${esc(x.notes)}</small>` : ''}</span><span class="row"><b>${u.hrs(x.minutes)}</b><button class="icon-btn sm" data-act="svc-del" data-id="${x.id}" aria-label="Remove">${icon('x')}</button></span></div>`).join('')}</div>` : ''}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Return visits</h2><button class="count link" data-act="rv-new">${icon('plus', 'sm')} Add</button></div>
        ${rvs.length ? `<div class="card list">${rvs.map((r) => `<button class="list-row rv" data-act="rv-edit" data-id="${r.id}"><span><b>${esc(r.name)}</b><small class="muted block">${esc([r.where, r.notes].filter(Boolean).join(' · '))}</small></span><span class="small ${r.next && r.next < t ? 'overdue' : 'muted'}">${r.next ? 'Next: ' + u.relDay(r.next) : ''}</span></button>`).join('')}</div>`
          : `<div class="empty"><p>People to go back and see. Set a next-visit date and it shows on your schedule.</p></div>`}
      </section>`;
  }

  function reportText() {
    const s = sp();
    const min = S.serviceMinutes(month);
    const lines = [`${u.monthName(month)} field service report`, `Shared in the ministry: ${min || s.service.some((x) => x.date.startsWith(month)) ? 'Yes' : 'No'}`, `Bible studies: ${s.studies[month] || 0}`];
    if (min) lines.push(`Hours: ${Math.round((min / 60) * 100) / 100}`);
    return lines.join('\n');
  }

  L.rvSheet = function (r) {
    const isNew = !r;
    formSheet({
      title: isNew ? 'New return visit' : r.name,
      values: r || {},
      fields: [
        { name: 'name', label: 'Name', placeholder: 'Maria' },
        { name: 'where', label: 'Where', optional: true, placeholder: '123 Oak St, blue door' },
        { name: 'phone', label: 'Phone', type: 'tel', optional: true },
        { name: 'notes', label: 'Notes', type: 'textarea', optional: true, placeholder: 'What you talked about, what to bring next time…' },
        { name: 'last', label: 'Last visit', type: 'date', optional: true },
        { name: 'next', label: 'Next visit', type: 'date', optional: true },
      ],
      onSave(v) {
        if (!v.name) { u.toast('Add a name.'); return false; }
        if (isNew) S.spAdd('rvs', v); else { Object.assign(r, v); S.save(); }
      },
      onDelete: isNew ? null : () => S.spRemove('rvs', r.id),
    });
  };

  // ================= Group =================
  function group() {
    const s = sp();
    const g = s.group;
    const fsm = s.fsm.slice().sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    const members = s.members.slice().sort((a, b) => a.name.localeCompare(b.name));
    const person = (role, name, phone) => name ? `<div class="list-row"><span><small class="muted block">${role}</small><b>${esc(name)}</b></span>${contact(phone)}</div>` : '';
    return `
      <section class="card">
        <div class="sec-head"><h2>${g.name ? esc(g.name) : 'My group'}</h2><button class="count link" data-act="group-edit">Edit</button></div>
        ${g.overseer || g.assistant ? `<div class="list">${person('Group overseer', g.overseer, g.overseerPhone)}${person('Assistant', g.assistant, g.assistantPhone)}</div>` : `<p class="muted small">Add your group overseer and assistant so they’re a tap away.</p>`}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Meetings for field service</h2><button class="count link" data-act="fsm-new">${icon('plus', 'sm')} Add</button></div>
        ${fsm.length ? `<div class="card list">${fsm.map((f) => `<button class="list-row" data-act="fsm-edit" data-id="${f.id}"><span><b>${u.DOW_LONG[f.day]} ${u.timeText(f.time)}</b><small class="muted block">${esc([f.place, f.conductor].filter(Boolean).join(' · '))}</small></span><span class="muted">${icon('right')}</span></button>`).join('')}</div>`
          : `<div class="empty"><p>Add when and where your group meets for field service. They show on your schedule every week.</p></div>`}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Members</h2><button class="count link" data-act="member-new">${icon('plus', 'sm')} Add</button></div>
        ${members.length ? `<div class="card list">${members.map((m) => `<div class="list-row"><button class="member" data-act="member-edit" data-id="${m.id}">${esc(m.name)}</button>${contact(m.phone)}</div>`).join('')}</div>`
          : `<div class="empty"><p>Your group’s publishers, with phone numbers to call or text.</p></div>`}
      </section>`;
  }

  // ================= Personal study =================
  function study() {
    const s = sp();
    const t = u.today();
    const read = !!s.reading[t];
    const streak = S.readingStreak();
    const days = Array.from({ length: 7 }, (_, i) => u.addDays(t, i - 6));
    const ws = u.weekStart(t);
    const week = s.study.filter((x) => x.date >= ws);
    const recent = s.study.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    return `
      <section class="card reading">
        <button class="habit-row ${read ? 'on' : ''}" data-act="read-toggle" data-day="${t}" aria-pressed="${read}">
          <span class="hname">Daily Bible reading<small>${streak ? `${icon('flame', 'sm')} ${u.plural(streak, 'day')} in a row` : 'Tap when you’ve read today'}</small></span><span class="tick">${icon('check')}</span>
        </button>
        <div class="week">${days.map((d) => `<button class="day ${s.reading[d] ? 'on' : 'due'} ${d === t ? 'is-today' : ''}" data-act="read-toggle" data-day="${d}" aria-pressed="${!!s.reading[d]}" aria-label="${u.fmt(d, { weekday: 'long' })}"><span class="dl">${u.DOW[u.dow(d)][0]}</span><span class="dc">${s.reading[d] ? icon('check') : ''}</span></button>`).join('')}</div>
        <label class="field"><span>Where I’m reading</span><input data-change="reading-at" value="${esc(s.readingAt)}" placeholder="Isaiah 40" autocomplete="off"></label>
      </section>
      <section class="card">
        <div class="sec-head"><h2>Study log</h2><span class="count">This week: ${week.length ? `${u.hrs(week.reduce((n, x) => n + (Number(x.minutes) || 0), 0))} · ${u.plural(week.length, 'session')}` : 'nothing yet'}</span></div>
        <form class="study-form" data-form="study">
          <input name="topic" placeholder="What did you study?" autocomplete="off" aria-label="Topic" required>
          <div class="row"><input name="minutes" type="number" min="1" inputmode="numeric" placeholder="30" aria-label="Minutes"><span class="muted">min</span><span class="grow"></span><button class="btn primary sm">Log it</button></div>
          <div class="chips">${TOPICS.map((x) => `<button type="button" data-topic="${x}">${x}</button>`).join('')}</div>
        </form>
        ${recent.length ? `<div class="list">${recent.map((x) => `<div class="list-row"><span><b>${esc(x.topic)}</b><small class="muted block">${u.relDay(x.date)}${x.notes ? ' · ' + esc(x.notes) : ''}</small></span><span class="row">${x.minutes ? `<span class="muted">${u.hrs(x.minutes)}</span>` : ''}<button class="icon-btn sm" data-act="study-del" data-id="${x.id}" aria-label="Remove">${icon('x')}</button></span></div>`).join('')}</div>` : ''}
      </section>`;
  }

  // ================= Tab =================
  L.views.spiritual = function () {
    const body = { meetings, service, group, study }[tab]();
    return `
      <header class="page-head"><h1>Spiritual</h1></header>
      <div class="seg sp-tabs" role="tablist">${TABS.map(([k, l]) => `<label><input type="radio" name="sp-tab" value="${k}" data-act="sp-tab" ${tab === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      ${body}`;
  };

  Object.assign(L.acts, {
    'sp-tab'(el) { tab = el.value; app().render(); },
    'part-new': () => L.partSheet(),
    'part-edit': (el) => L.partSheet(S.sp('parts', el.dataset.id)),
    'part-ready'(el) { const p = S.sp('parts', el.dataset.id); p.prepared = !p.prepared; S.save(); app().render(); },
    'meet-times'() {
      const m = sp().meetings;
      const days = [['-1', 'No meeting'], ...u.DOW_LONG.map((d, i) => [String(i), d])];
      formSheet({
        title: 'Meeting times',
        values: { mwDay: m.midweek.day, mwTime: m.midweek.time, weDay: m.weekend.day, weTime: m.weekend.time, place: m.place },
        fields: [
          { name: 'mwDay', label: 'Midweek meeting', type: 'select', options: days }, { name: 'mwTime', label: 'Time', type: 'time' },
          { name: 'weDay', label: 'Weekend meeting', type: 'select', options: days }, { name: 'weTime', label: 'Time', type: 'time' },
          { name: 'place', label: 'Where', placeholder: 'Kingdom Hall' },
        ],
        onSave(v) {
          m.midweek = { day: Number(v.mwDay), time: v.mwTime || '19:00' };
          m.weekend = { day: Number(v.weDay), time: v.weTime || '10:00' };
          m.place = v.place; S.save();
        },
      });
    },
    'svc-month'(el) { month = u.shiftMonth(month, Number(el.dataset.v)); app().render(); },
    studies(el) { const s = sp(); s.studies[month] = Math.max(0, (s.studies[month] || 0) + Number(el.dataset.v)); S.save(); app().render(); },
    async 'svc-copy'() {
      const text = reportText();
      if (navigator.share && /iphone|ipad|android/i.test(navigator.userAgent)) { try { await navigator.share({ text }); return; } catch (e) { /* cancelled; copy instead */ } }
      u.toast((await u.copyText(text)) ? 'Report copied. Paste it in a text to your group overseer.' : text);
    },
    'svc-goal'() {
      formSheet({
        title: 'Monthly hour goal', values: { goal: sp().serviceGoal || '' },
        fields: [{ name: 'goal', label: 'Hours a month (leave empty for none)', type: 'number', placeholder: '15' }],
        onSave(v) { sp().serviceGoal = Math.max(0, Number(v.goal) || 0); S.save(); },
      });
    },
    'svc-del'(el) { S.spRemove('service', el.dataset.id); app().render(); },
    'rv-new': () => L.rvSheet(),
    'rv-edit': (el) => L.rvSheet(S.sp('rvs', el.dataset.id)),
    'group-edit'() {
      formSheet({
        title: 'My group', values: sp().group,
        fields: [
          { name: 'name', label: 'Group', placeholder: 'Group 3' },
          { name: 'overseer', label: 'Group overseer', optional: true }, { name: 'overseerPhone', label: 'Overseer’s phone', type: 'tel', optional: true },
          { name: 'assistant', label: 'Assistant', optional: true }, { name: 'assistantPhone', label: 'Assistant’s phone', type: 'tel', optional: true },
        ],
        onSave(v) { Object.assign(sp().group, v); S.save(); },
      });
    },
    'fsm-new': () => fsmSheet(),
    'fsm-edit': (el) => fsmSheet(S.sp('fsm', el.dataset.id)),
    'member-new': () => memberSheet(),
    'member-edit': (el) => memberSheet(S.sp('members', el.dataset.id)),
    'read-toggle'(el) { const r = sp().reading; const d = el.dataset.day; if (r[d]) delete r[d]; else r[d] = 1; S.save(); app().render(); },
    'study-del'(el) { S.spRemove('study', el.dataset.id); app().render(); },
  });

  function fsmSheet(f) {
    const isNew = !f;
    formSheet({
      title: isNew ? 'Meeting for field service' : 'Edit meeting for field service',
      values: f || { day: 6, time: '09:30' },
      fields: [
        { name: 'day', label: 'Day', type: 'select', options: u.DOW_LONG.map((d, i) => [String(i), d]) },
        { name: 'time', label: 'Time', type: 'time' },
        { name: 'place', label: 'Where', placeholder: 'The Smiths’ home' },
        { name: 'conductor', label: 'Conducted by', optional: true },
      ],
      onSave(v) { v.day = Number(v.day); if (isNew) S.spAdd('fsm', v); else { Object.assign(f, v); S.save(); } },
      onDelete: isNew ? null : () => S.spRemove('fsm', f.id),
    });
  }

  function memberSheet(m) {
    const isNew = !m;
    formSheet({
      title: isNew ? 'Add member' : 'Edit member', values: m || {},
      fields: [{ name: 'name', label: 'Name' }, { name: 'phone', label: 'Phone', type: 'tel', optional: true }],
      onSave(v) { if (!v.name) { u.toast('Add a name.'); return false; } if (isNew) S.spAdd('members', v); else { Object.assign(m, v); S.save(); } },
      onDelete: isNew ? null : () => S.spRemove('members', m.id),
    });
  }

  Object.assign(L.forms, {
    svc(fd) {
      const h = Number(fd.get('hours'));
      if (!(h > 0)) return;
      const note = document.getElementById('svc-note');
      S.spAdd('service', { date: fd.get('date') || u.today(), minutes: Math.round(h * 60), notes: note ? note.value.trim() : '' });
      app().render();
      u.toast(`Logged ${u.hrs(h * 60)}`);
    },
    study(fd) {
      const topic = (fd.get('topic') || '').trim();
      if (!topic) return;
      S.spAdd('study', { date: u.today(), topic, minutes: Number(fd.get('minutes')) || 0, notes: '' });
      app().render();
    },
  });

  const main = document.getElementById('main');
  main.addEventListener('change', (e) => {
    if (e.target.dataset.change === 'reading-at') { sp().readingAt = e.target.value.trim(); S.save(); u.toast('Saved'); }
  });
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (b) { const f = b.closest('form'); f.topic.value = b.dataset.topic; f.minutes.focus(); }
  });
})();
