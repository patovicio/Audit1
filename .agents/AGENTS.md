# Friosur Auditoría — Agent Rules

## What this project is

A **single-file PWA** for field audit of Friosur commercial clients across Patagonia.
All app logic lives in `index.html`. Backend is Google Apps Script (`Codigo.gs`).
No build step. No package manager. No framework.

## Hard constraints — never violate these

- Do NOT suggest or introduce React, Vue, Angular, Next.js, Vite, Webpack, or any JS framework/bundler.
- Do NOT create `package.json` or any npm dependency.
- All JavaScript logic MUST stay inside the `<script>` tag in `index.html`.
- Use **Vanilla JS ES6+** only.
- Use **TailwindCSS via CDN** — do not install it as a package.
- Do not split the app into multiple JS files. Keep it single-file.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + Vanilla JS ES6+ inside `index.html` |
| Styling | TailwindCSS CDN + Material Design 3 color tokens |
| Icons | Material Symbols Outlined via Google Fonts CDN |
| Backend | Google Apps Script Web App (`Codigo.gs`) |
| Offline | Service Worker (`sw.js`) + `localStorage` |
| Hosting | GitHub Pages |
| Data | `clientes_maestro.json` (473 clients, served from GitHub Pages) |

## Design priorities

1. **Offline-first**: every audit is saved to `localStorage` before any network call.
2. **Mobile-first**: targets Android/iPhone used by sales reps in low-connectivity areas.
3. **Auto-sync on reconnect**: `window.addEventListener('online', ...)` triggers sync.
4. **Google Sheets integration**: data sent via `CONFIG.SHEETS_API_URL` (GET with query params).

## Code conventions

- Function names: camelCase in Spanish (e.g., `renderizarLista`, `guardarAuditoria`)
- HTML IDs: camelCase (e.g., `pantallaLista`, `contenedorActivos`)
- Global constants: SCREAMING_SNAKE_CASE (e.g., `CONFIG`, `MARCAS_COMPETENCIA`)
- Global state: `let` variables at the top of the `<script>` block
- No ES6 classes — use plain functions and simple global state

## Key files

| File | Purpose |
|------|---------|
| `index.html` | Entire app — UI + JS + inline styles (~895 lines) |
| `sw.js` | Service Worker — caches app shell for offline use |
| `manifest.json` | PWA config — name, icons, orientation |
| `Codigo.gs` | Google Apps Script backend — writes to Google Sheets |
| `clientes_maestro.json` | Client database — 473 records, 9 cities |
| `resumen_proyecto.md` | Project summary — keep in sync with actual code |

## Google Apps Script integration notes

- App sends data via `fetch(url)` where `url = CONFIG.SHEETS_API_URL + '?action=guardar&data=JSON'`
- This hits `doGet()` in `Codigo.gs`, which appends a 16-column row to "Auditorías" sheet
- Photos (base64) are stripped before sending to avoid URL size limits (~8000 chars safe)
- `doPost()` exists but is NOT used by the current app — `doGet` is the active endpoint
- `SPREADSHEET_ID` in `Codigo.gs` points to the live Google Sheet

## Cities covered (clientes_maestro.json)

Río Gallegos (320), Puerto San Julián (31), El Calafate (28), 28 de Noviembre (27),
Piedrabuena (25), Río Turbio (15), Gobernador Gregores (14), Puerto Santa Cruz (12),
El Chaltén (1)
