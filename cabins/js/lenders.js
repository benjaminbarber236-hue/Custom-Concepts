// Lender calls: the questions to ask a bank about a land loan, with each lender's answers.
// A small part of the Money tab (#/lenders), also linked from the "Talk to 2–3 lenders" step.
(function () {
  const u = L.u, S = L.store, esc = u.esc, icon = u.icon;

  // [group, [[question, tip, compareKey, keyForCabins]]]
  const GROUPS = [
    ['Do they do this kind of loan?', [
      ['Do you make loans on raw land with no house on it?'],
      ['Do you lend in the county where I’m looking?'],
      ['Is it different if the land has no road, power or water yet?'],
    ]],
    ['Money up front', [
      ['How much down payment do you need?', 'Raw land often needs 20–50%.', 'down'],
      ['What closing costs and fees should I expect?', '', 'fees'],
      ['Do you need a survey, appraisal or perc test before approving, and who pays?'],
    ]],
    ['The loan itself', [
      ['What interest rate are you offering right now? Fixed or does it change?', '', 'rate'],
      ['How many years is the loan? Is there a balloon payment at the end?', '', 'term'],
      ['What would my monthly payment be on a loan of $____?', '', 'payment'],
      ['Is there a penalty for paying it off early?'],
    ]],
    ['Qualifying', [
      ['What credit score do you look for?'],
      ['How much income and debt do you allow?'],
      ['Can I get pre-approved, and how long does it take?'],
    ]],
    ['Building the cabins later', [
      ['Do you also do construction loans for building on the land later?', '', 'constr', true],
      ['Can the land loan roll into a construction loan, or would I refinance?', '', '', true],
      ['Can the land I own count as the down payment on the construction loan?', '', '', true],
      ['Do you lend to owner-builders who do the work themselves?', '', '', true],
      ['Do you lend on cabins meant as short-term rentals?', '', '', true],
    ]],
    ['Rules on the land', [
      ['Are there acreage limits or land you won’t lend on (flood zone, no legal road access)?'],
      ['Is there a deadline to start building?'],
    ]],
    ['Before you hang up', [
      ['Get the loan officer’s name, direct phone and email (top of this page).'],
      ['Ask them to email the list of documents they need.'],
    ]],
  ];
  // Each question has a stable id ("q1"…) so answers stay matched if the list changes.
  const Q = [];
  GROUPS.forEach(([g, qs]) => qs.forEach(([t, tip, key, important]) => Q.push({ id: 'q' + (Q.length + 1), g, t, tip: tip || '', key: key || '', important: !!important })));
  const COMPARE = [['down', 'Down payment'], ['rate', 'Rate'], ['term', 'Years / balloon'], ['payment', 'Monthly'], ['fees', 'Fees'], ['constr', 'Construction loan?']];
  const answerFor = (l, key) => { const q = Q.find((x) => x.key === key); return (l.answers || {})[q.id] || ''; };
  const asked = (l) => Q.filter((q) => (l.checks || {})[q.id]).length;
  const nameOf = (l, i) => (l.name || '').trim() || 'Lender ' + (i + 1);

  // Small card on the Money tab.
  function moneyCard() {
    const ls = S.db.lenders;
    return `<section class="sec">
      <div class="sec-head"><h2>Lender calls</h2><a href="#/lenders" class="count">${ls.length ? 'Open' : 'Questions to ask'}</a></div>
      <a href="#/lenders" class="card lender-mini">
        <span class="grow"><b class="block">${ls.length ? ls.map(nameOf).map(esc).join(', ') : 'Calling a bank about a land loan?'}</b>
        <small class="muted">${ls.length ? `${Q.length} questions each · compare down payment, rate and term` : `${Q.length} questions to ask, with room for each lender's answers`}</small></span>
        ${icon('right')}
      </a>
    </section>`;
  }

  function viewList() {
    const ls = S.db.lenders;
    return `<a href="#/money" class="back">${icon('left')} Money</a>
      <header class="page-head"><div><h1>Lender calls</h1><p class="muted">Ask each lender the same questions, then compare.</p></div>
        <button class="btn primary sm" data-act="lender-new">${icon('plus')} Lender</button></header>
      ${ls.length ? `<div class="card list">${ls.map((l, i) => `<a href="#/lenders/${l.id}" class="list-row lender-row">
          <span class="grow"><span class="block">${esc(nameOf(l, i))}</span><small class="muted">${esc([l.person, l.phone, l.when].filter(Boolean).join(' · ') || 'No contact yet')}</small></span>
          <span class="small muted">${asked(l)}/${Q.length}</span></a>`).join('')}</div>
        <section class="sec"><div class="sec-head"><h2>Compare</h2></div>
          <div class="card compare"><table><thead><tr><th></th>${ls.map((l, i) => `<th>${esc(nameOf(l, i))}</th>`).join('')}</tr></thead>
          <tbody>${COMPARE.map(([k, n]) => `<tr><th>${n}</th>${ls.map((l) => `<td>${esc(answerFor(l, k)) || '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`
      : `<div class="empty big">${icon('phone')}<p>Add the bank or credit union you're about to call. You'll get ${Q.length} questions to ask, with a box under each for their answer.</p><button class="btn primary" data-act="lender-new">Add a lender</button></div>`}`;
  }

  function viewOne(id) {
    const ls = S.db.lenders, i = ls.findIndex((x) => x.id === id), l = ls[i];
    if (!l) return viewList();
    let last = '';
    return `<a href="#/lenders" class="back">${icon('left')} Lender calls</a>
      <header class="page-head"><div><h1>${esc(nameOf(l, i))}</h1><p class="muted">${asked(l)} of ${Q.length} asked</p></div></header>
      <section class="card lender-info">
        <label class="field"><span>Bank or lender</span><input id="ln-name" data-id="${l.id}" data-lf="name" value="${esc(l.name)}" placeholder="e.g. First Valley Bank"></label>
        <div class="two"><label class="field"><span>Loan officer</span><input id="ln-person" data-id="${l.id}" data-lf="person" value="${esc(l.person)}"></label>
          <label class="field"><span>Phone</span><input id="ln-phone" type="tel" data-id="${l.id}" data-lf="phone" value="${esc(l.phone)}"></label></div>
        <div class="two"><label class="field"><span>Email</span><input id="ln-email" inputmode="email" data-id="${l.id}" data-lf="email" value="${esc(l.email)}"></label>
          <label class="field"><span>Date called</span><input id="ln-when" data-id="${l.id}" data-lf="when" value="${esc(l.when)}" placeholder="Nov 18"></label></div>
      </section>
      ${Q.map((q) => {
        const head = q.g !== last ? `<h2 class="q-group">${esc(q.g)}</h2>` : '';
        last = q.g;
        const on = !!(l.checks || {})[q.id];
        return `${head}<div class="card lq ${q.important ? 'key' : ''} ${on ? 'done' : ''}">
          <button class="tick-sm ${on ? 'on' : ''}" data-act="lender-check" data-id="${l.id}" data-q="${q.id}" aria-pressed="${on}" aria-label="Asked">${icon('check')}</button>
          <div class="lq-body">${q.important ? '<span class="key-tag">Key for your cabins</span>' : ''}
            <span class="lq-text">${esc(q.t)}</span>${q.tip ? `<small class="muted">${esc(q.tip)}</small>` : ''}
            <textarea id="ans-${q.id}" data-id="${l.id}" data-la="${q.id}" rows="1" placeholder="Their answer">${esc((l.answers || {})[q.id] || '')}</textarea></div>
        </div>`;
      }).join('')}
      <div class="actions center-actions"><button class="btn sm danger" data-act="lender-delete" data-id="${l.id}">Delete this lender</button></div>`;
  }

  // Typing in the lender page saves without redrawing it, so the keyboard stays put.
  const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.max(44, t.scrollHeight + 2) + 'px'; };
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset || !(t.dataset.lf || t.dataset.la)) return;
    const l = S.find('lenders', t.dataset.id);
    if (!l) return;
    if (t.dataset.lf) l[t.dataset.lf] = t.value; else { l.answers = l.answers || {}; l.answers[t.dataset.la] = t.value; grow(t); }
    S.save();
  });
  L.lenders = {
    moneyCard, viewList, viewOne, count: Q.length,
    afterRender() { document.querySelectorAll('textarea[data-la]').forEach(grow); },
    acts: {
      'lender-new'() { const l = S.add('lenders', { name: '', person: '', phone: '', email: '', when: '', checks: {}, answers: {} }); L.app.go('#/lenders/' + l.id); setTimeout(() => { const f = document.getElementById('ln-name'); if (f) f.focus(); }, 60); },
      'lender-check'(el) {
        const l = S.find('lenders', el.dataset.id), q = el.dataset.q;
        l.checks = l.checks || {};
        if (l.checks[q]) delete l.checks[q]; else l.checks[q] = 1;
        S.save();
        const on = !!l.checks[q];
        el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
        el.closest('.lq').classList.toggle('done', on);
        const sub = document.querySelector('.page-head .muted'); if (sub) sub.textContent = `${asked(l)} of ${Q.length} asked`;
      },
      async 'lender-delete'(el) {
        const l = S.find('lenders', el.dataset.id);
        if (!(await u.confirm(`Delete ${l.name || 'this lender'} and its answers?`))) return;
        S.remove('lenders', l.id); L.app.go('#/lenders');
      },
    },
  };
})();
