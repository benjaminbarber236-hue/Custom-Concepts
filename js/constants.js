// Static lists and defaults used throughout the app.
window.WC = window.WC || {};

WC.C = {
  // Every job moves through one pipeline, from first contact to after the final install.
  // `section` decides whether it shows under Sales, Installs, or Closed.
  STAGES: [
    { id: 'lead',     label: 'New Lead',              section: 'sales' },
    { id: 'consult',  label: 'Consult Scheduled',     section: 'sales' },
    { id: 'quoting',  label: 'Measure / Quoting',     section: 'sales' },
    { id: 'proposal', label: 'Proposal Sent',         section: 'sales' },
    { id: 'sold',     label: 'Sold – Ordering',       section: 'install' },
    { id: 'prewire',  label: 'Pre-wire / Rough-in',   section: 'install' },
    { id: 'waiting',  label: 'Waiting on Trades',     section: 'install' },
    { id: 'install',  label: 'Installing',            section: 'install' },
    { id: 'punch',    label: 'Punch List / Service',  section: 'install' },
    { id: 'complete', label: 'Complete',              section: 'closed' },
    { id: 'lost',     label: 'Lost',                  section: 'closed' },
  ],

  CATEGORIES: ['Shades', 'Blinds', 'Shutters', 'Drapery', 'Outdoor Screens & Shades', 'Motorization / Controls', 'Hardware / Other'],

  // Starter brand lists; editable in Settings.
  DEFAULT_BRANDS: {
    'Shades': ['Hunter Douglas', 'Lutron', 'Norman', 'Graber', 'Levolor', 'Alta', 'Lafayette', 'Draper', 'MechoShade'],
    'Blinds': ['Hunter Douglas', 'Norman', 'Graber', 'Levolor', 'Bali', 'Alta'],
    'Shutters': ['Hunter Douglas', 'Norman', 'Sunburst', 'Graber', 'Polywood'],
    'Drapery': ['Hunter Douglas Design Studio', 'Kirsch', 'Graber', 'Custom Workroom'],
    'Outdoor Screens & Shades': ['Phantom Screens', 'Insolroll', 'Draper', 'Hunter Douglas', 'Somfy'],
    'Motorization / Controls': ['Lutron', 'Somfy', 'Hunter Douglas PowerView', 'Control4', 'Savant'],
    'Hardware / Other': ['Kirsch', 'Rowley', 'Other'],
  },

  CONTACT_ROLES: [
    'Homeowner', 'Interior Designer', 'Builder / GC', 'Contractor', 'Architect',
    'Electrician', 'Low-voltage / AV', 'Framer', 'Drywaller', 'Painter',
    'Property Manager', 'Vendor / Rep', 'Coworker', 'Other',
  ],

  PROJECT_TYPES: ['Existing home', 'New construction', 'Remodel', 'Commercial', 'Service / Repair'],

  LEAD_SOURCES: ['Referral', 'Interior designer', 'Builder / contractor', 'Website', 'Showroom', 'Repeat customer', 'Home show', 'Phone call', 'Other'],

  EVENT_TYPES: [
    { id: 'sales',   label: 'Sales call',      color: '#5b6f86' },
    { id: 'measure', label: 'Measure',         color: '#8a7896' },
    { id: 'install', label: 'Install',         color: '#5f8466' },
    { id: 'prewire', label: 'Pre-wire / drill', color: '#b38a47' },
    { id: 'service', label: 'Service / repair', color: '#ad5d52' },
    { id: 'meeting', label: 'Site meeting',    color: '#5f8a8b' },
    { id: 'other',   label: 'Other',           color: '#9a948c' },
  ],

  LOG_TYPES: ['Call', 'Text', 'Email', 'Meeting', 'Site visit', 'Note'],

  ITEM_STATUSES: ['Quoted', 'Ordered', 'Received', 'Installed', 'Issue'],

  MOUNTS: ['Inside', 'Outside', 'Ceiling', 'Wall', 'Pocket'],
  CONTROLS: ['Cordless', 'Cord', 'Wand', 'Chain / loop', 'Motorized – hardwired', 'Motorized – battery', 'Motorized – plug-in', 'Manual crank'],

  PHASE_STATUSES: ['To do', 'Waiting', 'Scheduled', 'Done'],

  // Typical sequence for a new-construction / big remodel job.
  PHASE_TEMPLATE: [
    { name: 'Review plans & window schedule', waitingOn: '' },
    { name: 'Pre-wire: run low-voltage / power to windows', waitingOn: 'Framing' },
    { name: 'Blocking / drill holes / recess pockets', waitingOn: 'Framing' },
    { name: 'Wait for drywall, trim & paint', waitingOn: 'Drywall / Paint' },
    { name: 'Final measure', waitingOn: '' },
    { name: 'Order products', waitingOn: '' },
    { name: 'Install', waitingOn: '' },
    { name: 'Program motors / integrate controls', waitingOn: 'AV / Electrician' },
    { name: 'Walkthrough & punch list', waitingOn: '' },
  ],

  // Follow-ups created automatically when a job enters a stage. days = offset from today.
  STAGE_AUTOTASKS: {
    proposal: { title: 'Follow up on proposal', days: 3 },
    sold:     { title: 'Place product orders', days: 1 },
    complete: { title: 'Post-install check-in (happy? referrals? review?)', days: 14 },
  },
};

WC.C.stage = (id) => WC.C.STAGES.find((s) => s.id === id) || WC.C.STAGES[0];
WC.C.eventType = (id) => WC.C.EVENT_TYPES.find((t) => t.id === id) || WC.C.EVENT_TYPES[WC.C.EVENT_TYPES.length - 1];
