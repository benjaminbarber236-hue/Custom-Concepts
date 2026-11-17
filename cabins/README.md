# Cabins

A phone-friendly planner for buying a piece of land and building cabins on it, from saving the down payment to welcoming the first guests.

Plain HTML, CSS and JavaScript: no build step and no server. It works offline and installs on your phone's home screen.

## The five tabs

| Tab | What's there |
|---|---|
| **Plan** | How far along the whole project is, which phase you're in, the **next 3 steps** (tap to check off), steps **due soon**, money spent vs. budget, land and building progress, and **your team** (agent, lender, master electrician, sawmill…) with tap-to-call. Set target dates for buying the land and opening. |
| **Steps** | About 65 starting steps in **8 phases**: Goals & money → Find the land → Check the land (under contract) → Buy the land → Site plan, design & permits → Site work & utilities → Build → Finish & open. The design and build steps assume **you are the builder** (owner-builder rules, master electrician sign-off, snow-load trusses, log loads and sawmill). Tap a step to add **notes** and a **due date**. Edit, delete or add your own steps anywhere. |
| **Land** | Every property you're looking at: price, acres, **price per acre**, **land cost per unit**, a star rating and a status (Watching → Visited → Offer made → Under contract → Bought, or Passed), plus a checklist: road access, zoning for several units, short-term rentals, power, water, perc test, flood zone, internet and buildable ground. |
| **Build** | **Duplexes or cabins? Keep both until you decide.** Each **plan** is a line-by-line cost estimate with low and high prices. It starts with your **32×34 duplex** breakdown (Alpine, WY; sawmill framing, radiant slab, metal roof) and a **single cabin** with the same lines, not priced yet. Set how many units you want and each plan shows the cost per building, **per unit**, **per sq ft**, and the total for that many units. Add your **buildings**: each can stay "not decided" or use a plan, and moves through **24 build stages** from permit and slab to final inspection. Expenses tagged to a building and a part of the build (slab, radiant heat, shell, windows, rough-in, finishes, permits) show spent vs. estimate for that part. |
| **Money** | A **budget** with 14 lines (land, closing, tests, permits, site work, well, septic, power, building materials, tools & equipment, furnishings, extras, business, reserve). The building-materials line can take your buildings' low or high estimate in one tap. Log every **expense**; export as CSV. |

**Settings** (the gear on Plan): project name and target dates, light/dark, backup and restore, sample data, erase.

## Using it on your phone
Served by GitHub Pages at **https://benjaminbarber236-hue.github.io/Custom-Concepts/cabins/** (from whichever branch Pages deploys).

- **iPhone:** in **Safari**, tap **Share**, then **Add to Home Screen**.
- **Android:** in **Chrome**, tap **⋮**, then **Install app**.

On a computer, run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Your data
Everything is saved **on this device, in this browser only**. Nothing is uploaded. Use **Settings → Save backup** now and then; the Plan tab reminds you after a month without one.

## Files
```
index.html              app shell
css/styles.css          styles (light and dark)
js/util.js              dates, icons, toast, bottom sheet (shared with Life)
js/plan.js              starting phases and steps, build stages, the duplex estimate, budget lines, land checklist
js/store.js             data (localStorage), progress and totals
js/sample.js            sample data
js/build.js             Build tab: plans, comparison, buildings
js/app.js               screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js     builds a single-file demo with sample data
```
