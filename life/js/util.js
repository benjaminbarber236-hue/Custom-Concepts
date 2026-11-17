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
  const weekStart = (s) => addDays(s, -((dow(s) + 6) % 7)); // Monday
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

  function confirmBox(message, yes = 'Delete') {
    return new Promise((resolve) => {
      const dlg = document.getElementById('confirm');
      dlg.innerHTML = `<form method="dialog" class="sheet small"><p>${esc(message)}</p>
        <div class="sheet-foot"><span class="grow"></span><button value="no" class="btn">Cancel</button><button value="yes" class="btn primary danger-fill">${esc(yes)}</button></div></form>`;
      dlg.onclose = () => resolve(dlg.returnValue === 'yes');
      dlg.returnValue = '';
      dlg.showModal();
    });
  }

  // Speech-to-text into a textarea using the browser's built-in recognition.
  // Returns null where it isn't available (then the keyboard's own mic still works).
  function dictation(ta, onState) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    let rec = null, want = false, base = '';
    const join = (a, b) => (!a ? b : !b ? a : /\s$/.test(a) ? a + b.trimStart() : a + ' ' + b.trimStart());
    const cap = (t) => t.replace(/^\s*\w/, (c) => c.toUpperCase());
    function begin() {
      rec = new SR();
      // Android Chrome repeats words in continuous mode, so there it listens in short bursts and restarts.
      rec.continuous = !/android/i.test(navigator.userAgent);
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      base = ta.value;
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        ta.value = join(base, base.trim() ? text : cap(text));
        ta.scrollTop = ta.scrollHeight;
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { want = false; onState('blocked'); }
      };
      // Phones stop listening after a pause; keep going until the person taps stop.
      rec.onend = () => { if (want) { try { begin(); } catch (err) { want = false; onState('off'); } } else onState('off'); };
      rec.start();
    }
    return {
      get on() { return want; },
      start() { if (want) return; want = true; try { begin(); onState('on'); } catch (err) { want = false; onState('blocked'); } },
      stop() { want = false; if (rec) try { rec.stop(); } catch (err) { /* already stopped */ } },
    };
  }

  L.u = { dictation, key, parse, today, addDays, daysBetween, dow, weekStart, fmt, esc, relDay, icon, toast, sheet, confirm: confirmBox };
})();
