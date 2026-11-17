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
      { id: id(), name: 'Drink water', schedule: 'daily', days: [], perWeek: 0, perDay: 8, created: d(-20), archived: false, hit: 0.7 },
      { id: id(), name: 'Brush teeth', schedule: 'daily', days: [], perWeek: 0, perDay: 2, created: d(-30), archived: false, hit: 0.9 },
    ];
    const checks = {};
    for (const h of habits) {
      checks[h.id] = {};
      for (let i = u.daysBetween(h.created, t); i >= 1; i--) {
        const day = d(-i);
        if (h.schedule === 'days' && !h.days.includes(u.dow(day))) continue;
        if (rnd() < h.hit || i <= 6) checks[h.id][day] = h.perDay || 1; // a clean recent run
      }
      delete h.hit;
    }
    checks[habits[1].id][t] = 1;
    checks[habits[4].id][t] = 3; // water: 3 of 8 so far today
    checks[habits[5].id][t] = 1; // teeth: morning done

    const tasks = [
      { title: 'Call the dentist to reschedule', date: d(-1) },
      { title: 'Prepare talk outline', date: t },
      { title: 'Pick up dry cleaning', date: t },
      { title: 'Send weekly report', date: t, done: true, doneOn: t },
      { title: 'Book campsite for spring trip', date: d(2) },
      { title: 'Birthday card for Mom', date: d(5) },
      { title: 'Clean out the garage', date: null },
    ].map((x) => ({ id: id(), done: false, doneOn: null, ...x }));

    // Next given weekday (0 = Sunday) on or after today, plus whole weeks.
    const next = (dw, weeks = 0) => { let x = t; while (u.dow(x) !== dw) x = u.addDays(x, 1); return u.addDays(x, weeks * 7); };
    const ev = (o) => ({ id: id(), time: '', end: '', place: '', notes: '', repeat: '', until: '', skips: [], ...o });
    const events = [
      ev({ title: 'Dinner with Sam & Jess', date: next(5), time: '18:30', place: 'Olive Garden on Main St', cat: 'social', notes: 'Sam’s birthday. Bring the card.' }),
      ev({ title: 'Movies: the new space one', date: next(6), time: '19:15', end: '21:30', place: 'Regal 12', cat: 'social' }),
      ev({ title: 'Bible study with Marcus', date: next(2, -3), time: '18:00', place: 'His place, 412 Elm', cat: 'spiritual', repeat: 'weekly', notes: 'Chapter 6 of the Enjoy Life Forever book.' }),
      ev({ title: 'Family worship', date: next(1, -3), time: '19:30', cat: 'spiritual', repeat: 'weekly' }),
      ev({ title: 'Dentist', date: d(9), time: '08:15', place: 'Bright Smile Dental', cat: 'personal' }),
      ev({ title: 'Team lunch', date: d(1), time: '12:00', place: 'Taco Spot', cat: 'work' }),
      ev({ title: 'Game night at the Hendersons', date: d(12), time: '19:00', cat: 'social' }),
      ev({ title: 'Hiking with the group', date: d(-3), time: '08:00', place: 'Eagle Ridge trail', cat: 'social' }),
    ];

    const service = [];
    for (let i = 1; i <= 45; i++) if (rnd() < 0.18) service.push({ id: id(), date: d(-i), minutes: [60, 90, 105, 120, 150][Math.floor(rnd() * 5)], notes: rnd() < 0.4 ? 'Door to door with Brother Kim' : '' });
    const reading = {};
    for (let i = 0; i < 30; i++) if (i > 0 && (i < 9 || rnd() < 0.8)) reading[d(-i)] = 1;
    const attended = {};
    for (let i = 1; i <= 40; i++) { const x = d(-i); if (u.dow(x) === 4 && rnd() < 0.9) attended[x + ':midweek'] = 1; if (u.dow(x) === 0 && rnd() < 0.95) attended[x + ':weekend'] = 1; }
    const spiritual = {
      meetings: { midweek: { day: 4, time: '19:00' }, weekend: { day: 0, time: '10:00' }, place: 'Kingdom Hall, 200 Cedar Rd' },
      attended,
      parts: [
        { id: id(), date: next(4), title: 'Starting a conversation', assistant: 'Brother Ortiz', notes: 'Lesson 3, point 4. Setting: informal witnessing.', prepared: false },
        { id: id(), date: next(4, 3), title: 'Bible reading', assistant: '', notes: 'Isaiah 41:1-13', prepared: false },
        { id: id(), date: d(-15), title: 'Following up', assistant: 'Brother Lee', notes: '', prepared: true },
      ],
      service, studies: { [t.slice(0, 7)]: 1, [u.shiftMonth(t.slice(0, 7), -1)]: 1 }, serviceGoal: 15,
      rvs: [
        { id: id(), name: 'Maria', where: '88 Birch Ln, blue door', phone: '', notes: 'Asked why God allows suffering. Bring the brochure.', last: d(-6), next: d(3) },
        { id: id(), name: 'Mr. Thompson', where: 'Corner of 5th & Pine', phone: '', notes: 'Likes Psalms. Retired teacher.', last: d(-12), next: d(-1) },
      ],
      group: { name: 'Group 3', overseer: 'Brother James Carter', overseerPhone: '555-201-4410', assistant: 'Brother Kim', assistantPhone: '555-201-7782' },
      fsm: [
        { id: id(), day: 6, time: '09:30', place: 'The Carters’ home', conductor: 'Bro. Carter' },
        { id: id(), day: 3, time: '10:00', place: 'Kingdom Hall', conductor: 'Bro. Kim' },
      ],
      members: [['Brother James Carter', '555-201-4410'], ['Sister Ana Carter', '555-201-4411'], ['Brother Kim', '555-201-7782'], ['Sister Lopez', '555-302-1190'], ['Brother Ortiz', '555-302-5521'], ['Sister Hendricks', '']].map(([name, phone]) => ({ id: id(), name, phone })),
      reading, readingAt: 'Isaiah 40',
      study: [
        { id: id(), date: d(-1), topic: 'Watchtower study', minutes: 45, notes: '' },
        { id: id(), date: d(-2), topic: 'Meeting prep', minutes: 40, notes: '' },
        { id: id(), date: d(-4), topic: 'Research', minutes: 30, notes: 'Why did Jesus speak in illustrations?' },
        { id: id(), date: d(-8), topic: 'Bible reading', minutes: 20, notes: '' },
      ],
    };

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

    const log = (pairs) => pairs.map(([n, a]) => ({ id: id(), date: d(n), amount: a }));
    const goals = [
      { id: id(), title: 'Run 100 miles this year', why: 'Feel strong for the half marathon in spring.', kind: 'count', target: 100, unit: 'miles', created: d(-46), due: `${t.slice(0, 4)}-12-31`,
        log: log([[-44, 3], [-41, 4], [-38, 3.5], [-35, 5], [-31, 3], [-27, 6], [-24, 4], [-20, 3], [-16, 5], [-12, 4.5], [-9, 3], [-5, 6], [-2, 4]]), steps: [], done: false, doneOn: null },
      { id: id(), title: 'Run 15 miles a month', why: '', kind: 'count', target: 15, unit: 'miles', repeat: 'month', created: d(-100), due: null,
        log: log([[-95, 5], [-88, 6], [-80, 5], [-66, 4], [-60, 5], [-50, 4], [-40, 5], [-33, 6], [-25, 5], [-18, 4], [-12, 3], [-8, 4], [-3, 3]]), steps: [], done: false, doneOn: null },
      { id: id(), title: 'Read 12 books this year', why: '', kind: 'count', target: 12, unit: 'books', created: d(-320), due: `${t.slice(0, 4)}-12-31`,
        log: log([[-300, 1], [-270, 1], [-230, 1], [-200, 1], [-170, 1], [-130, 1], [-95, 1], [-60, 1], [-25, 1]]), steps: [], done: false, doneOn: null },
      { id: id(), title: 'Plan the family reunion', why: 'Everyone together for the first time since 2022.', kind: 'steps', target: 0, unit: '', created: d(-20), due: d(60), log: [],
        steps: [['Pick a date', true], ['Book the pavilion', true], ['Send invitations', false], ['Order food', false], ['Make a slideshow', false]].map(([x, done]) => ({ id: id(), title: x, done })), done: false, doneOn: null },
    ];

    // Always show at least one recent lucid dream in the sample.
    entries.push({ id: id(), kind: 'dream', lucid: true, date: d(-4), time: '06:12', text: lucid[0], created: d(-4) });

    return { version: 2, habits, checks, tasks, goals, journal, entries, events, spiritual, settings: { theme: '', lastBackup: null, oldImport: 'skipped', oldEvents: 'skipped' } };
  };
})();
