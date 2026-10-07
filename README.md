# Window Covering Job Tracker

A phone-friendly app for tracking a window covering business (shades, blinds, shutters, drapery, and outdoor screens) from the first phone call to the check-in after the final install.

It's plain HTML, CSS and JavaScript. There's no build step and no server, it works offline, and you can install it on your phone's home screen.

## How a job works

Every job follows the same steps, matching how a typical job goes:

**New lead → Sales calls → Quotes out → Final measure → Ordered → Install → Done**

Each job page shows where the job is and a **Next step** card with one big button for what to do now:

| Step | Next step button |
|---|---|
| New lead | Schedule sales call |
| Sales calls | Add a quote (one per option or price range, with its PDF) |
| Quotes out | They said yes: book final measure (asks which option they picked) |
| Final measure | Measured: place the order |
| Ordered | Product is in: schedule install (you enter the expected arrival date and get a reminder that day) |
| Install | Job finished (sets a check-in reminder 2 weeks later) |

Scheduling an appointment moves the job forward automatically. For example, booking a final measure moves it to **Final measure**. After each appointment, **Add notes** asks what happened and what's next, and can set a reminder. Reminders the app made for a step clear themselves when the job moves on.

## Reminders

Add a reminder from the Dashboard or from any day on the calendar, with an optional time. When it's done, tap it, write what you talked about in **Notes**, and tap **Mark done**, or just tick the box. Finished reminders stay on their calendar day (crossed off) with their notes, so you can look back later. If a reminder belongs to a job, its notes also appear in that job's **Notes** tab, and Records search finds them.

## Screens

| Tab | What's there |
|---|---|
| **Dashboard** | Month calendar (tap a day), quick buttons (New lead, Schedule, Reminder), a **To do** list (appointments to add notes for, reminders due, jobs with no next step), and a count of jobs at each step. |
| **Sales** | Jobs in New lead, Sales calls and Quotes out. |
| **Installs** | Jobs in Final measure, Ordered and Install. |
| **Records** | One search across people, companies, every job (including finished and lost), products, notes and files. |

**Each job** has four tabs:
- **Overview**: what's coming up, quotes, people, details, and history. Big jobs can turn on **phases** (pre-wire, waiting on drywall…) from the ⋯ menu.
- **Products**: windows by room. Tap a status to change it, **Copy** to add the next window with the same specs, or **Import order sheet** (Excel, CSV or text PDF) to fill the list automatically after a review.
- **Files**: plans, quote PDFs, order sheets and photos, with thumbnails and a zoomable viewer.
- **Notes**: what you talked about and decided.

## Using it

### On your phone (recommended): GitHub Pages
1. Open https://github.com/benjaminbarber236-hue/Custom-Concepts/settings/pages
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**. Pick the branch `claude/window-covering-scheduler-qfe9s1` and the `/ (root)` folder, then tap **Save**.
3. Wait about a minute, then open **https://benjaminbarber236-hue.github.io/Custom-Concepts/** on your phone.
4. Add it to your home screen:
   - **iPhone:** open the link in **Safari**, tap the **Share** button, then **Add to Home Screen**.
   - **Android:** open it in **Chrome**, tap **⋮**, then **Install app**.

It then opens full screen like a regular app, works offline, and updates itself when new changes are pushed.

The same site also hosts **Life Tracker** (work, congregation, recreation and fitness) at **https://benjaminbarber236-hue.github.io/Custom-Concepts/life/**. See `life/README.md`.

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
