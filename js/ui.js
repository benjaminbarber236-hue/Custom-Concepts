// Small UI helpers: escaping, dates, forms, modal dialog, toasts.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Dates (stored as local 'YYYY-MM-DD' strings and 'HH:MM' times) ----
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const weekStart = (s) => { const d = parse(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return ymd(d); };

  function fmtDate(s, opts) {
    if (!s) return '';
    return parse(s).toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function relDate(s) {
    if (!s) return '';
    const n = daysBetween(today(), s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n < 0 && n > -7) return `${-n} days ago`;
    if (n > 0 && n < 7) return fmtDate(s, { weekday: 'long' });
    return fmtDate(s);
  }
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    return `${((h + 11) % 12) + 1}${m ? ':' + pad(m) : ''}${ap}`;
  }
  const money = (n) => (n || n === 0) && n !== '' ? Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '';

  // ---- Links that work on a phone ----
  const telLink = (p) => p ? `<a href="tel:${esc(p.replace(/[^\d+]/g, ''))}">${esc(p)}</a>` : '';
  const mapLink = (addr) => addr ? `<a href="https://maps.google.com/?q=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${esc(addr)}</a>` : '';

  // ---- Form builder ----
  // field: { name, label, type: text|textarea|select|chips|date|time|number|checkbox|tel|email|file,
  //          options, list, half, required, placeholder, quick: [[label, days]…] (date shortcuts), more (under "More details"), cls }
  const optList = (options) => (options || []).map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : typeof o === 'object' ? o : { value: o, label: o }));

  function fieldHtml(f, values) {
    const v = values[f.name] ?? f.default ?? '';
    const id = 'f_' + f.name;
    const req = f.required ? 'required' : '';
    const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
    const cls = `${f.half ? 'half' : ''} ${f.cls || ''}`;
    let input;
    if (f.type === 'chips') {
      return `<fieldset class="field choices ${cls}"><legend>${esc(f.label)}</legend><div class="choice-row">${optList(f.options).map((o) =>
        `<label class="choice"><input type="radio" name="${f.name}" value="${esc(o.value)}" ${String(o.value) === String(v) ? 'checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div></fieldset>`;
    }
    if (f.type === 'textarea') {
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" ${req} ${ph}>${esc(v)}</textarea>`;
    } else if (f.type === 'select') {
      const opts = (f.options || []).map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const lab = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`;
      }).join('');
      input = `<select id="${id}" name="${f.name}" ${req}>${opts}</select>`;
    } else if (f.type === 'file') {
      input = `<input id="${id}" name="${f.name}" type="file" ${f.accept ? `accept="${esc(f.accept)}"` : ''} ${f.multiple ? 'multiple' : ''} ${req}>`;
    } else if (f.type === 'checkbox') {
      return `<label class="field check ${cls}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    } else {
      const list = f.list ? `list="dl_${f.name}"` : '';
      const dl = f.list ? `<datalist id="dl_${f.name}">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
      const step = f.type === 'number' ? `step="${f.step || 'any'}" inputmode="decimal"` : '';
      input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${req} ${ph} ${list} ${step}>${dl}`;
    }
    if (f.quick) {
      const quick = `<div class="quick-row">${f.quick.map(([l, n]) => `<button type="button" class="chip" data-quick-for="${id}" data-days="${n}">${esc(l)}</button>`).join('')}</div>`;
      return `<div class="field ${cls}"><label for="${id}">${esc(f.label)}</label>${input}${quick}</div>`;
    }
    return `<label class="field ${cls}" for="${id}"><span>${esc(f.label)}</span>${input}</label>`;
  }

  function readForm(form, fields) {
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (!el) continue;
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'file') out[f.name] = f.multiple ? Array.from(el.files) : (el.files[0] || null);
      else if (f.type === 'number') out[f.name] = el.value === '' ? '' : Number(el.value);
      else out[f.name] = String(el.value ?? '').trim();
    }
    return out;
  }

  // ---- Modal ----
  const dlg = () => document.getElementById('modal');

  // openForm({ title, fields, values, submitLabel, onSubmit(data, form) -> false keeps it open, onDelete, intro, after(form) })
  function openForm(o) {
    const d = dlg();
    const values = o.values || {};
    d.className = '';
    d.innerHTML = `
      <form method="dialog" class="modal-form">
        <header class="modal-head"><h2>${esc(o.title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${WC.icon('x')}</button></header>
        <div class="modal-body" tabindex="-1" autofocus>
          ${o.intro || ''}
          <div class="form-grid">${o.fields.filter((f) => !f.more).map((f) => f.html || fieldHtml(f, values)).join('')}</div>
          ${o.fields.some((f) => f.more) ? `<details class="more-fields"><summary>More details</summary><div class="form-grid">${o.fields.filter((f) => f.more).map((f) => fieldHtml(f, values)).join('')}</div></details>` : ''}
        </div>
        <footer class="modal-foot">
          ${o.onDelete ? '<button type="button" class="btn danger ghost" data-delete>Delete</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn primary">${esc(o.submitLabel || 'Save')}</button>
        </footer>
      </form>`;
    const form = d.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = readForm(form, o.fields.filter((f) => f.name));
      if (o.onSubmit(data, form) !== false) close();
    });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    const del = d.querySelector('[data-delete]');
    if (del) del.addEventListener('click', () => ask('Delete this? This can\'t be undone.', () => { o.onDelete(); close(); }));
    form.querySelectorAll('[data-quick-for]').forEach((b) => b.addEventListener('click', () => {
      form.querySelector('#' + b.dataset.quickFor).value = addDays(today(), Number(b.dataset.days));
      b.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
    }));
    if (o.after) o.after(form);
    d.showModal();
    const first = form.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea');
    if (first && !matchMedia('(pointer: coarse)').matches) first.focus();
  }

  function openInfo(title, html, cls) {
    const d = dlg();
    d.className = cls || '';
    d.innerHTML = `<div class="modal-form"><header class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${WC.icon('x')}</button></header><div class="modal-body" tabindex="-1" autofocus>${html}</div></div>`;
    d.querySelector('[data-close]').addEventListener('click', close);
    d.showModal();
  }

  // In-app confirmation (stacks above an open form dialog; works where window.confirm is blocked).
  function ask(msg, onYes, yesLabel) {
    let d = document.getElementById('confirmDlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'confirmDlg'; d.className = 'confirm-dlg'; document.body.appendChild(d); }
    d.innerHTML = `<div class="modal-body"><p>${esc(msg)}</p><div class="row gap end"><button type="button" class="btn ghost" data-no>Cancel</button><button type="button" class="btn danger" data-yes>${esc(yesLabel || 'Delete')}</button></div></div>`;
    d.querySelector('[data-no]').addEventListener('click', () => d.close());
    d.querySelector('[data-yes]').addEventListener('click', () => { d.close(); onYes(); });
    d.showModal();
  }

  function close() { const d = dlg(); if (d.open) d.close(); }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function download(filename, text, type) {
    if (WC.DEMO) {
      openInfo(filename, `<p class="small muted">The demo can't save files. In the installed app this downloads <b>${esc(filename)}</b>.</p><textarea class="order-text" rows="12" readonly>${esc(text)}</textarea>`);
      return;
    }
    const blob = text instanceof Blob ? text : new Blob([text], { type: type || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  WC.ui = {
    esc, ymd, parse, today, addDays, daysBetween, weekStart, fmtDate, relDate, fmtTime, money,
    telLink, mapLink, fieldHtml, readForm, openForm, openInfo, ask, close, toast, download,
  };
})();
