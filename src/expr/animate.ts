import type { OpNode } from './tree.ts';
import type { OpTable } from '../table/types.ts';
import { createSymbolEl } from '../symbols.ts';
import { lookup } from '../table/types.ts';

/**
 * Reduction animation showing a table lookup:
 * 1. Fly operands — left operand flies to its row header, right to column header
 * 2. Highlight — entire row and column light up, crosshair-style
 * 3. Cell flash — intersection cell pulses to reveal the result
 * 4. Fly result — result symbol flies from the cell back to the redex
 * 5. Unhighlight — row/column fade back to normal
 * 6. Swap + shrink — redex is replaced with the result, wrapper shrinks
 */
export async function animateReduction(
  redexEl: HTMLElement,
  target: OpNode & { left: { kind: 'symbol'; value: number }; right: { kind: 'symbol'; value: number } },
  table: OpTable,
  onComplete: () => void,
): Promise<void> {
  const leftVal = target.left.value;
  const rightVal = target.right.value;
  const resultVal = table.cells[leftVal][rightVal];

  const cellEl = document.getElementById(`cell-${leftVal}-${rightVal}`);
  const rowHeaderEl = document.getElementById(`row-header-${leftVal}`);
  const colHeaderEl = document.getElementById(`col-header-${rightVal}`);
  if (!cellEl || !rowHeaderEl || !colHeaderEl) {
    onComplete();
    return;
  }

  // Collect all cells in the target row and column for highlighting
  const tableEl = cellEl.closest('table')!;
  const rowCells = Array.from(
    tableEl.querySelectorAll<HTMLElement>(`td[data-row="${leftVal}"], th#row-header-${leftVal}`),
  );
  const colCells = Array.from(
    tableEl.querySelectorAll<HTMLElement>(`td[data-col="${rightVal}"], th#col-header-${rightVal}`),
  );

  // Find the left and right symbol spans inside the redex.
  // Structure is: (paren) (left-symbol) (op) (right-symbol) (paren)
  const children = redexEl.children;
  const leftSymEl = children[1] as HTMLElement;
  const rightSymEl = children[3] as HTMLElement;

  // Phase 1: Fly operands to their headers (450ms)
  const leftRect = leftSymEl.getBoundingClientRect();
  const rightRect = rightSymEl.getBoundingClientRect();
  const rowHeaderRect = rowHeaderEl.getBoundingClientRect();
  const colHeaderRect = colHeaderEl.getBoundingClientRect();

  const leftFlyer = createFlyer(leftVal);
  const rightFlyer = createFlyer(rightVal);

  await Promise.all([
    flyBetween(leftFlyer, leftRect, rowHeaderRect, 450),
    flyBetween(rightFlyer, rightRect, colHeaderRect, 450),
  ]);

  leftFlyer.remove();
  rightFlyer.remove();

  // Phase 2: Highlight entire row and column
  rowHeaderEl.classList.add('lookup-highlight-header');
  colHeaderEl.classList.add('lookup-highlight-header');
  for (const el of rowCells) el.classList.add('lookup-highlight');
  for (const el of colCells) el.classList.add('lookup-highlight');

  await wait(250);

  // Phase 3: Cell flash at the intersection (400ms)
  cellEl.classList.add('cell-flash');
  await wait(400);
  cellEl.classList.remove('cell-flash');

  await wait(100);

  // Phase 4: Fly result from cell to redex (450ms)
  const cellRect = cellEl.getBoundingClientRect();
  const redexRect = redexEl.getBoundingClientRect();

  const resultFlyer = createFlyer(resultVal);

  await flyBetween(resultFlyer, cellRect, redexRect, 450);
  resultFlyer.remove();

  // Phase 5: Remove highlights
  rowHeaderEl.classList.remove('lookup-highlight-header');
  colHeaderEl.classList.remove('lookup-highlight-header');
  for (const el of rowCells) el.classList.remove('lookup-highlight');
  for (const el of colCells) el.classList.remove('lookup-highlight');

  // Phase 6: Swap redex contents with result, then shrink wrapper
  const startWidth = redexEl.getBoundingClientRect().width;

  redexEl.style.display = 'inline-block';
  redexEl.style.width = `${startWidth}px`;
  redexEl.style.overflow = 'hidden';
  redexEl.style.whiteSpace = 'nowrap';
  redexEl.style.verticalAlign = 'baseline';

  redexEl.textContent = '';
  const resultSpan = document.createElement('span');
  resultSpan.className = 'expr-symbol';
  resultSpan.appendChild(createSymbolEl(resultVal));
  redexEl.appendChild(resultSpan);

  const endWidth = resultSpan.getBoundingClientRect().width;

  await redexEl.animate([
    { width: `${startWidth}px` },
    { width: `${endWidth}px` },
  ], { duration: 400, easing: 'ease-in-out', fill: 'forwards' }).finished;

  redexEl.style.cssText = '';
  onComplete();
}

function createFlyer(symbolIndex: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'flyer';
  el.appendChild(createSymbolEl(symbolIndex));
  el.style.position = 'fixed';
  el.style.zIndex = '1000';
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(el);
  return el;
}

