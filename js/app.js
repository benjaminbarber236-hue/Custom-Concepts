// Views, routing, and actions.
(function () {
  const S = WC.store, U = WC.ui, C = WC.C, esc = U.esc;

  const state = {
    salesFilter: 'active',
    installFilter: 'active',
    salesSearch: '',
    installSearch: '',
    recQuery: '',
    recType: 'all',
    jobStatus: 'all',
    contactRole: '',
    fileFilter: 'all',
    calDay: U.today(),
    calMonth: U.today().slice(0, 8) + '01',
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
  const byDue = (a, b) => `${a.due || ''} ${a.time || ''}`.localeCompare(`${b.due || ''} ${b.time || ''}`);
  const tasksOn = (day) => S.all('tasks').filter((x) => x.due === day).sort(byDue);
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
  // "today" / "tomorrow" / "Wednesday" / "Wed, Oct 14" for use mid-sentence.
  const relIn = (d) => { const r = U.relDate(d); return /^(Today|Tomorrow|Yesterday)$/.test(r) ? r.toLowerCase() : r; };
  const whenText = (e) => `${U.relDate(e.date)}${e.start ? ' at ' + U.fmtTime(e.start) : ''}`;
  const firstName = (c) => (c && c.name ? c.name.split(/[ &]/)[0] : '');
  // Open a follow-up dialog after the current one has closed.
  const later = (fn) => setTimeout(fn, 60);

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
    if (c.phone) out.push(`<a class="pill" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${WC.icon('phone')} Call</a>`, `<a class="pill" href="${esc(sms(c.phone))}">${WC.icon('message')} Text</a>`);
    if (c.email) out.push(`<a class="pill" href="mailto:${esc(c.email)}">${WC.icon('mail')} Email</a>`);
    if (c.address) out.push(`<a class="pill" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(c.address)}">${WC.icon('pin')} Map</a>`);
    return out.join('');
  }

  // ======================================================================
  // Reusable rows / cards
  // ======================================================================
  // One line saying what happens next on a job (shown on job cards).
  function nextLine(p) {
    const ne = nextEvent(p.id);
    if (ne) return `${WC.icon('calendar')} ${esc(C.eventType(ne.type).label)} ${esc(whenText(ne))}`;
    const t = openTasks((x) => x.projectId === p.id)[0];
    if (t) return `<span class="${t.due < U.today() ? 'overdue' : ''}">${WC.icon('clock')} ${esc(t.title)} · ${esc(U.relDate(t.due))}</span>`;
    if (p.stage === 'ordered' && p.eta) return `${WC.icon('clock')} Product expected ${esc(U.fmtDate(p.eta))}`;
    if (section(p) === 'closed') return '';
    return `<span class="warn-text">${WC.icon('clock')} No next step set</span>`;
  }

  function projectCard(p, extra) {
    const pc = S.primaryContact(p);
    const val = projectValue(p);
    const nl = nextLine(p);
    return `<a class="card proj" href="#/project/${p.id}">
      <div class="row between gap"><strong>${esc(p.name)}</strong>${stageBadge(p)}</div>
      <div class="muted small">${[pc && esc(pc.name), esc(p.address || '')].filter(Boolean).join(' · ')}</div>
      ${extra || ''}
      ${nl || val ? `<div class="row between gap small card-foot"><span>${nl}</span><span class="muted">${val ? U.money(val) : ''}</span></div>` : ''}
    </a>`;
  }

  function eventRow(e, opts = {}) {
    const p = e.projectId && S.get('projects', e.projectId);
    const days = Math.max(1, e.days || 1);
    const span = days > 1 ? (opts.day ? `Day ${U.daysBetween(e.date, opts.day) + 1} of ${days}` : `${days} days`) : '';
    // Notes are asked for once the appointment's last day has come (a 2-day install waits for day 2).
    const canWrap = !e.done && lastDay(e) <= U.today();
    const sub = [p && !opts.hideProject ? `<a href="#/project/${p.id}">${esc(p.name)}</a>` : '', span, e.notes ? esc(e.notes) : ''].filter(Boolean).join(' · ');
    return `<div class="item ev ${e.done ? 'done' : ''}">
      <div class="ev-time">${opts.showDate ? `<b>${esc(U.relDate(e.date))}</b><br>` : ''}${e.start ? U.fmtTime(e.start) : 'Any time'}</div>
      <div class="grow">
        <a href="#" class="ev-title" data-action="editEvent" data-id="${e.id}">${typeDot(e.type)}<strong>${esc(C.eventType(e.type).label)}</strong></a>
        ${sub ? `<div class="small muted">${sub}</div>` : ''}
      </div>
      ${canWrap ? `<button class="btn tiny primary" data-action="wrapUp" data-id="${e.id}">Add notes</button>` : ''}
    </div>`;
  }

  function taskRow(t, opts = {}) {
    const p = t.projectId && S.get('projects', t.projectId);
    const late = !t.done && t.due < U.today();
    const when = opts.hideDate ? (t.time ? U.fmtTime(t.time) : '') : `${U.relDate(t.due)}${t.time ? ' · ' + U.fmtTime(t.time) : ''}`;
    const sub = [when, p && !opts.hideProject ? `<a href="#/project/${p.id}">${esc(p.name)}</a>` : ''].filter(Boolean).join(' · ');
    const note = (t.notes || '').split('\n')[0];
    return `<div class="item task ${t.done ? 'done' : ''}">
      <input type="checkbox" class="chk" data-action="toggleTask" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="${t.done ? 'Mark not done' : 'Mark done'}">
      <div class="grow">
        <a href="#" class="task-title" data-action="editTask" data-id="${t.id}">${esc(t.title)}</a>
        ${sub ? `<div class="small ${late ? 'overdue' : 'muted'}">${sub}</div>` : ''}
        ${note ? `<a href="#" class="task-note" data-action="editTask" data-id="${t.id}">${WC.icon('note')} ${esc(note.length > 110 ? note.slice(0, 110) + '…' : note)}</a>` : ''}
      </div>
    </div>`;
  }

  function logRow(p, l, opts = {}) {
    return `<div class="item log">
      <div class="grow">
        <div class="small muted">${esc(U.fmtDate(l.date))} · ${esc(l.type)}${opts.showProject ? ` · <a href="#/project/${p.id}">${esc(p.name)}</a>` : ''}</div>
        <div class="pre">${esc(l.summary)}</div>
      </div>
      <button class="btn tiny ghost" data-action="editLog" data-project="${p.id}" data-id="${l.id}">Edit</button>
    </div>`;
  }

  const isPlan = (f) => f.label === 'Plans';
  const isSheet = (f) => f.label === 'Order sheet';
  const isImg = (f) => (f.type || '').startsWith('image/');
  const itemClass = (s) => `it-${(s || 'Quoted').toLowerCase()}`;
  const phaseClass = (s) => `ph-${(s || 'To do').toLowerCase().replace(/\s/g, '')}`;

  const fmtSize = (n) => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

  function fileRow(p, f, opts = {}) {
    const meta = [esc(f.label), esc(U.fmtDate(f.addedAt.slice(0, 10))), fmtSize(f.size), opts.showProject ? `<a href="#/project/${p.id}">${esc(p.name)}</a>` : ''].filter(Boolean).join(' · ');
    return `<div class="item file">
      <button class="file-ic" data-action="viewFile" data-project="${p.id}" data-id="${f.id}" aria-label="Open ${esc(f.name)}">${WC.icon(isImg(f) ? 'image' : 'file')}</button>
      <div class="grow">
        <a href="#" data-action="viewFile" data-project="${p.id}" data-id="${f.id}"><strong>${esc(f.name)}</strong></a>
        <div class="small muted">${meta}</div>
        ${f.note ? `<div class="small muted pre">${esc(f.note)}</div>` : ''}
      </div>
      <button class="btn tiny ghost" data-action="editFile" data-project="${p.id}" data-id="${f.id}">Edit</button>
    </div>`;
  }

  // Thumbnail card used on the Files tab.
  function fileCard(p, f) {
    const thumb = isImg(f) || WC.importer.kindOf(f.name, f.type) === 'pdf';
    return `<div class="plan-card">
      <button class="plan-thumb" data-action="viewFile" data-project="${p.id}" data-id="${f.id}" ${thumb ? `data-thumb="${f.id}"` : ''} aria-label="Open ${esc(f.name)}">${WC.icon(isImg(f) ? 'image' : 'file')}</button>
      <div class="plan-meta"><a href="#" data-action="viewFile" data-project="${p.id}" data-id="${f.id}"><strong>${esc(f.name)}</strong></a>
        <div class="small muted">${esc(f.label)} · ${esc(U.fmtDate(f.addedAt.slice(0, 10)))}</div></div>
      <button class="btn tiny ghost" data-action="editFile" data-project="${p.id}" data-id="${f.id}">Edit</button>
    </div>`;
  }

  // ======================================================================
  // Views
  // ======================================================================
  const views = {};

  // ---------------- Dashboard ----------------
  // "Add to Home Screen" tip, shown on phones until the app is installed (or the tip is hidden).
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (!document.getElementById('modal').open) render(); });
  function installHint() {
    const installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    const phone = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (WC.DEMO || installed || !phone || S.db.settings.installHintHidden) return '';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const how = ios ? 'In Safari, tap the Share button, then <b>Add to Home Screen</b>.'
      : installPrompt ? '<a href="#" data-action="installApp">Install the app</a>' : 'In Chrome, tap the ⋮ menu, then <b>Install app</b>.';
    return `<div class="banner install">${WC.icon('download')}<span><b>Put this app on your home screen.</b> ${how} <a href="#" data-action="hideInstall">Hide</a></span></div>`;
  }

  const activeJobs = () => S.all('projects').filter((p) => section(p) !== 'closed');
  // Open jobs with nothing scheduled and no reminder: they need a next step.
  const stuckJobs = () => activeJobs().filter((p) => !nextEvent(p.id) && !openTasks((x) => x.projectId === p.id).length && !(p.stage === 'ordered' && p.eta));

  views.home = () => {
    const t = U.today();
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const name = S.db.settings.userName;
    const projects = S.all('projects');

    if (!projects.length && !S.all('contacts').length) {
      return `<h1>${greet}${name ? ', ' + esc(name) : ''}</h1>
        ${installHint()}
        <div class="card welcome">
          <h2>Welcome</h2>
          <p>Track every job from the first referral to the check-in after the install. Each job walks you through the next step:</p>
          <ol class="flow-list">${C.STAGES.filter((s) => s.section !== 'closed').map((s) => `<li>${esc(s.label)}</li>`).join('')}</ol>
          <div class="row gap wrap">
            <button class="btn primary" data-action="newLead">${WC.icon('plus')} Add your first lead</button>
            <button class="btn" data-action="loadSample">Try it with sample jobs</button>
          </div>
        </div>`;
    }

    const wrap = S.all('events').filter((e) => !e.done && lastDay(e) < t && lastDay(e) >= U.addDays(t, -30)).sort(byWhen);
    const due = openTasks((x) => x.due <= t);
    const doneToday = S.all('tasks').filter((x) => x.done && (x.due === t || (x.doneAt || '').slice(0, 10) === t)).sort(byDue);
    const soon = openTasks((x) => x.due > t && x.due <= U.addDays(t, 7));
    const stuck = stuckJobs();
    const todoCount = wrap.length + due.length + stuck.length;

    const wrapItem = (e) => {
      const p = e.projectId && S.get('projects', e.projectId);
      return `<div class="item todo">
        <span class="todo-ic">${WC.icon('calendar')}</span>
        <div class="grow"><b>How did the ${esc(C.eventType(e.type).label.toLowerCase())} go?</b>
          <div class="small muted">${p ? esc(p.name) + ' · ' : ''}${esc(U.relDate(e.date))}</div></div>
        <button class="btn tiny primary" data-action="wrapUp" data-id="${e.id}">Add notes</button>
      </div>`;
    };
    const stuckItem = (p) => `<a class="item todo" href="#/project/${p.id}">
        <span class="todo-ic warn-text">${WC.icon('clock')}</span>
        <div class="grow"><b>${esc(p.name)}</b><div class="small warn-text">${esc(C.stage(p.stage).label)} · no next step set</div></div>
        <span class="btn tiny">Open</span>
      </a>`;

    const steps = C.STAGES.filter((s) => s.section !== 'closed').map((s) => {
      const n = projects.filter((p) => p.stage === s.id).length;
      const tab = s.section === 'sales' ? 'sales' : 'installs';
      return `<a class="stat" href="#/${tab}" data-action="setFilter" data-key="${tab === 'sales' ? 'salesFilter' : 'installFilter'}" data-value="${s.id}"><b>${n}</b><span>${esc(s.label)}</span></a>`;
    }).join('');

    const lb = S.db.settings.lastBackup;
    const hint = installHint();
    const backupNag = projects.length && (!lb || daysSince(lb) >= 7)
      ? `<div class="banner">${WC.icon('download')} <span>${lb ? `Last backup was ${daysSince(lb)} days ago.` : 'You haven\'t backed up yet.'} Your data lives only on this device. <a href="#" data-action="exportData">Back up now</a></span></div>` : '';

    return `
      <h1>${greet}${name ? ', ' + esc(name) : ''}</h1>
      <p class="muted">${esc(U.fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' }))}</p>
      ${WC.DEMO ? `<div class="banner demo">This demo is filled with sample jobs. Tap around and try things. Changes stay in this browser only. <a href="#" data-action="resetDemo">Reset demo</a></div>` : hint + backupNag}
      ${calendarCard()}

      <div class="quick-actions">
        <button class="qa" data-action="newLead">${WC.icon('plus')}<span>New lead</span></button>
        <button class="qa" data-action="newEvent" data-date="${state.calDay}">${WC.icon('calendar')}<span>Schedule</span></button>
        <button class="qa" data-action="newTask" data-date="${state.calDay}">${WC.icon('clock')}<span>Reminder</span></button>
      </div>

      <section class="panel">
        <h3>To do ${todoCount ? `<span class="count ${due.some((x) => x.due < t) ? 'bad' : ''}">${todoCount}</span>` : ''}</h3>
        ${wrap.map(wrapItem).join('')}
        ${due.map((x) => taskRow(x)).join('')}
        ${stuck.map(stuckItem).join('')}
        ${todoCount ? '' : empty('You\'re all caught up.')}
        ${doneToday.length ? `<div class="group-label">Done today</div>${doneToday.map((x) => taskRow(x)).join('')}` : ''}
      </section>

      ${soon.length ? `<section class="panel">
        <h3>Reminders this week</h3>
        ${soon.map((x) => taskRow(x)).join('')}
      </section>` : ''}

      <section class="panel">
        <h3>Jobs by step</h3>
        <div class="stats step-stats">${steps}</div>
      </section>
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
      return groups || empty(q ? 'No matches.' : sec === 'sales' ? 'No open sales. Tap “New lead” to add one.' : 'No jobs here yet. A job moves here when the client says yes and it\'s time for the final measure.');
    }
    ps.sort((a, b) => S.lastActivity(b).localeCompare(S.lastActivity(a)));
    return ps.map((p) => projectCard(p, sec === 'install' ? installProgress(p) : '')).join('') || empty('Nothing here.');
  }

  function installProgress(p) {
    const n = p.items.reduce((a, i) => a + (Number(i.qty) || 1), 0);
    if (!n || p.stage !== 'install') return '';
    const done = p.items.filter((i) => i.status === 'Installed').reduce((a, i) => a + (Number(i.qty) || 1), 0);
    const pct = Math.round((done / n) * 100);
    return `<div class="progress-wrap small"><div class="progress"><span style="width:${pct}%"></span></div><span class="muted">${done} of ${n} installed</span></div>`;
  }

  function chips(filterKey, sec) {
    const stages = C.STAGES.filter((s) => s.section === sec);
    const opts = [{ id: 'active', label: 'All' }, ...stages, { id: 'closed', label: sec === 'sales' ? 'Lost' : 'Done' }];
    return `<div class="chips">${opts.map((o) => `<button class="chip ${state[filterKey] === o.id ? 'on' : ''}" data-action="setFilter" data-key="${filterKey}" data-value="${o.id}">${esc(o.label)}</button>`).join('')}</div>`;
  }

  views.sales = () => `
    <div class="row between"><h1>Sales</h1><button class="btn primary" data-action="newLead">${WC.icon('plus')} New lead</button></div>
    <input class="search" type="search" placeholder="Search jobs and people…" value="${esc(state.salesSearch)}" data-search="salesSearch" data-target="salesList" aria-label="Search sales">
    ${chips('salesFilter', 'sales')}
    <div id="salesList">${pipelineList('sales', 'salesFilter', 'salesSearch')}</div>`;

  views.installs = () => `
    <h1>Installs</h1>
    <input class="search" type="search" placeholder="Search jobs and people…" value="${esc(state.installSearch)}" data-search="installSearch" data-target="installList" aria-label="Search installs">
    ${chips('installFilter', 'install')}
    <div id="installList">${pipelineList('install', 'installFilter', 'installSearch')}</div>`;

  // ---------------- Job page ----------------
  const STEPS = C.STAGES.filter((s) => s.section !== 'closed');

  function tracker(p) {
    const idx = STEPS.findIndex((s) => s.id === p.stage);
    const finished = p.stage === 'complete';
    return `<ol class="tracker ${p.stage === 'lost' ? 'is-lost' : ''}" aria-label="Job steps">${STEPS.map((s, i) => {
      const cls = finished || (idx >= 0 && i < idx) ? 'past' : i === idx ? 'now' : '';
      return `<li class="${cls}" ${cls === 'now' ? 'aria-current="step"' : ''}><span class="tr-dot">${cls === 'past' ? WC.icon('check') : i + 1}</span><span class="tr-label">${esc(s.step)}</span></li>`;
    }).join('')}</ol>`;
  }

  // The single next thing to do on a job, based on its step and what's scheduled.
  function nextStep(p) {
    const today = U.today();
    const upcoming = (type) => projectEvents(p.id).find((e) => e.type === type && lastDay(e) >= today);
    const pastOf = (type) => projectEvents(p.id).filter((e) => e.type === type && lastDay(e) < today);
    const A = (label, action, extra = '') => ({ label, action, extra });
    const change = (e) => A('Change appointment', 'editEvent', `data-id="${e.id}"`);
    const lost = A('Lost the job', 'markLost');
    const nq = p.quotes.length;
    switch (p.stage) {
      case 'lead':
        return { title: 'Book the first sales call', text: 'Go see what they want and take rough measurements.', main: A('Schedule sales call', 'newEvent', 'data-type="sales"'), more: [lost] };
      case 'consult': {
        const e = upcoming('sales');
        if (e) return { title: `Sales call ${whenText(e)}`, text: 'Afterward, tap “Add notes” on the appointment, then add your quotes here.', main: A('Add a quote', 'addQuote'), more: [change(e), lost] };
        return { title: 'Put quotes together', text: 'Price out a few options, like different products or price ranges.', main: A('Add a quote', 'addQuote'), more: [A('Schedule another sales call', 'newEvent', 'data-type="sales"'), lost] };
      }
      case 'quoted': {
        const e = upcoming('sales');
        return {
          title: e ? `Going over options ${whenText(e)}` : 'Waiting on their decision',
          text: `${nq} quote${nq === 1 ? '' : 's'} out. Follow up, or meet again to go over the options.`,
          main: A('They said yes: book final measure', 'acceptJob'),
          more: [e ? change(e) : A('Schedule another sales call', 'newEvent', 'data-type="sales"'), A('Add another quote', 'addQuote'), lost],
        };
      }
      case 'measure': {
        const e = upcoming('measure');
        if (e) return { title: `Final measure ${whenText(e)}`, text: 'Measure every window exactly. Then place the order.', main: A('Measured: place the order', 'markOrdered'), more: [change(e), A('Import order sheet', 'importSheet')] };
        if (pastOf('measure').length) return { title: 'Place the order', text: 'The final measure is done.', main: A('Mark as ordered', 'markOrdered'), more: [A('Import order sheet', 'importSheet')] };
        return { title: 'Book the final measure', text: 'Exact measurements before anything is ordered.', main: A('Schedule final measure', 'newEvent', 'data-type="measure"'), more: [A('Already measured: mark as ordered', 'markOrdered')] };
      }
      case 'ordered': {
        const late = p.eta && p.eta < today;
        return {
          title: late ? 'Product should be in' : 'Waiting on product',
          text: p.eta ? `Expected ${U.fmtDate(p.eta, { month: 'long', day: 'numeric' })}.${late ? ' Check on the order if it hasn\'t arrived.' : ''}` : 'Usually takes 1 to 3 months.',
          main: A('Product is in: schedule install', 'newEvent', 'data-type="install"'),
          more: [A(p.eta ? 'Change expected date' : 'Set expected date', 'markOrdered')],
        };
      }
      case 'install': {
        const e = upcoming('install');
        if (e) return { title: `Install ${whenText(e)}`, text: (e.days || 1) > 1 ? `Booked for ${e.days} days.` : 'Mark the job finished once everything is up and working.', main: A('Job finished', 'markDone'), more: [change(e), A('Add another install day', 'newEvent', 'data-type="install"')] };
        return { title: 'Install', text: 'Mark the job finished once everything is up and working.', main: A('Job finished', 'markDone'), more: [A('Schedule an install day', 'newEvent', 'data-type="install"')] };
      }
      case 'complete':
        return { title: 'Job finished', text: 'A reminder to check in with the client is set for two weeks after the install.', main: null, more: [A('Reopen job', 'reopen')] };
      default:
        return { title: 'Marked as lost', text: '', main: null, more: [A('Reopen job', 'reopen')] };
    }
  }

  function nextCard(p) {
    const n = nextStep(p);
    const btn = (a, cls) => `<button class="btn ${cls}" data-action="${a.action}" data-project="${p.id}" ${a.extra}>${esc(a.label)}</button>`;
    return `<section class="next-card">
      <div class="next-label">Next step</div>
      <h2>${esc(n.title)}</h2>
      ${n.text ? `<p>${esc(n.text)}</p>` : ''}
      ${n.main ? btn(n.main, 'primary big') : ''}
      ${n.more.length ? `<div class="next-more">${n.more.map((a) => btn(a, 'link')).join('')}</div>` : ''}
    </section>`;
  }

  views.project = (id, tab) => {
    const p = S.get('projects', id);
    if (!p) return `<p>Job not found. <a href="#/sales">Back to Sales</a></p>`;
    tab = tab || 'overview';
    const tabs = [['overview', 'Overview'], ['products', `Products${p.items.length ? ` (${p.items.length})` : ''}`], ['files', `Files${p.files.length ? ` (${p.files.length})` : ''}`], ['notes', `Notes${p.log.length ? ` (${p.log.length})` : ''}`]];
    const body = { overview: projectOverview, products: projectProducts, files: projectFiles, notes: projectNotes }[tab] || projectOverview;
    const home = section(p) === 'install' || p.stage === 'complete' ? 'installs' : 'sales';
    const pc = S.primaryContact(p);
    return `
      <a class="back" href="#/${home}">${WC.icon('left')} ${home === 'sales' ? 'Sales' : 'Installs'}</a>
      <div class="job-head">
        <h1>${esc(p.name)}</h1>
        <button class="icon-btn" data-action="jobMenu" data-project="${p.id}" aria-label="More options">${WC.icon('more')}</button>
      </div>
      <div class="job-sub">
        ${pc ? `<a href="#/contact/${pc.id}" class="job-client">${esc(pc.name)}</a>` : ''}
        ${p.address ? `<a class="pill" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(p.address)}">${WC.icon('pin')} ${esc(p.address)}</a>` : ''}
        ${pc && pc.phone ? `<a class="pill" href="tel:${esc(pc.phone.replace(/[^\d+]/g, ''))}">${WC.icon('phone')} Call</a><a class="pill" href="${esc(sms(pc.phone))}">${WC.icon('message')} Text</a>` : ''}
      </div>
      ${tracker(p)}
      ${nextCard(p)}
      <div class="quick-actions">
        <button class="qa" data-action="newLog" data-project="${p.id}">${WC.icon('note')}<span>Note</span></button>
        <button class="qa" data-action="newEvent" data-project="${p.id}">${WC.icon('calendar')}<span>Schedule</span></button>
        <button class="qa" data-action="newTask" data-project="${p.id}">${WC.icon('clock')}<span>Reminder</span></button>
        <button class="qa" data-action="addFile" data-project="${p.id}">${WC.icon('paperclip')}<span>File</span></button>
      </div>
      <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/project/${p.id}/${k}" class="${k === tab ? 'on' : ''}">${esc(l)}</a>`).join('')}</nav>
      ${body(p)}`;
  };

  function quoteRow(p, q) {
    return `<div class="item quote">
      <div class="grow">
        <strong>${esc(q.name)}</strong> ${q.chosen ? '<span class="badge st-install">Chosen</span>' : ''}
        <div class="small muted">${[q.amount ? U.money(q.amount) : '', q.date ? U.fmtDate(q.date) : '', q.note ? esc(q.note) : ''].filter(Boolean).join(' · ')}</div>
      </div>
      ${q.fileId && p.files.some((f) => f.id === q.fileId) ? `<button class="btn tiny" data-action="viewFile" data-project="${p.id}" data-id="${q.fileId}">${WC.icon('file')} Open</button>` : ''}
      <button class="btn tiny ghost" data-action="editQuote" data-project="${p.id}" data-id="${q.id}">Edit</button>
    </div>`;
  }

  function projectOverview(p) {
    const pcs = S.projectContacts(p);
    const evs = projectEvents(p.id).filter((e) => lastDay(e) >= U.today());
    const tasks = openTasks((t) => t.projectId === p.id);
    const pastEvs = projectEvents(p.id).filter((e) => lastDay(e) < U.today()).reverse();
    const showQuotes = p.quotes.length || ['consult', 'quoted'].includes(p.stage);
    const val = projectValue(p);
    return `
      <section class="panel">
        <h3>Coming up</h3>
        ${evs.map((e) => eventRow(e, { showDate: true, hideProject: true })).join('')}
        ${tasks.map((t) => taskRow(t, { hideProject: true })).join('')}
        ${!evs.length && !tasks.length ? empty('Nothing scheduled.') : ''}
      </section>

      ${showQuotes ? `<section class="panel">
        <div class="row between"><h3>Quotes ${p.quotes.length ? `<span class="count">${p.quotes.length}</span>` : ''}</h3><button class="btn tiny" data-action="addQuote" data-project="${p.id}">${WC.icon('plus')} Quote</button></div>
        ${p.quotes.map((q) => quoteRow(p, q)).join('') || empty('No quotes yet. Add each option you price out, with its PDF if you have one.')}
      </section>` : ''}

      ${p.phases.length ? phasesPanel(p) : ''}

      <section class="panel">
        <div class="row between"><h3>People</h3><button class="btn tiny" data-action="addPerson" data-project="${p.id}">${WC.icon('plus')} Person</button></div>
        ${pcs.map((pc) => `<div class="item">
            <div class="grow"><a href="#/contact/${pc.contact.id}"><strong>${esc(pc.contact.name)}</strong></a>
              <span class="badge">${esc(pc.role || pc.contact.role || '')}</span>
              <div class="pills">${contactActions({ ...pc.contact, address: '' })}</div></div>
            <button class="btn tiny ghost" data-action="removePerson" data-project="${p.id}" data-id="${pc.contactId}" aria-label="Remove ${esc(pc.contact.name)} from this job">${WC.icon('x')}</button>
          </div>`).join('') || empty('No one added yet.')}
      </section>

      <section class="panel">
        <div class="row between"><h3>Details</h3><button class="btn tiny ghost" data-action="editProject" data-id="${p.id}">Edit</button></div>
        <div class="details">
          <div><span>Value</span>${val ? U.money(val) : '—'}</div>
          <div><span>Referred by</span>${esc(p.referredBy || p.source || '—')}</div>
          <div><span>Started</span>${esc(U.fmtDate((p.createdAt || '').slice(0, 10)))}</div>
          ${p.eta ? `<div><span>Product expected</span>${esc(U.fmtDate(p.eta))}</div>` : ''}
        </div>
        ${p.notes ? `<div class="notes pre">${esc(p.notes)}</div>` : ''}
      </section>

      <details class="panel history">
        <summary>History</summary>
        <ol class="timeline">${p.stageHistory.map((h) => `<li><b>${esc(C.stage(h.stage).label)}</b> <span class="muted small">${esc(U.fmtDate(h.at.slice(0, 10)))}</span></li>`).join('')}</ol>
        ${pastEvs.length ? `<div class="group-label">Past appointments</div>${pastEvs.map((e) => eventRow(e, { showDate: true, hideProject: true })).join('')}` : ''}
      </details>`;
  }

  function projectProducts(p) {
    const rooms = {};
    p.items.forEach((i) => { (rooms[i.room || 'No room'] = rooms[i.room || 'No room'] || []).push(i); });
    const counts = C.ITEM_STATUSES.map((s) => {
      const n = p.items.filter((i) => i.status === s).reduce((a, i) => a + (Number(i.qty) || 1), 0);
      return n ? `<span class="badge it-${s.toLowerCase()}">${s}: ${n}</span>` : '';
    }).join(' ');
    return `
      <div class="row gap wrap tab-actions">
        <button class="btn primary" data-action="newItem" data-project="${p.id}">${WC.icon('plus')} Add window</button>
        <button class="btn" data-action="importSheet" data-project="${p.id}">${WC.icon('upload')} Import order sheet</button>
      </div>
      ${p.items.length ? `<div class="row between wrap gap products-sum">
        <div>${counts} ${itemTotal(p) ? `<b class="total">${U.money(itemTotal(p))}</b>` : ''}</div>
        <div class="row gap">
          <select class="tiny-select" data-change="bulkStatus" data-project="${p.id}" aria-label="Mark all products as"><option value="">Mark all as…</option>${C.ITEM_STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
          <button class="btn tiny" data-action="copyOrder" data-project="${p.id}">Order list</button>
        </div>
      </div>` : empty('No windows yet. Add them one at a time, or import the order sheet to fill this in.')}
      ${Object.keys(rooms).sort().map((room) => `
        <section class="panel">
          <h3>${esc(room)} <span class="count">${rooms[room].length}</span></h3>
          ${rooms[room].map((i) => `<div class="item product">
            <div class="grow">
              <div><strong>${esc(i.location || 'Window')}</strong>${i.width || i.height ? ` <span class="dim">${esc(i.width || '?')} × ${esc(i.height || '?')}</span>` : ''}</div>
              <div class="small">${[i.brand, i.product, i.color].filter(Boolean).map(esc).join(' · ')}</div>
              <div class="small muted">${[i.mount && esc(i.mount + ' mount'), i.control && esc(i.control), (Number(i.qty) || 1) > 1 ? `qty ${esc(i.qty)}` : '', i.price ? U.money(i.price) + ' ea' : ''].filter(Boolean).join(' · ')}</div>
              ${i.notes ? `<div class="small muted pre">${esc(i.notes)}</div>` : ''}
            </div>
            <div class="col-actions">
              <button class="badge status-btn ${itemClass(i.status)}" data-action="itemStatus" data-project="${p.id}" data-id="${i.id}" aria-label="Status: ${esc(i.status || 'Quoted')}. Change status">${esc(i.status || 'Quoted')}${WC.icon('down')}</button>
              <div class="row gap"><button class="btn tiny ghost" data-action="editItem" data-project="${p.id}" data-id="${i.id}">Edit</button><button class="btn tiny ghost" data-action="dupItem" data-project="${p.id}" data-id="${i.id}">Copy</button></div>
            </div>
          </div>`).join('')}
        </section>`).join('')}`;
  }

  const FILE_FILTERS = [['all', 'All'], ['Plans', 'Plans'], ['Quote', 'Quotes'], ['Order sheet', 'Order sheets'], ['Photo', 'Photos'], ['Other', 'Other']];

  function projectFiles(p) {
    const f = state.fileFilter;
    const files = p.files.filter((x) => f === 'all' || x.label === f || (f === 'Other' && !['Plans', 'Quote', 'Order sheet', 'Photo'].includes(x.label)))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    const used = new Set(p.files.map((x) => (['Plans', 'Quote', 'Order sheet', 'Photo'].includes(x.label) ? x.label : 'Other')));
    return `
      <div class="row gap wrap tab-actions">
        <button class="btn primary" data-action="addFile" data-project="${p.id}">${WC.icon('upload')} Upload</button>
      </div>
      ${p.files.length > 1 ? `<div class="chips">${FILE_FILTERS.filter(([k]) => k === 'all' || used.has(k)).map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-action="setFilter" data-key="fileFilter" data-value="${k}">${l}</button>`).join('')}</div>` : ''}
      ${files.length ? `<div class="plan-grid">${files.map((x) => fileCard(p, x)).join('')}</div>` : empty(p.files.length ? 'Nothing in this group.' : 'No files yet. Upload plans, quote PDFs, order sheets or photos.')}`;
  }

  function projectNotes(p) {
    return `
      <div class="row gap wrap tab-actions">
        <button class="btn primary" data-action="newLog" data-project="${p.id}">${WC.icon('note')} Add note</button>
      </div>
      <section class="panel">
        ${p.log.slice().sort((a, b) => b.date.localeCompare(a.date)).map((l) => logRow(p, l)).join('') || empty('Write down what you talk about: what they want, product decisions, timing with other trades.')}
      </section>`;
  }

  // Optional step list for big jobs (pre-wire, waiting on drywall, etc.).
  function phasesPanel(p) {
    return `<section class="panel">
      <div class="row between"><h3>Job phases</h3><button class="btn tiny" data-action="newPhase" data-project="${p.id}">${WC.icon('plus')} Phase</button></div>
      ${p.phases.map((ph, idx) => `<div class="item phase ${phaseClass(ph.status)}">
        <div class="ph-num">${idx + 1}</div>
        <div class="grow">
          <a href="#" data-action="editPhase" data-project="${p.id}" data-id="${ph.id}"><strong>${esc(ph.name)}</strong></a>
          <div class="small muted">${[ph.waitingOn && `Waiting on ${esc(ph.waitingOn)}`, ph.date && `Target ${esc(U.fmtDate(ph.date))}`].filter(Boolean).join(' · ')}</div>
        </div>
        <button class="badge ph-badge status-btn" data-action="phaseStatus" data-project="${p.id}" data-id="${ph.id}" aria-label="Status: ${esc(ph.status)}. Change status">${esc(ph.status)}${WC.icon('down')}</button>
      </div>`).join('')}
    </section>`;
  }

  // ---------------- Dashboard calendar ----------------
  function calendarCard() {
    const t = U.today();
    const m = state.calMonth;
    const month = U.parse(m).getMonth();
    const gridStart = U.weekStart(m);
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = U.addDays(gridStart, i);
      const dt = U.parse(d);
      if (i % 7 === 0 && i >= 28 && dt.getMonth() !== month) break;
      const evs = eventsOn(d);
      const dayTasks = tasksOn(d);
      const due = dayTasks.length;
      const allDone = due && dayTasks.every((x) => x.done);
      const label = `${U.fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}: ${evs.length} appointment${evs.length === 1 ? '' : 's'}${due ? `, ${due} reminder${due === 1 ? '' : 's'}` : ''}`;
      cells += `<button class="cal-day${dt.getMonth() !== month ? ' out' : ''}${d === t ? ' today' : ''}${d === state.calDay ? ' sel' : ''}" data-action="calDay" data-date="${d}" aria-label="${esc(label)}">
        <span>${dt.getDate()}</span><i>${evs.slice(0, 3).map((e) => `<b style="background:${C.eventType(e.type).color}"></b>`).join('')}${due ? `<b class="task-dot${allDone ? ' done' : ''}"></b>` : ''}</i></button>`;
    }
    const sel = state.calDay;
    const evs = eventsOn(sel);
    const tasks = tasksOn(sel);
    const used = new Set(S.all('events').map((e) => e.type));
    return `<section class="panel cal">
      <div class="row between cal-head">
        <h2 class="cal-title">${esc(U.parse(m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h2>
        <div class="row">
          <button class="btn tiny ghost" data-action="calMonth" data-dir="-1" aria-label="Previous month">${WC.icon('left')}</button>
          <button class="btn tiny ghost" data-action="calMonth" data-dir="0">Today</button>
          <button class="btn tiny ghost" data-action="calMonth" data-dir="1" aria-label="Next month">${WC.icon('right')}</button>
        </div>
      </div>
      <div class="cal-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      <div class="cal-legend">${C.EVENT_TYPES.filter((x) => used.has(x.id)).map((x) => `<span>${typeDot(x.id)}${esc(x.label)}</span>`).join('')}<span><span class="dot" style="box-shadow:inset 0 0 0 1px var(--muted)"></span>Reminder</span></div>
      <div class="cal-agenda">
        <div class="row between"><h3>${sel === t ? 'Today' : esc(U.fmtDate(sel, { weekday: 'long', month: 'short', day: 'numeric' }))}</h3>
          <div class="row gap"><button class="btn tiny" data-action="newTask" data-date="${sel}">${WC.icon('plus')} Reminder</button><button class="btn tiny" data-action="newEvent" data-date="${sel}">${WC.icon('plus')} Schedule</button></div></div>
        ${evs.map((e) => eventRow(e, { day: sel })).join('')}
        ${tasks.map((x) => taskRow(x, { hideDate: true })).join('')}
        ${!evs.length && !tasks.length ? empty(sel === t ? 'Nothing scheduled today.' : 'Nothing scheduled.') : ''}
      </div>
    </section>`;
  }

  // ---------------- Records (people, companies, jobs, documents) ----------------
  const norm = (v) => String(v || '').toLowerCase();
  const allDocs = () => S.all('projects').flatMap((p) => p.files.map((f) => ({ p, f }))).sort((a, b) => b.f.addedAt.localeCompare(a.f.addedAt));
  const contactJobs = (cid) => S.all('projects').filter((p) => p.contacts.some((pc) => pc.contactId === cid));
  const companyJobs = (coId) => {
    const ids = new Set(S.companyContacts(coId).map((c) => c.id));
    return S.all('projects').filter((p) => p.contacts.some((pc) => ids.has(pc.contactId)));
  };
  const jobStatusOf = (p) => (p.stage === 'complete' ? 'complete' : p.stage === 'lost' ? 'lost' : 'active');

  function snippet(text, q) {
    const i = norm(text).indexOf(q);
    if (i < 0) return text.slice(0, 90);
    const start = Math.max(0, i - 30);
    const end = Math.min(text.length, i + q.length + 60);
    return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  // Where a job matches the search: its basics, or (with a short excerpt) its notes, products, log or phases.
  function jobMatch(p, q) {
    const people = S.projectContacts(p).map((pc) => `${pc.contact.name} ${pc.contact.company || ''}`).join(' ');
    if (norm(`${p.name} ${p.address} ${p.type} ${p.source} ${people} ${C.stage(p.stage).label}`).includes(q)) return {};
    if (norm(p.notes).includes(q)) return { where: 'Notes', text: snippet(p.notes, q) };
    for (const i of p.items) {
      const t = [i.room, i.location, i.category, i.brand, i.product, i.color, i.notes].filter(Boolean).join(' · ');
      if (norm(t).includes(q)) return { where: 'Product', text: t };
    }
    for (const l of p.log) if (norm(l.summary).includes(q)) return { where: `${l.type}, ${U.fmtDate(l.date)}`, text: snippet(l.summary, q) };
    for (const ph of p.phases) if (norm(`${ph.name} ${ph.waitingOn} ${ph.notes}`).includes(q)) return { where: 'Phase', text: ph.name };
    for (const f of p.files) if (norm(`${f.name} ${f.label} ${f.note}`).includes(q)) return { where: 'Document', text: f.name };
    return null;
  }

  function personCard(c) {
    const jobs = contactJobs(c.id);
    return `<a class="card" href="#/contact/${c.id}">
      <div class="row between gap"><strong>${esc(c.name)}</strong><span class="badge">${esc(c.role || '')}</span></div>
      <div class="small muted">${[c.company, c.phone, c.email].filter(Boolean).map(esc).join(' · ')}</div>
      ${jobs.length ? `<div class="small">${jobs.length} job${jobs.length > 1 ? 's' : ''}: ${jobs.slice(0, 3).map((p) => esc(p.name)).join(', ')}${jobs.length > 3 ? '…' : ''}</div>` : ''}
    </a>`;
  }

  function companyCard(co) {
    const people = S.companyContacts(co.id);
    const jobs = companyJobs(co.id);
    return `<a class="card" href="#/company/${co.id}">
      <div class="row between gap"><strong>${esc(co.name)}</strong><span class="badge">${esc(co.type || '')}</span></div>
      <div class="small muted">${[co.phone, co.email, co.website].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="small">${people.length} ${people.length === 1 ? 'person' : 'people'} · ${jobs.length} job${jobs.length === 1 ? '' : 's'}${people.length ? `: ${people.slice(0, 3).map((c) => esc(c.name)).join(', ')}` : ''}</div>
    </a>`;
  }

  function jobCard(p, m) {
    return projectCard(p, m && m.where ? `<div class="small muted match">${esc(m.where)}: ${esc(m.text)}</div>` : '');
  }

  // Current jobs first, then finished/lost ones under "Previous jobs".
  function jobsGrouped(jobs, extra) {
    const cur = jobs.filter((p) => section(p) !== 'closed');
    const prev = jobs.filter((p) => section(p) === 'closed').sort((a, b) => S.lastActivity(b).localeCompare(S.lastActivity(a)));
    return `${cur.map((p) => projectCard(p, extra && extra(p))).join('')}
      ${prev.length ? `<div class="group-label">Previous jobs <span class="count">${prev.length}</span></div>${prev.map((p) => projectCard(p, extra && extra(p))).join('')}` : ''}`;
  }

  const REC_TYPES = [['all', 'All'], ['people', 'People'], ['companies', 'Companies'], ['jobs', 'Jobs'], ['docs', 'Documents']];

  function recResults() {
    const q = norm(state.recQuery.trim());
    const type = state.recType;
    const people = S.all('contacts').filter((c) => (type !== 'people' || !state.contactRole || c.role === state.contactRole)
      && (!q || norm(`${c.name} ${c.company} ${c.phone} ${c.email} ${c.role} ${c.address} ${c.notes}`).includes(q))).sort(byName);
    const companies = S.all('companies').filter((co) => !q || norm(`${co.name} ${co.type} ${co.phone} ${co.email} ${co.website} ${co.address} ${co.notes}`).includes(q)).sort(byName);
    const jobs = S.all('projects').map((p) => ({ p, m: q ? jobMatch(p, q) : {} })).filter((x) => x.m
      && (type !== 'jobs' || state.jobStatus === 'all' || jobStatusOf(x.p) === state.jobStatus))
      .sort((a, b) => S.lastActivity(b.p).localeCompare(S.lastActivity(a.p)));
    const docs = allDocs().filter(({ p, f }) => !q || norm(`${f.name} ${f.label} ${f.note} ${p.name}`).includes(q));
    const reminders = q && type === 'all' ? S.all('tasks').filter((x) => norm(`${x.title} ${x.notes}`).includes(q)).sort((a, b) => byDue(b, a)) : [];

    const sections = {
      people: { label: 'People', n: people.length, html: (lim) => people.slice(0, lim).map(personCard).join('') },
      companies: { label: 'Companies', n: companies.length, html: (lim) => companies.slice(0, lim).map(companyCard).join('') },
      jobs: { label: 'Jobs', n: jobs.length, html: (lim) => jobs.slice(0, lim).map(({ p, m }) => jobCard(p, m)).join('') },
      reminders: { label: 'Reminders', n: reminders.length, html: (lim) => `<div class="panel tight">${reminders.slice(0, lim).map((x) => taskRow(x)).join('')}</div>` },
      docs: { label: 'Documents', n: docs.length, html: (lim) => `<div class="panel tight">${docs.slice(0, lim).map(({ p, f }) => fileRow(p, f, { showProject: true })).join('')}</div>` },
    };

    if (type === 'all' && !q) {
      const done = S.all('projects').filter((p) => p.stage === 'complete').length;
      const recent = [
        ...S.all('contacts').map((x) => ({ at: x.updatedAt || x.createdAt || '', html: personCard(x) })),
        ...S.all('companies').map((x) => ({ at: x.updatedAt || x.createdAt || '', html: companyCard(x) })),
        ...S.all('projects').map((x) => ({ at: S.lastActivity(x), html: projectCard(x) })),
      ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
      const tile = (key, n, label, sub) => `<button class="stat" data-action="setFilter" data-key="recType" data-value="${key}"><b>${n}</b><span>${label}</span>${sub ? `<em>${sub}</em>` : ''}</button>`;
      return `<div class="stats rec-stats">
          ${tile('people', S.all('contacts').length, 'People')}
          ${tile('companies', S.all('companies').length, 'Companies')}
          ${tile('jobs', S.all('projects').length, 'Jobs', done ? `${done} completed` : '')}
          ${tile('docs', allDocs().length, 'Documents')}
        </div>
        <div class="group-label">Recently updated</div>
        ${recent.map((r) => r.html).join('') || empty('Nothing here yet. Tap “+ Add” to start your records.')}`;
    }

    let filters = '';
    if (type === 'people') {
      filters = `<select class="role-filter" data-change="contactRole" aria-label="Filter by role"><option value="">All roles</option>${C.CONTACT_ROLES.map((r) => `<option ${r === state.contactRole ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
    } else if (type === 'jobs') {
      filters = `<div class="chips">${[['all', 'All jobs'], ['active', 'Active'], ['complete', 'Completed'], ['lost', 'Lost']].map(([k, l]) => `<button class="chip small-chip ${state.jobStatus === k ? 'on' : ''}" data-action="setFilter" data-key="jobStatus" data-value="${k}">${l}</button>`).join('')}</div>`;
    }

    if (type !== 'all') {
      const sec = sections[type];
      return `${filters}${sec.n ? sec.html(Infinity) : empty(q ? 'No matches.' : 'Nothing here yet.')}`;
    }
    const groups = Object.entries(sections).filter(([, sec]) => sec.n).map(([key, sec]) => `
      <div class="group-label">${sec.label} <span class="count">${sec.n}</span></div>
      ${sec.html(5)}
      ${sec.n > 5 ? `<button class="btn tiny ghost" data-action="setFilter" data-key="recType" data-value="${key}">Show all ${sec.n} ${sec.label.toLowerCase()}</button>` : ''}`).join('');
    return groups || empty(`Nothing matches “${esc(state.recQuery.trim())}”.`);
  }

  views.records = () => `
    <div class="row between"><h1>Records</h1><button class="btn primary" data-action="newRecord">${WC.icon('plus')} Add</button></div>
    <input class="search" type="search" placeholder="Search all records…" value="${esc(state.recQuery)}" data-search="recQuery" data-target="recResults" aria-label="Search records">
    <div class="chips">${REC_TYPES.map(([k, l]) => `<button class="chip ${state.recType === k ? 'on' : ''}" data-action="setFilter" data-key="recType" data-value="${k}">${l}</button>`).join('')}</div>
    <div id="recResults">${recResults()}</div>`;
  views.contacts = views.records;

  views.contact = (id) => {
    const c = S.get('contacts', id);
    if (!c) return `<p>Contact not found. <a href="#/records">Back to Records</a></p>`;
    const jobs = contactJobs(c.id);
    const logs = [];
    S.all('projects').forEach((p) => p.log.forEach((l) => { if (l.contactId === c.id) logs.push({ p, l }); }));
    logs.sort((a, b) => b.l.date.localeCompare(a.l.date));
    const tasks = S.all('tasks').filter((t) => t.contactId === c.id).sort(byDue);
    const co = c.companyId && S.get('companies', c.companyId);
    return `
      <a class="back" href="#/records">${WC.icon('left')} Records</a>
      <div class="row between wrap gap"><h1>${esc(c.name)}</h1><button class="btn ghost" data-action="editContact" data-id="${c.id}">Edit</button></div>
      <div class="muted">${[c.role && esc(c.role), co ? `<a href="#/company/${co.id}">${esc(co.name)}</a>` : esc(c.company || '')].filter(Boolean).join(' · ')}</div>
      <div class="pills big">${contactActions(c)}</div>
      <section class="panel details">
        ${c.phone ? `<div><span>Phone</span>${U.telLink(c.phone)}</div>` : ''}
        ${c.email ? `<div><span>Email</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>` : ''}
        ${c.address ? `<div><span>Address</span>${U.mapLink(c.address)}</div>` : ''}
        ${co ? `<div><span>Company</span><a href="#/company/${co.id}">${esc(co.name)}</a></div>` : ''}
      </section>
      ${c.notes ? `<section class="panel"><h3>Notes</h3><div class="pre">${esc(c.notes)}</div></section>` : ''}
      <section class="panel">
        <div class="row between"><h3>Jobs</h3><button class="btn tiny" data-action="newLead" data-contact="${c.id}">+ New job</button></div>
        ${jobs.length ? jobsGrouped(jobs, (p) => `<div class="small">Role: ${esc((p.contacts.find((pc) => pc.contactId === c.id) || {}).role || c.role || '')}</div>`) : empty('Not linked to any jobs.')}
      </section>
      ${jobs.some((p) => p.files.length) ? `<section class="panel">
        <h3>Documents</h3>
        ${jobs.flatMap((p) => p.files.map((f) => ({ p, f }))).sort((a, b) => b.f.addedAt.localeCompare(a.f.addedAt)).map(({ p, f }) => fileRow(p, f, { showProject: true })).join('')}
      </section>` : ''}
      <section class="panel">
        <div class="row between"><h3>Follow-ups</h3><button class="btn tiny" data-action="newTask" data-contact="${c.id}">+ Follow-up</button></div>
        ${tasks.map((t) => taskRow(t)).join('') || empty('None.')}
      </section>
      <section class="panel">
        <h3>Conversation history</h3>
        ${logs.map(({ p, l }) => logRow(p, l, { showProject: true })).join('') || empty('No logged conversations.')}
      </section>`;
  };

  views.company = (id) => {
    const co = S.get('companies', id);
    if (!co) return `<p>Company not found. <a href="#/records">Back to Records</a></p>`;
    const people = S.companyContacts(co.id).sort(byName);
    const jobs = companyJobs(co.id);
    const docs = jobs.flatMap((p) => p.files.map((f) => ({ p, f }))).sort((a, b) => b.f.addedAt.localeCompare(a.f.addedAt));
    const site = co.website ? (/^https?:\/\//.test(co.website) ? co.website : 'https://' + co.website) : '';
    const done = jobs.filter((p) => p.stage === 'complete');
    const sold = done.reduce((a, p) => a + projectValue(p), 0);
    return `
      <a class="back" href="#/records">${WC.icon('left')} Records</a>
      <div class="row between wrap gap"><h1>${esc(co.name)}</h1><button class="btn ghost" data-action="editCompany" data-id="${co.id}">Edit</button></div>
      <div class="muted">${esc(co.type || 'Company')}</div>
      <div class="pills big">${contactActions(co)}${site ? `<a class="pill" href="${esc(site)}" target="_blank" rel="noopener">${WC.icon('external')} Website</a>` : ''}</div>
      <section class="panel details">
        <div><span>People</span>${people.length}</div>
        <div><span>Jobs</span>${jobs.length}${done.length ? ` (${done.length} completed)` : ''}</div>
        ${sold ? `<div><span>Completed work</span>${U.money(sold)}</div>` : ''}
        ${co.phone ? `<div><span>Phone</span>${U.telLink(co.phone)}</div>` : ''}
        ${co.email ? `<div><span>Email</span><a href="mailto:${esc(co.email)}">${esc(co.email)}</a></div>` : ''}
        ${co.address ? `<div><span>Address</span>${U.mapLink(co.address)}</div>` : ''}
      </section>
      ${co.notes ? `<section class="panel"><h3>Notes</h3><div class="pre">${esc(co.notes)}</div></section>` : ''}
      <section class="panel">
        <div class="row between"><h3>People</h3><button class="btn tiny" data-action="newContact" data-company="${esc(co.name)}">+ Add person</button></div>
        ${people.map((c) => `<div class="item"><div class="grow"><a href="#/contact/${c.id}"><strong>${esc(c.name)}</strong></a> <span class="badge">${esc(c.role || '')}</span>
          <div class="pills">${contactActions({ ...c, address: '' })}</div></div></div>`).join('') || empty('No people linked yet.')}
      </section>
      <section class="panel">
        <h3>Jobs</h3>
        ${jobs.length ? jobsGrouped(jobs) : empty('No jobs yet with people from this company.')}
      </section>
      ${docs.length ? `<section class="panel"><h3>Documents</h3>${docs.map(({ p, f }) => fileRow(p, f, { showProject: true })).join('')}</section>` : ''}`;
  };

  // ---------------- Settings ----------------
  views.settings = () => {
    const st = S.db.settings;
    const counts = ['projects', 'contacts', 'companies', 'events', 'tasks'].map((k) => `${S.all(k).length} ${k === 'projects' ? 'jobs' : k}`).join(' · ');
    return `
      <h1>Settings</h1>
      <section class="panel">
        <h3>You</h3>
        <label class="field"><span>Your first name (for the greeting)</span><input id="set_name" value="${esc(st.userName)}"></label>
        <button class="btn primary" data-action="saveName">Save</button>
      </section>
      <section class="panel">
        <h3>Backup & restore</h3>
        <p class="small muted">Everything is stored only in this browser on this device (${counts}). Export a backup file regularly (it includes attached documents) and keep it in iCloud, Google Drive or email. Import it to restore or move to a new phone.</p>
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
    const pre = prefill.contactId && S.get('contacts', prefill.contactId);
    const people = S.all('contacts').map((c) => c.name).sort();
    const referrers = [...new Set([...people, ...S.all('companies').map((c) => c.name)])].sort();
    const fields = prefill.past ? [
      { name: 'clientName', label: 'Client name', required: true, list: people },
      { name: 'address', label: 'Address' },
      { name: 'doneDate', label: 'Finished on', type: 'date', half: true },
      { name: 'estValue', label: 'Job total ($)', type: 'number', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, more: true },
    ] : [
      { name: 'clientName', label: 'Client name', required: true, list: people, placeholder: 'e.g. Sarah Johnson' },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'address', label: 'Address', half: true },
      { name: 'referredBy', label: 'Referred by', list: referrers, placeholder: 'Designer, builder, past client…' },
      { name: 'interest', label: 'What are they looking for?', placeholder: 'e.g. motorized shades in the great room' },
      { name: 'callDate', label: 'First sales call (optional)', type: 'date', half: true },
      { name: 'callTime', label: 'Time', type: 'time', half: true },
      { name: 'email', label: 'Email', type: 'email', more: true },
      { name: 'notes', label: 'Other notes', type: 'textarea', rows: 2, more: true },
    ];
    U.openForm({
      title: prefill.past ? 'Add a past job' : 'New lead',
      fields,
      values: { clientName: pre ? pre.name : '', phone: pre ? pre.phone : '', address: pre ? pre.address : '', doneDate: U.today() },
      submitLabel: prefill.past ? 'Save job' : 'Add lead',
      onSubmit(d) {
        const key = d.clientName.toLowerCase();
        let contact = pre && pre.name.toLowerCase() === key ? pre : S.all('contacts').find((c) => c.name.toLowerCase() === key);
        if (contact) {
          const patch = {};
          ['phone', 'email', 'address'].forEach((k) => { if (d[k] && !contact[k]) patch[k] = d[k]; });
          if (Object.keys(patch).length) contact = S.upsert('contacts', { ...patch, id: contact.id });
        } else {
          contact = S.upsert('contacts', { name: d.clientName, role: 'Homeowner', phone: d.phone || '', email: d.email || '', address: d.address || '', company: '', notes: '' });
        }
        const contacts = [{ contactId: contact.id, role: contact.role || 'Homeowner' }];
        const refKey = (d.referredBy || '').toLowerCase();
        const refPerson = refKey && S.all('contacts').find((c) => c.name.toLowerCase() === refKey && c.id !== contact.id);
        if (refPerson) contacts.push({ contactId: refPerson.id, role: refPerson.role || 'Referral' });
        const street = (d.address || contact.address || '').split(',')[0];
        const stage = prefill.past ? 'complete' : 'lead';
        const at = prefill.past && d.doneDate ? new Date(U.parse(d.doneDate).getTime() + 43200000).toISOString() : new Date().toISOString();
        const p = S.upsert('projects', {
          name: `${contact.name}${street ? ' – ' + street : ''}`,
          stage, address: d.address || contact.address || '', referredBy: d.referredBy || '', source: d.referredBy ? 'Referral' : '',
          estValue: d.estValue || '', notes: [d.interest && `Looking for: ${d.interest}`, d.notes].filter(Boolean).join('\n'),
          contacts, items: [], phases: [], log: [], files: [], quotes: [], stageHistory: [{ stage, at }],
        });
        if (prefill.past) { U.toast('Past job saved'); go(`#/project/${p.id}`); return; }
        if (d.callDate) {
          S.upsert('events', { title: `Sales call – ${p.name}`, type: 'sales', projectId: p.id, date: d.callDate, start: d.callTime, end: '', days: 1, location: p.address, notes: '', done: false });
          S.setStage(p, 'consult');
          U.toast('Lead added and sales call scheduled');
        } else {
          S.upsert('tasks', { title: `Call ${firstName(contact)} to book a sales call`, due: U.addDays(U.today(), 1), projectId: p.id, contactId: contact.id, done: false, forStage: 'lead' });
          U.toast('Lead added. Reminder set for tomorrow to book the sales call.');
        }
        go(`#/project/${p.id}`);
      },
    });
  }

  function projectForm(p) {
    const fields = [
      { name: 'name', label: 'Job name', required: true },
      { name: 'address', label: 'Address' },
      { name: 'estValue', label: 'Job value ($)', type: 'number', half: true },
      { name: 'referredBy', label: 'Referred by', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
    ];
    U.openForm({
      title: 'Edit job', fields, values: p,
      onSubmit(d) { Object.assign(p, d); S.touch(p); render(); },
      onDelete() { S.remove('projects', p.id); go('#/sales'); U.toast('Job deleted'); },
    });
  }

  const companyNames = () => S.all('companies').map((co) => co.name).sort();

  function contactForm(c = {}, onSaved, defaults = {}) {
    const fields = [
      { name: 'name', label: 'Name', required: true },
      { name: 'role', label: 'Role', type: 'select', options: C.CONTACT_ROLES, half: true },
      { name: 'company', label: 'Company', list: companyNames(), half: true, placeholder: 'Pick or type a new one' },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'address', label: 'Address' },
      { name: 'notes', label: 'Notes (preferences, how they like to communicate…)', type: 'textarea' },
    ];
    U.openForm({
      title: c.id ? 'Edit contact' : 'New contact', fields, values: c.id ? c : defaults,
      onSubmit(d) {
        const saved = S.upsert('contacts', c.id ? { ...d, id: c.id } : d);
        if (onSaved) onSaved(saved); else if (!c.id) go(`#/contact/${saved.id}`); else render();
      },
      onDelete: c.id ? () => { S.remove('contacts', c.id); go('#/records'); } : null,
    });
  }

  function companyForm(co = {}) {
    const fields = [
      { name: 'name', label: 'Company name', required: true },
      { name: 'type', label: 'Type', type: 'select', options: C.COMPANY_TYPES, half: true },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'website', label: 'Website', half: true, placeholder: 'example.com' },
      { name: 'address', label: 'Address' },
      { name: 'notes', label: 'Notes (how they work, who to call for what, pricing agreements…)', type: 'textarea' },
    ];
    U.openForm({
      title: co.id ? 'Edit company' : 'New company', fields, values: co.id ? co : { type: 'Design firm' },
      onSubmit(d) {
        const dup = S.all('companies').find((x) => x.id !== co.id && x.name.toLowerCase() === d.name.toLowerCase());
        if (dup) { U.toast(`“${dup.name}” is already in your records`); return false; }
        const saved = S.upsert('companies', co.id ? { ...d, id: co.id } : d);
        if (!co.id) go(`#/company/${saved.id}`); else render();
      },
      onDelete: co.id ? () => { S.remove('companies', co.id); go('#/records'); U.toast('Company deleted. Its people are kept.'); } : null,
    });
  }

  function newRecordChooser() {
    const opts = [
      ['person', 'users', 'Person', 'Client, designer, builder, electrician…'],
      ['company', 'briefcase', 'Company', 'Design firm, builder, supplier…'],
      ['job', 'plus', 'New job / lead', 'Starts in Sales'],
      ['past', 'file', 'Past job', 'A job you already finished'],
    ];
    U.openInfo('Add to records', `<div class="chooser">${opts.map(([k, ic, l, sub]) => `<button class="chooser-btn" data-pick="${k}">${WC.icon(ic)}<span><b>${l}</b><em>${sub}</em></span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => {
      U.close();
      ({ person: () => contactForm(), company: () => companyForm(), job: () => leadForm(), past: () => leadForm({ past: true }) })[btn.dataset.pick]();
    }));
  }

  function addPersonForm(p) {
    const fields = [
      { name: 'contactId', label: 'Person', type: 'select', options: contactOptions('Someone new (fill in below)') },
      { name: 'name', label: 'Name', half: true },
      { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'role', label: 'Role on this job', type: 'select', options: C.CONTACT_ROLES },
      { name: 'company', label: 'Company', half: true, more: true },
      { name: 'email', label: 'Email', type: 'email', half: true, more: true },
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

  // Moving a job forward automatically when you schedule the matching appointment.
  const STAGE_FOR_EVENT = { sales: ['consult', ['lead']], measure: ['measure', ['lead', 'consult', 'quoted']], install: ['install', ['lead', 'consult', 'quoted', 'measure', 'ordered']] };

  function eventForm(e = {}, defaults = {}) {
    const isNew = !e.id;
    const p0 = S.get('projects', e.projectId || defaults.projectId || '');
    const fixedJob = isNew && p0;
    const fields = [
      { name: 'type', label: 'What', type: 'chips', options: C.EVENT_TYPES.filter((t) => t.pick || t.id === e.type).map((t) => [t.id, t.label]) },
      ...(fixedJob ? [] : [{ name: 'projectId', label: 'Job', type: 'select', options: projectOptions(e.projectId) }]),
      { name: 'date', label: 'Day', type: 'date', required: true, half: true },
      { name: 'start', label: 'Time (optional)', type: 'time', half: true },
      { name: 'days', label: 'How many days?', type: 'number', step: 1, half: true, cls: 'install-only' },
      { name: 'notes', label: 'Notes (optional)', type: 'textarea', rows: 2, placeholder: 'e.g. Bring samples. The designer will be there.' },
    ];
    const defaultType = defaults.type || (p0 ? ({ lead: 'sales', consult: 'sales', quoted: 'sales', measure: 'measure', ordered: 'install', install: 'install' }[p0.stage] || 'other') : 'sales');
    const values = isNew ? { type: defaultType, projectId: p0 ? p0.id : '', date: defaults.date || U.today(), days: 1 } : e;
    const tools = !isNew && !WC.DEMO ? `<button type="button" class="btn tiny" id="icsBtn">${WC.icon('calendarPlus')} Add to phone calendar</button>` : '';
    U.openForm({
      title: isNew ? 'Schedule' : 'Appointment',
      intro: `${fixedJob ? `<p class="form-context">For <b>${esc(p0.name)}</b></p>` : ''}${tools}`,
      fields, values,
      submitLabel: isNew ? 'Schedule' : 'Save',
      after(form) {
        const daysField = form.querySelector('.install-only');
        const sync = () => { daysField.style.display = form.elements.type.value === 'install' ? '' : 'none'; };
        form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener('change', sync));
        sync();
        const ics = form.querySelector('#icsBtn');
        if (ics) ics.addEventListener('click', () => U.download(`${e.title.replace(/[^\w-]+/g, '_')}.ics`, icsFor(e), 'text/calendar'));
      },
      onSubmit(d) {
        d.type = d.type || e.type || 'other';
        d.projectId = fixedJob ? p0.id : d.projectId;
        const p = S.get('projects', d.projectId);
        d.days = d.type === 'install' ? Math.max(1, Math.round(Number(d.days) || 1)) : 1;
        d.title = `${C.eventType(d.type).label}${p ? ' – ' + p.name : ''}`;
        d.location = p ? p.address : (e.location || '');
        d.end = e.end || '';
        if (isNew) d.done = false;
        S.upsert('events', isNew ? d : { ...d, id: e.id });
        let msg = isNew ? 'Scheduled' : 'Saved';
        const rule = STAGE_FOR_EVENT[d.type];
        if (isNew && p && rule && rule[1].includes(p.stage)) {
          S.setStage(p, rule[0]);
          msg += `. Job moved to “${C.stage(rule[0]).label}”.`;
        }
        U.toast(msg);
        render();
      },
      onDelete: isNew ? null : () => { S.remove('events', e.id); render(); },
    });
  }

  // After an appointment: what happened, and what's next.
  function wrapUpForm(e) {
    const p = S.get('projects', e.projectId);
    const NEXT = {
      sales: [['quotes', 'Put quotes together'], ['again', 'Meet again'], ['yes', 'They said yes'], ['lost', 'Not interested']],
      measure: [['order', 'Ready to order'], ['again', 'Need to come back']],
      install: [['done', 'Job finished'], ['again', 'Need another day']],
    }[e.type] || [];
    const fields = [
      { name: 'summary', label: 'What happened?', type: 'textarea', rows: 4, placeholder: e.type === 'sales' ? 'What they want, rooms, rough measurements, budget…' : 'Anything worth remembering' },
      ...(p && NEXT.length ? [{ name: 'next', label: 'What\'s next?', type: 'chips', options: NEXT }] : []),
      { name: 'remind', label: 'Remind me to follow up', type: 'chips', options: [['', 'No'], ['2', 'In 2 days'], ['7', 'In a week'], ['14', 'In 2 weeks']] },
    ];
    const defNext = { sales: p && p.quotes.length ? 'again' : 'quotes', measure: 'order', install: 'done' }[e.type] || '';
    U.openForm({
      title: `How did the ${C.eventType(e.type).label.toLowerCase()} go?`,
      intro: p ? `<p class="form-context">${esc(p.name)} · ${esc(U.relDate(e.date))}</p>` : '',
      fields,
      values: { next: defNext, remind: e.type === 'sales' ? '2' : '' },
      submitLabel: 'Save',
      onSubmit(d) {
        e.done = true;
        S.upsert('events', e);
        if (p && d.summary) p.log.push({ id: S.uid(), date: e.date, type: e.type === 'sales' ? 'Visit' : 'Note', contactId: '', summary: `${C.eventType(e.type).label}: ${d.summary}` });
        if (p) S.touch(p);
        const client = p && S.primaryContact(p);
        if (d.remind) {
          const title = d.next === 'quotes' ? `Send quotes to ${firstName(client) || 'client'}` : `Follow up with ${firstName(client) || 'client'}`;
          S.upsert('tasks', { title, due: U.addDays(U.today(), Number(d.remind)), projectId: e.projectId || '', contactId: client ? client.id : '', done: false, forStage: p ? (d.next === 'quotes' && p.stage === 'lead' ? 'consult' : p.stage) : '' });
        }
        if (p) {
          if (d.next === 'quotes' && p.stage === 'lead') S.setStage(p, 'consult');
          if (d.next === 'lost') S.setStage(p, 'lost');
          if (d.next === 'done') finishJob(p);
          if (d.next === 'again') later(() => eventForm({}, { projectId: p.id, type: e.type, date: U.addDays(U.today(), 7) }));
          if (d.next === 'yes') { S.setStage(p, 'measure'); later(() => eventForm({}, { projectId: p.id, type: 'measure', date: U.addDays(U.today(), 3) })); }
          if (d.next === 'order') later(() => orderedForm(p));
        }
        U.toast('Saved');
        render();
      },
    });
  }

  // Notes written on a reminder also appear in its job's Notes, so they're easy to find later.
  function syncTaskNote(task) {
    const p = task.projectId && S.get('projects', task.projectId);
    if (!p) return;
    const entry = p.log.find((l) => l.taskId === task.id);
    if (task.notes) {
      const fields = { date: (task.doneAt || '').slice(0, 10) || task.due || U.today(), type: 'Note', summary: `${task.title}: ${task.notes}` };
      if (entry) Object.assign(entry, fields); else p.log.push({ id: S.uid(), taskId: task.id, contactId: '', ...fields });
    } else if (entry) p.log = p.log.filter((l) => l !== entry);
    S.touch(p);
  }

  function taskForm(t = {}, defaults = {}) {
    const isNew = !t.id;
    const pid = t.projectId || defaults.projectId;
    const p0 = pid && S.get('projects', pid);
    const fields = [
      { name: 'title', label: isNew ? 'What do you need to do?' : 'Reminder', required: true, placeholder: 'e.g. Talk to Nick about the Aetna job' },
      ...(p0 ? [] : [{ name: 'projectId', label: 'Job (optional)', type: 'select', options: projectOptions(t.projectId) }]),
      { name: 'due', label: 'Day', type: 'date', required: true, half: true },
      { name: 'time', label: 'Time (optional)', type: 'time', half: true },
      { name: 'notes', label: isNew ? 'Notes (optional)' : 'Notes', type: 'textarea', rows: isNew ? 2 : 5, placeholder: 'What did you talk about? It stays with this reminder.' },
      ...(!isNew && t.done ? [{ name: 'done', label: 'Done', type: 'checkbox' }] : []),
    ];
    const quick = isNew ? `<div class="quick-row reminder-quick">${[['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7], ['In 2 weeks', 14], ['In a month', 30]].map(([l, n]) => `<button type="button" class="chip" data-days="${n}">${l}</button>`).join('')}</div>` : '';
    const status = !isNew && t.done ? `<p class="form-context">${WC.icon('check')} Done${t.doneAt ? ` ${esc(U.fmtDate(t.doneAt.slice(0, 10)))}` : ''}</p>` : '';
    U.openForm({
      title: isNew ? 'Reminder' : (t.done ? 'Reminder (done)' : 'Reminder'),
      intro: `${p0 ? `<p class="form-context">For <b>${esc(p0.name)}</b></p>` : ''}${status}`,
      fields,
      values: isNew ? { due: defaults.date && defaults.date >= U.today() ? defaults.date : U.addDays(U.today(), 1), projectId: '' } : t,
      submitLabel: isNew ? 'Set reminder' : 'Save',
      altSubmit: !isNew && !t.done ? 'Mark done' : '',
      after(form) {
        if (!quick) return;
        form.querySelector('#f_due').closest('.field').insertAdjacentHTML('afterend', `<div class="field">${quick}</div>`);
        form.querySelectorAll('.reminder-quick [data-days]').forEach((b) => b.addEventListener('click', () => {
          form.elements.due.value = U.addDays(U.today(), Number(b.dataset.days));
          b.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
        }));
      },
      onSubmit(d, form, markDone) {
        if (p0) d.projectId = p0.id;
        if (isNew) { d.done = false; d.contactId = defaults.contactId || ''; }
        if (markDone) d.done = true;
        if (!isNew && 'done' in d || markDone) d.doneAt = d.done ? (t.doneAt || new Date().toISOString()) : null;
        const saved = S.upsert('tasks', isNew ? d : { ...d, id: t.id });
        syncTaskNote(saved);
        U.toast(isNew ? `Reminder set for ${relIn(d.due)}${d.time ? ' at ' + U.fmtTime(d.time) : ''}` : markDone ? 'Done. Your notes are saved with it.' : 'Saved');
        render();
      },
      onDelete: isNew ? null : () => {
        const p = t.projectId && S.get('projects', t.projectId);
        if (p) { p.log = p.log.filter((l) => l.taskId !== t.id); S.touch(p); }
        S.remove('tasks', t.id); render();
      },
    });
  }

  function logForm(p, l = {}) {
    const isNew = !l.id;
    const fields = [
      ...(p ? [] : [{ name: 'projectId', label: 'Job', type: 'select', options: projectOptions(), required: true }]),
      { name: 'type', label: 'Type', type: 'chips', options: [...C.LOG_TYPES, ...(l.type && !C.LOG_TYPES.includes(l.type) ? [l.type] : [])] },
      { name: 'summary', label: 'Note', type: 'textarea', rows: 5, required: true, placeholder: 'What was discussed or decided?' },
      ...(isNew ? [] : [{ name: 'date', label: 'Date', type: 'date' }]),
    ];
    U.openForm({
      title: isNew ? 'Add note' : 'Edit note',
      intro: p ? `<p class="form-context">For <b>${esc(p.name)}</b></p>` : '',
      fields,
      values: isNew ? { type: 'Note' } : l,
      onSubmit(d) {
        const proj = p || S.get('projects', d.projectId);
        if (!proj) { U.toast('Pick a job'); return false; }
        const entry = { id: l.id || S.uid(), date: d.date || l.date || U.today(), type: d.type || l.type || 'Note', contactId: l.contactId || '', summary: d.summary };
        if (isNew) proj.log.push(entry);
        else Object.assign(proj.log.find((x) => x.id === l.id), entry);
        S.touch(proj);
        U.toast('Note saved');
        render();
      },
      onDelete: isNew ? null : () => { p.log = p.log.filter((x) => x.id !== l.id); S.touch(p); render(); },
    });
  }

  // A quote option (Option A, B…) with an optional PDF.
  function quoteForm(p, q = {}) {
    const isNew = !q.id;
    const fields = [
      { name: 'name', label: 'Option name', required: true, placeholder: 'e.g. Option A – Duette with battery motors' },
      { name: 'amount', label: 'Price ($)', type: 'number', half: true },
      ...(isNew ? [{ name: 'file', label: 'Quote PDF (optional)', type: 'file', accept: 'application/pdf,image/*', half: true }] : []),
      { name: 'note', label: 'Note (optional)', more: true },
      ...(isNew ? [] : [{ name: 'chosen', label: 'This is the option they picked', type: 'checkbox' }]),
    ];
    U.openForm({
      title: isNew ? 'Add a quote' : 'Edit quote',
      intro: `<p class="form-context">For <b>${esc(p.name)}</b></p>`,
      fields,
      values: isNew ? { name: `Option ${String.fromCharCode(65 + Math.min(p.quotes.length, 25))}` } : q,
      submitLabel: isNew ? 'Add quote' : 'Save',
      onSubmit(d) {
        const save = (fileId) => {
          if (isNew) p.quotes.push({ id: S.uid(), name: d.name, amount: d.amount, note: d.note, fileId: fileId || '', date: U.today(), chosen: false });
          else {
            Object.assign(q, { name: d.name, amount: d.amount, note: d.note, chosen: d.chosen });
            if (d.chosen) { p.quotes.forEach((x) => { if (x !== q) x.chosen = false; }); if (d.amount) p.estValue = d.amount; }
          }
          let msg = isNew ? 'Quote added' : 'Saved';
          if (isNew && ['lead', 'consult'].includes(p.stage)) {
            const t = S.setStage(p, 'quoted');
            msg += `. Job moved to “Quotes out”${t ? `. Reminder to check in ${relIn(t.due)}` : ''}.`;
          }
          S.touch(p); render(); U.toast(msg);
        };
        if (isNew && d.file) {
          const fileId = S.uid();
          WC.files.put(fileId, d.file).then(() => {
            p.files.push({ id: fileId, name: d.file.name, label: 'Quote', type: d.file.type || 'application/pdf', size: d.file.size, addedAt: new Date().toISOString(), note: d.name });
            save(fileId);
          }).catch(() => { save(''); U.toast('Quote added, but the PDF could not be saved on this device'); });
        } else save('');
      },
      onDelete: isNew ? null : () => { p.quotes = p.quotes.filter((x) => x.id !== q.id); S.touch(p); render(); },
    });
  }

  // "They said yes": note which quote they picked, then book the final measure.
  function acceptJob(p) {
    const proceed = () => {
      S.setStage(p, 'measure');
      render();
      later(() => eventForm({}, { projectId: p.id, type: 'measure', date: U.addDays(U.today(), 3) }));
    };
    if (p.quotes.length < 2) {
      if (p.quotes[0]) { p.quotes[0].chosen = true; if (p.quotes[0].amount) p.estValue = p.quotes[0].amount; }
      proceed();
      return;
    }
    U.openInfo('Which option did they pick?', `<div class="chooser">${p.quotes.map((q) => `<button class="chooser-btn" data-quote="${q.id}"><span><b>${esc(q.name)}</b><em>${q.amount ? U.money(q.amount) : ''}</em></span></button>`).join('')}
      <button class="chooser-btn" data-quote=""><span><b>A mix / not sure yet</b></span></button></div>`);
    document.querySelectorAll('#modal [data-quote]').forEach((b) => b.addEventListener('click', () => {
      p.quotes.forEach((q) => { q.chosen = q.id === b.dataset.quote; if (q.chosen && q.amount) p.estValue = q.amount; });
      U.close();
      proceed();
    }));
  }

  // Ordered: when should it arrive? Sets a reminder for that day to schedule the install.
  function orderedForm(p) {
    U.openForm({
      title: 'Order placed',
      intro: `<p class="form-context">For <b>${esc(p.name)}</b>. Products usually take 1 to 3 months. You'll get a reminder that day to schedule the install.</p>`,
      fields: [{ name: 'eta', label: 'When should it arrive?', type: 'date', required: true, quick: [['4 weeks', 28], ['6 weeks', 42], ['8 weeks', 56], ['12 weeks', 84]] }],
      values: { eta: p.eta || U.addDays(U.today(), 42) },
      submitLabel: 'Save',
      onSubmit(d) {
        p.eta = d.eta;
        if (['lead', 'consult', 'quoted', 'measure'].includes(p.stage)) S.setStage(p, 'ordered');
        p.items.forEach((i) => { if (!i.status || i.status === 'Quoted') i.status = 'Ordered'; });
        S.all('tasks').filter((t) => t.projectId === p.id && t.auto === 'eta' && !t.done).forEach((t) => S.remove('tasks', t.id));
        S.upsert('tasks', { title: 'Product should be in: schedule the install', due: d.eta, projectId: p.id, contactId: '', done: false, auto: 'eta', forStage: 'ordered' });
        S.touch(p);
        U.toast(`Marked as ordered. Reminder set for ${U.fmtDate(d.eta)}.`);
        render();
      },
    });
  }

  function finishJob(p) {
    S.setStage(p, 'complete');
    p.items.forEach((i) => { if (i.status !== 'Issue') i.status = 'Installed'; });
    S.touch(p);
  }

  function jobMenu(p) {
    const opts = [
      ['edit', 'Edit job details'],
      ['person', 'Add a person'],
      ['step', 'Move to a different step'],
      ['phases', p.phases.length ? 'Add a job phase' : 'Track phases (big jobs)'],
      ...(section(p) !== 'closed' ? [['lost', 'Mark as lost']] : []),
    ];
    U.openInfo(p.name, `<div class="chooser">${opts.map(([k, l]) => `<button class="chooser-btn" data-pick="${k}"><span><b>${l}</b></span></button>`).join('')}</div>`);
    document.querySelectorAll('#modal [data-pick]').forEach((b) => b.addEventListener('click', () => {
      U.close();
      ({
        edit: () => projectForm(p),
        person: () => addPersonForm(p),
        step: () => statusPicker('Move to step', C.STAGES.map((s) => s.label), C.stage(p.stage).label, () => 'st-sales', (label) => {
          const st = C.STAGES.find((s) => s.label === label);
          if (st.id === 'complete') finishJob(p); else S.setStage(p, st.id);
          render(); U.toast(`Moved to “${label}”`);
        }),
        phases: () => {
          if (p.phases.length) { phaseForm(p); return; }
          C.PHASE_TEMPLATE.forEach((ph) => p.phases.push({ id: S.uid(), name: ph.name, waitingOn: ph.waitingOn, status: 'To do', date: '', notes: '' }));
          S.touch(p); go(`#/project/${p.id}`); render(); U.toast('Phases added to the Overview. Delete any that don\'t apply.');
        },
        lost: () => actions.markLost({ project: p.id }),
      })[b.dataset.pick]();
    }));
  }

  function itemForm(p, i = {}) {
    const isNew = !i.id;
    const rooms = [...new Set(p.items.map((x) => x.room).filter(Boolean))];
    const roomList = [...new Set([...rooms, 'Living Room', 'Kitchen', 'Dining', 'Primary Bedroom', 'Primary Bath', 'Bedroom 2', 'Bedroom 3', 'Office', 'Family Room', 'Great Room', 'Laundry', 'Patio'])];
    const products = [...new Set(S.all('projects').flatMap((x) => x.items.map((it) => it.product)).filter(Boolean))].sort();
    const brands = [...new Set(Object.values(S.db.settings.brands).flat())].sort();
    const mounts = ['Inside', 'Outside', 'Ceiling', ...(i.mount && !['Inside', 'Outside', 'Ceiling'].includes(i.mount) ? [i.mount] : [])];
    const fields = [
      { name: 'room', label: 'Room', list: roomList, half: true, required: true },
      { name: 'location', label: 'Window', placeholder: 'e.g. Left of sink', half: true },
      { name: 'width', label: 'Width (inches)', placeholder: '34 3/8', half: true },
      { name: 'height', label: 'Height (inches)', placeholder: '60 1/4', half: true },
      { name: 'product', label: 'Product', list: products, placeholder: 'e.g. Duette, shutters', half: true },
      { name: 'color', label: 'Fabric / color', half: true },
      { name: 'mount', label: 'Mount', type: 'chips', options: mounts },
      { name: 'control', label: 'Control', type: 'select', options: ['', ...C.CONTROLS, ...(i.control && !C.CONTROLS.includes(i.control) ? [i.control] : [])] },
      { name: 'brand', label: 'Brand', list: brands, half: true, more: true },
      { name: 'category', label: 'Category', type: 'select', options: C.CATEGORIES, half: true, more: true },
      { name: 'qty', label: 'Quantity', type: 'number', step: 1, half: true, more: true },
      { name: 'price', label: 'Price each ($)', type: 'number', half: true, more: true },
      { name: 'notes', label: 'Notes (stack side, obstructions, wiring…)', type: 'textarea', rows: 2, more: true },
    ];
    const last = p.items[p.items.length - 1];
    U.openForm({
      title: isNew ? 'Add window' : 'Edit window', fields,
      values: isNew ? { qty: 1, room: last ? last.room : '', product: last ? last.product : '', brand: last ? last.brand : '', color: last ? last.color : '', mount: last ? last.mount : 'Inside', control: last ? last.control : '', category: last ? last.category : 'Shades' } : i,
      submitLabel: isNew ? 'Add' : 'Save',
      onSubmit(d) {
        if (isNew && (!last || d.category === last.category)) d.category = WC.importer.categoryOf(`${d.brand} ${d.product}`) || d.category;
        if (isNew) p.items.push({ ...d, id: S.uid(), status: section(p) === 'sales' ? 'Quoted' : 'Ordered' });
        else Object.assign(p.items.find((x) => x.id === i.id), d);
        S.touch(p); render(); U.toast(isNew ? 'Window added' : 'Saved');
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

  function fileForm(p, opts = {}) {
    const def = opts.label || (state.fileFilter !== 'all' ? state.fileFilter : section(p) === 'sales' ? 'Quote' : 'Plans');
    const fields = [
      { name: 'file', label: 'Choose files (PDFs or photos)', type: 'file', accept: 'application/pdf,image/*,.csv,.xlsx,.xls', required: true, multiple: true },
      { name: 'label', label: 'What is it?', type: 'chips', options: C.DOC_LABELS },
      { name: 'note', label: 'Note (optional)', more: true },
    ];
    U.openForm({
      title: opts.title || 'Upload files',
      intro: `<p class="form-context">For <b>${esc(p.name)}</b></p>`,
      fields, values: { label: def }, submitLabel: 'Upload',
      onSubmit(d) {
        const files = [].concat(d.file || []);
        const label = d.label || def;
        if (!files.length) { U.toast('Choose a file'); return false; }
        if (files.some((f) => f.size > 50 * 1048576)) { U.toast('A file is over 50 MB. Try a smaller PDF.'); return false; }
        Promise.all(files.map((file) => {
          const id = S.uid();
          return WC.files.put(id, file).then(() => {
            p.files.push({ id, name: file.name, label, type: file.type || 'application/pdf', size: file.size, addedAt: new Date().toISOString(), note: d.note });
            // An uploaded quote also shows in the job's Quotes list.
            if (label === 'Quote') p.quotes.push({ id: S.uid(), name: file.name.replace(/\.[^.]+$/, ''), amount: '', note: d.note, fileId: id, date: U.today(), chosen: false });
          });
        })).then(() => {
          let msg = files.length > 1 ? `${files.length} files uploaded` : 'Uploaded';
          if (label === 'Quote' && ['lead', 'consult'].includes(p.stage)) { S.setStage(p, 'quoted'); msg += '. Job moved to “Quotes out”.'; }
          state.fileFilter = 'all';
          S.touch(p); render(); U.toast(msg);
        }).catch((e) => U.toast('Could not save the file: ' + ((e && e.message) || 'storage unavailable')));
      },
    });
  }

  function fileEditForm(p, f) {
    const fields = [
      { name: 'name', label: 'Name', required: true },
      { name: 'label', label: 'Type', type: 'select', options: C.DOC_LABELS },
      { name: 'note', label: 'Note', type: 'textarea', rows: 2 },
    ];
    U.openForm({
      title: 'Edit document', fields, values: f,
      onSubmit(d) { Object.assign(f, d); S.touch(p); render(); },
      onDelete() { p.files = p.files.filter((x) => x.id !== f.id); WC.files.del(f.id); S.touch(p); render(); U.toast('Document deleted'); },
    });
  }

  let viewerUrl = null;
  async function viewFile(p, f) {
    const isImg = (f.type || '').startsWith('image/');
    U.openInfo(f.name, `<div class="small muted">${esc(f.label)} · ${esc(p.name)}${f.note ? ' · ' + esc(f.note) : ''}</div>
      <div class="row gap wrap viewer-tools" id="viewerTools"></div>
      <div class="viewer" id="viewer"><p class="empty">Loading…</p></div>`, 'wide');
    const box = document.getElementById('viewer');
    const tools = document.getElementById('viewerTools');
    const blob = await WC.files.get(f.id).catch(() => null);
    if (!blob) { box.innerHTML = empty('This file isn\'t stored on this device. It may have been attached on another phone; restore a backup that includes it.'); return; }
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = URL.createObjectURL(blob);
    const fname = /\.\w{2,4}$/.test(f.name) ? f.name : f.name + (isImg ? '' : '.pdf');
    if (!WC.DEMO) {
      const shareFile = new File([blob], fname, { type: blob.type || f.type });
      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        tools.insertAdjacentHTML('beforeend', `<button class="btn tiny primary" id="shareFile">${WC.icon('share')} Share / email</button>`);
        document.getElementById('shareFile').addEventListener('click', () => navigator.share({ files: [shareFile], title: f.name }).catch(() => {}));
      }
      tools.insertAdjacentHTML('beforeend', `<a class="btn tiny" href="${viewerUrl}" target="_blank" rel="noopener">${WC.icon('external')} Open full screen</a>
        <button class="btn tiny" id="dlFile">${WC.icon('download')} Download</button>`);
      document.getElementById('dlFile').addEventListener('click', () => U.download(fname, blob));
    }
    const kind = WC.importer.kindOf(f.name, f.type);
    if (kind === 'csv' || kind === 'excel') {
      try {
        const grid = (await WC.importer.readGrid(blob, f.name)).find((g) => g.length) || [];
        box.innerHTML = `<div class="sheet-wrap"><table class="sheet">${grid.slice(0, 300).map((row, ri) => `<tr>${row.map((c) => (ri ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`)).join('')}</tr>`).join('')}</table></div>`;
      } catch (e) { box.innerHTML = empty('The preview couldn\'t load: ' + esc(e.message)); }
      return;
    }
    let zoom = 1;
    tools.insertAdjacentHTML('beforeend', `<button class="btn tiny" id="zoomBtn" aria-pressed="false">${WC.icon('zoom')} Zoom in</button>`);
    const zoomBtn = document.getElementById('zoomBtn');
    zoomBtn.addEventListener('click', async () => {
      zoom = zoom === 1 ? 2.5 : 1;
      zoomBtn.setAttribute('aria-pressed', String(zoom > 1));
      zoomBtn.innerHTML = `${WC.icon('zoom')} ${zoom > 1 ? 'Zoom out' : 'Zoom in'}`;
      box.classList.toggle('zoomed', zoom > 1);
      if (isImg) return;
      await WC.files.renderPdf(blob, box, zoom).catch(() => {});
    });
    if (isImg) { box.innerHTML = `<img class="viewer-img" src="${viewerUrl}" alt="${esc(f.name)}">`; return; }
    try {
      await WC.files.renderPdf(blob, box);
    } catch (e) {
      box.innerHTML = empty(WC.DEMO ? 'The preview couldn\'t load here.' : 'The preview needs an internet connection the first time. Use “Open full screen” instead.');
    }
  }

  // ---- Order sheet import ----
  const SHEET_ACCEPT = '.xlsx,.xls,.csv,.tsv,.txt,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

  function pickOrderSheet(p) {
    U.openInfo('Import order sheet', `
      <p>Upload the order sheet and its lines become products on this job. You'll see everything before it's added.</p>
      <ul class="small muted tight-list">
        <li><b>Excel or CSV</b> works best: any sheet with a header row like Room, Window, Width, Height, Fabric, Mount, Control.</li>
        <li><b>PDF</b> order forms work when they have selectable text (not a scan). Results may need a quick check.</li>
      </ul>
      <div class="row gap wrap">
        <label class="btn primary">${WC.icon('upload')} Choose file<input type="file" id="sheetInput" accept="${SHEET_ACCEPT}" hidden></label>
        <button class="btn" id="sheetTemplate">Get blank template</button>
      </div>`);
    document.getElementById('sheetTemplate').addEventListener('click', () => U.download('order-sheet-template.csv', WC.importer.TEMPLATE, 'text/csv'));
    document.getElementById('sheetInput').addEventListener('change', async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      document.querySelector('#modal .modal-body').innerHTML = '<p class="empty">Reading ' + esc(file.name) + '…</p>';
      try {
        reviewImport(p, file, await WC.importer.analyze(file));
      } catch (e) {
        document.querySelector('#modal .modal-body').innerHTML = `<p>Couldn't read that file: ${esc(e.message)}</p>`;
      }
    });
  }

  function reviewImport(p, file, res) {
    const st = { ...res, items: res.items };
    const colOpts = (sel) => `<option value="">— not in sheet —</option>${(st.grid ? st.grid[st.headerIdx] : []).map((h, ci) => `<option value="${ci}" ${String(sel) === String(ci) ? 'selected' : ''}>${esc(h || `Column ${ci + 1}`)}</option>`).join('')}`;
    const rowHtml = (it, k) => `<label class="imp-row">
        <input type="checkbox" data-imp="${k}" ${it.include ? 'checked' : ''}>
        <span class="grow"><b>${esc(it.room || 'No room')}${it.location ? ' · ' + esc(it.location) : ''}</b>
          <span class="imp-dim">${it.width || it.height ? `${esc(it.width || '?')} × ${esc(it.height || '?')}` : ''}${it.qty > 1 ? ` · qty ${it.qty}` : ''}</span>
          <span class="small muted">${[it.brand, it.product, it.color, it.mount && it.mount + ' mount', it.control, it.price && U.money(it.price)].filter(Boolean).map(esc).join(' · ')}</span></span>
      </label>`;
    const body = () => {
      const n = st.items.filter((x) => x.include).length;
      return `
        ${st.items.length ? `<p class="small">Found <b>${st.items.length}</b> line${st.items.length === 1 ? '' : 's'} in <b>${esc(file.name)}</b>. Uncheck anything you don't want. You can edit details after importing.</p>`
          : `<p>No product lines were found in <b>${esc(file.name)}</b>. Order sheets import best as Excel or CSV with a header row (Room, Width, Height…). You can still save the file to the job.</p>`}
        ${st.mode === 'lines' ? '<p class="small muted">This PDF had no clear table header, so lines with W × H measurements were picked out. Check rooms and products.</p>' : ''}
        ${st.mode === 'table' ? `<details class="imp-map"><summary>Column matching</summary><div class="form-grid">${WC.importer.FIELDS.map(([f, label]) => `<label class="field half"><span>${esc(label)}</span><select data-map="${f}">${colOpts(st.map[f])}</select></label>`).join('')}</div></details>` : ''}
        <div class="imp-list">${st.items.map(rowHtml).join('')}</div>
        <div class="form-grid imp-opts">
          ${st.items.length ? `<label class="field half"><span>Set status to</span><select id="impStatus">${['Quoted', 'Ordered', 'Received'].map((x) => `<option ${x === 'Ordered' ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
          <label class="field check"><input type="checkbox" id="impSave" checked> Save the order sheet to this job</label>
          ${p.items.length && st.items.length ? `<label class="field check"><input type="checkbox" id="impReplace"> Replace the ${p.items.length} current product${p.items.length === 1 ? '' : 's'}</label>` : ''}
        </div>
        <div class="row gap end imp-actions">
          <button class="btn ghost" id="impCancel">Cancel</button>
          <button class="btn primary" id="impGo">${n ? `Add ${n} product${n === 1 ? '' : 's'}` : 'Save file only'}</button>
        </div>`;
    };
    U.openInfo('Review order sheet', '<div id="impBody"></div>', 'wide');
    const host = document.getElementById('impBody');
    const draw = () => { host.innerHTML = body(); };
    draw();
    host.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.dataset.imp !== undefined) { st.items[Number(t.dataset.imp)].include = t.checked; const n = st.items.filter((x) => x.include).length; document.getElementById('impGo').textContent = n ? `Add ${n} product${n === 1 ? '' : 's'}` : 'Save file only'; }
      if (t.dataset.map) {
        st.map[t.dataset.map] = t.value === '' ? undefined : Number(t.value);
        st.items = WC.importer.rowsToItems(st.grid, st.headerIdx, st.map);
        const open = host.querySelector('details').open;
        draw();
        host.querySelector('details').open = open;
      }
    });
    host.addEventListener('click', (ev) => {
      if (ev.target.closest('#impCancel')) U.close();
      if (!ev.target.closest('#impGo')) return;
      const chosen = st.items.filter((x) => x.include);
      const status = (document.getElementById('impStatus') || {}).value || 'Ordered';
      const replace = (document.getElementById('impReplace') || {}).checked;
      const saveFile = document.getElementById('impSave').checked;
      if (!chosen.length && !saveFile) { U.close(); return; }
      if (replace) p.items = [];
      chosen.forEach(({ include, ...it }) => p.items.push({ ...it, id: S.uid(), status, importedFrom: file.name }));
      const done = () => { S.touch(p); U.close(); go(`#/project/${p.id}/products`); render(); U.toast(chosen.length ? `Added ${chosen.length} product${chosen.length === 1 ? '' : 's'} from ${file.name}` : 'Order sheet saved'); };
      if (!saveFile) { done(); return; }
      const id = S.uid();
      WC.files.put(id, file).then(() => {
        p.files.push({ id, name: file.name, label: 'Order sheet', type: file.type || '', size: file.size, addedAt: new Date().toISOString(), note: chosen.length ? `${chosen.length} products imported` : '' });
        done();
      }).catch(() => { done(); U.toast('Products added, but the file could not be saved on this device'); });
    });
  }

  function statusPicker(title, options, current, cls, onPick) {
    U.openInfo(title, `<p class="small muted">Current status: <b>${esc(current)}</b></p><div class="chooser">${options.map((o) => `<button class="chooser-btn ${o === current ? 'is-current' : ''}" data-status="${esc(o)}"><span class="badge ${cls(o)}">${esc(o)}</span>${o === current ? '<em>Current</em>' : ''}</button>`).join('')}</div>`);
    document.querySelectorAll('#modal [data-status]').forEach((b) => b.addEventListener('click', () => {
      U.close();
      if (b.dataset.status !== current) onPick(b.dataset.status);
    }));
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
  // Builds a one-page PDF from [text, fontSize] lines (ASCII text only).
  function samplePdf(lines, draw = '', box = [612, 792]) {
    const pdfEsc = (str) => str.replace(/[\\()]/g, '\\$&');
    let y = box[1] - 62;
    // A line is [text, size] or [text, size, x, y] for positioned labels.
    const body = draw + '\n' + lines.map(([txt, size, lx, ly]) => { const out = `BT /F1 ${size} Tf ${lx ?? 60} ${ly ?? y} Td (${pdfEsc(txt)}) Tj ET`; if (lx == null) y -= size + 9; return out; }).join('\n');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${box[0]} ${box[1]}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
      `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let out = '%PDF-1.4\n';
    const offsets = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([out], { type: 'application/pdf' });
  }
  function loadSample(quiet) {
    const t = U.today();
    const iso = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
    const c = (o) => S.upsert('contacts', { address: '', notes: '', company: '', email: '', ...o });
    const sarah = c({ name: 'Sarah Johnson', role: 'Homeowner', phone: '(555) 201-3344', email: 'sarah@example.com', address: '42 Lakeview Dr' });
    const dana = c({ name: 'Dana Ruiz', role: 'Interior Designer', company: 'Ruiz Interiors', phone: '(555) 410-7788', email: 'dana@example.com', notes: 'Prefers texts. Likes to see fabric samples in person.' });
    const mike = c({ name: 'Mike Patterson', role: 'Builder / GC', company: 'Patterson Homes', phone: '(555) 330-1200' });
    const ed = c({ name: 'Ed Lin', role: 'Electrician', company: 'Bright Electric', phone: '(555) 778-0099' });
    const tom = c({ name: 'Tom & Lisa Greene', role: 'Homeowner', phone: '(555) 600-4512', address: '9 Harbor Ct' });

    const maria = c({ name: 'Maria Alvarez', role: 'Homeowner', phone: '(555) 219-4410', address: '18 Oak Ln' });
    const ruizCo = S.all('companies').find((x) => x.id === dana.companyId);
    S.upsert('companies', { ...ruizCo, phone: '(555) 410-7700', website: 'ruizinteriors.example', address: '220 Main St, Suite 4', notes: 'Sends 4–6 jobs a year. Trade pricing applies. Dana handles selections; Jen in their office handles scheduling.' });
    const pattCo = S.all('companies').find((x) => x.id === mike.companyId);
    S.upsert('companies', { ...pattCo, phone: '(555) 330-1000', notes: 'Custom builder. Wants pre-wire done before insulation.' });

    const linh = c({ name: 'Linh Nguyen', role: 'Homeowner', phone: '(555) 388-2290', address: '310 Elm St' });
    const jordan = c({ name: 'Jordan Brooks', role: 'Homeowner', phone: '(555) 912-6631', address: '5 Pine Ave' });
    const hist = (...steps) => steps.map(([stage, d]) => ({ stage, at: iso(d) }));
    const proj = (o) => S.upsert('projects', { items: [], phases: [], log: [], files: [], quotes: [], notes: '', estValue: '', referredBy: '', ...o });

    // New lead: referral from a designer, needs a sales call booked.
    const p6 = proj({ name: 'Jordan Brooks – 5 Pine Ave', stage: 'lead', address: '5 Pine Ave', referredBy: 'Dana Ruiz', source: 'Referral',
      contacts: [{ contactId: jordan.id, role: 'Homeowner' }, { contactId: dana.id, role: 'Interior Designer' }],
      notes: 'Looking for: blackout shades in bedrooms, something nice for the living room', stageHistory: hist(['lead', 0]) });
    S.upsert('tasks', { title: 'Call Jordan to book a sales call', due: t, projectId: p6.id, contactId: jordan.id, done: false, forStage: 'lead' });

    // Sales calls: first visit is tomorrow.
    const p1 = proj({ name: 'Johnson – Lakeview Dr', stage: 'consult', address: '42 Lakeview Dr', referredBy: 'Dana Ruiz', source: 'Referral',
      contacts: [{ contactId: sarah.id, role: 'Homeowner' }, { contactId: dana.id, role: 'Interior Designer' }],
      notes: 'Looking for: motorized shades for the great room, shutters in bedrooms', estValue: 8500,
      stageHistory: hist(['lead', -5], ['consult', -4]),
      log: [{ id: S.uid(), date: U.addDays(t, -5), type: 'Call', contactId: dana.id, summary: 'Dana referred Sarah. Great room has 6 tall windows facing west.' }] });
    S.upsert('events', { title: 'Sales call – Johnson – Lakeview Dr', type: 'sales', projectId: p1.id, date: U.addDays(t, 1), start: '10:00', end: '', days: 1, location: p1.address, notes: 'Bring Duette & shutter samples. Dana will join.', done: false });

    // Quotes out: two options sent, checking in.
    const p2 = proj({ name: 'Greene – Harbor Ct', stage: 'quoted', address: '9 Harbor Ct', referredBy: 'Past client', source: 'Referral',
      contacts: [{ contactId: tom.id, role: 'Homeowner' }], estValue: 4200,
      stageHistory: hist(['lead', -20], ['consult', -16], ['quoted', -9]),
      items: [
        { id: S.uid(), room: 'Patio', location: 'South opening', category: 'Outdoor Screens & Shades', brand: 'Phantom Screens', product: 'Executive', color: 'Charcoal 90%', width: '144', height: '96', mount: 'Outside', control: 'Motorized – hardwired', qty: 1, price: 3200, status: 'Quoted', notes: '' },
        { id: S.uid(), room: 'Kitchen', location: 'Over sink', category: 'Shades', brand: 'Hunter Douglas', product: 'Vignette', color: 'Linen', width: '36 1/2', height: '48', mount: 'Inside', control: 'Cordless', qty: 1, price: 1000, status: 'Quoted', notes: '' },
      ],
      log: [{ id: S.uid(), date: U.addDays(t, -16), type: 'Visit', contactId: tom.id, summary: 'Sales call: they want shade on the patio in the afternoon and something simple for the kitchen. Rough sizes taken.' }] });
    S.upsert('tasks', { title: 'Check in on the quotes', due: U.addDays(t, -2), projectId: p2.id, contactId: tom.id, done: false, forStage: 'quoted' });
    const pdfId = S.uid();
    const pdf = samplePdf([
      ['QUOTE - OPTION A', 22], ['Window treatments for Tom & Lisa Greene', 13], ['9 Harbor Ct', 11], [`Prepared ${U.fmtDate(U.addDays(t, -9), { month: 'long', day: 'numeric', year: 'numeric' })}`, 11], ['', 11],
      ['Patio - south opening', 13], ['Phantom Screens Executive retractable screen, Charcoal 90%', 11], ['Motorized, hardwired. 144 in W x 96 in H, outside mount            $3,200', 11], ['', 11],
      ['Kitchen - over sink', 13], ['Hunter Douglas Vignette modern roman shade, Linen', 11], ['Cordless. 36 1/2 in W x 48 in H, inside mount                        $1,000', 11], ['', 11],
      ['Total (installed)                                                    $4,200', 13], ['', 11],
      ['Sample document created for the demo.', 9],
    ]);
    p2.files.push({ id: pdfId, name: 'Greene quote - Option A.pdf', label: 'Quote', type: 'application/pdf', size: pdf.size, addedAt: iso(-9), note: '' });
    p2.quotes.push({ id: S.uid(), name: 'Option A – Motorized patio screen', amount: 4200, note: 'Includes kitchen Vignette', fileId: pdfId, date: U.addDays(t, -9), chosen: false });
    p2.quotes.push({ id: S.uid(), name: 'Option B – Manual patio screen', amount: 3100, note: 'Crank operation, same kitchen shade', fileId: '', date: U.addDays(t, -9), chosen: false });
    S.touch(p2);
    WC.files.put(pdfId, pdf).catch(() => {});
    S.upsert('events', { title: 'Sales call – Greene – Harbor Ct', type: 'sales', projectId: p2.id, date: U.addDays(t, -3), start: '13:00', end: '', days: 1, location: p2.address, notes: 'Go over Option A vs B', done: false });

    // Final measure: big new-construction job waiting on drywall (uses job phases).
    const p3 = proj({ name: 'Patterson Homes – Lot 14', stage: 'measure', address: '1400 Ridge Rd', referredBy: 'Patterson Homes', source: 'Referral',
      contacts: [{ contactId: mike.id, role: 'Builder / GC' }, { contactId: dana.id, role: 'Interior Designer' }, { contactId: ed.id, role: 'Electrician' }], estValue: 38000,
      stageHistory: hist(['lead', -60], ['consult', -55], ['quoted', -48], ['measure', -40]),
      phases: C.PHASE_TEMPLATE.slice(0, 6).map((ph, i) => ({ id: S.uid(), name: ph.name, waitingOn: ph.waitingOn, notes: '', date: i === 3 ? U.addDays(t, 18) : '', status: i < 3 ? 'Done' : i === 3 ? 'Waiting' : 'To do' })),
      items: ['Great Room', 'Great Room', 'Primary Bedroom', 'Primary Bath', 'Office'].map((room, i) => ({ id: S.uid(), room, location: `Window ${i + 1}`, category: 'Shades', brand: 'Lutron', product: 'Sivoia QS Roller', color: 'Basketweave 3%', width: '', height: '', mount: 'Pocket', control: 'Motorized – hardwired', qty: 1, price: 1800, status: 'Quoted', notes: 'Wire pulled to left side' })),
      log: [{ id: S.uid(), date: U.addDays(t, -30), type: 'Visit', contactId: ed.id, summary: 'Ran low-voltage to all 5 shade pockets with Ed. Marked headers for blocking.' },
        { id: S.uid(), date: U.addDays(t, -7), type: 'Call', contactId: mike.id, summary: 'Mike says drywall starts in about 2 weeks. He will call when paint is done so we can do the final measure.' }] });
    // Simple floor plan sheet: room outlines with window marks.
    const plan = samplePdf([
      ['LOT 14 - FIRST FLOOR PLAN', 16, 40, 560], ['Patterson Homes  |  Window treatment layout  |  Scale 1/8 in = 1 ft', 9, 40, 544],
      ['GREAT ROOM', 12, 120, 380], ['PRIMARY BEDROOM', 12, 470, 380], ['PRIMARY BATH', 10, 480, 190], ['OFFICE', 12, 140, 190],
      ['W1', 9, 92, 474], ['W2', 9, 222, 474], ['W3', 9, 520, 474], ['W4', 9, 650, 300], ['W5', 9, 30, 160],
      ['Shade pockets at W1-W3: 4 in deep, wire pulled left side', 9, 40, 40],
    ], '0.15 0.2 0.3 RG 2 w 60 80 m 700 80 l 700 470 l 60 470 h S 1 w 360 80 m 360 470 l S 60 270 m 700 270 l S 420 80 m 420 270 l S '
      + '0.35 0.55 0.8 RG 5 w 80 470 m 150 470 l S 210 470 m 280 470 l S 500 470 m 590 470 l S 700 290 m 700 360 l S 60 140 m 60 200 l S', [792, 612]);
    const planId = S.uid();
    p3.files.push({ id: planId, name: 'Lot 14 first floor plan.pdf', label: 'Plans', type: 'application/pdf', size: plan.size, addedAt: iso(-45), note: 'From Patterson Homes, rev B' });
    WC.files.put(planId, plan).catch(() => {});
    const sheetCsv = 'Room,Window,Width,Height,Qty,Brand,Product,Fabric / Color,Mount,Control,Price\n'
      + p3.items.map((i) => [i.room, i.location, '', '', 1, i.brand, i.product, i.color, i.mount, i.control, i.price].join(',')).join('\n') + '\n';
    const sheet = new Blob([sheetCsv], { type: 'text/csv' });
    const sheetId = S.uid();
    p3.files.push({ id: sheetId, name: 'Lot 14 Lutron order.csv', label: 'Order sheet', type: 'text/csv', size: sheet.size, addedAt: iso(-38), note: 'Widths/heights after final measure' });
    WC.files.put(sheetId, sheet).catch(() => {});
    S.touch(p3);

    S.upsert('events', { title: 'Site visit – Patterson Homes – Lot 14', type: 'meeting', projectId: p3.id, date: U.addDays(t, 3), start: '08:00', end: '09:00', days: 1, location: p3.address, notes: 'Walk with Mike & Dana, confirm pocket sizes.', done: false });
    S.upsert('tasks', { title: 'Check with Mike on drywall schedule', due: U.addDays(t, 7), projectId: p3.id, contactId: mike.id, done: false });

    proj({ name: 'Alvarez – Oak Ln', stage: 'complete', address: '18 Oak Ln', referredBy: 'Dana Ruiz', source: 'Referral',
      contacts: [{ contactId: maria.id, role: 'Homeowner' }, { contactId: dana.id, role: 'Interior Designer' }], estValue: 6200,
      stageHistory: hist(['lead', -150], ['consult', -146], ['quoted', -140], ['measure', -134], ['ordered', -130], ['install', -111], ['complete', -110]),
      items: ['Living Room', 'Living Room', 'Dining', 'Primary Bedroom'].map((room, i) => ({ id: S.uid(), room, location: `Window ${i + 1}`, category: 'Shades', brand: 'Hunter Douglas', product: 'Silhouette', color: 'Opal', width: '42', height: '66', mount: 'Inside', control: 'Motorized – battery', qty: 1, price: 1550, status: 'Installed', notes: '' })),
      log: [{ id: S.uid(), date: U.addDays(t, -110), type: 'Visit', contactId: maria.id, summary: 'Install complete. Programmed PowerView scenes for morning and evening. Maria very happy.' }] });

    // Ordered: waiting on product.
    const p5 = proj({ name: 'Linh Nguyen – 310 Elm St', stage: 'ordered', address: '310 Elm St', referredBy: 'Website', eta: U.addDays(t, 20),
      contacts: [{ contactId: linh.id, role: 'Homeowner' }], estValue: 5400,
      stageHistory: hist(['lead', -70], ['consult', -66], ['quoted', -60], ['measure', -45], ['ordered', -40]),
      items: ['Living Room', 'Living Room', 'Living Room', 'Den'].map((room, i) => ({ id: S.uid(), room, location: ['Left', 'Center', 'Right', 'Window'][i], category: 'Shades', brand: 'Hunter Douglas', product: 'Pirouette', color: 'Snow', width: ['30 1/4', '60 1/2', '30 1/4', '36'][i], height: '64', mount: 'Inside', control: 'Cordless', qty: 1, price: 1350, status: 'Ordered', notes: '' })) });
    S.upsert('tasks', { title: 'Product should be in: schedule the install', due: U.addDays(t, 20), projectId: p5.id, contactId: '', done: false, auto: 'eta', forStage: 'ordered' });

    // Install: two-day install starting today.
    const p4 = proj({ name: 'Kim – Maple St', stage: 'install', address: '77 Maple St',
      contacts: [], estValue: 2600, stageHistory: hist(['lead', -90], ['consult', -86], ['quoted', -80], ['measure', -74], ['ordered', -70], ['install', -1]),
      items: ['Living Room', 'Living Room', 'Bedroom 2'].map((room, i) => ({ id: S.uid(), room, location: `Window ${i + 1}`, category: 'Shutters', brand: 'Norman', product: 'Woodlore', color: 'Pure White', width: '30', height: '54', mount: 'Inside', control: '', qty: 1, price: 850, status: i === 0 ? 'Installed' : 'Received', notes: '' })) });
    S.upsert('events', { title: 'Install – Kim – Maple St', type: 'install', projectId: p4.id, date: t, start: '09:00', end: '15:00', days: 2, location: p4.address, notes: '', done: false });
    if (quiet !== true) U.toast('Sample data loaded');
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

    newTask: (ds) => taskForm({}, { projectId: ds.project, contactId: ds.contact, date: ds.date }),
    editTask: (ds) => taskForm(S.get('tasks', ds.id)),
    toggleTask: (ds) => {
      const t = S.get('tasks', ds.id);
      t.done = !t.done;
      t.doneAt = t.done ? new Date().toISOString() : null;
      S.save();
      if (t.done) U.toast(t.notes ? 'Done' : 'Done. Tap it to add notes.');
      setTimeout(render, 250);
    },

    addQuote: (ds) => quoteForm(proj(ds)),
    editQuote: (ds) => { const p = proj(ds); quoteForm(p, p.quotes.find((q) => q.id === ds.id)); },
    acceptJob: (ds) => acceptJob(proj(ds)),
    markOrdered: (ds) => orderedForm(proj(ds)),
    markDone: (ds) => {
      const p = proj(ds);
      U.ask('Mark this job as finished?', () => { finishJob(p); render(); U.toast('Job finished. A check-in reminder is set for two weeks from now.'); }, 'Job finished');
    },
    markLost: (ds) => {
      const p = proj(ds);
      U.ask('Mark this job as lost? You can reopen it later.', () => { S.setStage(p, 'lost'); render(); U.toast('Marked as lost'); }, 'Mark as lost');
    },
    reopen: (ds) => {
      const p = proj(ds);
      const prev = p.stageHistory.slice().reverse().find((h) => C.stage(h.stage).section !== 'closed');
      S.setStage(p, prev ? prev.stage : 'consult');
      render(); U.toast(`Reopened at “${C.stage(p.stage).label}”`);
    },
    jobMenu: (ds) => jobMenu(proj(ds)),
    installApp: () => { if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; render(); }); } },
    hideInstall: () => { S.db.settings.installHintHidden = true; S.save(); render(); },

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
    itemStatus: (ds) => {
      const p = proj(ds); const i = p.items.find((x) => x.id === ds.id);
      statusPicker(`${i.room || 'Product'}${i.location ? ' · ' + i.location : ''}`, C.ITEM_STATUSES, i.status || 'Quoted', itemClass, (st) => {
        i.status = st; S.touch(p); render(); U.toast(`Marked ${st}`);
      });
    },
    importSheet: (ds) => pickOrderSheet(proj(ds)),
    addPlans: (ds) => fileForm(proj(ds), { label: 'Plans / drawings', multiple: true, title: 'Upload plans' }),
    copyOrder: (ds) => {
      const text = orderList(proj(ds));
      U.openInfo('Order list (quoted & ordered items)', `<textarea class="order-text" rows="14" readonly>${esc(text)}</textarea><button class="btn primary" id="copyBtn">Copy to clipboard</button>`);
      document.getElementById('copyBtn').addEventListener('click', () => {
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => U.toast('Copied'), () => { document.querySelector('.order-text').select(); U.toast('Select & copy the text'); });
      });
    },

    addFile: (ds) => fileForm(proj(ds)),
    setFileFilter: (ds) => { state.fileFilter = ds.value; render(); },
    viewFile: (ds) => { const p = proj(ds); viewFile(p, p.files.find((f) => f.id === ds.id)); },
    editFile: (ds) => { const p = proj(ds); fileEditForm(p, p.files.find((f) => f.id === ds.id)); },

    newPhase: (ds) => phaseForm(proj(ds)),
    editPhase: (ds) => { const p = proj(ds); phaseForm(p, p.phases.find((x) => x.id === ds.id)); },
    phaseTemplate: (ds) => {
      const p = proj(ds);
      C.PHASE_TEMPLATE.forEach((ph) => p.phases.push({ id: S.uid(), name: ph.name, waitingOn: ph.waitingOn, status: 'To do', date: '', notes: '' }));
      S.touch(p); render(); U.toast('Phases added. Edit or delete any that don\'t apply.');
    },
    phaseStatus: (ds) => {
      const p = proj(ds); const ph = p.phases.find((x) => x.id === ds.id);
      statusPicker(ph.name, C.PHASE_STATUSES, ph.status, (o) => `ph-badge ${phaseClass(o)}`, (st) => {
        ph.status = st; S.touch(p); render(); U.toast(`Marked ${st}`);
      });
    },
    movePhase: (ds) => {
      const p = proj(ds); const i = p.phases.findIndex((x) => x.id === ds.id); const j = i + Number(ds.dir);
      if (j < 0 || j >= p.phases.length) return;
      [p.phases[i], p.phases[j]] = [p.phases[j], p.phases[i]];
      S.touch(p); render();
    },

    newContact: (ds) => contactForm({}, null, { company: ds.company || '', role: ds.company ? undefined : 'Homeowner' }),
    newRecord: () => newRecordChooser(),
    editCompany: (ds) => companyForm(S.get('companies', ds.id)),
    editContact: (ds) => contactForm(S.get('contacts', ds.id)),

    setFilter: (ds) => { state[ds.key] = ds.value; render(); },
    calDay: (ds) => { state.calDay = ds.date; state.calMonth = ds.date.slice(0, 8) + '01'; render(); },
    calMonth: (ds) => {
      const n = Number(ds.dir);
      if (n === 0) { state.calDay = U.today(); state.calMonth = state.calDay.slice(0, 8) + '01'; } else {
        const d = U.parse(state.calMonth); d.setMonth(d.getMonth() + n); state.calMonth = U.ymd(d);
      }
      render();
    },

    saveName: () => { S.db.settings.userName = document.getElementById('set_name').value.trim(); S.save(); U.toast('Saved'); },
    saveBrands: () => {
      document.querySelectorAll('[data-brand-cat]').forEach((ta) => { S.db.settings.brands[ta.dataset.brandCat] = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); });
      S.save(); U.toast('Brands saved');
    },
    exportData: () => {
      U.toast('Preparing backup…');
      S.exportJSON(!WC.DEMO).then((txt) => { U.download(`wc-tracker-backup-${U.today()}.json`, txt, 'application/json'); render(); })
        .catch((e) => U.toast('Backup failed: ' + e.message));
    },
    loadSample: () => { if (!S.all('projects').length) loadSample(); else U.ask('Add sample jobs and contacts alongside your data?', loadSample, 'Add samples'); },
    resetData: () => U.ask(WC.DEMO ? 'Erase all demo data and start from an empty app?' : 'Erase ALL jobs, contacts, appointments and follow-ups on this device? Export a backup first!', () => { S.reset(); go('#/home'); }, 'Erase everything'),
    resetDemo: () => U.ask('Put the sample data back the way it started?', () => { S.reset(); loadSample(true); U.toast('Demo reset'); }, 'Reset demo'),
  };

  const changes = {
    bulkStatus: (el) => {
      const status = el.value;
      el.value = '';
      if (!status) return;
      const p = proj(el.dataset);
      U.ask(`Mark all ${p.items.length} products as ${status}?`, () => { p.items.forEach((i) => { i.status = status; }); S.touch(p); render(); }, 'Mark all');
    },
    contactRole: (el) => { state.contactRole = el.value; document.getElementById('recResults').innerHTML = recResults(); },
    importData: (el) => {
      const f = el.files[0];
      if (!f) return;
      el.value = '';
      U.ask('Replace everything on this device with the backup file?', () => {
        f.text().then((txt) => S.importJSON(txt)).then(() => { U.toast('Backup restored'); render(); }).catch((e) => U.toast('Import failed: ' + e.message));
      }, 'Replace');
    },
  };

  const searchRenderers = { salesList: () => pipelineList('sales', 'salesFilter', 'salesSearch'), installList: () => pipelineList('install', 'installFilter', 'installSearch'), recResults };

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
    if (r.view === 'contact' || r.view === 'company' || r.view === 'contacts') active = 'records';
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === active));
    document.querySelectorAll('[data-thumb]').forEach((el) => {
      WC.files.get(el.dataset.thumb).then((blob) => blob && WC.files.renderThumb(blob, el)).catch(() => {});
    });
  }

  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  // Re-render when the app comes back to the foreground so "Today" stays current.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.getElementById('modal').open) render(); });

  WC.render = render;
  if (WC.DEMO && !S.all('projects').length) loadSample(true);
  render();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
