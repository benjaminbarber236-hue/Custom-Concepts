// Views, routing, and actions.
(function () {
  const S = WC.store, U = WC.ui, C = WC.C, esc = U.esc;

  const state = {
    salesFilter: 'active',
    installFilter: 'active',
    salesSearch: '',
    installSearch: '',
    contactSearch: '',
    contactRole: '',
    weekOf: U.weekStart(U.today()),
  };

  // ======================================================================
  // Helpers
  // ======================================================================
  // Navigation. The hosted demo keeps the route in memory instead of the URL hash.
  let demoRoute = '#/home';
  const currentHash = () => (WC.DEMO ? demoRoute : location.hash);
  function go(hash) {
    if (WC.DEMO) { demoRoute = hash; render(); window.scrollTo(0, 0); } else location.hash = hash;
  }
  const section = (p) => C.stage(p.stage).section;
  const lastDay = (e) => U.addDays(e.date, Math.max(1, e.days || 1) - 1);
  const byDue = (a, b) => (a.due || '').localeCompare(b.due || '');
  const byWhen = (a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || ''));
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');

  const eventsOn = (day) => S.all('events').filter((e) => e.date <= day && day <= lastDay(e)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const projectEvents = (pid) => S.all('events').filter((e) => e.projectId === pid).sort(byWhen);
  const openTasks = (filter) => S.all('tasks').filter((t) => !t.done && (!filter || filter(t))).sort(byDue);
  const nextEvent = (pid) => projectEvents(pid).find((e) => lastDay(e) >= U.today());
  const itemTotal = (p) => p.items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const projectValue = (p) => itemTotal(p) || Number(p.estValue) || 0;
  const daysSince = (iso) => (iso ? U.daysBetween(iso.slice(0, 10), U.today()) : 999);

  const stageBadge = (p) => `<span class="badge st-${section(p)}">${esc(C.stage(p.stage).label)}</span>`;
  const typeDot = (type) => `<span class="dot" style="background:${C.eventType(type).color}"></span>`;
  const empty = (msg) => `<p class="empty">${msg}</p>`;

  function projectOptions(includeId) {
    const ps = S.all('projects').filter((p) => section(p) !== 'closed' || p.id === includeId).sort(byName);
    return [{ value: '', label: '— none —' }, ...ps.map((p) => ({ value: p.id, label: p.name }))];
  }
  function contactOptions(blankLabel) {
    return [{ value: '', label: blankLabel || '— none —' }, ...S.all('contacts').slice().sort(byName).map((c) => ({ value: c.id, label: c.name + (c.role ? ` (${c.role})` : '') }))];
  }

  function sms(p) { return p ? `sms:${p.replace(/[^\d+]/g, '')}` : ''; }
  function contactActions(c) {
    const out = [];
    if (c.phone) out.push(`<a class="pill" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">📞 Call</a>`, `<a class="pill" href="${esc(sms(c.phone))}">💬 Text</a>`);
    if (c.email) out.push(`<a class="pill" href="mailto:${esc(c.email)}">✉️ Email</a>`);
    if (c.address) out.push(`<a class="pill" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(c.address)}">📍 Map</a>`);
    return out.join('');
  }

  // ======================================================================
  // Reusable rows / cards
  // ======================================================================
  function projectCard(p, extra) {
    const pc = S.primaryContact(p);
    const ne = nextEvent(p.id);
    const tasks = openTasks((t) => t.projectId === p.id);
    const bits = [];
    if (ne) bits.push(`📅 ${esc(U.relDate(ne.date))}${ne.start ? ' ' + U.fmtTime(ne.start) : ''} · ${esc(C.eventType(ne.type).label)}`);
    if (tasks[0]) bits.push(`<span class="${tasks[0].due < U.today() ? 'overdue' : ''}">☐ ${esc(tasks[0].title)} (${esc(U.relDate(tasks[0].due))})</span>`);
    const val = projectValue(p);
    return `<a class="card proj" href="#/project/${p.id}">
      <div class="row between"><strong>${esc(p.name)}</strong>${stageBadge(p)}</div>
      <div class="muted small">${[pc && esc(pc.name), esc(p.address || ''), esc(p.type || '')].filter(Boolean).join(' · ')}</div>
      ${extra || ''}
      ${bits.length ? `<div class="small meta">${bits.join('<br>')}</div>` : ''}
      <div class="row between small muted"><span>${val ? U.money(val) : ''}</span><span>Last activity ${esc(U.relDate(S.lastActivity(p).slice(0, 10)))}</span></div>
    </a>`;
  }

  function eventRow(e, opts = {}) {
    const p = e.projectId && S.get('projects', e.projectId);
    const span = (e.days || 1) > 1 && opts.day ? ` <span class="muted small">(day ${U.daysBetween(e.date, opts.day) + 1} of ${e.days})</span>` : '';
    const time = e.start ? `${U.fmtTime(e.start)}${e.end ? '–' + U.fmtTime(e.end) : ''}` : 'Any time';
    const canWrap = !e.done && e.date <= U.today();
    return `<div class="item ev ${e.done ? 'done' : ''}">
      <div class="ev-time">${opts.showDate ? `<b>${esc(U.relDate(e.date))}</b><br>` : ''}${time}</div>
      <div class="grow">
        <div>${typeDot(e.type)}<a href="#" data-action="editEvent" data-id="${e.id}"><strong>${esc(e.title)}</strong></a>${span}${e.done ? ' <span class="badge st-closed">done</span>' : ''}</div>
        ${p && !opts.hideProject ? `<div class="small"><a href="#/project/${p.id}">${esc(p.name)}</a></div>` : ''}
        ${e.location ? `<div class="small muted">${U.mapLink(e.location)}</div>` : ''}
        ${e.notes ? `<div class="small muted pre">${esc(e.notes)}</div>` : ''}
      </div>
      <div class="ev-actions">
        ${canWrap ? `<button class="btn tiny primary" data-action="wrapUp" data-id="${e.id}" title="Record what happened and set a follow-up">Wrap up</button>` : ''}
        ${WC.DEMO ? '' : `<button class="btn tiny ghost" data-action="icsEvent" data-id="${e.id}" title="Add to phone calendar">📲</button>`}
      </div>
    </div>`;
  }

  function taskRow(t, opts = {}) {
    const p = t.projectId && S.get('projects', t.projectId);
    const c = t.contactId && S.get('contacts', t.contactId);
    const late = !t.done && t.due < U.today();
    return `<div class="item task ${t.done ? 'done' : ''}">
      <input type="checkbox" class="chk" data-action="toggleTask" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Done">
      <div class="grow">
        <a href="#" data-action="editTask" data-id="${t.id}">${esc(t.title)}</a>
        <div class="small ${late ? 'overdue' : 'muted'}">${esc(U.relDate(t.due))}${p && !opts.hideProject ? ` · <a href="#/project/${p.id}">${esc(p.name)}</a>` : ''}${c ? ` · ${esc(c.name)}` : ''}</div>
      </div>
      ${t.done ? '' : `<div class="snooze"><button class="btn tiny ghost" data-action="snooze" data-id="${t.id}" data-days="1">+1d</button><button class="btn tiny ghost" data-action="snooze" data-id="${t.id}" data-days="7">+1w</button></div>`}
    </div>`;
  }

  function logRow(p, l, opts = {}) {
    const c = l.contactId && S.get('contacts', l.contactId);
    return `<div class="item log">
      <div class="log-type">${esc(l.type)}</div>
      <div class="grow">
        <div class="small muted">${esc(U.fmtDate(l.date))}${c ? ` · with ${esc(c.name)}` : ''}${opts.showProject ? ` · <a href="#/project/${p.id}">${esc(p.name)}</a>` : ''}</div>
        <div class="pre">${esc(l.summary)}</div>
      </div>
      <button class="btn tiny ghost" data-action="editLog" data-project="${p.id}" data-id="${l.id}">Edit</button>
    </div>`;
  }

  // ======================================================================
  // Views
  // ======================================================================
  const views = {};

  // ---------------- Home ----------------
  views.home = () => {
    const t = U.today();
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const name = S.db.settings.userName;
    const projects = S.all('projects');

    if (!projects.length && !S.all('contacts').length) {
      return `<h1>${greet}${name ? ', ' + esc(name) : ''}</h1>
        <div class="card welcome">
          <h2>Welcome 👋</h2>
          <p>This app tracks every job from first phone call, through the sales consult and proposal, ordering, pre-wire, waiting on other trades, install, punch list, and the check-in afterward.</p>
          <ul>
            <li><b>Sales</b>: leads, consults, quotes, proposals, follow-ups.</li>
            <li><b>Installs</b>: products by room, phases for big jobs, who you're waiting on.</li>
            <li><b>Calendar</b>: sales calls, measures, install days, site meetings.</li>
            <li><b>Contacts</b>: homeowners, designers, builders, electricians, and other trades.</li>
          </ul>
          <div class="row gap wrap">
            <button class="btn primary" data-action="newLead">+ Add first lead</button>
            <button class="btn" data-action="loadSample">Load sample data to explore</button>
          </div>
        </div>`;
    }

    const tasks = openTasks();
    const overdue = tasks.filter((x) => x.due < t);
    const dueToday = tasks.filter((x) => x.due === t);
    const soon = tasks.filter((x) => x.due > t && x.due <= U.addDays(t, 7));
    const wrap = S.all('events').filter((e) => !e.done && lastDay(e) < t && lastDay(e) >= U.addDays(t, -30)).sort(byWhen);

    let upcoming = '';
    for (let i = 1; i <= 7; i++) {
      const d = U.addDays(t, i);
      const evs = eventsOn(d);
      if (evs.length) upcoming += `<div class="day-label">${esc(U.relDate(d))}</div>` + evs.map((e) => eventRow(e, { day: d })).join('');
    }

    const salesStages = C.STAGES.filter((s) => s.section === 'sales');
    const pipeline = salesStages.map((s) => {
      const ps = projects.filter((p) => p.stage === s.id);
      const val = ps.reduce((a, p) => a + projectValue(p), 0);
      return `<a class="stat" href="#/sales" data-action="setFilter" data-key="salesFilter" data-value="${s.id}"><b>${ps.length}</b><span>${esc(s.label)}</span>${val ? `<em>${U.money(val)}</em>` : ''}</a>`;
    }).join('');

    const waiting = projects.filter((p) => section(p) === 'install').map((p) => {
      const w = p.phases.filter((ph) => ph.status === 'Waiting');
      return w.length ? { p, w } : null;
    }).filter(Boolean);

    const cold = projects.filter((p) => section(p) === 'sales'
      && daysSince(S.lastActivity(p)) >= 10
      && !openTasks((x) => x.projectId === p.id).length
      && !nextEvent(p.id));

    const lb = S.db.settings.lastBackup;
    const backupNag = projects.length && (!lb || daysSince(lb) >= 7)
      ? `<div class="banner">💾 ${lb ? `Last backup was ${daysSince(lb)} days ago.` : 'You haven\'t backed up yet.'} Your data lives only on this device. <a href="#" data-action="exportData">Export backup</a></div>` : '';

    return `
      <h1>${greet}${name ? ', ' + esc(name) : ''}</h1>
      <p class="muted">${esc(U.fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' }))}</p>
      ${WC.DEMO ? `<div class="banner demo">You're trying a demo filled with sample jobs. Tap around, add leads, and wrap up appointments. Changes stay in this browser only. <a href="#" data-action="resetDemo">Reset demo</a></div>` : backupNag}
      <div class="quick row gap wrap">
        <button class="btn primary" data-action="newLead">+ Lead</button>
        <button class="btn" data-action="newEvent" data-date="${t}">+ Appointment</button>
        <button class="btn" data-action="newTask">+ Follow-up</button>
        <button class="btn" data-action="newLog">+ Call / Note</button>
      </div>

      <section class="panel">
        <h3>Today</h3>
        ${eventsOn(t).map((e) => eventRow(e, { day: t })).join('') || empty('Nothing scheduled today.')}
      </section>

      ${wrap.length ? `<section class="panel warn">
        <h3>Needs wrap-up <span class="count">${wrap.length}</span></h3>
        <p class="small muted">Past appointments with no notes yet. Record what happened and set the next step.</p>
        ${wrap.map((e) => eventRow(e, { showDate: true })).join('')}
      </section>` : ''}

      <section class="panel">
        <h3>Follow-ups ${overdue.length ? `<span class="count bad">${overdue.length} overdue</span>` : ''}</h3>
        ${overdue.map((x) => taskRow(x)).join('')}
        ${dueToday.map((x) => taskRow(x)).join('')}
        ${soon.length ? `<div class="day-label">Next 7 days</div>${soon.map((x) => taskRow(x)).join('')}` : ''}
        ${!overdue.length && !dueToday.length && !soon.length ? empty('No follow-ups due this week.') : ''}
      </section>

      <section class="panel">
        <h3>Coming up this week</h3>
        ${upcoming || empty('Nothing on the calendar for the next 7 days.')}
      </section>

      <section class="panel">
        <h3>Sales pipeline</h3>
        <div class="stats">${pipeline}</div>
      </section>

      ${cold.length ? `<section class="panel">
        <h3>Going cold <span class="count">${cold.length}</span></h3>
        <p class="small muted">Open sales with no activity in 10+ days and no follow-up set.</p>
        ${cold.map((p) => projectCard(p)).join('')}
      </section>` : ''}

      ${waiting.length ? `<section class="panel">
        <h3>Installs waiting on others</h3>
        ${waiting.map(({ p, w }) => `<a class="item" href="#/project/${p.id}"><div class="grow"><strong>${esc(p.name)}</strong>
          <div class="small muted">${w.map((ph) => `⏳ ${esc(ph.name)}${ph.waitingOn ? ` — waiting on <b>${esc(ph.waitingOn)}</b>` : ''}${ph.date ? ` (target ${esc(U.fmtDate(ph.date))})` : ''}`).join('<br>')}</div></div></a>`).join('')}
      </section>` : ''}
    `;
  };

  // ---------------- Sales & Installs lists ----------------
  function pipelineList(sec, filterKey, searchKey) {
    const q = state[searchKey].toLowerCase();
    const f = state[filterKey];
    let ps = S.all('projects').filter((p) => {
      if (f === 'active') return section(p) === sec;
      if (f === 'closed') return sec === 'sales' ? p.stage === 'lost' : p.stage === 'complete';
      return p.stage === f;
    });
    if (q) {
      ps = ps.filter((p) => {
        const people = S.projectContacts(p).map((pc) => pc.contact.name).join(' ');
        return `${p.name} ${p.address} ${p.notes} ${people}`.toLowerCase().includes(q);
      });
    }
    if (f === 'active') {
      const stages = C.STAGES.filter((s) => s.section === sec);
      const groups = stages.map((s) => {
        const list = ps.filter((p) => p.stage === s.id).sort((a, b) => S.lastActivity(b).localeCompare(S.lastActivity(a)));
        return list.length ? `<div class="group-label">${esc(s.label)} <span class="count">${list.length}</span></div>${list.map((p) => projectCard(p, sec === 'install' ? installProgress(p) : '')).join('')}` : '';
      }).join('');
      return groups || empty(q ? 'No matches.' : sec === 'sales' ? 'No open sales. Tap “+ New lead” to add one.' : 'No active installs. Jobs show up here once a sale moves to “Sold”.');
    }
    ps.sort((a, b) => S.lastActivity(b).localeCompare(S.lastActivity(a)));
    return ps.map((p) => projectCard(p, sec === 'install' ? installProgress(p) : '')).join('') || empty('Nothing here.');
  }

  function installProgress(p) {
    const n = p.items.reduce((a, i) => a + (Number(i.qty) || 1), 0);
    const done = p.items.filter((i) => i.status === 'Installed').reduce((a, i) => a + (Number(i.qty) || 1), 0);
    const phDone = p.phases.filter((ph) => ph.status === 'Done').length;
    const waiting = p.phases.find((ph) => ph.status === 'Waiting');
    const pct = n ? Math.round((done / n) * 100) : 0;
    return `<div class="progress-wrap small">
      ${n ? `<div class="progress"><span style="width:${pct}%"></span></div><span class="muted">${done}/${n} installed</span>` : ''}
      ${p.phases.length ? `<span class="muted">· phases ${phDone}/${p.phases.length}</span>` : ''}
      ${waiting ? `<div class="waiting">⏳ ${esc(waiting.name)}${waiting.waitingOn ? ` — waiting on ${esc(waiting.waitingOn)}` : ''}</div>` : ''}
    </div>`;
  }

  function chips(filterKey, sec) {
    const stages = C.STAGES.filter((s) => s.section === sec);
    const opts = [{ id: 'active', label: 'All active' }, ...stages, { id: 'closed', label: sec === 'sales' ? 'Lost' : 'Complete' }];
    return `<div class="chips">${opts.map((o) => `<button class="chip ${state[filterKey] === o.id ? 'on' : ''}" data-action="setFilter" data-key="${filterKey}" data-value="${o.id}">${esc(o.label)}</button>`).join('')}</div>`;
  }

  views.sales = () => `
    <div class="row between"><h1>Sales</h1><button class="btn primary" data-action="newLead">+ New lead</button></div>
    <input class="search" type="search" placeholder="Search name, address, people…" value="${esc(state.salesSearch)}" data-search="salesSearch" data-target="salesList">
    ${chips('salesFilter', 'sales')}
    <div id="salesList">${pipelineList('sales', 'salesFilter', 'salesSearch')}</div>`;

  views.installs = () => `
    <div class="row between"><h1>Installs</h1><button class="btn" data-action="newEvent" data-type="install" data-date="${U.today()}">+ Install day</button></div>
    <input class="search" type="search" placeholder="Search jobs…" value="${esc(state.installSearch)}" data-search="installSearch" data-target="installList">
    ${chips('installFilter', 'install')}
    <div id="installList">${pipelineList('install', 'installFilter', 'installSearch')}</div>`;

  // ---------------- Project detail ----------------
  views.project = (id, tab) => {
    const p = S.get('projects', id);
    if (!p) return `<p>Job not found. <a href="#/sales">Back to Sales</a></p>`;
    tab = tab || 'overview';
    const tabs = [['overview', 'Overview'], ['products', `Products (${p.items.length})`], ['phases', `Phases (${p.phases.length})`], ['schedule', 'Schedule'], ['log', `Log (${p.log.length})`]];
    const stageSel = `<select class="stage-select" data-change="setStage" data-id="${p.id}">${['sales', 'install', 'closed'].map((sec) =>
      `<optgroup label="${sec === 'sales' ? 'Sales' : sec === 'install' ? 'Install' : 'Closed'}">${C.STAGES.filter((s) => s.section === sec).map((s) => `<option value="${s.id}" ${s.id === p.stage ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const body = { overview: projectOverview, products: projectProducts, phases: projectPhases, schedule: projectSchedule, log: projectLog }[tab] || projectOverview;
    const home = section(p) === 'install' || p.stage === 'complete' ? 'installs' : 'sales';
    return `
      <a class="back" href="#/${home}">← ${home === 'sales' ? 'Sales' : 'Installs'}</a>
      <div class="row between wrap gap"><h1>${esc(p.name)}</h1>${stageSel}</div>
      ${p.address ? `<div class="muted">📍 ${U.mapLink(p.address)}</div>` : ''}
      <div class="quick row gap wrap">
        <button class="btn" data-action="newLog" data-project="${p.id}">+ Call / Note</button>
        <button class="btn" data-action="newEvent" data-project="${p.id}">+ Appointment</button>
        <button class="btn" data-action="newTask" data-project="${p.id}">+ Follow-up</button>
        <button class="btn ghost" data-action="editProject" data-id="${p.id}">Edit job</button>
      </div>
      <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/project/${p.id}/${k}" class="${k === tab ? 'on' : ''}">${esc(l)}</a>`).join('')}</nav>
      ${body(p)}`;
  };

  function projectOverview(p) {
    const pcs = S.projectContacts(p);
    const tasks = openTasks((t) => t.projectId === p.id);
    const evs = projectEvents(p.id).filter((e) => lastDay(e) >= U.today()).slice(0, 4);
    const total = itemTotal(p);
    return `
      <section class="panel">
        <div class="details">
          <div><span>Type</span>${esc(p.type || '—')}</div>
          <div><span>Lead source</span>${esc(p.source || '—')}</div>
          <div><span>Estimate</span>${p.estValue ? U.money(p.estValue) : '—'}</div>
          <div><span>Products total</span>${total ? U.money(total) : '—'}</div>
          <div><span>Created</span>${esc(U.fmtDate((p.createdAt || '').slice(0, 10)))}</div>
          <div><span>Days in stage</span>${daysSince((p.stageHistory[p.stageHistory.length - 1] || {}).at || p.createdAt)}</div>
        </div>
        ${p.notes ? `<div class="notes pre">${esc(p.notes)}</div>` : ''}
      </section>

      <section class="panel">
        <div class="row between"><h3>People on this job</h3><button class="btn tiny" data-action="addPerson" data-project="${p.id}">+ Add person</button></div>
        ${pcs.map((pc) => `<div class="item">
            <div class="grow"><a href="#/contact/${pc.contact.id}"><strong>${esc(pc.contact.name)}</strong></a>
              <span class="badge">${esc(pc.role || pc.contact.role || '')}</span>${pc.contact.company ? ` <span class="muted small">${esc(pc.contact.company)}</span>` : ''}
              <div class="pills">${contactActions({ ...pc.contact, address: '' })}</div></div>
            <button class="btn tiny ghost" data-action="removePerson" data-project="${p.id}" data-id="${pc.contactId}" title="Remove from job">✕</button>
          </div>`).join('') || empty('No one linked yet. Add the homeowner, designer, builder, electrician…')}
      </section>

      <section class="panel">
        <div class="row between"><h3>Open follow-ups</h3><button class="btn tiny" data-action="newTask" data-project="${p.id}">+ Follow-up</button></div>
        ${tasks.map((t) => taskRow(t, { hideProject: true })).join('') || empty('No follow-ups set. Every open job should have a next step.')}
      </section>

      <section class="panel">
        <div class="row between"><h3>Upcoming</h3><a class="small" href="#/project/${p.id}/schedule">All appointments →</a></div>
        ${evs.map((e) => eventRow(e, { showDate: true, hideProject: true })).join('') || empty('Nothing scheduled.')}
      </section>

      <section class="panel">
        <div class="row between"><h3>Recent activity</h3><a class="small" href="#/project/${p.id}/log">Full log →</a></div>
        ${p.log.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((l) => logRow(p, l)).join('') || empty('No calls or notes logged yet.')}
      </section>

      <section class="panel">
        <h3>Stage history</h3>
        <ol class="timeline">${p.stageHistory.map((h) => `<li><b>${esc(C.stage(h.stage).label)}</b> <span class="muted small">${esc(U.fmtDate(h.at.slice(0, 10)))}</span></li>`).join('')}</ol>
      </section>`;
  }

  function projectProducts(p) {
    const rooms = {};
    p.items.forEach((i) => { (rooms[i.room || 'No room'] = rooms[i.room || 'No room'] || []).push(i); });
    const counts = C.ITEM_STATUSES.map((s) => {
      const n = p.items.filter((i) => i.status === s).reduce((a, i) => a + (Number(i.qty) || 1), 0);
      return n ? `<span class="badge it-${s.toLowerCase()}">${s}: ${n}</span>` : '';
    }).join(' ');
    return `
      <section class="panel">
        <div class="row between wrap gap">
          <div>${counts || '<span class="muted">No products yet.</span>'} ${itemTotal(p) ? `<b class="total">${U.money(itemTotal(p))}</b>` : ''}</div>
          <div class="row gap wrap">
            <button class="btn primary tiny" data-action="newItem" data-project="${p.id}">+ Add window / product</button>
            ${p.items.length ? `<select class="tiny-select" data-change="bulkStatus" data-project="${p.id}"><option value="">Mark all as…</option>${C.ITEM_STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
            <button class="btn tiny" data-action="copyOrder" data-project="${p.id}">Order list</button>` : ''}
          </div>
        </div>
        <p class="small muted">Tap a status badge to advance it (Quoted → Ordered → Received → Installed). Use “Copy” to quickly add the next window with the same specs.</p>
      </section>
      ${Object.keys(rooms).sort().map((room) => `
        <section class="panel">
          <h3>${esc(room)} <span class="count">${rooms[room].length}</span></h3>
          ${rooms[room].map((i) => `<div class="item product">
            <div class="grow">
              <div><strong>${esc(i.location || 'Window')}</strong> · ${esc(i.category || '')}</div>
              <div class="small">${[i.brand, i.product, i.color].filter(Boolean).map(esc).join(' · ')}</div>
              <div class="small muted">${[i.width && i.height ? `${esc(i.width)}″ W × ${esc(i.height)}″ H` : '', i.mount && esc(i.mount + ' mount'), i.control && esc(i.control), (Number(i.qty) || 1) > 1 ? `qty ${esc(i.qty)}` : '', i.price ? U.money(i.price) + ' ea' : ''].filter(Boolean).join(' · ')}</div>
              ${i.notes ? `<div class="small muted pre">${esc(i.notes)}</div>` : ''}
            </div>
            <div class="col-actions">
              <button class="badge it-${(i.status || 'quoted').toLowerCase()}" data-action="cycleItem" data-project="${p.id}" data-id="${i.id}">${esc(i.status || 'Quoted')}</button>
              <div class="row gap"><button class="btn tiny ghost" data-action="editItem" data-project="${p.id}" data-id="${i.id}">Edit</button><button class="btn tiny ghost" data-action="dupItem" data-project="${p.id}" data-id="${i.id}">Copy</button></div>
            </div>
          </div>`).join('')}
        </section>`).join('')}`;
  }

  function projectPhases(p) {
    return `
      <section class="panel">
        <div class="row between wrap gap">
          <h3>Job phases & sequencing</h3>
          <div class="row gap wrap">
            <button class="btn tiny primary" data-action="newPhase" data-project="${p.id}">+ Phase</button>
            <button class="btn tiny" data-action="phaseTemplate" data-project="${p.id}">Add new-construction template</button>
          </div>
        </div>
        <p class="small muted">For jobs that span weeks: pre-wire, wait on framers/drywall, come back to install. Tap the status to cycle To do → Waiting → Scheduled → Done.</p>
        ${p.phases.map((ph, idx) => `<div class="item phase ph-${ph.status.toLowerCase().replace(/\s/g, '')}">
          <div class="ph-num">${idx + 1}</div>
          <div class="grow">
            <a href="#" data-action="editPhase" data-project="${p.id}" data-id="${ph.id}"><strong>${esc(ph.name)}</strong></a>
            <div class="small muted">${[ph.waitingOn && `Depends on: ${esc(ph.waitingOn)}`, ph.date && `Target ${esc(U.fmtDate(ph.date))}`].filter(Boolean).join(' · ')}</div>
            ${ph.notes ? `<div class="small pre">${esc(ph.notes)}</div>` : ''}
          </div>
          <div class="col-actions">
            <button class="badge ph-badge" data-action="cyclePhase" data-project="${p.id}" data-id="${ph.id}">${esc(ph.status)}</button>
            <div class="row gap"><button class="btn tiny ghost" data-action="movePhase" data-project="${p.id}" data-id="${ph.id}" data-dir="-1" aria-label="Move up">↑</button><button class="btn tiny ghost" data-action="movePhase" data-project="${p.id}" data-id="${ph.id}" data-dir="1" aria-label="Move down">↓</button></div>
          </div>
        </div>`).join('') || empty('No phases yet. Small jobs usually don\'t need them.')}
      </section>`;
  }

  function projectSchedule(p) {
    const evs = projectEvents(p.id);
    const t = U.today();
    const fut = evs.filter((e) => lastDay(e) >= t);
    const past = evs.filter((e) => lastDay(e) < t).reverse();
    return `
      <section class="panel">
        <div class="row between"><h3>Upcoming</h3><button class="btn tiny primary" data-action="newEvent" data-project="${p.id}">+ Appointment</button></div>
        ${fut.map((e) => eventRow(e, { showDate: true, hideProject: true })).join('') || empty('Nothing scheduled.')}
      </section>
      <section class="panel">
        <h3>Past</h3>
        ${past.map((e) => eventRow(e, { showDate: true, hideProject: true })).join('') || empty('None yet.')}
      </section>
      <section class="panel">
        <h3>Follow-ups</h3>
        ${S.all('tasks').filter((x) => x.projectId === p.id).sort(byDue).map((x) => taskRow(x, { hideProject: true })).join('') || empty('None.')}
      </section>`;
  }

  function projectLog(p) {
    return `<section class="panel">
      <div class="row between"><h3>Calls, meetings & notes</h3><button class="btn tiny primary" data-action="newLog" data-project="${p.id}">+ Entry</button></div>
      ${p.log.slice().sort((a, b) => b.date.localeCompare(a.date)).map((l) => logRow(p, l)).join('') || empty('Log every conversation: what was discussed, decisions on products, sequencing with other trades.')}
    </section>`;
  }

  // ---------------- Calendar ----------------
  views.calendar = () => {
    const ws = state.weekOf;
    const t = U.today();
    let days = '';
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ws, i);
      const evs = eventsOn(d);
      const tasks = openTasks((x) => x.due === d);
      days += `<section class="panel day ${d === t ? 'is-today' : ''}">
        <div class="row between"><h3>${esc(U.fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' }))}${d === t ? ' <span class="badge st-sales">Today</span>' : ''}</h3>
          <button class="btn tiny ghost" data-action="newEvent" data-date="${d}" aria-label="Add appointment">+</button></div>
        ${evs.map((e) => eventRow(e, { day: d })).join('')}
        ${tasks.map((x) => taskRow(x)).join('')}
        ${!evs.length && !tasks.length ? '<p class="empty small">Open</p>' : ''}
      </section>`;
    }
    return `
      <div class="row between wrap gap"><h1>Calendar</h1><button class="btn primary" data-action="newEvent" data-date="${t}">+ Appointment</button></div>
      <div class="row between week-nav">
        <button class="btn ghost" data-action="week" data-dir="-1">← Prev</button>
        <button class="btn ghost" data-action="week" data-dir="0">${esc(U.fmtDate(ws, { month: 'short', day: 'numeric' }))} – ${esc(U.fmtDate(U.addDays(ws, 6), { month: 'short', day: 'numeric' }))}</button>
        <button class="btn ghost" data-action="week" data-dir="1">Next →</button>
      </div>
      <div class="legend small">${C.EVENT_TYPES.map((x) => `<span>${typeDot(x.id)}${esc(x.label)}</span>`).join('')}</div>
      ${days}`;
  };

  // ---------------- Contacts ----------------
  function contactList() {
    const q = state.contactSearch.toLowerCase();
    const list = S.all('contacts').filter((c) => (!state.contactRole || c.role === state.contactRole)
      && (!q || `${c.name} ${c.company} ${c.phone} ${c.email} ${c.role}`.toLowerCase().includes(q))).sort(byName);
    return list.map((c) => {
      const jobs = S.all('projects').filter((p) => p.contacts.some((pc) => pc.contactId === c.id));
      return `<a class="card" href="#/contact/${c.id}">
        <div class="row between"><strong>${esc(c.name)}</strong><span class="badge">${esc(c.role || '')}</span></div>
        <div class="small muted">${[c.company, c.phone, c.email].filter(Boolean).map(esc).join(' · ')}</div>
        ${jobs.length ? `<div class="small">${jobs.length} job${jobs.length > 1 ? 's' : ''}: ${jobs.slice(0, 3).map((p) => esc(p.name)).join(', ')}${jobs.length > 3 ? '…' : ''}</div>` : ''}
      </a>`;
    }).join('') || empty(q || state.contactRole ? 'No matches.' : 'No contacts yet.');
  }

  views.contacts = () => `
    <div class="row between"><h1>Contacts</h1><button class="btn primary" data-action="newContact">+ Contact</button></div>
    <div class="row gap">
      <input class="search grow" type="search" placeholder="Search people & companies…" value="${esc(state.contactSearch)}" data-search="contactSearch" data-target="contactList">
      <select class="role-filter" data-change="contactRole"><option value="">All roles</option>${C.CONTACT_ROLES.map((r) => `<option ${r === state.contactRole ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    </div>
    <div id="contactList">${contactList()}</div>`;

  views.contact = (id) => {
    const c = S.get('contacts', id);
    if (!c) return `<p>Contact not found. <a href="#/contacts">Back</a></p>`;
    const jobs = S.all('projects').filter((p) => p.contacts.some((pc) => pc.contactId === c.id));
    const logs = [];
    S.all('projects').forEach((p) => p.log.forEach((l) => { if (l.contactId === c.id) logs.push({ p, l }); }));
    logs.sort((a, b) => b.l.date.localeCompare(a.l.date));
    const tasks = S.all('tasks').filter((t) => t.contactId === c.id).sort(byDue);
    return `
      <a class="back" href="#/contacts">← Contacts</a>
      <div class="row between wrap gap"><h1>${esc(c.name)}</h1><button class="btn ghost" data-action="editContact" data-id="${c.id}">Edit</button></div>
      <div class="muted">${[c.role, c.company].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="pills big">${contactActions(c)}</div>
      <section class="panel details">
        ${c.phone ? `<div><span>Phone</span>${U.telLink(c.phone)}</div>` : ''}
        ${c.email ? `<div><span>Email</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>` : ''}
        ${c.address ? `<div><span>Address</span>${U.mapLink(c.address)}</div>` : ''}
      </section>
      ${c.notes ? `<section class="panel"><h3>Notes</h3><div class="pre">${esc(c.notes)}</div></section>` : ''}
      <section class="panel">
        <div class="row between"><h3>Jobs</h3><button class="btn tiny" data-action="newLead" data-contact="${c.id}">+ New job</button></div>
        ${jobs.map((p) => projectCard(p, `<div class="small">Role: ${esc((p.contacts.find((pc) => pc.contactId === c.id) || {}).role || c.role || '')}</div>`)).join('') || empty('Not linked to any jobs.')}
      </section>
      <section class="panel">
        <div class="row between"><h3>Follow-ups</h3><button class="btn tiny" data-action="newTask" data-contact="${c.id}">+ Follow-up</button></div>
        ${tasks.map((t) => taskRow(t)).join('') || empty('None.')}
      </section>
      <section class="panel">
        <h3>Conversation history</h3>
        ${logs.map(({ p, l }) => logRow(p, l, { showProject: true })).join('') || empty('No logged conversations.')}
      </section>`;
  };

  // ---------------- Settings ----------------
  views.settings = () => {
    const st = S.db.settings;
    const counts = ['projects', 'contacts', 'events', 'tasks'].map((k) => `${S.all(k).length} ${k}`).join(' · ');
    return `
      <h1>Settings</h1>
      <section class="panel">
        <h3>You</h3>
        <label class="field"><span>Your first name (for the greeting)</span><input id="set_name" value="${esc(st.userName)}"></label>
        <button class="btn primary" data-action="saveName">Save</button>
      </section>
      <section class="panel">
        <h3>Backup & restore</h3>
        <p class="small muted">Everything is stored only in this browser on this device (${counts}). Export a backup file regularly and keep it in iCloud/Google Drive/email. Import it to restore or move to a new phone.</p>
        <p class="small">Last backup: <b>${st.lastBackup ? esc(U.fmtDate(st.lastBackup.slice(0, 10))) : 'never'}</b></p>
        <div class="row gap wrap">
          <button class="btn primary" data-action="exportData">Export backup</button>
          <label class="btn">Import backup<input type="file" accept=".json,application/json" hidden data-change="importData"></label>
        </div>
      </section>
      <section class="panel">
        <h3>Brands by product category</h3>
        <p class="small muted">One brand per line. These show up as suggestions when you add products.</p>
        ${C.CATEGORIES.map((cat) => `<label class="field"><span>${esc(cat)}</span><textarea rows="3" data-brand-cat="${esc(cat)}">${esc((st.brands[cat] || []).join('\n'))}</textarea></label>`).join('')}
        <button class="btn primary" data-action="saveBrands">Save brands</button>
      </section>
      <section class="panel">
        <h3>Data</h3>
        <div class="row gap wrap">
          <button class="btn" data-action="loadSample">Load sample data</button>
          <button class="btn danger" data-action="resetData">Erase everything</button>
        </div>
      </section>
      <p class="small muted center">Window Covering Job Tracker · works offline · add to home screen from your browser's Share menu</p>`;
  };

  // ======================================================================
  // Forms
  // ======================================================================
  function leadForm(prefill = {}) {
    const fields = [
      { name: 'existingContact', label: 'Client', type: 'select', options: contactOptions('➕ New person (fill in below)') },
      { name: 'clientName', label: 'Name', placeholder: 'e.g. Sarah Johnson', half: true },
      { name: 'clientRole', label: 'They are a…', type: 'select', options: C.CONTACT_ROLES, default: 'Homeowner', half: true },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'company', label: 'Company (designers, builders)' },
      { name: 'name', label: 'Job name', placeholder: 'Leave blank to use client name, e.g. “Johnson – Lakeview Dr”' },
      { name: 'address', label: 'Job address' },
      { name: 'type', label: 'Job type', type: 'select', options: C.PROJECT_TYPES, half: true },
      { name: 'source', label: 'Lead source', type: 'select', options: ['', ...C.LEAD_SOURCES], half: true },
      { name: 'referredBy', label: 'Referred by / designer / builder', type: 'select', options: contactOptions() },
      { name: 'estValue', label: 'Rough budget / estimate ($)', type: 'number', half: true },
      { name: 'interest', label: 'Interested in', placeholder: 'e.g. motorized shades, shutters, patio screens', half: true },
      { name: 'consultDate', label: 'Consult date (optional)', type: 'date', half: true },
      { name: 'consultTime', label: 'Consult time', type: 'time', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ];
    U.openForm({
      title: 'New lead',
      fields,
      values: { existingContact: prefill.contactId || '' },
      submitLabel: 'Create lead',
      after(form) {
        const toggle = () => {
          const existing = !!form.elements.existingContact.value;
          ['clientName', 'clientRole', 'phone', 'email', 'company'].forEach((n) => { form.elements[n].closest('.field').style.display = existing ? 'none' : ''; });
        };
        form.elements.existingContact.addEventListener('change', toggle);
        toggle();
      },
      onSubmit(d) {
        let contact;
        if (d.existingContact) contact = S.get('contacts', d.existingContact);
        else {
          if (!d.clientName) { U.toast('Enter a client name or pick an existing contact'); return false; }
          contact = S.upsert('contacts', { name: d.clientName, role: d.clientRole, phone: d.phone, email: d.email, company: d.company, address: d.address, notes: '' });
        }
        const contacts = [{ contactId: contact.id, role: contact.role }];
        if (d.referredBy && d.referredBy !== contact.id) {
          const r = S.get('contacts', d.referredBy);
          contacts.push({ contactId: r.id, role: r.role });
        }
        const p = S.upsert('projects', {
          name: d.name || `${contact.name}${d.address ? ' – ' + d.address.split(',')[0] : ''}`,
          stage: 'lead', type: d.type, source: d.source, address: d.address || contact.address || '',
          estValue: d.estValue, notes: [d.interest && `Interested in: ${d.interest}`, d.notes].filter(Boolean).join('\n'),
          contacts, items: [], phases: [], log: [], stageHistory: [{ stage: 'lead', at: new Date().toISOString() }],
        });
        if (d.consultDate) {
          S.upsert('events', { title: `Consult – ${p.name}`, type: 'sales', projectId: p.id, date: d.consultDate, start: d.consultTime, end: '', days: 1, location: p.address, notes: '', done: false });
          S.setStage(p, 'consult');
        } else {
          S.upsert('tasks', { title: 'Call to schedule consult', due: U.addDays(U.today(), 1), projectId: p.id, contactId: contact.id, done: false });
        }
        U.toast(d.consultDate ? 'Lead created and consult scheduled' : 'Lead created with a follow-up for tomorrow');
        go(`#/project/${p.id}`);
      },
    });
  }

  function projectForm(p) {
    const fields = [
      { name: 'name', label: 'Job name', required: true },
      { name: 'address', label: 'Job address' },
      { name: 'type', label: 'Job type', type: 'select', options: C.PROJECT_TYPES, half: true },
      { name: 'source', label: 'Lead source', type: 'select', options: ['', ...C.LEAD_SOURCES], half: true },
      { name: 'estValue', label: 'Estimate ($)', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 5 },
    ];
    U.openForm({
      title: 'Edit job', fields, values: p,
      onSubmit(d) { Object.assign(p, d); S.touch(p); render(); },
      onDelete() { S.remove('projects', p.id); go('#/sales'); U.toast('Job deleted'); },
    });
  }

  function contactForm(c = {}, onSaved) {
    const fields = [
      { name: 'name', label: 'Name', required: true },
      { name: 'role', label: 'Role', type: 'select', options: C.CONTACT_ROLES, half: true },
      { name: 'company', label: 'Company', half: true },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'address', label: 'Address' },
      { name: 'notes', label: 'Notes (preferences, how they like to communicate…)', type: 'textarea' },
    ];
    U.openForm({
      title: c.id ? 'Edit contact' : 'New contact', fields, values: c,
      onSubmit(d) {
        const saved = S.upsert('contacts', c.id ? { ...d, id: c.id } : d);
        if (onSaved) onSaved(saved); else if (!c.id) go(`#/contact/${saved.id}`); else render();
      },
      onDelete: c.id ? () => { S.remove('contacts', c.id); go('#/contacts'); } : null,
    });
  }

  function addPersonForm(p) {
    const fields = [
      { name: 'contactId', label: 'Person', type: 'select', options: contactOptions('➕ New person (fill in below)') },
      { name: 'name', label: 'Name', half: true },
      { name: 'company', label: 'Company', half: true },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'role', label: 'Role on this job', type: 'select', options: C.CONTACT_ROLES },
    ];
    U.openForm({
      title: 'Add person to job', fields, values: { role: 'Interior Designer' },
      after(form) {
        const toggle = () => {
          const existing = !!form.elements.contactId.value;
          ['name', 'company', 'phone', 'email'].forEach((n) => { form.elements[n].closest('.field').style.display = existing ? 'none' : ''; });
          if (existing) { const c = S.get('contacts', form.elements.contactId.value); if (c && c.role) form.elements.role.value = c.role; }
        };
        form.elements.contactId.addEventListener('change', toggle);
        toggle();
      },
      onSubmit(d) {
        let id = d.contactId;
        if (!id) {
          if (!d.name) { U.toast('Pick a person or enter a name'); return false; }
          id = S.upsert('contacts', { name: d.name, company: d.company, phone: d.phone, email: d.email, role: d.role, address: '', notes: '' }).id;
        }
        if (p.contacts.some((pc) => pc.contactId === id)) { U.toast('Already on this job'); return false; }
        p.contacts.push({ contactId: id, role: d.role });
        S.touch(p); render();
      },
    });
  }

  function eventForm(e = {}, defaults = {}) {
    const isNew = !e.id;
    const p0 = S.get('projects', e.projectId || defaults.projectId || '');
    const fields = [
      { name: 'type', label: 'Type', type: 'select', options: C.EVENT_TYPES.map((t) => ({ value: t.id, label: t.label })), half: true },
      { name: 'projectId', label: 'Job', type: 'select', options: projectOptions(e.projectId), half: true },
      { name: 'title', label: 'Title', placeholder: 'Leave blank to auto-name, e.g. “Install – Johnson”' },
      { name: 'date', label: 'Date', type: 'date', required: true, half: true },
      { name: 'days', label: 'Number of days', type: 'number', step: 1, half: true },
      { name: 'start', label: 'Start time', type: 'time', half: true },
      { name: 'end', label: 'End time', type: 'time', half: true },
      { name: 'location', label: 'Location' },
      { name: 'notes', label: 'Notes (who will be there, what to bring, what to cover)', type: 'textarea' },
      ...(isNew ? [] : [{ name: 'done', label: 'Done / wrapped up', type: 'checkbox' }]),
    ];
    const sec = p0 ? section(p0) : 'sales';
    const values = isNew
      ? { type: defaults.type || (sec === 'install' ? 'install' : 'sales'), projectId: p0 ? p0.id : '', date: defaults.date || U.today(), days: 1, location: p0 ? p0.address : '' }
      : e;
    U.openForm({
      title: isNew ? 'New appointment' : 'Edit appointment', fields, values,
      after(form) {
        form.elements.projectId.addEventListener('change', () => {
          const p = S.get('projects', form.elements.projectId.value);
          if (p && !form.elements.location.value) form.elements.location.value = p.address || '';
        });
      },
      onSubmit(d) {
        const p = S.get('projects', d.projectId);
        d.days = Math.max(1, Math.round(Number(d.days) || 1));
        if (!d.title) d.title = `${C.eventType(d.type).label}${p ? ' – ' + p.name : ''}`;
        if (isNew) d.done = false;
        S.upsert('events', isNew ? d : { ...d, id: e.id });
        if (isNew && p && p.stage === 'lead' && (d.type === 'sales' || d.type === 'measure')) {
          S.setStage(p, 'consult');
          U.toast('Scheduled — job moved to “Consult Scheduled”');
        } else U.toast('Saved');
        render();
      },
      onDelete: isNew ? null : () => { S.remove('events', e.id); render(); },
    });
  }

  const logTypeFor = { sales: 'Meeting', measure: 'Site visit', install: 'Site visit', prewire: 'Site visit', service: 'Site visit', meeting: 'Meeting', other: 'Note' };

  function wrapUpForm(e) {
    const p = S.get('projects', e.projectId);
    const fields = [
      { name: 'summary', label: 'What happened? (decisions, products discussed, measurements, next steps)', type: 'textarea', rows: 5, required: true },
      ...(p ? [{ name: 'stage', label: 'Move job to', type: 'select', options: C.STAGES.map((s) => ({ value: s.id, label: s.label })) }] : []),
      { name: 'followDate', label: 'Next follow-up date', type: 'date', half: true },
      { name: 'followTitle', label: 'Follow-up', placeholder: 'e.g. Send proposal', half: true },
    ];
    const suggested = p && p.stage === 'consult' && e.type === 'sales' ? 'quoting' : p && p.stage;
    U.openForm({
      title: `Wrap up: ${e.title}`, fields,
      values: { stage: suggested, followDate: U.addDays(U.today(), 2), followTitle: p && section(p) === 'sales' ? 'Send proposal / follow up' : 'Follow up' },
      submitLabel: 'Save & close out',
      onSubmit(d) {
        e.done = true;
        S.upsert('events', e);
        if (p) {
          p.log.push({ id: S.uid(), date: e.date, type: logTypeFor[e.type] || 'Note', contactId: '', summary: `[${e.title}] ${d.summary}` });
          S.setStage(p, d.stage);
          S.touch(p);
        }
        if (d.followDate) S.upsert('tasks', { title: d.followTitle || 'Follow up', due: d.followDate, projectId: e.projectId || '', contactId: '', done: false });
        U.toast('Wrapped up');
        render();
      },
    });
  }

  function taskForm(t = {}, defaults = {}) {
    const isNew = !t.id;
    const fields = [
      { name: 'title', label: 'What needs to happen?', required: true, placeholder: 'e.g. Call designer about fabric samples' },
      { name: 'due', label: 'Due', type: 'date', required: true, half: true },
      { name: 'projectId', label: 'Job', type: 'select', options: projectOptions(t.projectId), half: true },
      { name: 'contactId', label: 'Person', type: 'select', options: contactOptions() },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
      ...(isNew ? [] : [{ name: 'done', label: 'Done', type: 'checkbox' }]),
    ];
    const quick = `<div class="row gap wrap quick-dates">${[['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30]].map(([l, n]) => `<button type="button" class="chip" data-days="${n}">${l}</button>`).join('')}</div>`;
    U.openForm({
      title: isNew ? 'New follow-up' : 'Edit follow-up', fields, intro: quick,
      values: isNew ? { due: U.addDays(U.today(), 2), projectId: defaults.projectId || '', contactId: defaults.contactId || '' } : t,
      after(form) {
        form.querySelectorAll('.quick-dates [data-days]').forEach((b) => b.addEventListener('click', () => { form.elements.due.value = U.addDays(U.today(), Number(b.dataset.days)); }));
      },
      onSubmit(d) {
        if (isNew) d.done = false;
        S.upsert('tasks', isNew ? d : { ...d, id: t.id });
        render();
      },
      onDelete: isNew ? null : () => { S.remove('tasks', t.id); render(); },
    });
  }

  function logForm(p, l = {}) {
    const isNew = !l.id;
    const pcs = p ? S.projectContacts(p) : [];
    const people = [{ value: '', label: '— none —' }, ...pcs.map((pc) => ({ value: pc.contact.id, label: `${pc.contact.name} (${pc.role || pc.contact.role || ''})` })),
      ...S.all('contacts').filter((c) => !pcs.some((pc) => pc.contact.id === c.id)).sort(byName).map((c) => ({ value: c.id, label: c.name }))];
    const fields = [
      ...(p ? [] : [{ name: 'projectId', label: 'Job', type: 'select', options: projectOptions(), required: true }]),
      { name: 'type', label: 'Type', type: 'select', options: C.LOG_TYPES, half: true },
      { name: 'date', label: 'Date', type: 'date', required: true, half: true },
      { name: 'contactId', label: 'With', type: 'select', options: people },
      { name: 'summary', label: 'Summary (what was discussed / decided)', type: 'textarea', rows: 5, required: true },
      ...(isNew ? [{ name: 'followDate', label: 'Follow-up date (optional)', type: 'date', half: true }, { name: 'followTitle', label: 'Follow-up', half: true }] : []),
    ];
    U.openForm({
      title: isNew ? 'Log call / note' : 'Edit entry', fields,
      values: isNew ? { type: 'Call', date: U.today(), contactId: pcs[0] ? pcs[0].contact.id : '' } : l,
      onSubmit(d) {
        const proj = p || S.get('projects', d.projectId);
        if (!proj) { U.toast('Pick a job'); return false; }
        const entry = { id: l.id || S.uid(), date: d.date, type: d.type, contactId: d.contactId, summary: d.summary };
        if (isNew) proj.log.push(entry);
        else Object.assign(proj.log.find((x) => x.id === l.id), entry);
        if (isNew && d.followDate) S.upsert('tasks', { title: d.followTitle || 'Follow up', due: d.followDate, projectId: proj.id, contactId: d.contactId, done: false });
        S.touch(proj);
        render();
      },
      onDelete: isNew ? null : () => { p.log = p.log.filter((x) => x.id !== l.id); S.touch(p); render(); },
    });
  }

  function itemForm(p, i = {}) {
    const isNew = !i.id;
    const rooms = [...new Set(p.items.map((x) => x.room).filter(Boolean))];
    const roomList = [...new Set([...rooms, 'Living Room', 'Kitchen', 'Dining', 'Primary Bedroom', 'Primary Bath', 'Bedroom 2', 'Bedroom 3', 'Office', 'Family Room', 'Great Room', 'Laundry', 'Patio', 'Lanai'])];
    const fields = [
      { name: 'room', label: 'Room', list: roomList, half: true, required: true },
      { name: 'location', label: 'Window / location', placeholder: 'e.g. Left of sink, Slider', half: true },
      { name: 'category', label: 'Category', type: 'select', options: C.CATEGORIES, half: true },
      { name: 'brand', label: 'Brand', list: [], half: true },
      { name: 'product', label: 'Product / line', placeholder: 'e.g. Duette, Silhouette, Palm Beach', half: true },
      { name: 'color', label: 'Fabric / color', half: true },
      { name: 'width', label: 'Width (in)', placeholder: '34 3/8', half: true },
      { name: 'height', label: 'Height (in)', placeholder: '60 1/4', half: true },
      { name: 'mount', label: 'Mount', type: 'select', options: ['', ...C.MOUNTS], half: true },
      { name: 'control', label: 'Control / power', type: 'select', options: ['', ...C.CONTROLS], half: true },
      { name: 'qty', label: 'Qty', type: 'number', step: 1, half: true },
      { name: 'price', label: 'Price each ($)', type: 'number', half: true },
      { name: 'status', label: 'Status', type: 'select', options: C.ITEM_STATUSES },
      { name: 'notes', label: 'Notes (stack direction, obstructions, wiring location…)', type: 'textarea', rows: 2 },
    ];
    const last = p.items[p.items.length - 1];
    U.openForm({
      title: isNew ? 'Add window / product' : 'Edit product', fields,
      values: isNew ? { qty: 1, status: 'Quoted', category: last ? last.category : 'Shades', room: last ? last.room : '', brand: last ? last.brand : '', product: last ? last.product : '', mount: last ? last.mount : '', control: last ? last.control : '' } : i,
      after(form) {
        const dl = form.querySelector('#dl_brand');
        const fill = () => { dl.innerHTML = (S.db.settings.brands[form.elements.category.value] || []).map((b) => `<option value="${esc(b)}">`).join(''); };
        form.elements.category.addEventListener('change', fill);
        fill();
      },
      onSubmit(d) {
        if (isNew) p.items.push({ ...d, id: S.uid() });
        else Object.assign(p.items.find((x) => x.id === i.id), d);
        S.touch(p); render();
      },
      onDelete: isNew ? null : () => { p.items = p.items.filter((x) => x.id !== i.id); S.touch(p); render(); },
    });
  }

  function phaseForm(p, ph = {}) {
    const isNew = !ph.id;
    const fields = [
      { name: 'name', label: 'Phase', required: true, placeholder: 'e.g. Run wire to windows' },
      { name: 'status', label: 'Status', type: 'select', options: C.PHASE_STATUSES, half: true },
      { name: 'date', label: 'Target date', type: 'date', half: true },
      { name: 'waitingOn', label: 'Depends on / waiting on', list: ['Framing', 'Electrician', 'Drywall', 'Drywall / Paint', 'Paint', 'Trim carpenter', 'AV / Electrician', 'Builder', 'Homeowner decision', 'Designer approval', 'Product delivery'] },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ];
    U.openForm({
      title: isNew ? 'New phase' : 'Edit phase', fields, values: isNew ? { status: 'To do' } : ph,
      onSubmit(d) {
        if (isNew) p.phases.push({ ...d, id: S.uid() });
        else Object.assign(p.phases.find((x) => x.id === ph.id), d);
        S.touch(p); render();
      },
      onDelete: isNew ? null : () => { p.phases = p.phases.filter((x) => x.id !== ph.id); S.touch(p); render(); },
    });
  }

  // ======================================================================
  // Exports
  // ======================================================================
  function icsFor(e) {
    const p = e.projectId && S.get('projects', e.projectId);
    const d = (s) => s.replace(/-/g, '');
    const t = (s) => s.replace(':', '') + '00';
    const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
    const days = Math.max(1, e.days || 1);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WC Tracker//EN', 'BEGIN:VEVENT',
      `UID:${e.id}@wc-tracker`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `SUMMARY:${escI(e.title)}`];
    if (e.start) {
      const end = e.end || `${String(Math.min(23, Number(e.start.slice(0, 2)) + 1)).padStart(2, '0')}${e.start.slice(2)}`;
      lines.push(`DTSTART:${d(e.date)}T${t(e.start)}`, `DTEND:${d(e.date)}T${t(end)}`);
      if (days > 1) lines.push(`RRULE:FREQ=DAILY;COUNT=${days}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${d(U.addDays(e.date, days))}`);
    }
    if (e.location) lines.push(`LOCATION:${escI(e.location)}`);
    lines.push(`DESCRIPTION:${escI([p && 'Job: ' + p.name, e.notes].filter(Boolean).join('\n'))}`, 'END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function orderList(p) {
    const byBrand = {};
    p.items.filter((i) => i.status === 'Quoted' || i.status === 'Ordered' || !i.status).forEach((i) => {
      const k = `${i.brand || 'No brand'} — ${i.product || i.category || ''}`;
      (byBrand[k] = byBrand[k] || []).push(i);
    });
    let out = `${p.name}\n${p.address || ''}\n`;
    for (const k of Object.keys(byBrand).sort()) {
      out += `\n${k}\n`;
      byBrand[k].forEach((i) => {
        out += `  • ${i.room}${i.location ? ' / ' + i.location : ''}: ${i.width || '?'} x ${i.height || '?'}${i.mount ? ', ' + i.mount : ''}${i.color ? ', ' + i.color : ''}${i.control ? ', ' + i.control : ''}${(Number(i.qty) || 1) > 1 ? ', qty ' + i.qty : ''}${i.notes ? ' — ' + i.notes : ''}\n`;
      });
    }
    return out;
  }

  // ======================================================================
  // Sample data
  // ======================================================================
  function loadSample() {
    const t = U.today();
    const iso = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
    const c = (o) => S.upsert('contacts', { address: '', notes: '', company: '', email: '', ...o });
    const sarah = c({ name: 'Sarah Johnson', role: 'Homeowner', phone: '(555) 201-3344', email: 'sarah@example.com', address: '42 Lakeview Dr' });
    const dana = c({ name: 'Dana Ruiz', role: 'Interior Designer', company: 'Ruiz Interiors', phone: '(555) 410-7788', email: 'dana@example.com', notes: 'Prefers texts. Likes to see fabric samples in person.' });
    const mike = c({ name: 'Mike Patterson', role: 'Builder / GC', company: 'Patterson Homes', phone: '(555) 330-1200' });
    const ed = c({ name: 'Ed Lin', role: 'Electrician', company: 'Bright Electric', phone: '(555) 778-0099' });
    const tom = c({ name: 'Tom & Lisa Greene', role: 'Homeowner', phone: '(555) 600-4512', address: '9 Harbor Ct' });

    const proj = (o) => S.upsert('projects', { items: [], phases: [], log: [], notes: '', estValue: '', ...o });
    const p1 = proj({ name: 'Johnson – Lakeview Dr', stage: 'consult', type: 'Existing home', source: 'Interior designer', address: '42 Lakeview Dr',
      contacts: [{ contactId: sarah.id, role: 'Homeowner' }, { contactId: dana.id, role: 'Interior Designer' }],
      notes: 'Interested in: motorized shades for great room, shutters in bedrooms', estValue: 8500,
      stageHistory: [{ stage: 'lead', at: iso(-5) }, { stage: 'consult', at: iso(-4) }],
      log: [{ id: S.uid(), date: U.addDays(t, -5), type: 'Call', contactId: dana.id, summary: 'Dana referred Sarah. Great room has 6 tall windows facing west.' }] });
    S.upsert('events', { title: 'Consult – Johnson', type: 'sales', projectId: p1.id, date: U.addDays(t, 1), start: '10:00', end: '11:30', days: 1, location: p1.address, notes: 'Bring Duette & shutter samples. Dana will join.', done: false });

    const p2 = proj({ name: 'Greene – Harbor Ct', stage: 'proposal', type: 'Existing home', source: 'Referral', address: '9 Harbor Ct',
      contacts: [{ contactId: tom.id, role: 'Homeowner' }], estValue: 4200,
      stageHistory: [{ stage: 'lead', at: iso(-20) }, { stage: 'quoting', at: iso(-12) }, { stage: 'proposal', at: iso(-9) }],
      items: [
        { id: S.uid(), room: 'Patio', location: 'South opening', category: 'Outdoor Screens & Shades', brand: 'Phantom Screens', product: 'Executive', color: 'Charcoal 90%', width: '144', height: '96', mount: 'Outside', control: 'Motorized – hardwired', qty: 1, price: 3200, status: 'Quoted', notes: '' },
        { id: S.uid(), room: 'Kitchen', location: 'Over sink', category: 'Shades', brand: 'Hunter Douglas', product: 'Vignette', color: 'Linen', width: '36 1/2', height: '48', mount: 'Inside', control: 'Cordless', qty: 1, price: 1000, status: 'Quoted', notes: '' },
      ],
      log: [{ id: S.uid(), date: U.addDays(t, -9), type: 'Email', contactId: tom.id, summary: 'Sent proposal. They want to think about the patio screen color.' }] });
    S.upsert('tasks', { title: 'Follow up on proposal', due: U.addDays(t, -2), projectId: p2.id, contactId: tom.id, done: false });

    const p3 = proj({ name: 'Patterson Homes – Lot 14', stage: 'waiting', type: 'New construction', source: 'Builder / contractor', address: '1400 Ridge Rd',
      contacts: [{ contactId: mike.id, role: 'Builder / GC' }, { contactId: dana.id, role: 'Interior Designer' }, { contactId: ed.id, role: 'Electrician' }], estValue: 38000,
      stageHistory: [{ stage: 'lead', at: iso(-60) }, { stage: 'sold', at: iso(-40) }, { stage: 'prewire', at: iso(-30) }, { stage: 'waiting', at: iso(-14) }],
      phases: C.PHASE_TEMPLATE.map((ph, i) => ({ id: S.uid(), name: ph.name, waitingOn: ph.waitingOn, notes: '', date: i === 3 ? U.addDays(t, 18) : '', status: i < 3 ? 'Done' : i === 3 ? 'Waiting' : 'To do' })),
      items: ['Great Room', 'Great Room', 'Primary Bedroom', 'Primary Bath', 'Office'].map((room, i) => ({ id: S.uid(), room, location: `Window ${i + 1}`, category: 'Shades', brand: 'Lutron', product: 'Sivoia QS Roller', color: 'Basketweave 3%', width: '', height: '', mount: 'Pocket', control: 'Motorized – hardwired', qty: 1, price: 1800, status: 'Quoted', notes: 'Wire pulled to left side' })),
      log: [{ id: S.uid(), date: U.addDays(t, -30), type: 'Site visit', contactId: ed.id, summary: 'Ran low-voltage to all 5 shade pockets with Ed. Marked headers for blocking.' },
        { id: S.uid(), date: U.addDays(t, -7), type: 'Call', contactId: mike.id, summary: 'Mike says drywall starts in ~2 weeks. Will call when paint is done.' }] });
    S.upsert('events', { title: 'Site meeting – Patterson Lot 14', type: 'meeting', projectId: p3.id, date: U.addDays(t, 3), start: '08:00', end: '09:00', days: 1, location: p3.address, notes: 'Walk with Mike & Dana, confirm pocket sizes.', done: false });
    S.upsert('tasks', { title: 'Check with Mike on drywall schedule', due: U.addDays(t, 7), projectId: p3.id, contactId: mike.id, done: false });

    const p4 = proj({ name: 'Kim – Maple St', stage: 'install', type: 'Existing home', source: 'Website', address: '77 Maple St',
      contacts: [], estValue: 2600, stageHistory: [{ stage: 'lead', at: iso(-25) }, { stage: 'sold', at: iso(-18) }, { stage: 'install', at: iso(0) }],
      items: ['Living Room', 'Living Room', 'Bedroom 2'].map((room, i) => ({ id: S.uid(), room, location: `Window ${i + 1}`, category: 'Shutters', brand: 'Norman', product: 'Woodlore', color: 'Pure White', width: '30', height: '54', mount: 'Inside', control: '', qty: 1, price: 850, status: i === 0 ? 'Installed' : 'Received', notes: '' })) });
    S.upsert('events', { title: 'Install – Kim', type: 'install', projectId: p4.id, date: t, start: '09:00', end: '15:00', days: 2, location: p4.address, notes: '', done: false });
    S.upsert('events', { title: 'Measure – Greene patio', type: 'measure', projectId: p2.id, date: U.addDays(t, -3), start: '13:00', end: '14:00', days: 1, location: p2.address, notes: '', done: false });
    U.toast('Sample data loaded');
    go('#/home');
  }

  // ======================================================================
  // Actions (event delegation: data-action / data-change / data-search)
  // ======================================================================
  const proj = (ds) => S.get('projects', ds.project);

  const actions = {
    newLead: (ds) => leadForm({ contactId: ds.contact }),
    editProject: (ds) => projectForm(S.get('projects', ds.id)),
    addPerson: (ds) => addPersonForm(proj(ds)),
    removePerson: (ds) => { const p = proj(ds); p.contacts = p.contacts.filter((pc) => pc.contactId !== ds.id); S.touch(p); render(); },

    newEvent: (ds) => eventForm({}, { projectId: ds.project, date: ds.date, type: ds.type }),
    editEvent: (ds) => eventForm(S.get('events', ds.id)),
    wrapUp: (ds) => wrapUpForm(S.get('events', ds.id)),
    icsEvent: (ds) => { const e = S.get('events', ds.id); U.download(`${e.title.replace(/[^\w-]+/g, '_')}.ics`, icsFor(e), 'text/calendar'); },

    newTask: (ds) => taskForm({}, { projectId: ds.project, contactId: ds.contact }),
    editTask: (ds) => taskForm(S.get('tasks', ds.id)),
    toggleTask: (ds) => { const t = S.get('tasks', ds.id); t.done = !t.done; t.doneAt = t.done ? new Date().toISOString() : null; S.save(); setTimeout(render, 250); },
    snooze: (ds) => { const t = S.get('tasks', ds.id); t.due = U.addDays(t.due < U.today() ? U.today() : t.due, Number(ds.days)); S.save(); render(); U.toast(`Moved to ${U.relDate(t.due)}`); },

    newLog: (ds) => logForm(ds.project ? proj(ds) : null),
    editLog: (ds) => { const p = proj(ds); logForm(p, p.log.find((l) => l.id === ds.id)); },

    newItem: (ds) => itemForm(proj(ds)),
    editItem: (ds) => { const p = proj(ds); itemForm(p, p.items.find((i) => i.id === ds.id)); },
    dupItem: (ds) => {
      const p = proj(ds); const i = p.items.find((x) => x.id === ds.id);
      const copy = { ...i, id: S.uid(), location: '', width: '', height: '' };
      p.items.splice(p.items.indexOf(i) + 1, 0, copy);
      S.touch(p); render(); itemForm(p, copy);
    },
    cycleItem: (ds) => {
      const p = proj(ds); const i = p.items.find((x) => x.id === ds.id);
      const flow = ['Quoted', 'Ordered', 'Received', 'Installed'];
      i.status = flow[(flow.indexOf(i.status) + 1) % flow.length];
      S.touch(p); render();
    },
    copyOrder: (ds) => {
      const text = orderList(proj(ds));
      U.openInfo('Order list (quoted & ordered items)', `<textarea class="order-text" rows="14" readonly>${esc(text)}</textarea><button class="btn primary" id="copyBtn">Copy to clipboard</button>`);
      document.getElementById('copyBtn').addEventListener('click', () => {
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => U.toast('Copied'), () => { document.querySelector('.order-text').select(); U.toast('Select & copy the text'); });
      });
    },

    newPhase: (ds) => phaseForm(proj(ds)),
    editPhase: (ds) => { const p = proj(ds); phaseForm(p, p.phases.find((x) => x.id === ds.id)); },
    phaseTemplate: (ds) => {
      const p = proj(ds);
      C.PHASE_TEMPLATE.forEach((ph) => p.phases.push({ id: S.uid(), name: ph.name, waitingOn: ph.waitingOn, status: 'To do', date: '', notes: '' }));
      S.touch(p); render(); U.toast('Phases added. Edit or delete any that don\'t apply.');
    },
    cyclePhase: (ds) => {
      const p = proj(ds); const ph = p.phases.find((x) => x.id === ds.id);
      ph.status = C.PHASE_STATUSES[(C.PHASE_STATUSES.indexOf(ph.status) + 1) % C.PHASE_STATUSES.length];
      S.touch(p); render();
    },
    movePhase: (ds) => {
      const p = proj(ds); const i = p.phases.findIndex((x) => x.id === ds.id); const j = i + Number(ds.dir);
      if (j < 0 || j >= p.phases.length) return;
      [p.phases[i], p.phases[j]] = [p.phases[j], p.phases[i]];
      S.touch(p); render();
    },

    newContact: () => contactForm(),
    editContact: (ds) => contactForm(S.get('contacts', ds.id)),

    setFilter: (ds) => { state[ds.key] = ds.value; render(); },
    week: (ds) => { const n = Number(ds.dir); state.weekOf = n === 0 ? U.weekStart(U.today()) : U.addDays(state.weekOf, 7 * n); render(); },

    saveName: () => { S.db.settings.userName = document.getElementById('set_name').value.trim(); S.save(); U.toast('Saved'); },
    saveBrands: () => {
      document.querySelectorAll('[data-brand-cat]').forEach((ta) => { S.db.settings.brands[ta.dataset.brandCat] = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); });
      S.save(); U.toast('Brands saved');
    },
    exportData: () => { U.download(`wc-tracker-backup-${U.today()}.json`, S.exportJSON(), 'application/json'); render(); },
    loadSample: () => { if (!S.all('projects').length) loadSample(); else U.ask('Add sample jobs and contacts alongside your data?', loadSample, 'Add samples'); },
    resetData: () => U.ask(WC.DEMO ? 'Erase all demo data and start from an empty app?' : 'Erase ALL jobs, contacts, appointments and follow-ups on this device? Export a backup first!', () => { S.reset(); go('#/home'); }, 'Erase everything'),
    resetDemo: () => U.ask('Put the sample data back the way it started?', () => { S.reset(); loadSample(); }, 'Reset demo'),
  };

  const changes = {
    setStage: (el) => {
      const p = S.get('projects', el.dataset.id);
      const task = S.setStage(p, el.value);
      U.toast(task ? `Stage updated. Added follow-up: “${task.title}”` : 'Stage updated');
      render();
    },
    bulkStatus: (el) => {
      const status = el.value;
      el.value = '';
      if (!status) return;
      const p = proj(el.dataset);
      U.ask(`Mark all ${p.items.length} products as ${status}?`, () => { p.items.forEach((i) => { i.status = status; }); S.touch(p); render(); }, 'Mark all');
    },
    contactRole: (el) => { state.contactRole = el.value; document.getElementById('contactList').innerHTML = contactList(); },
    importData: (el) => {
      const f = el.files[0];
      if (!f) return;
      el.value = '';
      U.ask('Replace everything on this device with the backup file?', () => {
        f.text().then((txt) => { S.importJSON(txt); U.toast('Backup restored'); render(); }).catch((e) => U.toast('Import failed: ' + e.message));
      }, 'Replace');
    },
  };

  const searchRenderers = { salesList: () => pipelineList('sales', 'salesFilter', 'salesSearch'), installList: () => pipelineList('install', 'installFilter', 'installSearch'), contactList };

  document.addEventListener('click', (ev) => {
    if (WC.DEMO) {
      const a = ev.target.closest('a[href^="#/"]');
      if (a && !a.dataset.action) { ev.preventDefault(); go(a.getAttribute('href')); return; }
    }
    const el = ev.target.closest('[data-action]');
    if (!el || el.closest('dialog')) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    if (el.tagName !== 'INPUT') ev.preventDefault();
    if (el.dataset.action === 'setFilter' && el.getAttribute('href')) { state[el.dataset.key] = el.dataset.value; go(el.getAttribute('href')); return; }
    fn(el.dataset, el);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (el && !el.closest('dialog') && changes[el.dataset.change]) changes[el.dataset.change](el);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (!el.dataset || !el.dataset.search) return;
    state[el.dataset.search] = el.value;
    document.getElementById(el.dataset.target).innerHTML = searchRenderers[el.dataset.target]();
  });

  // ======================================================================
  // Router
  // ======================================================================
  function parseRoute() {
    const [view, id, sub] = (currentHash().replace(/^#\/?/, '') || 'home').split('/');
    return { view: views[view] ? view : 'home', id, sub };
  }

  function render() {
    const r = parseRoute();
    document.getElementById('main').innerHTML = views[r.view](r.id, r.sub);
    let active = r.view;
    if (r.view === 'project') { const p = S.get('projects', r.id); active = p && (section(p) === 'install' || p.stage === 'complete') ? 'installs' : 'sales'; }
    if (r.view === 'contact') active = 'contacts';
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === active));
  }

  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  // Re-render when the app comes back to the foreground so "Today" stays current.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.getElementById('modal').open) render(); });

  WC.render = render;
  if (WC.DEMO && !S.all('projects').length) loadSample();
  render();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
