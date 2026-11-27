// Date helpers, HTML escaping, icons, toast and the bottom-sheet dialog.
window.L = window.L || {};
(function () {
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => key(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return key(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const dow = (s) => parse(s).getDay();
  const weekStart = (s) => addDays(s, -dow(s)); // weeks start on Sunday
  const fmt = (s, o) => parse(s).toLocaleDateString(undefined, o);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function relDay(s) {
    const n = daysBetween(today(), s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return fmt(s, { weekday: 'long' });
    if (n < -1 && n > -7) return 'Last ' + fmt(s, { weekday: 'short' });
    return fmt(s, { month: 'short', day: 'numeric', year: parse(s).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }

  const P = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    habits: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    journal: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    flame: '<path d="M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3 0-5.5 1-8.5z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    schedule: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    spiritual: '<path d="M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z"/><path d="M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>',
    moon: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // Toast with an optional action button (e.g. Undo).
  let toastTimer;
  function toast(msg, action) {
    const el = document.getElementById('toast');
    el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
    if (action) el.querySelector('button').onclick = () => { action.run(); el.classList.remove('show'); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
  }

  // Bottom sheet. onSubmit(formData, form) returns false to keep it open.
  function sheet({ title, body, submit = 'Save', onSubmit, onMount, onClose, danger }) {
    const dlg = document.getElementById('sheet');
    dlg.innerHTML = `<form class="sheet" novalidate>
      <div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="sheet-body">${body}</div>
      <div class="sheet-foot">
        ${danger ? `<button type="button" class="btn ghost danger" data-danger>${esc(danger.label)}</button>` : ''}
        <span class="grow"></span>
        ${onSubmit ? `<button type="submit" class="btn primary">${esc(submit)}</button>` : `<button type="button" class="btn" data-close>Done</button>`}
      </div></form>`;
    const form = dlg.querySelector('form');
    const close = () => dlg.close();
    dlg.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
    if (danger) form.querySelector('[data-danger]').onclick = async () => { if ((await danger.run()) !== false) close(); };
    form.onsubmit = (e) => {
      e.preventDefault();
      if (onSubmit && onSubmit(new FormData(form), form) === false) return;
      close();
    };
    dlg.onclick = (e) => { if (e.target === dlg) close(); };
    dlg.onclose = () => { if (onClose) onClose(); };
    dlg.showModal();
    if (onMount) onMount(form);
    const first = form.querySelector('input[autofocus], textarea[autofocus]');
    if (first) setTimeout(() => first.focus(), 50);
    return { close, form };
  }

  // safe = true for a non-destructive yes (green instead of red).
  function confirmBox(message, yes = 'Delete', safe = false) {
    return new Promise((resolve) => {
      const dlg = document.getElementById('confirm');
      dlg.innerHTML = `<form method="dialog" class="sheet small"><p>${esc(message)}</p>
        <div class="sheet-foot"><span class="grow"></span><button value="no" class="btn">Cancel</button><button value="yes" class="btn primary ${safe ? '' : 'danger-fill'}">${esc(yes)}</button></div></form>`;
      dlg.onclose = () => resolve(dlg.returnValue === 'yes');
      dlg.returnValue = '';
      dlg.showModal();
    });
  }

  // Speech-to-text into a textarea using the browser's built-in recognition.
  // Returns null where it isn't available (then the keyboard's own mic still works).
  // iPhone/iPad: the web speech engine there is weak (misses quiet speech) and unstable in
  // home-screen apps, while the keyboard's own dictation is excellent, so we use that instead.
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function dictation(ta, onState) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || isIOS) return null;
    let rec = null, want = false, base = '', startedAt = 0, quickEnds = 0;
    const join = (a, b) => (!a ? b : !b ? a : /\s$/.test(a) ? a + b.trimStart() : a + ' ' + b.trimStart());
    const cap = (t) => t.replace(/^\s*\w/, (c) => c.toUpperCase());
    function begin() {
      rec = new SR();
      // Android Chrome repeats words in continuous mode, so there it listens in short bursts and restarts.
      rec.continuous = !/android/i.test(navigator.userAgent);
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      base = ta.value;
      startedAt = Date.now();
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        ta.value = join(base, base.trim() ? text : cap(text));
        ta.scrollTop = ta.scrollHeight;
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { want = false; onState('blocked'); }
        else if (e.error === 'network' || e.error === 'language-not-supported') { want = false; onState('failed'); }
      };
      // Phones stop listening after a pause; keep going until the person taps stop. If it keeps
      // stopping straight away, give up instead of restarting in a loop (that can freeze the app).
      rec.onend = () => {
        if (!want) return onState('off');
        quickEnds = Date.now() - startedAt < 1500 ? quickEnds + 1 : 0;
        if (quickEnds >= 3) { want = false; return onState('failed'); }
        setTimeout(() => { if (!want) return; try { begin(); } catch (err) { want = false; onState('failed'); } }, 250);
      };
      rec.start();
    }
    return {
      get on() { return want; },
      start() { if (want) return; want = true; try { begin(); onState('on'); } catch (err) { want = false; onState('blocked'); } },
      stop() { want = false; if (rec) try { rec.stop(); } catch (err) { /* already stopped */ } },
    };
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const plural = (n, w, pl) => `${n} ${n === 1 ? w : pl || w + 's'}`;
  const timeText = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const nowHM = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
  const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const monthName = (ym, year = true) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, year ? { month: 'long', year: 'numeric' } : { month: 'long' }); };
  // 150 -> "2h 30m"
  const hrs = (min) => { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; };

  // Month grid (Sunday first). cell(day) returns the inner HTML/attrs for each date.
  function monthGrid(ym, cell) {
    const first = ym + '-01';
    const [y, m] = ym.split('-').map(Number);
    const out = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<b>${x}</b>`);
    for (let i = 0; i < dow(first); i++) out.push('<span></span>');
    for (let i = 1; i <= new Date(y, m, 0).getDate(); i++) out.push(cell(`${ym}-${pad(i)}`, i));
    return `<div class="cal">${out.join('')}</div>`;
  }

  // Calendar file for one event so the phone's own calendar can remind you.
  // alarm: minutes before the start to alert (reminders use 0 = right at the time).
  function ics({ title, date, time, end, place, notes, repeat, alarm = 30 }) {
    const stamp = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
    const escI = (x) => String(x || '').replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
    const rr = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' }[repeat];
    let endT = end;
    if (time && !endT) { const [h, m] = time.split(':').map(Number); endT = `${pad(Math.min(23, h + 1))}:${pad(m)}`; }
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@life', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      time ? 'DTSTART:' + stamp(date, time) : 'DTSTART;VALUE=DATE:' + stamp(date),
      time ? 'DTEND:' + stamp(date, endT) : 'DTEND;VALUE=DATE:' + stamp(addDays(date, 1)),
      'SUMMARY:' + escI(title)];
    if (place) lines.push('LOCATION:' + escI(place));
    if (notes) lines.push('DESCRIPTION:' + escI(notes));
    if (rr) lines.push('RRULE:' + rr);
    if (time) lines.push('BEGIN:VALARM', alarm ? `TRIGGER:-PT${alarm}M` : 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(title), 'END:VALARM');
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) { /* no clipboard */ }
      ta.remove(); return ok;
    }
  }

  // Forms are submitted by hand instead of by the browser: some previews (sandboxed frames)
  // block real form submission, which would make every Save button do nothing there.
  function submitByHand(form, btn) {
    if (form.getAttribute('method') === 'dialog') { const dlg = form.closest('dialog'); if (dlg) dlg.close(btn ? btn.value : ''); return; }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.form || (btn.getAttribute('type') || 'submit') !== 'submit') return;
    e.preventDefault();
    submitByHand(btn.form, btn);
  }, true);
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (e.key !== 'Enter' || e.isComposing || !el.form || el.tagName !== 'INPUT' || /^(checkbox|radio|button|submit)$/.test(el.type)) return;
    e.preventDefault();
    submitByHand(el.form);
  }, true);

  // "‹ This week ›" switcher; offset 0 = this week, -1 = last week…
  function weekNav(offset, act) {
    const ws = addDays(weekStart(today()), offset * 7);
    const label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${fmt(ws, { month: 'short', day: 'numeric' })} – ${fmt(addDays(ws, 6), { month: 'short', day: 'numeric' })}`;
    return `<div class="week-nav"><button class="icon-btn sm" data-act="${act}" data-v="-1" aria-label="Earlier week">${icon('left')}</button><span>${label}</span><button class="icon-btn sm" data-act="${act}" data-v="1" aria-label="Later week" ${offset >= 0 ? 'disabled' : ''}>${icon('right')}</button></div>`;
  }

  // Checking off a day other than today asks first, so a stray tap can't change history.
  // Returns true to go ahead.
  async function confirmDay(day, what, on) {
    if (day === today()) return true;
    const when = fmt(day, { weekday: 'long', month: 'short', day: 'numeric' });
    return confirmBox(on ? `Remove the check for “${what}” on ${when}?` : `Mark “${what}” done on ${when}?`, on ? 'Remove check' : 'Mark done', !on);
  }

  // Keep bottom sheets above the on-screen keyboard (iPhone doesn't resize the page for it).
  if (window.visualViewport) {
    const vv = window.visualViewport;
    // Only lift for the keyboard while something is actually being typed in, and never by more
    // than most of the screen. (Coming back to the app, iPhone can report a keyboard that's gone;
    // trusting that pushed the sheet off screen while its backdrop blocked every tap.)
    const fit = () => {
      const a = document.activeElement;
      const typing = a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|date|time|file)$/.test(a.type)));
      const kb = typing ? Math.min(Math.max(0, window.innerHeight - vv.height - vv.offsetTop), window.innerHeight * 0.6) : 0;
      document.documentElement.style.setProperty('--kb', kb + 'px');
      document.documentElement.style.setProperty('--vvh', (typing ? vv.height : window.innerHeight) + 'px');
    };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
    document.addEventListener('focusin', fit);
    document.addEventListener('focusout', () => setTimeout(fit, 60));
    window.addEventListener('pageshow', fit);
    fit();
  }

  // Leaving the app: put the keyboard away. Coming back: reset the layout and re-show an open
  // sheet, which clears iPhone's stuck-touch state for dialogs in home-screen apps.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return; }
    document.documentElement.style.setProperty('--kb', '0px');
    document.documentElement.style.setProperty('--vvh', window.innerHeight + 'px');
    const dlg = document.getElementById('sheet');
    if (dlg && dlg.open) {
      const keep = dlg.onclose; dlg.onclose = null;
      try { dlg.close(); dlg.showModal(); } catch (e) { /* leave it */ }
      dlg.onclose = keep;
    }
  });

  L.u = { isIOS, weekNav, confirmDay, DOW, DOW_LONG, plural, timeText, nowHM, shiftMonth, monthName, hrs, monthGrid, ics, download, copyText, dictation, key, parse, today, addDays, daysBetween, dow, weekStart, fmt, esc, relDay, icon, toast, sheet, confirm: confirmBox };
})();
