import './style.css';
import type { Expr, OpNode } from './expr/tree.ts';
import { findRedexes, randomExpr, reduce, isRedex } from './expr/tree.ts';
import { renderExpr } from './expr/render.ts';
import { animateReduction } from './expr/animate.ts';
import type { OpTable } from './table/types.ts';
import { lookup, randomTable } from './table/types.ts';
import { renderTable } from './table/render.ts';

interface AppState {
  table: OpTable;
  expr: Expr;
  animating: boolean;
}

const state: AppState = {
  table: randomTable(3),
  expr: randomExpr(3, 5),
  animating: false,
};

const tableContainer = document.getElementById('table-container')!;
const exprContainer = document.getElementById('expr-container')!;
const newExprBtn = document.getElementById('new-expr-btn')!;
const newTableBtn = document.getElementById('new-table-btn')!;

function renderAll() {
  renderTableView();
  renderExprView();
}

function renderTableView() {
  tableContainer.innerHTML = '';
  tableContainer.appendChild(renderTable(state.table));
}

function renderExprView() {
  exprContainer.innerHTML = '';

  // Check if expression is fully reduced (single symbol)
  if (state.expr.kind === 'symbol') {
    const { element } = renderExpr(state.expr);
    element.classList.add('expr-complete');
    exprContainer.appendChild(element);
    return;
  }

  const { element, nodeMap } = renderExpr(state.expr);
  exprContainer.appendChild(element);

  // Attach click handlers to redex groups
  const redexEls = element.querySelectorAll('.redex-group');
  for (const el of redexEls) {
    const htmlEl = el as HTMLElement;
    const node = nodeMap.get(htmlEl);
    if (!node) continue;

    const handler = () => {
      if (state.animating) return;
      if (!isRedex(node)) return;
      handleRedexClick(htmlEl, node);
    };

    htmlEl.addEventListener('click', handler);
    htmlEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  }
}

function handleRedexClick(
  el: HTMLElement,
  target: OpNode & { left: { kind: 'symbol'; value: number }; right: { kind: 'symbol'; value: number } },
) {
  state.animating = true;

  animateReduction(el, target, state.table, () => {
    state.expr = reduce(state.expr, target, (l, r) => lookup(state.table, l, r));
    state.animating = false;
    renderExprView();
  });
}

newExprBtn.addEventListener('click', () => {
  if (state.animating) return;
  state.expr = randomExpr(3, 5);
  renderExprView();
});

newTableBtn.addEventListener('click', () => {
  if (state.animating) return;
  state.table = randomTable(3);
  state.expr = randomExpr(3, 5);
  renderAll();
});

// Ensure the expression always has at least one redex to start
function ensureReducible() {
  let attempts = 0;
  while (findRedexes(state.expr).length === 0 && attempts < 20) {
    state.expr = randomExpr(3, 5);
    attempts++;
  }
}

ensureReducible();
renderAll();
