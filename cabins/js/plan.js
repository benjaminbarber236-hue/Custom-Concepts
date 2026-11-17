// The starting plan: every phase from saving up to the first guests, broken into steps.
// Each step can be edited, checked off, given a due date and notes, or deleted. You can add your own.
(function () {
  const PHASES = [
    { id: 'money', name: 'Goals & money', blurb: 'Decide what the cabins are for and how you will pay for the land and the build.', steps: [
      ['Decide what the cabins are for: renting to guests, family use, or both', 'This changes the zoning you need, how big to build and how to finance it.'],
      ['Set a rough total budget: land + site work + 4 cabins + 10–15% reserve', 'Use the Money tab. Fill in an estimate for each line, even a guess.'],
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
    { id: 'diligence', name: 'Check the land (under contract)', blurb: 'Make sure the land can actually hold 4 cabins before you close.', steps: [
      ['Get a boundary survey', 'Confirms the lines, acreage and any encroachments.'],
      ['Perc / soil test for septic', 'Make sure the soil can handle the number of bedrooms across all cabins, or plan separate systems.'],
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
    { id: 'design', name: 'Site plan, design & permits', blurb: 'Decide where everything goes, pick plans, hire a builder and get permits.', steps: [
      ['Make a site plan: each cabin, driveway, parking, well, septic, power lines', 'Think about privacy between cabins, views, sun, and setbacks from property lines.'],
      ['Choose cabin plans: size, layout, style', 'Options: custom build, cabin kit, prefab/modular, or tiny home. Fill in each cabin in the Cabins tab.'],
      ['Decide the build order (one at a time or all at once)', 'Building one first lets it start earning while you build the rest.'],
      ['Get at least 3 builder bids'],
      ['Check builder references, license and insurance'],
      ['Sign the builder contract with a payment schedule'],
      ['Get the construction loan (if financing)'],
      ['Get stamped plans if the county requires them'],
      ['Apply for building permits'],
      ['Apply for septic and well permits'],
      ['Apply for a driveway / road entrance permit'],
    ] },
    { id: 'site', name: 'Site work & utilities', blurb: 'Get the land ready for building.', steps: [
      ['Clear trees and brush where the cabins and driveway go'],
      ['Build the driveway and parking'],
      ['Drill the well (or connect to water)'],
      ['Install the septic system(s)'],
      ['Bring power to the site and to each cabin spot'],
      ['Grade the cabin pads and plan drainage'],
      ['Set up internet'],
    ] },
    { id: 'build', name: 'Build the cabins', blurb: 'Each cabin moves through its own stages in the Cabins tab.', cabins: true, steps: [
      ['Pre-construction meeting with the builder'],
      ['Order materials with long lead times (windows, doors, kits)'],
      ['Visit the site often and take photos of each stage'],
      ['Keep a list of change orders and their cost'],
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

  const CABIN_STAGES = ['Plans chosen', 'Permit approved', 'Foundation', 'Framing', 'Roof, windows & doors', 'Plumbing & electrical', 'Inspections passed', 'Insulation & walls', 'Floors, kitchen & bath', 'Final inspection', 'Furnished', 'Ready for guests'];

  const BUDGET = [
    ['land', 'Land'],
    ['closing', 'Closing, legal & title'],
    ['tests', 'Survey & tests'],
    ['permits', 'Plans & permits'],
    ['site', 'Clearing, driveway & grading'],
    ['water', 'Well & water'],
    ['septic', 'Septic'],
    ['power', 'Power & internet'],
    ['build', 'Cabin construction'],
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

  const ROLES = ['Land agent', 'Lender', 'Surveyor', 'Attorney / title', 'County planning', 'Health dept. (septic)', 'Builder', 'Well driller', 'Septic installer', 'Excavator', 'Electrician', 'Power company', 'Insurance', 'Accountant'];

  L.plan = { PHASES, CABIN_STAGES, BUDGET, LAND_CHECKS, LAND_STATUS, ROLES };
})();
