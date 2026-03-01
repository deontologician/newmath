# newmath

Browser-based tool for exploring algebraic structures. Given a set of
constraints (associativity, commutativity, identity, zero elements), the app
finds a binary operation table that satisfies them using the MiniZinc constraint
solver compiled to WASM via HiGHS.

## Technology

- **Vite + TypeScript** — frontend toolchain
- **MiniZinc + HiGHS** — constraint solver, runs in-browser via WASM
- **Zod** — runtime schema validation for solver inputs and outputs
- **Nix** — reproducible dev environment (`flake.nix`)

## Root-level files

- **index.html** — single-page app entry point; mounts `src/main.ts`
- **flake.nix** / **flake.lock** — Nix dev shell providing Node 22, MiniZinc,
  HiGHS, and claude-code
- **package.json** / **package-lock.json** — npm dependencies (vite, typescript,
  minizinc, zod); the `postinstall` script copies WASM files into `public/wasm/`
- **tsconfig.json** — strict TypeScript config targeting ES2022, bundler module
  resolution
- **.envrc** — direnv hook (`use flake`) to auto-enter the Nix shell

## Directories

- **src/** — application source: Vite scaffold entrypoints plus the
  `minizinc/` constraint-solver library
- **public/** — static assets served by Vite; `public/wasm/` holds the
  MiniZinc WASM runtime (gitignored, populated by `npm install`)
- **dist/** — build output (gitignored); produced by `npm run build`
- **node_modules/** — npm packages (gitignored)

## Common commands

```bash
# Enter the Nix dev shell first:
nix develop

# Start the dev server with hot reload:
npm run dev

# Type-check + production build:
npm run build

# Preview the production build locally:
npm run preview
```
