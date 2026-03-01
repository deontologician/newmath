import type { Expr, OpNode } from './tree.ts';
import { isRedex } from './tree.ts';
import { createSymbolEl, createOperatorEl } from '../symbols.ts';

export interface FlatRenderResult {
  element: HTMLElement;
  /** Maps each clickable operator element to the index of its left operand. */
  opIndexMap: WeakMap<HTMLElement, number>;
}

/**
 * Render a list of leaf symbol values as a flat expression with no parens.
 * Every operator between adjacent symbols is a clickable redex target.
 */
export function renderExprFlat(leaves: number[]): FlatRenderResult {
  const opIndexMap = new WeakMap<HTMLElement, number>();
  const root = document.createElement('span');
  root.className = 'expr-root';

  leaves.forEach((val, i) => {
    const sym = document.createElement('span');
    sym.className = 'expr-symbol';
    sym.appendChild(createSymbolEl(val));
    root.appendChild(sym);

    if (i < leaves.length - 1) {
      const opEl = document.createElement('span');
      opEl.className = 'expr-op flat-redex';
      opEl.tabIndex = 0;
      opEl.append(' ', createOperatorEl(), ' ');
      opIndexMap.set(opEl, i);
      root.appendChild(opEl);
    }
  });

  return { element: root, opIndexMap };
}

export interface RenderResult {
  element: HTMLElement;
  /** Maps DOM elements with class "redex-group" back to their OpNode. */
  nodeMap: WeakMap<HTMLElement, OpNode>;
}

/**
 * Render an Expr tree to a DOM span tree.
 * Redex groups (innermost reducible ops) get class="redex-group", tabindex,
 * and are registered in the returned WeakMap for click handling.
 */
export function renderExpr(expr: Expr): RenderResult {
  const nodeMap = new WeakMap<HTMLElement, OpNode>();
  const element = renderNode(expr, nodeMap);
  element.classList.add('expr-root');
  return { element, nodeMap };
}

function renderNode(expr: Expr, nodeMap: WeakMap<HTMLElement, OpNode>): HTMLElement {
  if (expr.kind === 'symbol') {
    const span = document.createElement('span');
    span.className = 'expr-symbol';
    span.appendChild(createSymbolEl(expr.value));
    return span;
  }

  const wrap = document.createElement('span');

  if (isRedex(expr)) {
    // Innermost reducible: make it clickable
    wrap.className = 'redex-group';
    wrap.tabIndex = 0;
    nodeMap.set(wrap, expr);

    const open = document.createElement('span');
    open.className = 'expr-paren';
    open.textContent = '(';

    const left = document.createElement('span');
    left.className = 'expr-symbol';
    left.appendChild(createSymbolEl(expr.left.value));

    const opSym = document.createElement('span');
    opSym.className = 'expr-op';
    opSym.append(' ', createOperatorEl(), ' ');

    const right = document.createElement('span');
    right.className = 'expr-symbol';
    right.appendChild(createSymbolEl(expr.right.value));

    const close = document.createElement('span');
    close.className = 'expr-paren';
    close.textContent = ')';

    wrap.append(open, left, opSym, right, close);
  } else {
    // Non-innermost op: render recursively with parens
    wrap.className = 'expr-group';

    const open = document.createElement('span');
    open.className = 'expr-paren';
    open.textContent = '(';

    const leftEl = renderNode(expr.left, nodeMap);

    const opSym = document.createElement('span');
    opSym.className = 'expr-op';
    opSym.append(' ', createOperatorEl(), ' ');

    const rightEl = renderNode(expr.right, nodeMap);

    const close = document.createElement('span');
    close.className = 'expr-paren';
    close.textContent = ')';

    wrap.append(open, leftEl, opSym, rightEl, close);
  }

  return wrap;
}
