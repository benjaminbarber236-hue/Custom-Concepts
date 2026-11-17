// Sample data for the demo build and Settings → Load sample data.
(function () {
  L.sample = function (d, uid) {
    const u = L.u, t = u.today();
    const ago = (n) => u.addDays(t, -n);
    d.project = { name: 'Alpine Cabins', landBy: u.addDays(t, 120), openBy: u.addDays(t, 700) };
    // First phase done, a few steps into finding land.
    d.steps.forEach((s, i) => { if (s.phase === 'money' || (s.phase === 'find' && i < 11)) { s.done = true; s.doneOn = ago(60 - i * 3); } });
    const visit = d.steps.find((s) => s.phase === 'find' && !s.done);
    if (visit) visit.due = u.addDays(t, 6);
    const zoning = d.steps.filter((s) => s.phase === 'find' && !s.done)[1];
    if (zoning) zoning.due = u.addDays(t, 12);
    Object.assign(d.budget, { land: 185000, closing: 4000, tests: 3500, permits: 6000, site: 18000, water: 12000, septic: 24000, power: 9000, build: 233000, tools: 6000, furnish: 32000, extras: 20000, business: 3000, reserve: 50000 });
    const duplex = d.plans[0];
    d.buildings = [
      { id: uid(), name: 'Building A', plan: duplex.id, stages: { 'Plan chosen': ago(20) }, notes: 'Closest to the road. Build this one first.' },
      { id: uid(), name: 'Building B', plan: '', stages: {}, notes: 'Duplex or two cabins? Deciding after the perc test.' },
    ];
    d.land = [
      { id: uid(), name: 'Greys River Rd, 14 acres', place: 'Lincoln County, WY', acres: 14, price: 189000, url: '', status: 'visited', rating: 4, notes: 'Creek frontage, gentle slope, view of the Salt River Range. 10 min to Alpine.', added: ago(30), checks: { road: 'yes', power: 'yes', water: 'unknown', perc: 'unknown', flood: 'no', internet: 'yes', buildable: 'yes', zoning: 'yes', rentals: 'yes' } },
      { id: uid(), name: 'Star Valley parcel, 22 acres', place: 'Lincoln County, WY', acres: 22, price: 165000, url: '', status: 'watching', rating: 3, notes: 'Cheaper per acre but steep. Long gravel road.', added: ago(18), checks: { road: 'yes', power: 'no', water: 'unknown', zoning: 'yes', rentals: 'unknown' } },
      { id: uid(), name: 'Overlook Dr, 9 acres', place: 'Bonneville County, ID', acres: 9, price: 210000, url: '', status: 'passed', rating: 2, notes: 'HOA does not allow short-term rentals.', added: ago(40), checks: { road: 'yes', power: 'yes', rentals: 'no' } },
    ];
    d.expenses = [
      { id: uid(), date: ago(35), title: 'Gas and lunch: land tour', amount: 86, cat: 'tests', building: '', section: '' },
      { id: uid(), date: ago(10), title: 'County zoning map printouts', amount: 25, cat: 'permits', building: '', section: '' },
      { id: uid(), date: ago(5), title: 'Duplex plan set', amount: 650, cat: 'permits', building: d.buildings[0].id, section: 'Permits' },
      { id: uid(), date: ago(2), title: 'Used chainsaw mill', amount: 1400, cat: 'tools', building: '', section: '' },
    ];
    d.team = [
      { id: uid(), role: 'Land agent', name: 'Dana Whitfield', phone: '555-201-4410', email: '', notes: 'Knows the creek parcels.' },
      { id: uid(), role: 'Lender', name: 'Mountain Farm Credit', phone: '555-201-8890', email: '', notes: 'Land loan: 25% down, 20 yr.' },
    ];
    return d;
  };
})();
