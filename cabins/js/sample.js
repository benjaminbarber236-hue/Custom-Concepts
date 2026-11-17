// Sample data for the demo build and Settings → Load sample data.
(function () {
  L.sample = function (d, uid) {
    const u = L.u, t = u.today();
    const ago = (n) => u.addDays(t, -n);
    d.project = { name: 'Ridge Cabins', landBy: u.addDays(t, 120), openBy: u.addDays(t, 700) };
    // First phase done, a few steps into finding land.
    d.steps.forEach((s, i) => { if (s.phase === 'money' || (s.phase === 'find' && i < 11)) { s.done = true; s.doneOn = ago(60 - i * 3); } });
    const visit = d.steps.find((s) => s.phase === 'find' && !s.done);
    if (visit) visit.due = u.addDays(t, 6);
    const zoning = d.steps.filter((s) => s.phase === 'find' && !s.done)[1];
    if (zoning) zoning.due = u.addDays(t, 12);
    Object.assign(d.budget, { land: 95000, closing: 4000, tests: 3500, permits: 6000, site: 18000, water: 12000, septic: 24000, power: 9000, build: 360000, furnish: 32000, extras: 20000, business: 3000, reserve: 50000 });
    const sizes = [[480, 1, 1, 'A-frame', 85000], [480, 1, 1, 'A-frame', 85000], [720, 2, 1, 'Modern cabin', 95000], [720, 2, 1, 'Modern cabin', 95000]];
    d.cabins.forEach((c, i) => Object.assign(c, { sqft: sizes[i][0], beds: sizes[i][1], baths: sizes[i][2], style: sizes[i][3], estimate: sizes[i][4] }));
    d.cabins[0].stages = { 0: ago(20) };
    d.land = [
      { id: uid(), name: 'Bear Creek Rd, 14 acres', place: 'Sevier County', acres: 14, price: 119000, url: '', status: 'visited', rating: 4, notes: 'Creek frontage, gentle slope, mountain view from the top. 10 min to town.', added: ago(30), checks: { road: 'yes', power: 'yes', water: 'unknown', perc: 'unknown', flood: 'no', internet: 'yes', buildable: 'yes', zoning: 'yes', rentals: 'yes' } },
      { id: uid(), name: 'Hollow Ln, 22 acres', place: 'Blount County', acres: 22, price: 98000, url: '', status: 'watching', rating: 3, notes: 'Cheaper per acre but steep. Long gravel road.', added: ago(18), checks: { road: 'yes', power: 'no', water: 'unknown', zoning: 'yes', rentals: 'unknown' } },
      { id: uid(), name: 'Overlook Dr, 9 acres', place: 'Sevier County', acres: 9, price: 135000, url: '', status: 'passed', rating: 2, notes: 'HOA does not allow short-term rentals.', added: ago(40), checks: { road: 'yes', power: 'yes', rentals: 'no' } },
    ];
    d.expenses = [
      { id: uid(), date: ago(35), title: 'Gas and lunch: land tour', amount: 86, cat: 'tests', cabin: '' },
      { id: uid(), date: ago(10), title: 'County zoning map printouts', amount: 25, cat: 'permits', cabin: '' },
      { id: uid(), date: ago(5), title: 'A-frame plan set', amount: 650, cat: 'build', cabin: d.cabins[0].id },
    ];
    d.team = [
      { id: uid(), role: 'Land agent', name: 'Dana Whitfield', phone: '555-201-4410', email: '', notes: 'Knows the creek parcels.' },
      { id: uid(), role: 'Lender', name: 'Mountain Farm Credit', phone: '555-201-8890', email: '', notes: 'Land loan: 25% down, 20 yr.' },
    ];
    return d;
  };
})();
