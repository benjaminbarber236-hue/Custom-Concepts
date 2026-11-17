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
Open **https://benjaminbarber236-hue.github.io/Custom-Concepts/cabins/** in Safari, tap **Share → Add to Home Screen**. It opens full screen with the cabin icon.

Sign in with the same email and password as Job Tracker. Your plan is saved in the same Supabase database (rows named `cabins-…` in the `docs` table, so the two apps never mix) and syncs between your phone and computer. A copy stays on the phone, so it opens without signal and syncs when you're back online. **Skip** on the sign-in screen keeps the plan on that phone only.

## Your data
Signed in: in your Supabase database, plus a copy on each device. Skipped: in that browser only. Either way, **Settings → Save backup** downloads everything as a file.

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
js/supabase.js          Supabase client (same file as Job Tracker)
tools/build-artifact.js builds a single-page version for claude.ai (older, not needed for the phone)
open/index.html         old launcher address; forwards to the app
```
