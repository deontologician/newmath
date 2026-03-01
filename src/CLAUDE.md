# src/

Application source directory. Contains the interactive redex reduction UI
and the `minizinc/` constraint-solver library.

## Files

- **main.ts** — Application entry point. Manages app state (OpTable + Expr),
  wires up rendering, click handlers for redex reduction with animation, and
  "New Expression" / "New Table" buttons.
- **style.css** — Global stylesheet. True black background, Cormorant Garamond
  font, CSS Grid layout (table left, expression right), redex hover glow,
  cell flash animation, flying symbol styles, completion glow. Responsive
  layout stacks vertically on narrow viewports.
- **symbols.ts** — Symbol display names (X, Y, Z), colors (red, teal, gold),
  and the binary operation symbol (○).
- **associative_right_zero.mzn** — Standalone MiniZinc model for CLI
  experimentation; not imported by any TypeScript source.

## Subdirectories

- **expr/** — Expression tree: types, redex detection, reduction, rendering,
  and animation. See `expr/CLAUDE.md`.
- **table/** — Operation table: types, lookup, random generation, rendering.
  See `table/CLAUDE.md`.
- **minizinc/** — Typed constraint-templating pipeline: Zod schemas, constraint
  registry, MiniZinc model generator, and WASM solver wrapper. See
  `minizinc/CLAUDE.md`.

## Running the MiniZinc model from the CLI

The `.mzn` file can be solved directly from the Nix dev shell (no browser
needed):

```bash
nix develop
minizinc src/associative_right_zero.mzn
```
