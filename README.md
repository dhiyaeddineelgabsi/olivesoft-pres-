# Olivesoft-Pres

OliveBranch · CSTAM 3.0 technical pitch deck (11 slides, plain HTML/CSS/JS, no build step).

## Run locally
```bash
npx serve .          # or: python3 -m http.server 8000
```
Open http://localhost:8000. It also works from `file://` (open `index.html`).
Keys: arrows / space to move, clicks reveal the next beat. Speaker notes are in `<aside class="notes">` and in `PITCH.md`.

## Host
Static site, no build. On Vercel: import the repo, framework "Other", no build command, output directory `.` (`vercel.json` is included).

## Edit
- Slides and text: `index.html`
- Styles: `css/` · Behaviour: `js/` · Images and demo video: `assets/`
- Pitch script and Q&A: `PITCH.md`

## Tools (optional)
`tools/` has the PDF export (`export-pdf.mjs`) and the live-capture script. Run `npm ci` in `tools/` first; Playwright is needed.
