import type { Expr } from './tree.ts';
import { sym, op } from './tree.ts';
import type { OpTable } from '../table/types.ts';
import type { ConstraintName } from '../minizinc/index.ts';

export interface PropertyTemplate {
  varCount: number;
  specialVars?: { index: number; kind: 'identity' | 'zero' }[];
  build: (vars: number[]) => { lhs: Expr; rhs: Expr };
}

export const propertyTemplates: Partial<Record<ConstraintName, PropertyTemplate>> = {
  associativity: {
    varCount: 3,
    build: ([a, b, c]) => ({
      lhs: op(op(sym(a), sym(b)), sym(c)),
      rhs: op(sym(a), op(sym(b), sym(c))),
    }),
  },
  commutativity: {
    varCount: 2,
    build: ([a, b]) => ({
      lhs: op(sym(a), sym(b)),
      rhs: op(sym(b), sym(a)),
    }),
  },
  leftIdentity: {
    varCount: 2,
    specialVars: [{ index: 0, kind: 'identity' }],
    build: ([e, a]) => ({
      lhs: op(sym(e), sym(a)),
      rhs: sym(a),
    }),
  },
  rightIdentity: {
    varCount: 2,
    specialVars: [{ index: 0, kind: 'identity' }],
    build: ([e, a]) => ({
      lhs: op(sym(a), sym(e)),
      rhs: sym(a),
    }),
  },
  leftZero: {
    varCount: 2,
    specialVars: [{ index: 0, kind: 'zero' }],
    build: ([z, a]) => ({
      lhs: op(sym(z), sym(a)),
      rhs: sym(z),
    }),
  },
  rightZero: {
    varCount: 2,
    specialVars: [{ index: 0, kind: 'zero' }],
    build: ([z, a]) => ({
      lhs: op(sym(a), sym(z)),
      rhs: sym(z),
    }),
  },
  idempotent: {
    varCount: 1,
    build: ([a]) => ({
      lhs: op(sym(a), sym(a)),
      rhs: sym(a),
    }),
  },
  medial: {
    varCount: 4,
    build: ([a, b, c, d]) => ({
      lhs: op(op(sym(a), sym(b)), op(sym(c), sym(d))),
      rhs: op(op(sym(a), sym(c)), op(sym(b), sym(d))),
    }),
  },
  leftDistributive: {
    varCount: 3,
    build: ([a, b, c]) => ({
      lhs: op(sym(a), op(sym(b), sym(c))),
      rhs: op(op(sym(a), sym(b)), op(sym(a), sym(c))),
    }),
  },
  rightDistributive: {
    varCount: 3,
    build: ([a, b, c]) => ({
      lhs: op(op(sym(b), sym(c)), sym(a)),
      rhs: op(op(sym(b), sym(a)), op(sym(c), sym(a))),
    }),
  },
};

export function findIdentity(table: OpTable, side: 'left' | 'right'): number | null {
  for (let e = 0; e < table.size; e++) {
    let works = true;
    for (let a = 0; a < table.size; a++) {
      const result = side === 'left' ? table.cells[e][a] : table.cells[a][e];
      if (result !== a) { works = false; break; }
    }
    if (works) return e;
  }
  return null;
}

export function findZero(table: OpTable, side: 'left' | 'right'): number | null {
  for (let z = 0; z < table.size; z++) {
    let works = true;
    for (let a = 0; a < table.size; a++) {
      const result = side === 'left' ? table.cells[z][a] : table.cells[a][z];
      if (result !== z) { works = false; break; }
    }
    if (works) return z;
  }
  return null;
}

export function randomizePropertyVars(
  template: PropertyTemplate,
  symbolCount: number,
  table: OpTable,
  constraint: ConstraintName,
): number[] {
  const vars: number[] = [];
  for (let i = 0; i < template.varCount; i++) {
    vars.push(Math.floor(Math.random() * symbolCount));
  }

  if (template.specialVars) {
    for (const sv of template.specialVars) {
      let element: number | null = null;
      if (sv.kind === 'identity') {
        const side = constraint.startsWith('left') ? 'left' : 'right';
        element = findIdentity(table, side);
      } else if (sv.kind === 'zero') {
        const side = constraint.startsWith('left') ? 'left' : 'right';
        element = findZero(table, side);
      }
      if (element !== null) {
        vars[sv.index] = element;
      }
    }
  }

  return vars;
}
