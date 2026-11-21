# The Butter Typing Trainer on the QNAP NAS

The kids use the Butter Typing Trainer from the NAS at **http://&lt;NAS address&gt;:3316**, on any computer in the house. Everyone's progress is kept in one place on the NAS.

It's set up the same way as Adventures in Shajun:

- Container Station runs the app in the official Node image.
- The family PC puts each new version there with a double-click.

## Before you start

- **Container Station** is installed on the NAS. It already is, because Shajun uses it.
- This computer has **Git** (https://git-scm.com/download/win) and a clone of this repo, e.g. `C:\Users\justi\Scripture-Typing`.
- Typing `\\<NAS address>\Container` into File Explorer's address bar opens the folder. If it asks you to sign in, use the NAS administrator account and tick *Remember my credentials*.

## 1. Copy the app to the NAS

Double-click **`Scripture-Typing-nas-update.bat`**.

1. It asks for the NAS address the first time, e.g. `192.168.1.50`, and remembers it in `nas-address.txt`.
2. It pulls the latest version from GitHub.
3. It copies the app to `Container\scripture-typing\app`.
4. It makes `Container\scripture-typing\data`, which is where the kids' progress will live.

If you've already been using `Scripture-Typing-play.bat` on this PC, it offers to copy that progress over. It only does this once, and it never overwrites anything on the NAS.

## 2. Create the app in Container Station

1. Open `deploy\qnap\docker-compose.yml` in Notepad and copy all of it.
2. In Container Station, go to **Create** → **Create Application**.
3. Set the **Application name** to `scripture-typing`.
4. Paste the YAML and change `PUBLIC_URL=http://NAS-ADDRESS:3316` to your NAS's address, e.g. `PUBLIC_URL=http://192.168.1.50:3316`. The .bat prints this line for you at the end.
5. Press **Create**.

It starts in a few seconds. To watch it, open **Containers** → **scripture-typing** → **Logs**. It's ready when the log says:

```
The Butter Typing Trainer running on http://localhost:8080
Family opens:  http://192.168.1.50:3316
```

## 3. Type!

Open **http://192.168.1.50:3316** (your NAS's address) on each kid's computer and bookmark it. Add each child under **⚙️ Parents** → **Add a typist**.

## Updating

Double-click **`Scripture-Typing-nas-update.bat`** whenever there's a new version.

1. It shows what's new, pulls it and copies the changed files to the NAS.
2. It leaves a note in the app folder (`.update-ready`).
3. Within a few seconds the app on the NAS finds the note, saves and stops. Container Station starts it straight back up on the new version.
4. Anyone in the middle of typing should refresh the page.

If nothing new was copied, it asks before restarting.

`Scripture-Typing-update.bat` updates this PC's own copy only, and you don't need it for the NAS. `Scripture-Typing-play.bat` runs a separate copy on this PC at http://localhost:8080, which is handy for trying things out.

> If you pressed **Stop** on the app in Container Station, it stays stopped until you press **Start**. The update note can't start a stopped app.

## Backups

Everything the family owns is one file: **`Container\scripture-typing\data\db.json`**. It holds the kids, their results and your family passages. Include it in your NAS backups. You can also download a backup from inside the app under **⚙️ Parents** → **Backup**.

The `app` folder can always be copied again from the PC.

## Troubleshooting

- **The page doesn't open.** Check that the app shows *running* in Container Station and look at its log. If the log says it can't find `server.js`, run the .bat first. The app only runs what the .bat copied.
- **Port 3316 is taken.** In the YAML, change the left-hand number of `"3316:8080"` and the port in `PUBLIC_URL`. Then change `PORT` near the top of `Scripture-Typing-nas-update.bat` to match.
- **Wrong NAS address.** Delete `nas-address.txt` next to the .bat and run it again.
