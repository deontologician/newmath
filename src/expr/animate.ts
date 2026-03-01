import type { OpNode } from './tree.ts';
import type { OpTable } from '../table/types.ts';
import { SYMBOL_NAMES, SYMBOL_COLORS } from '../symbols.ts';

/**
 * 4-phase reduction animation:
 * 1. Flash — table cell scales up + glows
 * 2. Fly — clone of result symbol flies from table cell to redex position
 * 3. Collapse — redex group shrinks, result fades in
 * 4. Re-space — clean up, call onComplete to re-render
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
  if (!cellEl) {
    onComplete();
    return;
  }

  // Phase 1: Flash the table cell (200ms)
  cellEl.classList.add('cell-flash');
  await wait(200);
  cellEl.classList.remove('cell-flash');

  // Phase 2: Fly a clone from cell to redex (400ms)
  const cellRect = cellEl.getBoundingClientRect();
  const redexRect = redexEl.getBoundingClientRect();

  const flyer = document.createElement('span');
  flyer.className = 'flyer';
  flyer.textContent = SYMBOL_NAMES[resultVal];
  flyer.style.color = SYMBOL_COLORS[resultVal];
  flyer.style.position = 'fixed';
  flyer.style.left = `${cellRect.left + cellRect.width / 2}px`;
  flyer.style.top = `${cellRect.top + cellRect.height / 2}px`;
  flyer.style.transform = 'translate(-50%, -50%)';
  flyer.style.zIndex = '1000';
  flyer.style.pointerEvents = 'none';
  document.body.appendChild(flyer);

  const targetX = redexRect.left + redexRect.width / 2;
  const targetY = redexRect.top + redexRect.height / 2;

  await flyer.animate([
    { left: `${cellRect.left + cellRect.width / 2}px`, top: `${cellRect.top + cellRect.height / 2}px`, opacity: 1 },
    { left: `${targetX}px`, top: `${targetY}px`, opacity: 1 },
  ], { duration: 400, easing: 'ease-in-out', fill: 'forwards' }).finished;

  flyer.remove();

  // Phase 3: Collapse redex, fade in result (300ms)
  redexEl.style.display = 'inline-block';
  redexEl.style.overflow = 'hidden';
  const startWidth = redexEl.getBoundingClientRect().width;

  // Insert result symbol next to redex
  const resultSpan = document.createElement('span');
  resultSpan.className = 'expr-symbol reduction-result';
  resultSpan.textContent = SYMBOL_NAMES[resultVal];
  resultSpan.style.color = SYMBOL_COLORS[resultVal];
  resultSpan.style.opacity = '0';
  redexEl.parentElement?.insertBefore(resultSpan, redexEl.nextSibling);

  // Collapse old, fade in new simultaneously
  await Promise.all([
    redexEl.animate([
      { maxWidth: `${startWidth}px`, opacity: 1 },
      { maxWidth: '0px', opacity: 0 },
    ], { duration: 300, easing: 'ease-in-out', fill: 'forwards' }).finished,
    resultSpan.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 300, easing: 'ease-in-out', fill: 'forwards' }).finished,
  ]);

  // Phase 4: Re-space (200ms) — clean up and re-render from tree
  await wait(200);
  redexEl.remove();
  resultSpan.remove();
  onComplete();
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
