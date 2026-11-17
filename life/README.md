# Life

A calm, phone-friendly app for the things that make up a good day: **today's plan**, your **schedule**, **habits**, **spiritual** activities and a **journal**.

Plain HTML, CSS and JavaScript: no build step and no server. It works offline and installs on your phone's home screen.

## The five tabs

| Tab | What's there |
|---|---|
| **Today** | The date, a one-tap **mood check-in** with quick **Dream** and **Journal** mic buttons, today's **schedule** (with the next plan if today is empty), today's **habits** (tap to check off), your **plan** for today with a quick-add box (unfinished items from earlier days carry over, and **Coming up** holds later and someday items). |
| **Schedule** | Plans with a time and place: dinner, movies, a Bible study and so on. Quick picks fill in the name and kind (**Social**, **Spiritual**, **Work**, **Personal**). Plans can repeat weekly, every 2 weeks, monthly and more. A month **calendar** has a colored dot for each kind of plan; tap a day to see it, with any to-dos for that day. **Coming up** shows the next 3 weeks. Meetings, meetings for field service, your parts and return visits show up automatically. Open a plan and tap **Add to phone calendar** to get a reminder 30 minutes before. |
| **Habits** | Each habit with its streak and the last 7 days. Tap any day to fill in one you missed. Open a habit to see its current and best streak, how often you did it in the last 30 days, and a 20-week grid. A habit can be **every day**, **certain days** (such as weekdays) or **a number of times a week**. |
| **Spiritual** | Four sections. **Meetings:** this week's meetings with a **Went?** check, how many you attended this month, **my parts** (date, assistant, notes, prepared) and your meeting times. **Service:** log time, count Bible studies, set an optional hour goal and **Copy report** to text your group overseer. It also keeps **return visits** with a next-visit date. **Group:** group overseer and assistant, **meetings for field service**, and members, with tap-to-call or text. **Study:** a daily Bible reading tracker with a streak and where you're reading, and a study log. |
| **Journal** | Two big buttons: **Dream** and **Journal**. Each opens with the **microphone already listening**, so you can speak a dream right after waking. The words are written down along with the date and time, and a switch marks a **lucid dream**. Below them is a month **calendar with a dot for each kind of entry** (green: journal, purple: dream, gold: lucid dream). Tap a day to read its entries, or filter to just Journal or Dreams. |

**Settings** (the gear on Today): light or dark mode, backup and restore, add to home screen, sample data, erase.

### Dictation
The mic uses your phone's built-in speech recognition (Chrome on Android, Safari on iPhone). The first time, allow microphone access. Tap the mic again to stop; you can edit the text before saving. If speech recognition isn't available (some browsers, or the app opened from an iPhone home screen), use the mic on your keyboard instead.

## Coming from the old Life Tracker
On the same phone and browser, Today offers **Bring it over** once. Your open to-dos go into the plan, your calendar events go on the **Schedule**, and your logged workouts become an **Exercise** habit (a number of times a week, using your old weekly goal). The old data isn't deleted. You can also do this later from Settings.

The per-area tabs and notes from the old version are gone, to keep the app uncluttered. Goals were replaced by the Spiritual tab.

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
js/schedule.js          Schedule tab, plans, agenda rows
js/spiritual.js         Spiritual tab: meetings, service, group, study
js/app.js               screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js     builds a single-file demo with sample data
```
