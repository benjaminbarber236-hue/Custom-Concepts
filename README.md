# Window Covering Job Tracker

A phone-friendly app for tracking a window covering business (shades, blinds, shutters, drapery, and outdoor screens) from the first phone call to the check-in after the final install.

It's plain HTML, CSS and JavaScript. There's no build step and no server, it works offline, and you can install it on your phone's home screen.

## What it does

| Section | What's there |
|---|---|
| **Dashboard** | A month calendar of sales calls, measures, install days and site meetings (tap a day to see its appointments; multi-day installs supported, and each appointment can go to your phone calendar), overdue and upcoming follow-ups, past appointments that still need wrap-up notes, the sales pipeline, sales leads going cold, and installs waiting on other trades. |
| **Sales** | Leads → Consult scheduled → Measure/quoting → Proposal sent. Includes search and stage filters. |
| **Installs** | Sold/ordering → Pre-wire → Waiting on trades → Installing → Punch list. Shows install progress and who you're waiting on. |
| **Records** | Your searchable database. One search box covers people, companies, every job (including completed and lost ones), products, notes, call logs and documents. Filter by People, Companies, Jobs (Active, Completed, Lost) or Documents. A company page lists its people and all of their jobs, current and previous. **+ Add** creates a person, a company, a new lead, or a previous job you already finished. |

**Each job** has:
- **Documents**: attach the proposal PDF (or quotes, signed contracts, plans and photos) to the job. Tap it to read it right in the app, or share/email it from your phone. Attaching a proposal can move the job to *Proposal Sent* and set the follow-up for you. A contact's page lists the documents from all of their jobs.
- **Overview**: the people on the job and their roles, open follow-ups, upcoming appointments, recent activity and stage history.
- **Products**: windows grouped by room, with category, brand, product line, color, measurements, mount, control/motor, quantity and price. Tap a status to choose a new one (Quoted, Ordered, Received, Installed, Issue). One tap only opens the menu, so nothing changes by accident. **Copy** adds the next window with the same specs. **Order list** builds a text list grouped by brand.
- **Import order sheet**: upload the order sheet (Excel, CSV, or a PDF with selectable text) and its lines become products. The app matches columns like Room, Window, Width, Height, Fabric, Mount, Control and Price, and converts decimals to fractions (34.375 becomes 34 3/8). You review and uncheck rows before anything is added, and the sheet is saved with the job. **Get blank template** gives you a CSV with the right headers.
- **Plans**: upload floor plans, elevations or window schedules (several at once). They show as thumbnails, and **Zoom in** helps you read the details on site.
- **Phases**: steps for long jobs, such as pre-wire, blocking, waiting on drywall, final measure, order, install, program motors and punch list. Each phase can name who it depends on. There's a one-tap template for new construction.
- **Schedule** and **Log**: every appointment, plus every call, text, email, meeting and site visit.

**Built-in follow-through**
- New leads get a "call to schedule consult" follow-up automatically, or a consult appointment if you enter a date.
- After an appointment, **Wrap up** asks what happened, lets you move the job to the next stage, and sets the next follow-up.
- Moving a job to *Proposal Sent* adds a follow-up for 3 days later. *Sold* adds "place orders". *Complete* adds a check-in 2 weeks after the install.

## Using it

### On your phone (recommended): GitHub Pages
1. On GitHub, open the repo → **Settings → Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, pick the branch and the `/ (root)` folder, then click **Save**.
3. After about a minute, open the URL GitHub shows (e.g. `https://<user>.github.io/<repo>/`) on your phone.
4. Add it to your home screen:
   - **iPhone (Safari):** Share → **Add to Home Screen**.
   - **Android (Chrome):** ⋮ → **Install app**.

### On a computer
Open `index.html` directly in a browser, or run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Your data

Everything is saved **on the device, in that browser only**. Nothing is uploaded anywhere. That means:
- Go to **Settings → Export backup** regularly. It downloads a `.json` file you can keep in iCloud, Google Drive or email. Home shows a reminder after 7 days without a backup.
- Backups include attached documents, so the file can get large if you attach many PDFs.
- Use **Import backup** to restore your data or move it to a new phone.
- Data on your phone and data on your computer are **separate** unless you export from one and import into the other.

To try it out, use **Settings → Load sample data**. Then use **Erase everything** before you start using it for real.

## Customizing
- **Brands**: edit them in Settings (one per line, for each category).
- **Stages, contact roles, lead sources, phase template, automatic follow-ups**: edit `js/constants.js`.

## Files
```
index.html            app shell
css/styles.css        styles (light and dark mode)
js/constants.js       stages, categories, brands, roles, templates
js/ui.js              date helpers, form builder, dialogs
js/store.js           data storage (localStorage) + backup/restore
js/app.js             screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
```

## Demo build
`node tools/build-demo.js demo.html` bundles the app into one self-contained page in demo mode: sample data is preloaded, navigation stays in memory, and file downloads are shown as text.
