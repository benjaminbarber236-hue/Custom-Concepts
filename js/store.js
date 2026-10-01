// Data layer. Everything lives in one JSON blob in localStorage on this device.
// Use Settings → Export backup regularly; Import restores it (or moves it to another device).
(function () {
  const KEY = 'wc-tracker-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const empty = () => ({
    version: 1,
    contacts: [],
    projects: [],
    events: [],
    tasks: [],
    settings: { userName: '', brands: clone(WC.C.DEFAULT_BRANDS), lastBackup: null },
  });

  function normalize(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (!(k in d)) d[k] = base[k];
    d.settings = Object.assign(base.settings, d.settings);
    d.projects.forEach((p) => {
      p.items = p.items || [];
      p.phases = p.phases || [];
      p.log = p.log || [];
      p.contacts = p.contacts || [];
      p.stageHistory = p.stageHistory || [];
    });
    return d;
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
      obj.updatedAt = now();
      save();
      return S.get(coll, obj.id);
    },

    remove(coll, id) {
      db[coll] = db[coll].filter((x) => x.id !== id);
      if (coll === 'projects') {
        db.events = db.events.filter((e) => e.projectId !== id);
        db.tasks = db.tasks.filter((t) => t.projectId !== id);
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
      let task = null;
      const auto = WC.C.STAGE_AUTOTASKS[stageId];
      if (auto) {
        task = S.upsert('tasks', {
          title: auto.title,
          due: WC.ui.addDays(WC.ui.today(), auto.days),
          projectId: project.id,
          done: false,
          auto: true,
        });
      }
      S.touch(project);
      return task;
    },

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

    exportJSON() {
      db.settings.lastBackup = now();
      save();
      return JSON.stringify(db, null, 2);
    },

    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.projects) || !Array.isArray(d.contacts)) throw new Error('Not a backup file from this app');
      db = normalize(d);
      save();
    },

    reset() {
      db = empty();
      save();
    },
  };

  WC.store = S;
})();
