import './style.css';
import type { Expr, OpNode } from './expr/tree.ts';
import { findRedexes, randomExpr, reduce, isRedex, sym, op } from './expr/tree.ts';
import { renderExpr, renderExprFlat } from './expr/render.ts';
import { animateReduction, animateFlatReduction } from './expr/animate.ts';
import type { OpTable } from './table/types.ts';
import { lookup, randomTable, fromSolverResult } from './table/types.ts';
import { renderTable } from './table/render.ts';
import { randomizeGlyphs, getGlyphState, setGlyphState } from './symbols.ts';
import { solve } from './minizinc/index.ts';
import type { ConstraintName } from './minizinc/index.ts';

const SYMBOL_COUNT = 4;

// --- Favorites (types + storage helpers, needed before initial glyph pick) ---

interface SavedMath {
  table: OpTable;
  constraints: ConstraintName[];
  glyphs: { symbols: number[]; operator: number | null };
}

const STORAGE_KEY = 'newmath-favorites';

function loadFavorites(): SavedMath[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeFavorites(favs: SavedMath[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

/** Collect all glyph IDs used by saved favorites so new math avoids them. */
function getFavoriteExclusions(): { symbols: Set<number>; operators: Set<number> } {
  const symbols = new Set<number>();
  const operators = new Set<number>();
  for (const fav of loadFavorites()) {
    for (const id of fav.glyphs.symbols) symbols.add(id);
    if (fav.glyphs.operator !== null) operators.add(fav.glyphs.operator);
  }
  return { symbols, operators };
}

// ---

/** Extract leaf symbol values in left-to-right order. */
function flattenLeaves(expr: Expr): number[] {
  if (expr.kind === 'symbol') return [expr.value];
  return [...flattenLeaves(expr.left), ...flattenLeaves(expr.right)];
}

/** Rebuild a left-leaning tree from leaf values. */
function leavesToTree(values: number[]): Expr {
  let tree: Expr = sym(values[0]);
  for (let i = 1; i < values.length; i++) {
    tree = op(tree, sym(values[i]));
  }
  return tree;
}

interface AppState {
  table: OpTable;
  expr: Expr;
  originalExpr: Expr;
  reducedSymbol: Expr | null;
  animating: boolean;
  selectedConstraints: Set<ConstraintName>;
  solving: boolean;
}

randomizeGlyphs(SYMBOL_COUNT, getFavoriteExclusions());

const initialExpr = randomExpr(SYMBOL_COUNT, 5);
const state: AppState = {
  table: randomTable(SYMBOL_COUNT),
  expr: initialExpr,
  originalExpr: initialExpr,
  reducedSymbol: null,
  animating: false,
  selectedConstraints: new Set(),
  solving: false,
};

const tableContainer = document.getElementById('table-container')!;
const activeConstraintsEl = document.getElementById('active-constraints')!;
const exprContainer = document.getElementById('expr-container')!;
const newExprBtn = document.getElementById('new-expr-btn')!;
const newTableBtn = document.getElementById('new-table-btn')!;
const solverMessage = document.getElementById('solver-message')!;
const constraintToggles = document.querySelectorAll<HTMLButtonElement>('.constraint-toggle');

// Build label map from the toggle buttons
const constraintLabels = new Map<ConstraintName, string>();
for (const btn of constraintToggles) {
  constraintLabels.set(
    btn.dataset.constraint as ConstraintName,
    btn.textContent!.trim(),
  );
}

function renderAll() {
  renderTableView();
  renderExprView();
}

function renderTableView() {
  tableContainer.innerHTML = '';
  tableContainer.appendChild(renderTable(state.table));

  activeConstraintsEl.innerHTML = '';
  if (state.selectedConstraints.size === 0) return;

  for (const name of state.selectedConstraints) {
    const label = constraintLabels.get(name);
    if (!label) continue;
    const el = document.createElement('div');
    el.className = 'active-constraint';
    el.textContent = label;
    activeConstraintsEl.appendChild(el);
  }
}

function appendEquationSuffix(element: HTMLElement) {
  if (!state.reducedSymbol) return;
  element.classList.add('expr-complete');

  const eq = document.createElement('span');
  eq.className = 'expr-equation-lhs expr-op';
  eq.textContent = ' = ';

  const { element: resultEl } = renderExpr(state.reducedSymbol);
  resultEl.classList.remove('expr-root');

  element.append(eq, resultEl);
}

function renderExprView() {
  exprContainer.innerHTML = '';

  // When fully reduced, reset to original for replay
  if (state.expr.kind === 'symbol' && state.reducedSymbol) {
    state.expr = state.originalExpr;
    newExprBtn.classList.add('btn-pulse');
    newTableBtn.classList.add('btn-pulse');
  }

  const associative = state.selectedConstraints.has('associativity');

  // Flat rendering for associative operations: every adjacent pair is reducible
  if (associative) {
    const leaves = flattenLeaves(state.expr);
    const { element, opIndexMap } = renderExprFlat(leaves);

    appendEquationSuffix(element);
    exprContainer.appendChild(element);

    // Each operator is a click target that reduces the pair around it
    const flatOps = element.querySelectorAll('.flat-redex');
    for (const el of flatOps) {
      const htmlEl = el as HTMLElement;
      const idx = opIndexMap.get(htmlEl);
      if (idx === undefined) continue;

      const handler = () => {
        if (state.animating || state.solving) return;
        state.animating = true;

        animateFlatReduction(htmlEl, leaves[idx], leaves[idx + 1], state.table, () => {
          const result = lookup(state.table, leaves[idx], leaves[idx + 1]);
          const newLeaves = [...leaves];
          newLeaves.splice(idx, 2, result);
          if (newLeaves.length === 1) {
            state.reducedSymbol = sym(newLeaves[0]);
          }
          state.expr = leavesToTree(newLeaves);
          state.animating = false;
          renderExprView();
        });
      };

      htmlEl.addEventListener('click', handler);
      htmlEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    }
    return;
  }

  // Tree rendering for non-associative operations
  const { element, nodeMap } = renderExpr(state.expr);

  appendEquationSuffix(element);
  exprContainer.appendChild(element);

  // Attach click handlers to redex groups
  const redexEls = element.matches('.redex-group')
    ? [element, ...element.querySelectorAll('.redex-group')]
    : element.querySelectorAll('.redex-group');

  for (const el of redexEls) {
    const htmlEl = el as HTMLElement;
    const node = nodeMap.get(htmlEl);
    if (!node) continue;

    const handler = () => {
      if (state.animating || state.solving) return;
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
    const reduced = reduce(state.expr, target, (l, r) => lookup(state.table, l, r));
    if (reduced.kind === 'symbol') {
      state.reducedSymbol = reduced;
    }
    state.expr = reduced;
    state.animating = false;
    renderExprView();
  });
}

function showSolverMessage(text: string) {
  solverMessage.textContent = text;
  solverMessage.classList.remove('visible');
  // Force reflow to restart animation
  void solverMessage.offsetWidth;
  solverMessage.classList.add('visible');
}

function setSolving(active: boolean) {
  state.solving = active;
  newTableBtn.textContent = active ? 'solving…' : 'New Math';
  newTableBtn.classList.toggle('solving', active);
  for (const btn of constraintToggles) {
    btn.disabled = active;
  }
}

// Constraint toggle handlers
for (const btn of constraintToggles) {
  btn.addEventListener('click', () => {
    if (state.solving) return;
    const name = btn.dataset.constraint as ConstraintName;
    if (state.selectedConstraints.has(name)) {
      state.selectedConstraints.delete(name);
      btn.classList.remove('active');
    } else {
      state.selectedConstraints.add(name);
      btn.classList.add('active');
    }
    // Nudge the New Math button to signal "regenerate to apply"
    newTableBtn.classList.remove('nudge');
    void newTableBtn.offsetWidth;
    newTableBtn.classList.add('nudge');
  });
}

newExprBtn.addEventListener('click', () => {
  if (state.animating || state.solving) return;
  const e = randomExpr(SYMBOL_COUNT, 5);
  state.expr = e;
  state.originalExpr = e;
  state.reducedSymbol = null;
  newExprBtn.classList.remove('btn-pulse');
  newTableBtn.classList.remove('btn-pulse');
  renderExprView();
});

newTableBtn.addEventListener('click', async () => {
  if (state.animating || state.solving) return;

  newExprBtn.classList.remove('btn-pulse');
  newTableBtn.classList.remove('btn-pulse');
  randomizeGlyphs(SYMBOL_COUNT, getFavoriteExclusions());

  setSolving(true);
  try {
    const result = await solve({
      symbolCount: SYMBOL_COUNT,
      constraints: [...state.selectedConstraints, 'diversity'],
    });
    state.table = fromSolverResult(result.op);
    const e2 = randomExpr(SYMBOL_COUNT, 5);
    state.expr = e2;
    state.originalExpr = e2;
    state.reducedSymbol = null;
    ensureReducible();
    renderAll();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Solver error';
    showSolverMessage(msg);
  } finally {
    setSolving(false);
  }
});

// Ensure the expression always has at least one redex to start
function ensureReducible() {
  let attempts = 0;
  while (findRedexes(state.expr).length === 0 && attempts < 20) {
    const e = randomExpr(SYMBOL_COUNT, 5);
    state.expr = e;
    state.originalExpr = e;
    attempts++;
  }
}

// --- Favorites (UI) ---

const saveBtn = document.getElementById('save-btn')!;
const favoritesContainer = document.getElementById('favorites')!;

function renderFavorites(): void {
  const favs = loadFavorites();
  favoritesContainer.innerHTML = '';
  if (favs.length === 0) return;

  const label = document.createElement('span');
  label.className = 'favorites-label';
  label.textContent = 'saved';
  favoritesContainer.appendChild(label);

  const list = document.createElement('div');
  list.className = 'favorites-list';

  favs.forEach((fav, i) => {
    const item = document.createElement('div');
    item.className = 'favorite-item';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'favorite-load';

    // Operator glyph
    if (fav.glyphs.operator !== null) {
      const opImg = document.createElement('img');
      opImg.src = `/operators/${String(fav.glyphs.operator).padStart(4, '0')}.webp`;
      opImg.className = 'favorite-glyph favorite-op-glyph';
      opImg.draggable = false;
      loadBtn.appendChild(opImg);
    }

    // Set notation: { sym1, sym2, ... }
    const setText = (t: string) => {
      const span = document.createElement('span');
      span.className = 'favorite-set-punct';
      span.textContent = t;
      loadBtn.appendChild(span);
    };
    setText('{ ');
    fav.glyphs.symbols.forEach((id, j) => {
      if (j > 0) setText(', ');
      const img = document.createElement('img');
      img.src = `/symbols/${String(id).padStart(4, '0')}.webp`;
      img.className = 'favorite-glyph';
      img.draggable = false;
      loadBtn.appendChild(img);
    });
    setText(' }');
    loadBtn.addEventListener('click', () => {
      if (state.animating || state.solving) return;
      setGlyphState(fav.glyphs);
      state.table = fav.table;
      const e = randomExpr(fav.table.size, 5);
      state.expr = e;
      state.originalExpr = e;
      state.reducedSymbol = null;
      // Restore constraint toggles
      state.selectedConstraints = new Set(fav.constraints);
      for (const btn of constraintToggles) {
        const name = btn.dataset.constraint as ConstraintName;
        btn.classList.toggle('active', state.selectedConstraints.has(name));
      }
      newExprBtn.classList.remove('btn-pulse');
      newTableBtn.classList.remove('btn-pulse');
      ensureReducible();
      renderAll();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'favorite-delete';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      const f = loadFavorites();
      f.splice(i, 1);
      storeFavorites(f);
      renderFavorites();
    });

    item.append(loadBtn, delBtn);
    list.appendChild(item);
  });

  favoritesContainer.appendChild(list);
}

saveBtn.addEventListener('click', () => {
  if (state.animating || state.solving) return;
  const favs = loadFavorites();
  favs.push({
    table: state.table,
    constraints: [...state.selectedConstraints],
    glyphs: getGlyphState(),
  });
  storeFavorites(favs);
  renderFavorites();
  // Brief feedback
  saveBtn.textContent = 'Saved!';
  setTimeout(() => { saveBtn.textContent = 'Save'; }, 1000);
});

ensureReducible();
renderAll();
renderFavorites();
