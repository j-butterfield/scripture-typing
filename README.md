# Scripture Typing Trainer

A typing tutor for kids that uses Bible passages as the practice text. You host it on your home NAS, and every computer in the house shares the same progress.

- **Practice.** 61 King James Version passages in three levels: short verses, longer verses and whole passages such as Psalm 23, the Lord's Prayer and the Beatitudes. Each passage earns up to 3 stars.
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

## Install on a NAS (Docker)

Most NAS systems can run Docker Compose: Synology Container Manager, QNAP Container Station, Unraid, TrueNAS SCALE and OpenMediaVault.

1. Copy this `typing-trainer` folder to your NAS, e.g. `/volume1/docker/typing-trainer`.
2. Create a project from the `docker-compose.yml` in that folder:
   - **Synology:** Container Manager → Project → Create, then choose that folder.
   - **SSH:** run `docker compose up -d --build` in that folder.
3. Open `http://<your-nas-ip>:8080` on the kids' computers. Bookmark it.

Progress is saved in `data/db.json` inside the folder, so include that folder in your NAS backups. To use a port other than 8080, change the left number in `docker-compose.yml`, e.g. `"3000:8080"`.

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
