# src/expr/

Expression tree module for algebraic reduction.

## Files

- **tree.ts** — Core data types (`Expr = SymbolNode | OpNode`), redex detection
  (`isRedex`, `findRedexes`), tree reduction (`reduce`), and random expression
  generation (`randomExpr`). Pure logic, no DOM dependencies.
- **render.ts** — Renders an `Expr` tree to DOM elements with clickable redex
  targets. Uses a `WeakMap<HTMLElement, OpNode>` to map DOM spans back to tree
  nodes.
- **animate.ts** — 4-phase reduction animation: flash table cell, fly result
  symbol to redex position, collapse old redex, re-space.
- **properties.ts** — Property demo mode: `PropertyTemplate` registry mapping
  equation-based constraints to LHS/RHS expression builders, element finders
  (`findIdentity`, `findZero`), and `randomizePropertyVars` for generating
  concrete symbol assignments that pin special vars (identity/zero) to their
  discovered elements.

## Key concepts

- A **redex** is an `OpNode` where both children are `SymbolNode`s — the
  innermost reducible sub-expression.
- `reduce()` finds a target node by reference identity (`===`) and replaces it
  with the lookup result.
- `randomExpr(symbolCount, leafCount)` builds a tree by combining adjacent
  random leaves; 4–6 leaves gives 3–5 reduction steps.
