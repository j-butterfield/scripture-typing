# Scripture Typing Trainer

A typing tutor for kids that uses Bible passages as the practice text. You host it on your home NAS, and every computer in the house shares the same progress.

- **Lessons.** 21 step-by-step lessons that teach touch typing:
  - It starts with posture (sitting, floating wrists, curved fingers, home row and the F/J bumps).
  - Then come the home row, top row and bottom row, a key or two at a time, then capitals and punctuation, ending with a whole verse.
  - Each key is drilled reaching from its home key and back, then mixed with keys already learned, then used in real words and Bible phrases.
  - Animated hands show which finger to use, and a lesson passes at 90% accuracy, which unlocks the next.
  - A **Windows / Mac** switch changes the key names, such as Backspace/delete, Enter/return and Ctrl/⌘ command. Hand placement is the same on both.
- **Practice.** 61 King James Version passages in three levels: short verses, longer verses and whole passages such as Psalm 23, the Lord's Prayer and the Beatitudes. Each passage earns up to 3 stars.
- **America's founding documents.** The Declaration of Independence, the Constitution (Preamble through Article VII) and the Bill of Rights:
  - They are word for word from the National Archives transcripts, with the original spelling, like "defence".
  - They are split into 152 short parts of about 40 words each (never more than about 65), broken at the ends of sentences or clauses and kept in document order.
  - Speed tests can use them too.
- **Speed tests.** 1, 2, 3 or 5 minute timed tests that measure **speed (WPM)** and **accuracy**.
- **Keyboard guide.** The on-screen keyboard lights up the next key, color-codes the keys by finger and tells the child which finger to use.
- **Progress.** Charts of speed and accuracy over time, the keys missed most often, badges, a day streak and a history of recent sessions.
- **Parent settings.** One profile per child, with:
  - easy mode (lowercase letters only, no punctuation),
  - "wait for the right key" mode,
  - a speed goal for each child,
  - your own passages in any translation,
  - backup and restore.
- **No dependencies and no internet needed.** It is plain HTML/JS plus a tiny Node.js server. Data is kept in one JSON file.

## How scores work

| Score | How it is worked out |
|---|---|
| Speed (WPM) | correctly typed characters ÷ 5 ÷ minutes. Mistakes left in do not count. |
| Accuracy | correct key presses ÷ all key presses. A mistake still counts after it is fixed with Backspace. |
| Stars | 1 for finishing a passage, 2 for 90%+ accuracy, 3 for 97%+ |

## The double-click files (Windows)

| File | What it does |
|---|---|
| `Scripture-Typing-nas-update.bat` | Pulls the latest version and copies it to the QNAP NAS. The app there then restarts itself onto it. |
| `Scripture-Typing-update.bat` | Pulls the latest version into this computer's copy only. |
| `Scripture-Typing-play.bat` | Runs a copy on this computer at http://localhost:8080. |

## Install on the QNAP NAS

Follow **[deploy/QNAP.md](deploy/QNAP.md)**. In short:

1. Run `Scripture-Typing-nas-update.bat`.
2. Paste `deploy/qnap/docker-compose.yml` into Container Station.
3. Open `http://<NAS address>:3316`.

The kids' progress lives in `Container\scripture-typing\data\db.json` on the NAS.

### Other NAS systems

The `Dockerfile` and `docker-compose.yml` at the top of this repo build an image instead. Run `docker compose up -d --build` in this folder, then open `http://<your-nas-ip>:8080`. Progress is saved in `data/db.json`.

## Run without Docker

You need Node.js 18 or newer:

```sh
node server.js              # http://localhost:8080
PORT=3000 DATA_DIR=/path/to/data node server.js
```

## Adding passages

- **From the app:** Parents → Family passages. This is the easy way, and good for a weekly memory verse or another translation. The level is chosen from the passage's length.
- **Built in:** edit `public/js/passages.js`.

The built-in text is the KJV, which is public domain. Most modern translations (NIV, ESV, NKJV…) are copyrighted but allow personal use. Type them in through the app for your own family's use.

## Tests

```sh
npm test
```
