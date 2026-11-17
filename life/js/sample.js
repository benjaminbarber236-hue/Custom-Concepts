// Example data dated around today (Settings → Load sample data, and the demo).
(function () {
  L.sample = function () {
    const u = L.u;
    const t = u.today();
    const d = (n) => u.addDays(t, n);
    const id = () => Math.random().toString(36).slice(2, 9);
    // Repeatable pseudo-random so the sample looks the same every time.
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

    const habits = [
      { id: id(), name: 'Read 20 minutes', schedule: 'daily', days: [], perWeek: 0, created: d(-75), archived: false, hit: 0.85 },
      { id: id(), name: 'Morning prayer', schedule: 'daily', days: [], perWeek: 0, created: d(-90), archived: false, hit: 0.93 },
      { id: id(), name: 'Exercise', schedule: 'weekly', days: [], perWeek: 4, created: d(-80), archived: false, hit: 0.6 },
      { id: id(), name: 'Inbox to zero', schedule: 'days', days: [1, 2, 3, 4, 5], perWeek: 0, created: d(-40), archived: false, hit: 0.75 },
      { id: id(), name: 'Drink 8 glasses of water', schedule: 'daily', days: [], perWeek: 0, created: d(-20), archived: false, hit: 0.7 },
    ];
    const checks = {};
    for (const h of habits) {
      checks[h.id] = {};
      for (let i = u.daysBetween(h.created, t); i >= 1; i--) {
        const day = d(-i);
        if (h.schedule === 'days' && !h.days.includes(u.dow(day))) continue;
        if (rnd() < h.hit || i <= 6) checks[h.id][day] = 1; // a clean recent run
      }
      delete h.hit;
    }
    checks[habits[1].id][t] = 1;

    const tasks = [
      { title: 'Call the dentist to reschedule', date: d(-1) },
      { title: 'Prepare talk outline', date: t },
      { title: 'Pick up dry cleaning', date: t },
      { title: 'Send weekly report', date: t, done: true, doneOn: t },
      { title: 'Book campsite for spring trip', date: d(2) },
      { title: 'Birthday card for Mom', date: d(5) },
      { title: 'Clean out the garage', date: null },
    ].map((x) => ({ id: id(), done: false, doneOn: null, ...x }));

    const log = (pairs) => pairs.map(([n, a]) => ({ id: id(), date: d(n), amount: a }));
    const goals = [
      { id: id(), title: 'Run 100 miles', why: 'Feel strong for the half marathon in spring.', kind: 'count', target: 100, unit: 'miles', created: d(-46), due: d(44),
        log: log([[-44, 3], [-41, 4], [-38, 3.5], [-35, 5], [-31, 3], [-27, 6], [-24, 4], [-20, 3], [-16, 5], [-12, 4.5], [-9, 3], [-5, 6], [-2, 4]]), steps: [], done: false, doneOn: null },
      { id: id(), title: 'Read 12 books this year', why: '', kind: 'count', target: 12, unit: 'books', created: d(-320), due: `${t.slice(0, 4)}-12-31`,
        log: log([[-300, 1], [-270, 1], [-230, 1], [-200, 1], [-170, 1], [-130, 1], [-95, 1], [-60, 1], [-25, 1]]), steps: [], done: false, doneOn: null },
      { id: id(), title: 'Plan the family reunion', why: 'Everyone together for the first time since 2022.', kind: 'steps', target: 0, unit: '', created: d(-20), due: d(60), log: [],
        steps: [['Pick a date', true], ['Book the pavilion', true], ['Send invitations', false], ['Order food', false], ['Make a slideshow', false]].map(([s, done]) => ({ id: id(), title: s, done })), done: false, doneOn: null },
    ];

    const notes = ['Slow morning, good talk with J.', 'Long day at work but finished the report.', 'Felt tired, went to bed early.', 'Great hike with friends!', '', 'Meeting went well.', 'Stressed about the deadline.', '', 'Quiet evening reading.'];
    const journal = {};
    for (let i = 1; i <= 40; i++) {
      if (rnd() < 0.2) continue;
      const mood = Math.max(1, Math.min(5, Math.round(3.4 + (rnd() - 0.4) * 3)));
      journal[d(-i)] = { mood, energy: Math.max(1, Math.min(5, mood + Math.round(rnd() * 2 - 1))) };
    }
    const entries = [];
    const at = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const dreams = [
      'I was back in my old high school but the hallways kept stretching longer. Someone was calling my name from the gym but I never got there.',
      'Flying over a city made of glass. The ocean was purple and warm. My brother was there selling umbrellas.',
      'Missed a flight again. The airport turned into a grocery store and I couldn’t find my gate between the cereal aisles.',
      'A big friendly dog led me through a forest to a cabin where my grandma was baking bread.',
      'Driving a car with no brakes down a hill, but it slowly turned into a bicycle and I was fine.',
    ];
    const lucid = [
      'Realized I was dreaming when the clock had no numbers. Decided to fly and went straight up through the clouds. It lasted maybe a minute before I woke up.',
      'Noticed my hands looked strange, did a reality check and was lucid! Walked through a wall into a huge library.',
    ];
    for (let i = 0; i <= 40; i++) {
      const day = d(-i);
      if (rnd() < 0.45) entries.push({ id: id(), kind: 'dream', lucid: false, date: day, time: at(5 + Math.floor(rnd() * 3), Math.floor(rnd() * 60)), text: dreams[i % dreams.length], created: day });
      if (rnd() < 0.08) entries.push({ id: id(), kind: 'dream', lucid: true, date: day, time: at(6, Math.floor(rnd() * 60)), text: lucid[i % lucid.length], created: day });
      if (i > 0 && rnd() < 0.6 && notes[i % notes.length]) entries.push({ id: id(), kind: 'journal', lucid: false, date: day, time: at(20 + Math.floor(rnd() * 3), Math.floor(rnd() * 60)), text: notes[i % notes.length], created: day });
    }

    return { version: 2, habits, checks, tasks, goals, journal, entries, settings: { theme: '', lastBackup: null, oldImport: 'skipped' } };
  };
})();
