// Data layer. Everything lives in one JSON blob in localStorage on this device.
// Use Settings → Export backup regularly; Import restores it (or moves it to another device).
(function () {
  const KEY = 'wc-tracker-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const empty = () => ({
    version: 1,
    contacts: [],
    companies: [],
    projects: [],
    events: [],
    tasks: [],
    settings: { userName: '', brands: clone(WC.C.DEFAULT_BRANDS), lastBackup: null },
  });

  function normalize(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.settings = Object.assign(base.settings, d.settings);
    // Older data stored a company only as text on each contact; turn those into company records.
    d.contacts.forEach((c) => linkCompany(c, d));
    d.projects.forEach((p) => {
      p.items = p.items || [];
      p.phases = p.phases || [];
      p.log = p.log || [];
      p.contacts = p.contacts || [];
      p.stageHistory = p.stageHistory || [];
      p.files = p.files || [];
      p.quotes = p.quotes || [];
      const OLD = WC.C.OLD_STAGES;
      if (OLD[p.stage]) p.stage = OLD[p.stage];
      p.stageHistory.forEach((h) => { if (OLD[h.stage]) h.stage = OLD[h.stage]; });
      p.files.forEach((f) => { if (WC.C.OLD_DOC_LABELS[f.label]) f.label = WC.C.OLD_DOC_LABELS[f.label]; });
    });
    return d;
  }

  // Point a contact at the company named in its `company` field, creating the company if needed.
  function linkCompany(c, d) {
    const name = (c.company || '').trim();
    if (!name) { c.companyId = ''; return; }
    let co = d.companies.find((x) => x.id === c.companyId && x.name.toLowerCase() === name.toLowerCase())
      || d.companies.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!co) {
      co = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name, type: WC.C.ROLE_COMPANY_TYPE[c.role] || 'Other',
        phone: '', email: '', website: '', address: '', notes: '', createdAt: new Date().toISOString() };
      d.companies.push(co);
    }
    c.companyId = co.id;
    c.company = co.name;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load data', e);
    }
    return empty();
  }

  let db = load();

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      WC.ui.toast('Could not save. Storage may be full. Export a backup now.');
    }
  }

  const S = {
    uid,
    get db() { return db; },
    save,

    all: (coll) => db[coll],
    get: (coll, id) => db[coll].find((x) => x.id === id),

    upsert(coll, obj) {
      if (!obj.id) {
        obj.id = uid();
        obj.createdAt = now();
        db[coll].push(obj);
      } else {
        const i = db[coll].findIndex((x) => x.id === obj.id);
        if (i >= 0) db[coll][i] = Object.assign(db[coll][i], obj);
        else db[coll].push(obj);
      }
      const saved = S.get(coll, obj.id);
      saved.updatedAt = now();
      if (coll === 'contacts') linkCompany(saved, db);
      if (coll === 'companies') db.contacts.forEach((c) => { if (c.companyId === saved.id) c.company = saved.name; });
      save();
      return saved;
    },

    remove(coll, id) {
      const target = S.get(coll, id);
      db[coll] = db[coll].filter((x) => x.id !== id);
      if (coll === 'projects') {
        if (target && WC.files) target.files.forEach((f) => WC.files.del(f.id));
        db.events = db.events.filter((e) => e.projectId !== id);
        db.tasks = db.tasks.filter((t) => t.projectId !== id);
      }
      if (coll === 'companies') {
        db.contacts.forEach((c) => { if (c.companyId === id) { c.companyId = ''; c.company = ''; } });
      }
      if (coll === 'contacts') {
        db.projects.forEach((p) => { p.contacts = p.contacts.filter((c) => c.contactId !== id); });
        db.tasks.forEach((t) => { if (t.contactId === id) t.contactId = ''; });
      }
      save();
    },

    // Mark a project as changed (bumps "last activity") and persist.
    touch(project) {
      project.updatedAt = now();
      save();
    },

    setStage(project, stageId) {
      if (project.stage === stageId) return null;
      project.stage = stageId;
      project.stageHistory.push({ stage: stageId, at: now() });
      // Reminders the app made for an earlier step are finished once the job moves on.
      db.tasks.forEach((t) => {
        if (t.projectId === project.id && !t.done && t.forStage && t.forStage !== stageId) { t.done = true; t.doneAt = now(); }
      });
      let task = null;
      const auto = WC.C.STAGE_AUTOTASKS[stageId];
      if (auto) {
        task = S.upsert('tasks', {
          title: auto.title,
          due: WC.ui.addDays(WC.ui.today(), auto.days),
          projectId: project.id,
          done: false,
          auto: true,
          forStage: stageId,
        });
      }
      S.touch(project);
      return task;
    },

    companyContacts: (companyId) => db.contacts.filter((c) => c.companyId === companyId),

    projectContacts(project) {
      return project.contacts
        .map((pc) => ({ ...pc, contact: S.get('contacts', pc.contactId) }))
        .filter((pc) => pc.contact);
    },

    primaryContact(project) {
      const pcs = S.projectContacts(project);
      return pcs.length ? pcs[0].contact : null;
    },

    // Latest timestamp of anything that happened on a project.
    lastActivity(project) {
      let t = project.updatedAt || project.createdAt || '';
      for (const l of project.log) if (l.date > t.slice(0, 10)) t = l.date;
      return t;
    },

    // Backup file: all records plus every attached document (base64) so a restore is complete.
    async exportJSON(withFiles = true) {
      db.settings.lastBackup = now();
      save();
      const fileData = {};
      if (withFiles && WC.files) {
        for (const p of db.projects) {
          for (const f of p.files) {
            const blob = await WC.files.get(f.id).catch(() => null);
            if (blob) fileData[f.id] = await WC.files.blobToDataURL(blob);
          }
        }
      }
      return JSON.stringify({ ...db, fileData }, null, 1);
    },

    async importJSON(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.projects) || !Array.isArray(d.contacts)) throw new Error('Not a backup file from this app');
      const fileData = d.fileData || {};
      delete d.fileData;
      for (const [id, url] of Object.entries(fileData)) await WC.files.put(id, await WC.files.dataURLToBlob(url));
      db = normalize(d);
      save();
    },

    reset() {
      if (WC.files) db.projects.forEach((p) => p.files.forEach((f) => WC.files.del(f.id)));
      db = empty();
      save();
    },
  };

  WC.store = S;
})();
