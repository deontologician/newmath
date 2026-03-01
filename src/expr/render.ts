import type { Expr, OpNode } from './tree.ts';
import { isRedex } from './tree.ts';
import { SYMBOL_NAMES, SYMBOL_COLORS, OP_SYMBOL } from '../symbols.ts';

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
  element.className = 'expr-root';
  return { element, nodeMap };
}

function renderNode(expr: Expr, nodeMap: WeakMap<HTMLElement, OpNode>): HTMLElement {
  if (expr.kind === 'symbol') {
    const span = document.createElement('span');
    span.className = 'expr-symbol';
    span.textContent = SYMBOL_NAMES[expr.value];
    span.style.color = SYMBOL_COLORS[expr.value];
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
    left.textContent = SYMBOL_NAMES[expr.left.value];
    left.style.color = SYMBOL_COLORS[expr.left.value];

    const opSym = document.createElement('span');
    opSym.className = 'expr-op';
    opSym.textContent = ` ${OP_SYMBOL} `;

    const right = document.createElement('span');
    right.className = 'expr-symbol';
    right.textContent = SYMBOL_NAMES[expr.right.value];
    right.style.color = SYMBOL_COLORS[expr.right.value];

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
    opSym.textContent = ` ${OP_SYMBOL} `;

    const rightEl = renderNode(expr.right, nodeMap);

    const close = document.createElement('span');
    close.className = 'expr-paren';
    close.textContent = ')';

    wrap.append(open, leftEl, opSym, rightEl, close);
  }

  return wrap;
}
