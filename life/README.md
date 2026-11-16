# Life

A calm, phone-friendly app for the things that make up a good day: **habits**, **today's plan**, **goals** and a **journal**.

Plain HTML, CSS and JavaScript: no build step and no server. It works offline and installs on your phone's home screen.

## The four tabs

| Tab | What's there |
|---|---|
| **Today** | The date, a one-tap **mood check-in**, today's **habits** (tap to check off), your **plan** for today with a quick-add box (unfinished items from earlier days carry over, and **Coming up** holds later and someday items), and your top goals at a glance. |
| **Habits** | Each habit with its streak and the last 7 days. Tap any day to fill in one you missed. Open a habit to see its current and best streak, how often you did it in the last 30 days, and a 20-week grid. A habit can be **every day**, **certain days** (such as weekdays) or **a number of times a week**. |
| **Goals** | Goals tracked by **a number** (run 100 miles, read 12 books), where you log progress as you go, or by **steps** (plan the reunion) that you tick off. An optional finish date shows days left and whether you're **ahead**, **on track** or **behind**. An optional "why it matters" line keeps you going. |
| **Journal** | A month calendar colored by mood, plus your entries. Each entry has mood, energy and notes. |

**Settings** (the gear on Today): light or dark mode, backup and restore, add to home screen, sample data, erase.

## Coming from the old Life Tracker
On the same phone and browser, Today offers **Bring it over** once. Your open to-dos go into the plan, and your logged workouts become an **Exercise** habit (a number of times a week, using your old weekly goal). The old data isn't deleted. You can also do this later from Settings.

The calendar, events and per-area tabs from the old version are gone. That was on purpose, to keep the app uncluttered.

## Using it on your phone
The app is served by GitHub Pages at **https://benjaminbarber236-hue.github.io/Custom-Concepts/life/**, from whichever branch Pages is set to deploy (Settings → Pages in the repository).

- **iPhone:** in **Safari**, tap **Share**, then **Add to Home Screen**.
- **Android:** in **Chrome**, tap **⋮**, then **Install app**.

On a computer, run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Your data
Everything is saved **on this device, in this browser only**. Nothing is uploaded. Use **Settings → Save backup** now and then. The Today screen reminds you after a month without one.

## Files
```
index.html              app shell
css/styles.css          styles (light and dark)
js/util.js              dates, icons, toast, bottom sheet
js/store.js             data (localStorage), streaks, goal progress, old-app import
js/sample.js            sample data
js/app.js               screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js     builds a single-file demo with sample data
```