function flyBetween(
  flyer: HTMLElement,
  from: DOMRect,
  to: DOMRect,
  duration: number,
): Promise<void> {
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height / 2;

  const img = flyer.querySelector('.symbol-glyph') as HTMLElement | null;
  const fromH = from.height;
  const toH = to.height;

  const keyframes: Keyframe[] = [
    { left: `${fromX}px`, top: `${fromY}px`, opacity: 1 },
    { left: `${toX}px`, top: `${toY}px`, opacity: 1 },
  ];

  const promises: Promise<void>[] = [
    flyer.animate(keyframes, { duration, easing: 'ease-in-out', fill: 'forwards' })
      .finished.then(() => {}),
  ];

  if (img && fromH !== toH) {
    promises.push(
      img.animate([
        { height: `${fromH}px` },
        { height: `${toH}px` },
      ], { duration, easing: 'ease-in-out', fill: 'forwards' })
        .finished.then(() => {}),
    );
  }

  return Promise.all(promises).then(() => {});
}

/**
 * Animate a flat-redex reduction (associative mode).
 * The opEl is the operator span between two adjacent symbol spans.
 * Performs the same 6-phase table lookup animation as animateReduction.
 */
export async function animateFlatReduction(
  opEl: HTMLElement,
  leftVal: number,
  rightVal: number,
  table: OpTable,
  onComplete: () => void,
): Promise<void> {
  const resultVal = lookup(table, leftVal, rightVal);

  const cellEl = document.getElementById(`cell-${leftVal}-${rightVal}`);
  const rowHeaderEl = document.getElementById(`row-header-${leftVal}`);
  const colHeaderEl = document.getElementById(`col-header-${rightVal}`);
  if (!cellEl || !rowHeaderEl || !colHeaderEl) {
    onComplete();
    return;
  }

  const tableEl = cellEl.closest('table')!;
  const rowCells = Array.from(
    tableEl.querySelectorAll<HTMLElement>(`td[data-row="${leftVal}"], th#row-header-${leftVal}`),
  );
  const colCells = Array.from(
    tableEl.querySelectorAll<HTMLElement>(`td[data-col="${rightVal}"], th#col-header-${rightVal}`),
  );

  // Adjacent siblings: previous is left symbol, next is right symbol
  const leftSymEl = opEl.previousElementSibling as HTMLElement;
  const rightSymEl = opEl.nextElementSibling as HTMLElement;

  // Phase 1: Fly operands to their headers (450ms)
  const leftRect = leftSymEl.getBoundingClientRect();
  const rightRect = rightSymEl.getBoundingClientRect();
  const rowHeaderRect = rowHeaderEl.getBoundingClientRect();
  const colHeaderRect = colHeaderEl.getBoundingClientRect();

  const leftFlyer = createFlyer(leftVal);
  const rightFlyer = createFlyer(rightVal);

  await Promise.all([
    flyBetween(leftFlyer, leftRect, rowHeaderRect, 450),
    flyBetween(rightFlyer, rightRect, colHeaderRect, 450),
  ]);

  leftFlyer.remove();
  rightFlyer.remove();

  // Phase 2: Highlight entire row and column
  rowHeaderEl.classList.add('lookup-highlight-header');
  colHeaderEl.classList.add('lookup-highlight-header');
  for (const el of rowCells) el.classList.add('lookup-highlight');
  for (const el of colCells) el.classList.add('lookup-highlight');

  await wait(250);

  // Phase 3: Cell flash at the intersection (400ms)
  cellEl.classList.add('cell-flash');
  await wait(400);
  cellEl.classList.remove('cell-flash');

  await wait(100);

  // Phase 4: Fly result from cell back to the operator position (450ms)
  const cellRect = cellEl.getBoundingClientRect();
  const opRect = opEl.getBoundingClientRect();

  const resultFlyer = createFlyer(resultVal);

  await flyBetween(resultFlyer, cellRect, opRect, 450);
  resultFlyer.remove();

  // Phase 5: Remove highlights
  rowHeaderEl.classList.remove('lookup-highlight-header');
  colHeaderEl.classList.remove('lookup-highlight-header');
  for (const el of rowCells) el.classList.remove('lookup-highlight');
  for (const el of colCells) el.classList.remove('lookup-highlight');

  // Phase 6: Collapse — measure the trio (left + op + right), replace with result, shrink
  const parent = opEl.parentElement!;
  const trioLeft = leftSymEl.getBoundingClientRect().left;
  const trioRight = rightSymEl.getBoundingClientRect().right;
  const startWidth = trioRight - trioLeft;

  // Wrap the three elements in a temporary inline-block for shrink animation
  const wrapper = document.createElement('span');
  wrapper.style.display = 'inline-block';
  wrapper.style.width = `${startWidth}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.whiteSpace = 'nowrap';
  wrapper.style.verticalAlign = 'baseline';

  parent.insertBefore(wrapper, leftSymEl);
  wrapper.append(leftSymEl, opEl, rightSymEl);

  // Replace content with result symbol
  wrapper.textContent = '';
  const resultSpan = document.createElement('span');
  resultSpan.className = 'expr-symbol';
  resultSpan.appendChild(createSymbolEl(resultVal));
  wrapper.appendChild(resultSpan);

  const endWidth = resultSpan.getBoundingClientRect().width;

  await wrapper.animate([
    { width: `${startWidth}px` },
    { width: `${endWidth}px` },
  ], { duration: 400, easing: 'ease-in-out', fill: 'forwards' }).finished;

  wrapper.style.cssText = '';

  onComplete();
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
