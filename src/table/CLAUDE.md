# src/table/

Operation table module for binary algebraic operations.

## Files

- **types.ts** — `OpTable` type (size + 0-indexed 2D cell array), `lookup`
  function, `randomTable` generator, and `fromSolverResult` converter that
  translates the MiniZinc solver's 1-indexed output to 0-indexed.
- **render.ts** — Renders an `OpTable` to a DOM `<table>` element with colored
  symbol cells. Each cell gets `id="cell-{row}-{col}"` for animation targeting
  and `data-value` for CSS color rules.
