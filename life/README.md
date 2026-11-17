# Life

A calm, phone-friendly app for the things that make up a good day: **today's plan**, your **schedule**, **habits**, **spiritual** activities and a **journal**.

Plain HTML, CSS and JavaScript: no build step and no server. It works offline and installs on your phone's home screen.

## The five tabs

| Tab | What's there |
|---|---|
| **Today** | The date, a one-tap **mood check-in** with quick **Dream** and **Journal** mic buttons, today's **schedule** (with the next plan if today is empty), today's **habits** (tap to check off), your **plan** for today with a quick-add box (unfinished items from earlier days carry over, and **Coming up** holds later and someday items). |
| **Schedule** | Plans with a time and place: dinner, movies, a Bible study and so on. Quick picks fill in the name and kind (**Social**, **Spiritual**, **Work**, **Personal**). Plans can repeat weekly, every 2 weeks, monthly and more. A month **calendar** has a colored dot for each kind of plan; tap a day to see it, with any to-dos for that day. **Coming up** shows the next 3 weeks. Meetings, meetings for field service, your parts and return visits show up automatically. Open a plan and tap **Add to phone calendar** to get a reminder 30 minutes before. |
| **Habits** | Two sides, switched at the top. **Habits:** Each habit with its streak and the last 7 days. Tap any day to fill in one you missed. Open a habit to see its current and best streak, how often you did it in the last 30 days, and a 20-week grid. A habit can be **every day**, **certain days** (such as weekdays) or **a number of times a week**. Daily habits can also need **several times a day** (brush teeth 2×, water 8×): each tap on Today adds one and the circle fills up; the day counts once all are done. **Goals:** a number to reach by a date (run 100 miles this year, read 12 books) where you log progress as you go, or a list of steps you tick off. Shortcuts set the finish date to **this year** or **this month**. Number goals can also **start over** every week, month or year (run 15 miles a month): progress, pace and days left cover the current period, and **Past months** lists how each earlier one went. Each goal shows days left, whether you're **ahead**, **on track** or **behind**, and how much a week finishes it on time. |
| **Spiritual** | Four sections. **Meetings:** this week's meetings with a **Went?** check, how many you attended this month, **my parts** (date, assistant, notes, prepared) and your meeting times. **Service:** log time, count Bible studies, set an optional hour goal and **Copy report** to text your group overseer. It also keeps **return visits** with a next-visit date. **Group:** group overseer and assistant, **meetings for field service**, and members, with tap-to-call or text. **Study:** a daily Bible reading tracker with a streak and where you're reading, and a study log. |
| **Journal** | Two big buttons: **Dream** and **Journal**. Each opens with the **microphone already listening**, so you can speak a dream right after waking. The words are written down along with the date and time, and a switch marks a **lucid dream**. Below them is a month **calendar with a dot for each kind of entry** (green: journal, purple: dream, gold: lucid dream). Tap a day to read its entries, or filter to just Journal or Dreams. |

**Settings** (the gear on Today): light or dark mode, backup and restore, add to home screen, sample data, erase.

### Dictation
- **iPhone/iPad:** Dream and Journal open with the keyboard up; tap the **mic on the keyboard** and speak. Apple's keyboard dictation is far better than what web apps get (it picks up whispering), so the app uses it instead of its own mic.
- **Android and computers:** the round mic button uses the browser's speech recognition. If it isn't allowed or keeps stopping, the app switches to keyboard dictation instead of retrying.

### Cleaning up dictation (free)
Under a dream or journal entry, **Copy & open Claude** saves the entry, copies the text with cleanup instructions (fix misheard words, punctuation, paragraphs; add nothing) and opens Claude with it filled in. There's no share sheet, so it can't go to a contact by mistake. If the chat comes up empty, paste. Send it, copy Claude's reply, come back and tap **Paste Claude's version**. **Show what I said** switches back to the original, which is kept with the entry. If the app was closed meanwhile, the Journal tab shows **Waiting for Claude's version** for that entry.

**Claude project:** in **Settings → Claude project**, paste the link to one of your Claude projects (for example "Journal"; in Safari it's the claude.ai address with `/project/` in it), and copy the provided instructions into that project's Instructions. Copy & open Claude then copies just the entry (with its date and time) and opens that project; start a new chat there and paste. (A pre-filled link would make the Claude app skip the project, so none is used.)

On iPhones with Apple Intelligence you can also select the text and use **Writing Tools → Proofread**, which is free and built in.

## Coming from the old Life Tracker
On the same phone and browser, Today offers **Bring it over** once. Your open to-dos go into the plan, your calendar events go on the **Schedule**, and your logged workouts become an **Exercise** habit (a number of times a week, using your old weekly goal). The old data isn't deleted. You can also do this later from Settings.

The per-area tabs and notes from the old version are gone, to keep the app uncluttered. Goals now live on the Habits tab.

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
js/goals.js             Goals (inside the Habits tab)
js/app.js               screens and actions
sw.js, manifest.webmanifest, icons/   offline support and home-screen install
tools/build-demo.js     builds a single-file demo with sample data
```
