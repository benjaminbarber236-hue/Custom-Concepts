// Example data, dated around today (Settings → Load sample data, and the demo).
(function () {
  LT.sample = function () {
    const U = LT.ui;
    const t0 = U.today();
    const d = (n) => U.addDays(t0, n);
    const uid = LT.store.uid;
    const at = (n) => new Date(U.parse(d(n)).getTime() + 12 * 3600e3).toISOString();
    // Next given weekday (0 = Sunday) on or after today, plus `weeks`.
    const next = (dow, weeks = 0) => { const p = U.parse(t0); const off = (dow - p.getDay() + 7) % 7; return d(off + weeks * 7); };
    const task = (o) => ({ id: uid(), kind: 'task', done: false, skips: [], history: [], createdAt: at(-10), ...o });
    const event = (o) => ({ id: uid(), kind: 'event', skips: [], history: [], createdAt: at(-30), ...o });

    const items = [
      // Work
      event({ area: 'work', title: 'Team meeting', date: next(1, -4), time: '09:00', endTime: '10:00', repeat: 'weekly', location: 'Conference room B' }),
      event({ area: 'work', title: 'Quarterly review', date: d(9), time: '14:00', endTime: '15:30', notes: 'Bring the numbers for Q3 and the hiring plan.' }),
      event({ area: 'work', title: 'Client lunch: Harbor Supply', date: d(3), time: '12:00', endTime: '13:00', location: 'Rosie’s Cafe, Main St' }),
      task({ area: 'work', title: 'Send weekly report', date: next(5, -1), repeat: 'weekly', important: true }),
      task({ area: 'work', title: 'Follow up with Dana about the invoice', date: d(-2) }),
      task({ area: 'work', title: 'Book flights for the conference', date: d(4) }),
      task({ area: 'work', title: 'Update résumé', date: '' }),
      task({ area: 'work', title: 'Clean up shared drive', date: d(-6), done: true, doneAt: at(-5) }),
      // Congregation
      event({ area: 'congregation', title: 'Midweek meeting', date: next(4, -6), time: '19:00', endTime: '20:45', repeat: 'weekly', location: 'Hall' }),
      event({ area: 'congregation', title: 'Weekend meeting', date: next(0, -6), time: '10:00', endTime: '11:45', repeat: 'weekly', location: 'Hall' }),
      event({ area: 'congregation', title: 'Cleaning group', date: d(5), time: '08:00', endTime: '09:30', location: 'Hall' }),
      event({ area: 'congregation', title: 'Visit the Hendersons', date: d(2), time: '18:00', notes: 'Bring the soup. Ask how Ruth’s surgery went.' }),
      task({ area: 'congregation', title: 'Prepare assignment', date: d(1), important: true, notes: 'Five minutes. Practice it out loud twice.' }),
      task({ area: 'congregation', title: 'Call Brother Ortiz back', date: d(-1) }),
      task({ area: 'congregation', title: 'Sign up for the cleaning rotation', date: '' }),
      // Recreation
      event({ area: 'recreation', title: 'Game night at Mike’s', date: d(4), time: '19:30' }),
      event({ area: 'recreation', title: 'Fishing trip', date: d(11), notes: 'Get a fishing license renewed before then.' }),
      task({ area: 'recreation', title: 'Renew fishing license', date: d(8) }),
      task({ area: 'recreation', title: 'Plan a weekend away', date: '' }),
      // Fitness
      event({ area: 'fitness', title: 'Gym: strength', date: next(1, -4), time: '06:00', endTime: '06:45', repeat: 'weekly' }),
      event({ area: 'fitness', title: 'Gym: strength', date: next(3, -4), time: '06:00', endTime: '06:45', repeat: 'weekly' }),
      event({ area: 'fitness', title: 'Long run', date: next(6, -4), time: '07:30', repeat: 'weekly', location: 'River trail' }),
      task({ area: 'fitness', title: 'Stretch 10 minutes', date: t0, repeat: 'daily' }),
      task({ area: 'fitness', title: 'Buy new running shoes', date: d(6) }),
    ];

    const workouts = [];
    const types = [['Strength', 45, '', 'moderate'], ['Run', 35, 3.5, 'moderate'], ['Strength', 40, '', 'hard'], ['Run', 60, 6.2, 'easy']];
    for (let i = 1, k = 0; i <= 42; i += i % 3 === 0 ? 2 : 1, k++) {
      if (i % 5 === 4) continue;
      const [type, minutes, distance, effort] = types[k % types.length];
      workouts.push({ id: uid(), date: d(-i), type, minutes, distance, effort, notes: '', createdAt: at(-i) });
    }

    const notes = [
      { id: uid(), area: 'work', title: 'Ideas for the team offsite', body: '- Volunteer half-day\n- Bowling\n- Ask everyone for one thing to improve', pinned: true, createdAt: at(-4), updatedAt: at(-4) },
      { id: uid(), area: 'congregation', title: 'People to check on', body: 'Ruth (surgery recovery)\nThe Parks (new baby)\nTom: hasn’t been to meetings lately', pinned: true, createdAt: at(-8), updatedAt: at(-2) },
      { id: uid(), area: 'recreation', title: 'Books to read', body: 'The Boys in the Boat\nProject Hail Mary\nA River Runs Through It', createdAt: at(-20), updatedAt: at(-20) },
      { id: uid(), area: 'fitness', title: 'Gym program', body: 'Day A: squat 3x5, bench 3x5, row 3x8\nDay B: deadlift 1x5, press 3x5, pull-ups 3x max', createdAt: at(-15), updatedAt: at(-15) },
      { id: uid(), area: 'work', title: 'Talked with boss about raise', body: 'Revisit after the quarterly review. Write down the wins from this year before then.', date: d(-3), createdAt: at(-3), updatedAt: at(-3) },
    ];

    return {
      version: 1, items, notes, workouts,
      settings: { areas: JSON.parse(JSON.stringify(LT.C.DEFAULT_AREAS)), goal: { ...LT.C.DEFAULT_GOAL }, lastBackup: null, theme: '' },
    };
  };
})();
