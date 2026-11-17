// The starting plan: every phase from saving up to the first guests, broken into steps.
// Each step can be edited, checked off, given a due date and notes, or deleted. You can add your own.
(function () {
  const PHASES = [
    { id: 'money', name: 'Goals & money', blurb: 'Decide what the cabins are for and how you will pay for the land and the build.', steps: [
      ['Decide what the cabins are for: renting to guests, family use, or both', 'This changes the zoning you need, how big to build and how to finance it.'],
      ['Set a rough total budget: land + site work + buildings + tools + 10–15% reserve', 'Use the Money tab. Fill in an estimate for each line, even a guess.'],
      ['Check your credit score and pay down debt where you can'],
      ['Talk to 2–3 lenders about land loans and construction loans', 'Ask: down payment, rate, term, and whether they lend on raw land. Local banks and farm credit lenders often do land loans.'],
      ['Save the down payment for the land', 'Raw land loans often need 20–50% down.'],
      ['Pick the areas you want, and how far you are willing to drive'],
      ['List your land must-haves', 'Acres, road access, power nearby, water, views, slope, trees, distance to town or attractions.'],
      ['If renting: check short-term rental rules and lodging taxes in those counties'],
    ] },
    { id: 'find', name: 'Find the land', blurb: 'Search, visit and compare properties. Keep each one in the Land tab.', steps: [
      ['Find a real estate agent who sells land (not just houses)'],
      ['Search listings and save the good ones in the Land tab', 'LandWatch, Land.com, Zillow (lots/land), local agents, county tax and auction sales.'],
      ['Visit the top properties in person', 'Walk the boundaries, check the road in, look for wet spots, check cell signal.'],
      ['Call the county planning/zoning office about your favorite parcel', 'Ask: zoning, how many dwellings allowed on one parcel, minimum lot size, setbacks, whether short-term rentals are allowed.'],
      ['Ask the county health department about septic and wells'],
      ['Make an offer with contingencies', 'Common ones: survey, perc test, financing, legal access, clear title. They let you back out if a test fails.'],
    ] },
    { id: 'diligence', name: 'Check the land (under contract)', blurb: 'Make sure the land can actually hold all the units you want before you close.', steps: [
      ['Get a boundary survey', 'Confirms the lines, acreage and any encroachments.'],
      ['Perc / soil test for septic', 'Make sure the soil can handle the number of bedrooms across all units, or plan separate systems.'],
      ['Confirm legal road access and any easements'],
      ['Check water: well depths and yields nearby, or a public water hookup'],
      ['Get a quote from the power company to bring electricity in'],
      ['Check the flood zone (FEMA map) and wetlands'],
      ['Check internet options: fiber, cable, Starlink, cell signal'],
      ['Check deed restrictions, covenants or HOA rules'],
      ['Check mineral, timber and water rights'],
      ['Look up the property taxes'],
      ['Title search and title insurance'],
    ] },
    { id: 'buy', name: 'Buy the land', blurb: 'Close, record the deed and protect the property.', steps: [
      ['Finalize the land loan (if financing)'],
      ['Final walk of the land before closing'],
      ['Close on the land'],
      ['Make sure the deed is recorded with the county'],
      ['Get liability insurance on the land'],
      ['Set up property tax payments and reminders'],
      ['Post the property (No Trespassing) and add a gate if needed'],
    ] },
    { id: 'design', name: 'Site plan, design & permits', blurb: 'Decide duplexes or cabins, where everything goes, and get your permits. You are the builder.', steps: [
      ['Decide: duplexes, single cabins, or a mix', 'Compare the plans on the Build tab: cost per unit and per square foot.'],
      ['Make a site plan: each building, driveway, parking, well, septic, power lines', 'Think about privacy between units, views, sun, snow shedding off the roofs, and setbacks from property lines.'],
      ['Price out your plans line by line on the Build tab'],
      ['Check Lincoln County / Town of Alpine rules for owner-builders'],
      ['Find a Wyoming master electrician to oversee and sign off the electrical', 'Budgeted at about $3,000 per unit for review, final connections and permit sign-off.'],
      ['Get plans drawn (and stamped if required) for the permit'],
      ['Get the trusses engineered for the Alpine snow load'],
      ['Line up the Douglas fir log loads and a sawmill', 'About 3 semi loads per duplex for framing lumber and the ceiling boards.'],
      ['Get the construction loan or set aside the cash'],
      ['Apply for building permits'],
      ['Apply for septic and well permits'],
      ['Apply for a driveway / road entrance permit'],
    ] },
    { id: 'site', name: 'Site work & utilities', blurb: 'Get the land ready for building.', steps: [
      ['Clear trees and brush where the buildings and driveway go'],
      ['Build the driveway and parking'],
      ['Drill the well (or connect to water)'],
      ['Install the septic system(s)'],
      ['Bring power to the site and to each building spot'],
      ['Set up internet'],
    ] },
    { id: 'build', name: 'Build', blurb: 'You are building it yourself. Each building moves through its own stages on the Build tab.', cabins: true, steps: [
      ['Gather tools and set up a dry place to store materials'],
      ['Book equipment rentals: excavator/skid steer, plate compactor, power trowel, concrete vibrator'],
      ['Mill and stack the lumber so it can dry'],
      ['Order windows and doors early (long lead times)'],
      ['Order the trusses'],
      ['Schedule each inspection with the county'],
      ['Take photos of every wall before it is closed up (pipes and wires)'],
    ] },
    { id: 'open', name: 'Finish & open', blurb: 'Make the cabins ready for people.', steps: [
      ['Decks, fire pits, paths and landscaping'],
      ['Furnish each cabin'],
      ['Insurance for rentals (short-term rental policy)'],
      ['Set up the business: LLC, bank account, business license'],
      ['Register for lodging / occupancy taxes'],
      ['Take professional photos'],
      ['List the cabins (Airbnb, VRBO, your own site)'],
      ['Set up cleaning and maintenance between guests'],
      ['Welcome your first guests'],
    ] },
  ];

  // Build stages for each building, in order (slab on grade with radiant heat, sawmill framing, DIY).
  const CABIN_STAGES = [
    'Plan chosen', 'Permit approved', 'Excavation & gravel base', 'Foam, radiant PEX & rebar', 'Slab poured',
    'Lumber milled', 'Walls framed', 'Trusses set & roof sheathed', 'Metal roof on', 'Windows & exterior doors',
    'Wrap, siding & wainscoting', 'Rough plumbing', 'Rough electrical', 'Rough-in inspection', 'Boiler & radiant heat hooked up',
    'Insulation', 'Drywall, mud & paint', 'Douglas fir ceilings', 'Flooring', 'Cabinets, counters & vanities',
    'Doors, trim & fixtures', 'Electrical sign-off', 'Final inspection', 'Furnished & ready',
  ];

  // Steps from the first version that assumed hiring a builder; dropped on upgrade if untouched.
  const RETIRED = ['Get at least 3 builder bids', 'Check builder references, license and insurance', 'Sign the builder contract with a payment schedule', 'Pre-construction meeting with the builder', 'Choose cabin plans: size, layout, style', 'Decide the build order (one at a time or all at once)', 'Order materials with long lead times (windows, doors, kits)', 'Visit the site often and take photos of each stage', 'Keep a list of change orders and their cost', 'Get the construction loan (if financing)', 'Get stamped plans if the county requires them', 'Make a site plan: each cabin, driveway, parking, septic, well go', 'Make a site plan: each cabin, driveway, parking, well, septic, power lines', 'Grade the cabin pads and plan drainage', 'Clear trees and brush where the cabins and driveway go', 'Bring power to the site and to each cabin spot'];

  // Your 32×34 duplex cost breakdown (Alpine, WY · owner-builder · sawmill framing). [item, low, high]
  const DUPLEX = [
    ['Concrete slab & site prep', [
      ['Excavation, gravel/crushed rock sub-base, 15-mil vapor retarder', 1500, 2200],
      ['Under-slab rigid foam insulation (EPS/XPS)', 1800, 2800],
      ['Equipment rentals (excavator/skid steer, plate compactor, power trowel, vibrator)', 1200, 1800],
      ['Ready-mix concrete, about 22–26 yards (6-inch slab & footings)', 2000, 2700],
      ['Formwork lumber, rebar grid, wire mesh, anchors', 800, 1200],
    ]],
    ['Radiant floor heating', [
      ['1/2-inch oxygen-barrier PEX tubing, about 2,500 ft', 800, 1200],
      ['Foam board staples, ties, layout track', 200, 300],
      ['Dual-zone manifolds with flow meters & purge valves', 800, 1200],
      ['Electric hydronic boiler, expansion tank, circulation pump, controls', 1400, 2500],
    ]],
    ['Exterior shell & framing', [
      ['Douglas fir log loads: 3 semi loads (framing lumber & ceiling boards)', 9000, 9000],
      ['Cathedral trusses engineered for Alpine snow load', 4500, 7000],
      ['Plywood roof & wall sheathing', 3000, 4500],
      ['Metal roofing, trim, flashing', 6000, 8500],
      ['Metal wainscoting & corner trims', 2500, 3800],
      ['Hardie plank lap siding & house wrap', 6500, 7700],
    ]],
    ['Windows & exterior doors', [
      ['Vinyl-clad energy-efficient windows (8–10)', 4500, 7000],
      ['Exterior metal doors, jambs, hardware', 1500, 3000],
    ]],
    ['Rough-in plumbing & electrical', [
      ['Master electrician oversight, final connections, sign-off ($3,000 per unit)', 6000, 6000],
      ['Electrical panels, wiring, boxes, switches, outlets (DIY pull)', 4500, 7000],
      ['PEX water supply, PVC drain/vent piping, fittings', 3500, 6000],
    ]],
    ['Interior finishes', [
      ['Insulation for walls and cathedral ceiling', 3000, 4500],
      ['Drywall, tape, mud, primer, paint', 2500, 3800],
      ['Flooring (LVP or tile over the slab)', 3000, 5000],
      ['Cabinets, countertops, vanities, hardware (2 units)', 5000, 8500],
      ['Interior doors, trim, lighting & plumbing fixtures', 3500, 4500],
    ]],
    ['Permits', [
      ['Lincoln County / Town of Alpine building permits & plan checks', 3000, 5000],
    ]],
  ];


  const BUDGET = [
    ['land', 'Land'],
    ['closing', 'Closing, legal & title'],
    ['tests', 'Survey & tests'],
    ['permits', 'Plans & permits'],
    ['site', 'Clearing, driveway & grading'],
    ['water', 'Well & water'],
    ['septic', 'Septic'],
    ['power', 'Power & internet'],
    ['build', 'Building materials'],
    ['tools', 'Tools & equipment'],
    ['furnish', 'Furnishings'],
    ['extras', 'Decks, landscaping & extras'],
    ['business', 'Business & insurance'],
    ['reserve', 'Reserve (surprises)'],
  ];

  const LAND_CHECKS = [
    ['road', 'Legal road access'],
    ['zoning', 'Zoning allows several cabins'],
    ['rentals', 'Short-term rentals allowed'],
    ['power', 'Power nearby'],
    ['water', 'Water (well or hookup)'],
    ['perc', 'Passes perc / septic test'],
    ['flood', 'Not in a flood zone'],
    ['internet', 'Internet or good cell signal'],
    ['buildable', 'Enough flat, buildable ground'],
  ];

  const LAND_STATUS = [['watching', 'Watching'], ['visited', 'Visited'], ['offer', 'Offer made'], ['contract', 'Under contract'], ['bought', 'Bought'], ['passed', 'Passed']];

  const ROLES = ['Land agent', 'Lender', 'Surveyor', 'Attorney / title', 'County planning', 'Health dept. (septic)', 'Master electrician', 'Sawmill', 'Truss company', 'Concrete supplier', 'Well driller', 'Septic installer', 'Excavator', 'Power company', 'Insurance', 'Accountant'];

  L.plan = { PHASES, CABIN_STAGES, RETIRED, DUPLEX, BUDGET, LAND_CHECKS, LAND_STATUS, ROLES };
})();
