# AI Resolution Tracker (10 Weekends)

A tiny, no-build web app that tracks progress across the **10 Weekend AI Resolution** projects.

## Run it

- Open `index.html` in your browser (double-click it).
- Your data autosaves in your browser via `localStorage`.

## Install on mobile (PWA)

This site is a **PWA** (installable web app). When installed, it opens like an app and supports offline use for previously loaded content.

- **Android (Chrome)**: open the site → menu → **Install app**
- **iPhone (Safari)**: open the site → Share button → **Add to Home Screen**

## What you can track

- Completion checkbox per weekend (with the PDF’s “Done when” criteria)
- Weekend notes
- Scorecard fields:
  - Outcome quality (1–5)
  - Time saved (1–5)
  - Repeatability (1–5)
  - Use again? (Yes/No)
  - Scorecard notes (best prompt, approach, what didn’t work)
- Hours spent estimate (per weekend + total)

## Backup / restore

- **Export**: copies/downloads JSON backup
- **Import**: restores from a JSON backup

## Offline / poor connection behavior

- The app **caches the app shell** (HTML/CSS/JS) so it loads even with no connection.
- Your entries are stored locally in `localStorage`, so your previously entered data remains available offline.
- First load must happen online at least once so the browser can cache the app.

