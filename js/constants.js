// Static lists and defaults used throughout the app.
window.WC = window.WC || {};

WC.C = {
  // A job's steps, in order, matching how a typical job goes: referral → sales call(s) →
  // quotes → final measure → order (1–3 months) → install. `section` puts it under Sales or Installs.
  STAGES: [
    { id: 'lead',     label: 'New lead',      step: 'Lead',          section: 'sales' },
    { id: 'consult',  label: 'Sales calls',   step: 'Sales calls',   section: 'sales' },
    { id: 'quoted',   label: 'Quotes out',    step: 'Quotes',        section: 'sales' },
    { id: 'measure',  label: 'Final measure', step: 'Final measure', section: 'install' },
    { id: 'ordered',  label: 'Ordered',       step: 'Ordered',       section: 'install' },
    { id: 'install',  label: 'Install',       step: 'Install',       section: 'install' },
    { id: 'complete', label: 'Done',          step: 'Done',          section: 'closed' },
    { id: 'lost',     label: 'Lost',          step: 'Lost',          section: 'closed' },
  ],

  // Older versions of the app used more steps; this maps them onto the current ones.
  OLD_STAGES: { quoting: 'consult', proposal: 'quoted', sold: 'measure', prewire: 'measure', waiting: 'measure', punch: 'install' },

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

  COMPANY_TYPES: ['Design firm', 'Builder / GC', 'Contractor', 'Architect', 'Electrical / low-voltage', 'Supplier / vendor', 'Property management', 'Commercial client', 'Other'],

  // Best guess for a new company's type from the role of the person it was created from.
  ROLE_COMPANY_TYPE: {
    'Interior Designer': 'Design firm', 'Builder / GC': 'Builder / GC', 'Contractor': 'Contractor', 'Architect': 'Architect',
    'Electrician': 'Electrical / low-voltage', 'Low-voltage / AV': 'Electrical / low-voltage', 'Framer': 'Contractor',
    'Drywaller': 'Contractor', 'Painter': 'Contractor', 'Property Manager': 'Property management', 'Vendor / Rep': 'Supplier / vendor',
  },

  PROJECT_TYPES: ['Existing home', 'New construction', 'Remodel', 'Commercial', 'Service / Repair'],

  LEAD_SOURCES: ['Referral', 'Interior designer', 'Builder / contractor', 'Website', 'Showroom', 'Repeat customer', 'Home show', 'Phone call', 'Other'],

  // `pick` types are the choices when scheduling; the rest only show on older appointments.
  EVENT_TYPES: [
    { id: 'sales',   label: 'Sales call',       color: '#5b6f86', pick: true },
    { id: 'measure', label: 'Final measure',    color: '#8a7896', pick: true },
    { id: 'install', label: 'Install',          color: '#5f8466', pick: true },
    { id: 'meeting', label: 'Site visit',       color: '#5f8a8b', pick: true },
    { id: 'other',   label: 'Other',            color: '#9a948c', pick: true },
    { id: 'prewire', label: 'Pre-wire / drill', color: '#b38a47' },
    { id: 'service', label: 'Service / repair', color: '#ad5d52' },
  ],

  DOC_LABELS: ['Plans', 'Quote', 'Order sheet', 'Photo', 'Contract', 'Other'],
  OLD_DOC_LABELS: { 'Proposal': 'Quote', 'Quote / estimate': 'Quote', 'Plans / drawings': 'Plans', 'Signed contract': 'Contract', 'Invoice': 'Other', 'Spec sheet': 'Other' },

  LOG_TYPES: ['Note', 'Call', 'Text', 'Email', 'Visit'],

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

  // Reminders created automatically when a job reaches a step. days = from today.
  STAGE_AUTOTASKS: {
    quoted:   { title: 'Check in on the quotes', days: 4 },
    complete: { title: 'Check in after install (happy? referrals? review?)', days: 14 },
  },

};

WC.C.stage = (id) => WC.C.STAGES.find((s) => s.id === id) || WC.C.STAGES[0];
WC.C.eventType = (id) => WC.C.EVENT_TYPES.find((t) => t.id === id) || WC.C.EVENT_TYPES[WC.C.EVENT_TYPES.length - 1];
