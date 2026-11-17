# Cabins

A phone-friendly planner for buying a piece of land and building cabins on it, from saving the down payment to welcoming the first guests.

Plain HTML, CSS and JavaScript: no build step and no server. It works offline and installs on your phone's home screen.

## The five tabs

| Tab | What's there |
|---|---|
| **Plan** | How far along the whole project is, which phase you're in, the **next 3 steps** (tap to check off), steps **due soon**, money spent vs. budget, land and cabin progress, and **your team** (agent, lender, surveyor, builder…) with tap-to-call. Set target dates for buying the land and opening. |
| **Steps** | About 60 starting steps in **8 phases**: Goals & money → Find the land → Check the land (under contract) → Buy the land → Site plan, design & permits → Site work & utilities → Build the cabins → Finish & open. Tap a step to add **notes** and a **due date** (and add it to your phone calendar). Edit, delete or add your own steps anywhere. |
| **Land** | Every property you're looking at: price, acres, **price per acre**, **land cost per cabin**, a star rating and a status (Watching → Visited → Offer made → Under contract → Bought, or Passed). A checklist for each one: road access, zoning for several cabins, short-term rentals allowed, power, water, perc test, flood zone, internet and buildable ground. |
| **Cabins** | Starts with **4 cabins** (add or remove). Each has its style, size, bedrooms, baths and build estimate, and moves through 12 **build stages** from "Plans chosen" to "Ready for guests". Costs logged for a cabin show up on it. |
| **Money** | A **budget** with 13 lines (land, closing, survey & tests, permits, site work, well, septic, power, construction, furnishings, extras, business, reserve). Log every **expense**; each line shows spent vs. estimate. Export expenses as CSV. **Lender calls**: 22 questions to ask a bank about a land loan, a box for each lender's answers, and a table comparing down payment, rate, term, monthly payment and fees. Also opens from the "Talk to 2–3 lenders" step. |

**Settings** (the gear on Plan): project name and target dates, light/dark, backup and restore, sample data, erase.

## Using it on your phone
The app lives on claude.ai, like Job Tracker: **https://claude.ai/artifact/CAdPbLmaxGUk1op2xoTRs1**. There it saves to your Claude account, so your plan is the same on your phone and computer.

For a home-screen icon, open **https://benjaminbarber236-hue.github.io/Custom-Concepts/cabins/open/** in Safari, tap **Share → Add to Home Screen**. The icon opens the app.

The same code also runs straight from GitHub Pages at `/cabins/` (or `python3 -m http.server` in this folder), where it saves to that browser only. To move a plan from there to claude.ai: **Settings → Save backup** there, then **Restore backup** in the claude.ai app.

## Your data
On claude.ai: saved to your Claude account (the artifact's database). Elsewhere: saved in that browser only; use **Settings → Save backup** now and then.

## Updating the claude.ai app
`node tools/build-artifact.js cabins.html` bundles everything into one page; publish that page to the same artifact.

## Files
```
index.html              app shell
css/styles.css          styles (light and dark)
js/util.js              dates, icons, toast, bottom sheet (shared with Life)
js/plan.js              the starting phases and steps, cabin stages, budget lines, land checklist
js/store.js             data (localStorage), progress and totals
js/sample.js            sample data
js/lenders.js           lender calls: loan questions and answers
js/app.js               screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js     builds a single-file demo with sample data
tools/build-artifact.js builds the single page published on claude.ai
open/index.html         home-screen launcher that opens the claude.ai app
```
