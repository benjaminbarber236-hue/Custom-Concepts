// App lock: Face ID (through the iPhone's passkeys) with a PIN as backup. It covers the app when it
// opens and when you come back to it, and hides it in the app switcher. It's a lock screen for the
// app, not encryption: the data itself stays in the app's storage on this phone.
(function () {
  const u = L.u, icon = u.icon, esc = u.esc;
  L.acts = L.acts || {};
  const KEY = 'life-lock'; // kept apart from your data, so it's never in backups
  const app = () => L.app;

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const store = (c) => { try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };
  let cfg = L.DEMO ? null : load(); // { salt, pinHash, pinLen, credId, after (minutes) }
  let locked = false, hiddenAt = 0, wrong = 0, waitUntil = 0, entered = '';

  // ---------- PIN ----------
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function hashPin(pin, salt) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin))); }

  // ---------- Face ID (WebAuthn platform passkey) ----------
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  async function faceIdAvailable() {
    try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
  }
  async function createFaceId() {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Life' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'Life app lock', displayName: 'Life app lock' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000, attestation: 'none',
    } });
    return b64(cred.rawId);
  }
  async function checkFaceId() {
    await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(cfg.credId) }],
      userVerification: 'required', timeout: 60000,
    } });
  }

  // ---------- Lock screen ----------
  function overlay() {
    let el = document.getElementById('lock');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'lock';
    el.innerHTML = `<div class="lock-box">
      <img src="icons/icon.svg?v=2" alt="" width="64" height="64" class="lock-icon">
      <h1>Life is locked</h1>
      <button type="button" class="btn primary" data-lock-face hidden>${icon('lock')} Unlock with Face ID</button>
      <p class="lock-sub muted small">Enter your PIN</p>
      <div class="pin-dots" aria-hidden="true"></div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => k === '' ? '<span></span>' : `<button type="button" data-key="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('')}</div>
      <p class="lock-msg small" aria-live="polite"></p>
      <button type="button" class="link small lock-forgot" data-lock-forgot>Forgot PIN?</button>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', onLockClick);
    return el;
  }
  function dots() {
    const el = overlay();
    el.querySelector('.pin-dots').innerHTML = Array.from({ length: cfg.pinLen }, (_, i) => `<i class="${i < entered.length ? 'on' : ''}"></i>`).join('');
  }
  const say = (m) => { overlay().querySelector('.lock-msg').textContent = m; };

  function lock() {
    if (!cfg || locked) return;
    locked = true; entered = '';
    const el = overlay();
    el.hidden = false;
    document.documentElement.classList.add('is-locked');
    el.querySelector('[data-lock-face]').hidden = !cfg.credId;
    say(''); dots();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function unlock() {
    locked = false; entered = ''; wrong = 0;
    const el = document.getElementById('lock');
    if (el) el.hidden = true;
    document.documentElement.classList.remove('is-locked');
  }

  async function tryFace() {
    if (!cfg || !cfg.credId) return;
    try { await checkFaceId(); unlock(); }
    catch (e) { say(e && e.name === 'NotAllowedError' ? 'Face ID was cancelled. Try again, or use your PIN.' : 'Face ID didn’t work here. Use your PIN.'); }
  }

  async function onLockClick(e) {
    if (e.target.closest('[data-lock-face]')) return tryFace();
    if (e.target.closest('[data-lock-forgot]')) return forgot();
    const k = e.target.closest('[data-key]');
    if (!k) return;
    if (Date.now() < waitUntil) return say(`Too many tries. Wait ${Math.ceil((waitUntil - Date.now()) / 1000)} seconds.`);
    const v = k.dataset.key;
    if (v === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < cfg.pinLen) entered += v;
    dots();
    if (entered.length === cfg.pinLen) {
      if ((await hashPin(entered, cfg.salt)) === cfg.pinHash) return unlock();
      wrong++; entered = '';
      const box = overlay().querySelector('.pin-dots'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      dots();
      if (wrong >= 5) { waitUntil = Date.now() + 30000; wrong = 0; say('Too many tries. Wait 30 seconds.'); } else say('Wrong PIN.');
    }
  }

  async function forgot() {
    if (cfg.credId) return say('Use Face ID to get in, then change your PIN in Settings.');
    const ok = await u.confirm('Without your PIN, the only way in is to erase everything in Life on this phone and start fresh (a saved backup file can bring it back). Erase everything?', 'Erase everything');
    if (!ok) return;
    L.store.reset(); cfg = null; store(null); unlock(); app().go('#/today');
    u.toast('Erased. Life is unlocked.');
  }

  // Lock when the app opens, and when it comes back after the chosen time.
  if (cfg) lock();
  document.addEventListener('visibilitychange', () => {
    if (!cfg) return;
    if (document.hidden) { hiddenAt = Date.now(); if (!cfg.after) lock(); } // hide right away (also blanks the app-switcher preview)
    else if (!locked && Date.now() - hiddenAt >= cfg.after * 60000) lock();
  });
  // Try Face ID straight away when the lock screen appears (if the phone allows it without a tap).
  window.addEventListener('pageshow', () => { if (locked && cfg && cfg.credId) tryFace(); });

  // ---------- Settings ----------
  function card() {
    if (L.DEMO) return `<section class="card"><div class="sec-head"><h2>App lock</h2></div><p class="muted small">Not available in the demo.</p></section>`;
    if (!cfg) return `<section class="card">
      <div class="sec-head"><h2>App lock</h2><span class="count">Off</span></div>
      <p class="muted small">Ask for Face ID or a PIN whenever Life opens, and hide it in the app switcher.</p>
      <button class="btn sm primary" data-act="lock-on">${icon('lock')} Turn on app lock</button>
    </section>`;
    return `<section class="card">
      <div class="sec-head"><h2>App lock</h2><span class="count all">On</span></div>
      <p class="muted small">${cfg.credId ? 'Face ID, with your PIN as backup.' : 'PIN.'} Locks:</p>
      <div class="seg">${[[0, 'Right away'], [1, 'After 1 min'], [5, 'After 5 min']].map(([v, l]) => `<label><input type="radio" name="lock-after" value="${v}" data-act="lock-after" ${cfg.after === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="row wrap lock-actions">
        ${cfg.credId ? `<button class="btn sm" data-act="lock-face-off">Stop using Face ID</button>` : `<button class="btn sm" data-act="lock-face-on">${icon('lock')} Use Face ID</button>`}
        <button class="btn sm" data-act="lock-pin">Change PIN</button>
        <button class="btn sm ghost danger" data-act="lock-off">Turn off</button>
      </div>
    </section>`;
  }

  // Ask for the current PIN before changing anything important.
  function askPin(title, then) {
    u.sheet({
      title, submit: 'Continue',
      body: `<label class="field"><span>Current PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="${cfg.pinLen}" autocomplete="off" autofocus></label>`,
      async onSubmit(fd) {
        const ok = (await hashPin(String(fd.get('pin') || ''), cfg.salt)) === cfg.pinHash;
        if (!ok) { u.toast('Wrong PIN.'); return; }
        then();
      },
    });
  }

  function pinSheet(isNew) {
    const canFace = faceIdAvailable();
    u.sheet({
      title: isNew ? 'Turn on app lock' : 'Change PIN',
      submit: isNew ? 'Turn on' : 'Save PIN',
      body: `
        <p class="muted small">Pick a 4-digit PIN. ${isNew ? 'You’ll use it whenever Face ID isn’t available.' : ''}</p>
        <div class="two">
          <label class="field"><span>New PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" autofocus></label>
          <label class="field"><span>Again</span><input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>
        </div>
        ${isNew ? `<label class="toggle plain" data-face-row hidden><input type="checkbox" name="face" checked><span class="sw-track"></span><span>Also unlock with Face ID</span></label>
        <p class="muted small" data-face-row hidden>Your iPhone may ask to save a passkey called “Life app lock”. That’s how Face ID works for apps like this one. Tap Continue.</p>` : ''}
      `,
      onMount(form) { canFace.then((ok) => { if (ok) form.querySelectorAll('[data-face-row]').forEach((el) => (el.hidden = false)); }); },
      onSubmit(fd) {
        const pin = String(fd.get('pin') || ''), pin2 = String(fd.get('pin2') || '');
        if (!/^\d{4}$/.test(pin)) { u.toast('The PIN needs 4 digits.'); return false; }
        if (pin !== pin2) { u.toast('The two PINs don’t match.'); return false; }
        const wantFace = isNew && !!fd.get('face');
        // Start Face ID setup right away, inside the tap, as iPhone requires.
        const face = wantFace ? createFaceId().catch(() => null) : Promise.resolve(cfg && cfg.credId);
        const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
        Promise.all([hashPin(pin, salt), face]).then(([pinHash, credId]) => {
          cfg = { after: cfg ? cfg.after : 0, ...cfg, salt, pinHash, pinLen: 4, credId: credId || null };
          store(cfg); app().render();
          u.toast(isNew ? (wantFace && !credId ? 'App lock is on with your PIN. Face ID wasn’t set up; you can add it in Settings.' : 'App lock is on.') : 'PIN changed.');
        });
      },
    });
  }

  Object.assign(L.acts, {
    'lock-on': () => pinSheet(true),
    'lock-pin': () => askPin('Change PIN', () => setTimeout(() => pinSheet(false), 50)),
    'lock-off': () => askPin('Turn off app lock', () => { cfg = null; store(null); app().render(); u.toast('App lock is off.'); }),
    'lock-after'(el) { cfg.after = Number(el.value); store(cfg); },
    async 'lock-face-on'() {
      // Must start inside the tap (iPhone rule), so no availability check first.
      try { cfg.credId = await createFaceId(); store(cfg); app().render(); u.toast('Face ID is on.'); }
      catch (e) { u.toast('Face ID wasn’t set up. It needs Face ID turned on for this phone.'); }
    },
    'lock-face-off'() { cfg.credId = null; store(cfg); app().render(); u.toast('Face ID is off. Your PIN still locks the app.'); },
  });

  L.lock = { card, isLocked: () => locked };
})();
