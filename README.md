# Tool-Tracker

Tool Tracker is a lightweight, single-page web app for signing tools out and back in on a job site. It is plain HTML, CSS and vanilla JavaScript with no build step.

## Features

- Sign tools out to a job and person, and check them back in from the tool cards
- Archive and restore tools; each tool shows its category, condition and status (Available, Checked Out, Archived)
- Searchable sign-out history
- Optional QR Code scanning and RFID reader support to simplify signing in and out
- Clean, responsive UI built with vanilla JavaScript
- All data stored locally in your browser

Not implemented yet: editing a tool from its card (shows a notice) and JSON export/import backups.

## Running

Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8000
```

Camera scanning requires a secure context (`https://` or `localhost`).

## Themes

The UI uses a red-and-black jobsite look with Light and Dark themes.

- The theme follows the system setting (`prefers-color-scheme`) by default.
- The button in the top-right corner switches themes manually; the choice is saved in `localStorage` under `tt-theme`.
- All colors are CSS variables defined at the top of `styles.css`. Edit the variables there rather than hard-coding colors.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and the tool card template |
| `styles.css` | Design tokens (Light and Dark) and component styles |
| `theme.js` | Theme toggle and saved preference |
| `app.js` | App logic: sign-out, history, tool cards, scanning, toasts |
