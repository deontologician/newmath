export interface SymbolNode {
  kind: 'symbol';
  value: number;
}

export interface OpNode {
  kind: 'op';
  left: Expr;
  right: Expr;
}

export type Expr = SymbolNode | OpNode;

export function sym(value: number): SymbolNode {
  return { kind: 'symbol', value };
}

export function op(left: Expr, right: Expr): OpNode {
  return { kind: 'op', left, right };
}

/** A redex is an OpNode whose children are both SymbolNodes. */
export function isRedex(node: Expr): node is OpNode & { left: SymbolNode; right: SymbolNode } {
  return node.kind === 'op' && node.left.kind === 'symbol' && node.right.kind === 'symbol';
}

/** Find all redexes (innermost binary ops) in the tree. */
export function findRedexes(expr: Expr): OpNode[] {
  if (expr.kind === 'symbol') return [];
  if (isRedex(expr)) return [expr];
  return [...findRedexes(expr.left), ...findRedexes(expr.right)];
}

/**
 * Reduce the tree by replacing `target` (found by reference identity)
 * with the result of looking up the operation in the table.
 */
export function reduce(
  expr: Expr,
  target: OpNode,
  lookup: (left: number, right: number) => number,
): Expr {
  if (expr === target && isRedex(expr)) {
    return sym(lookup(expr.left.value, expr.right.value));
  }
  if (expr.kind === 'symbol') return expr;
  const left = reduce(expr.left, target, lookup);
  const right = reduce(expr.right, target, lookup);
  if (left === expr.left && right === expr.right) return expr;
  return op(left, right);
}

/**
 * Build a random expression tree.
 * `symbolCount` — number of distinct symbols (e.g. 3 for {0,1,2})
 * `leafCount` — total leaves; gives leafCount-1 reduction steps.
 * Strategy: start with `leafCount` random leaves, repeatedly combine
 * two adjacent leaves into an op node at a random position.
 */
export function randomExpr(symbolCount: number, leafCount: number): Expr {
  const leaves: Expr[] = [];
  for (let i = 0; i < leafCount; i++) {
    leaves.push(sym(Math.floor(Math.random() * symbolCount)));
  }
  while (leaves.length > 1) {
    const i = Math.floor(Math.random() * (leaves.length - 1));
    const combined = op(leaves[i], leaves[i + 1]);
    leaves.splice(i, 2, combined);
  }
  return leaves[0];
}
