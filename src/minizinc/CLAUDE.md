# src/minizinc/

MiniZinc constraint templating pipeline. Generates MiniZinc models from a
typed configuration and solves them in-browser via WASM.

## Files

- **schema.ts** — Zod schemas and inferred TypeScript types: `ConstraintName`
  (enum of supported constraint identifiers), `SolverConfig` (solver input), and
  `SolverResult` (solver output). Types are inferred from schemas — no duplicate
  definitions.
- **constraints.ts** — Registry mapping constraint names to MiniZinc text.
  Each entry has a `description` (human-readable) and `mzn` (MiniZinc code).
- **generate.ts** — `generateMzn(config)` composes a complete `.mzn` string
  from the preamble, selected constraints, solve statement, and output block.
- **solve.ts** — `solve(config)` runs the WASM solver and returns a single
  validated result. `solveAll(config)` collects all solutions.
- **index.ts** — Barrel re-export.

## Adding a new constraint

1. Add the name to the `ConstraintName` enum in `schema.ts`
2. Add the entry to `constraintRegistry` in `constraints.ts` with
   `description` and `mzn` fields
3. The generator and solver pick it up automatically

## Example usage

```typescript
// From src/main.ts (one level up):
import { solve } from './minizinc';

const result = await solve({
  symbolCount: 3,
  constraints: ['associativity', 'rightZero'],
});
console.log(result.op); // e.g. [[1,2,1],[1,2,1],[1,2,1]]
```

## WASM files

The `minizinc` npm package needs three files served from `public/wasm/`:
`minizinc-worker.js`, `minizinc.wasm`, `minizinc.data`. These are copied
automatically by the `postinstall` script in `package.json`.
