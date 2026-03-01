# public/

Static assets served by Vite at the root URL path. Files here are copied
verbatim into `dist/` on build and are accessible as `/filename` in the browser.

## Files

- **vite.svg** — Vite logo SVG, used by the scaffold UI in `src/main.ts`.

## Subdirectory

- **wasm/** — MiniZinc WASM runtime files required by the in-browser solver.
  This directory is **gitignored** and must be populated before running the dev
  server or building. It is created automatically by `npm install` via the
  `postinstall` script in `package.json`, which copies three files from
  `node_modules/minizinc/dist/`:
  - `minizinc-worker.js`
  - `minizinc.wasm`
  - `minizinc.data`

  If the wasm files are missing (e.g., after a fresh clone without running
  `npm install`), re-run:

  ```bash
  npm install
  ```
