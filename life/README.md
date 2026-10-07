# Life Tracker

A phone-friendly app to keep work, congregation, recreation and fitness in one place, so nothing slips through the cracks.

Plain HTML, CSS and JavaScript: no build step, no server, works offline, and installs on your phone's home screen.

## What's in it

| Screen | What's there |
|---|---|
| **Dashboard** | Today's date and count, quick buttons (To-do, Event, Note, Workout), **Needs attention** (overdue to-dos with a Move button, areas with nothing planned in the next 2 weeks, workouts you still need this week), a month **calendar** with colored dots per area (tap a day to see it and add things to it), **Coming up** for the next 7 days, a card per area, pinned notes, and to-dos with no date yet. |
| **Work / Congregation / Recreation / Fitness** | One tab per area, each with **To do** (overdue, today, next 7 days, later, no date, done recently), **Schedule** (next 60 days plus the regular repeating schedule), and **Notes**. Fitness adds **Workouts**: this week against your goal, the last 8 weeks as bars, and your log. |
| **Search** (magnifier, top right) | Finds to-dos, events, notes and workouts. |
| **Settings** (sliders, top right) | Rename, recolor, reorder or add areas; fitness goal; light/dark; send events to your phone calendar; backup. |

### The pieces
- **To-dos** have an optional due day, time, repeat and flag. Tick one to finish it (Undo shows for a few seconds). A repeating to-do moves to its next date and the finished day stays on the calendar.
- **Events** go on the calendar and can repeat (every day, weekday, week, 2 weeks, month or year) until a date. Deleting one date of a repeating event asks whether you mean just that date, that date and later, or all of them.
- **Notes** belong to an area and can be pinned to the Dashboard or shown on a calendar day.
- **Workouts**: type, minutes, distance, effort, notes. A Fitness event in the past has a **Log as workout** button.

### Alerts on your phone
The app can't send notifications by itself. To get alerts, open an event and tap **Add to phone calendar** (or Settings → **Add all events to phone calendar**). Your phone's calendar then reminds you 30 minutes before anything with a time. If you change an event later, add it again.

## Using it

### On your phone (recommended): GitHub Pages
1. On GitHub, open the repo → **Settings → Pages**.
2. Choose **Deploy from a branch**, pick this branch and the `/ (root)` folder, then **Save**.
3. After about a minute, open `https://<user>.github.io/<repo>/life/` on your phone.
4. Add it to your home screen: **iPhone (Safari)** Share → **Add to Home Screen**. **Android (Chrome)** ⋮ → **Install app**.

### On a computer
Run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Your data
Everything is saved **on the device, in that browser only**. Nothing is uploaded.
- Use **Settings → Export backup** regularly and keep the file somewhere safe. The Dashboard reminds you after 14 days without one.
- **Import backup** restores it, or moves it to a new phone.
- To look around first, use **Load sample data**, then **Erase everything** before using it for real.

## Customizing
Areas can be changed in Settings. Title suggestions, workout types, repeat options and the "nothing planned" window are in `js/constants.js`.

## Files
```
index.html            app shell
css/styles.css        styles (light and dark mode, one color per area)
js/constants.js       areas, colors, repeats, workout types, suggestions
js/ui.js              date helpers, form builder, dialogs
js/store.js           data storage (localStorage), repeats, backup/restore
js/sample.js          sample data
js/app.js             screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js   bundles a single-file demo with sample data
```
