/**
 * Image-based glyph system.
 *
 * On each "new table" we pick random symbol images from public/symbols/
 * and (when available) a random operator image from public/operators/.
 */

/** All available symbol glyph file IDs (0–999). */
const SYMBOL_GLYPH_IDS: number[] = [];
for (let i = 0; i <= 999; i++) {
  SYMBOL_GLYPH_IDS.push(i);
}

/** Available operator glyph file IDs (0–99). */
const OPERATOR_GLYPH_IDS: number[] = [];
for (let i = 0; i <= 99; i++) {
  OPERATOR_GLYPH_IDS.push(i);
}

/** Currently selected symbol file IDs, one per symbol index. */
let currentSymbols: number[] = [];

/** Currently selected operator file ID, or null for text fallback. */
let currentOperator: number | null = null;

/** The text fallback for the binary operation symbol. */
export const OP_SYMBOL = '\u25CB'; // ○

/** Pick `count` random symbol glyphs and one operator glyph, avoiding excluded IDs. */
export function randomizeGlyphs(
  count: number,
  exclude?: { symbols?: Set<number>; operators?: Set<number> },
): void {
  const exSym = exclude?.symbols;
  const exOp = exclude?.operators;

  // Fisher-Yates sample from non-excluded symbols
  const pool = exSym ? SYMBOL_GLYPH_IDS.filter(id => !exSym.has(id)) : [...SYMBOL_GLYPH_IDS];
  const picked: number[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length);
    picked.push(pool[j]);
    pool[j] = pool[pool.length - 1];
    pool.pop();
  }
  currentSymbols = picked;

  const opPool = exOp ? OPERATOR_GLYPH_IDS.filter(id => !exOp.has(id)) : OPERATOR_GLYPH_IDS;
  if (opPool.length > 0) {
    currentOperator = opPool[Math.floor(Math.random() * opPool.length)];
  } else {
    currentOperator = null;
  }
}

/** Get the current glyph state for serialization. */
export function getGlyphState(): { symbols: number[]; operator: number | null } {
  return { symbols: [...currentSymbols], operator: currentOperator };
}

/** Restore glyph state from a saved snapshot. */
export function setGlyphState(s: { symbols: number[]; operator: number | null }): void {
  currentSymbols = [...s.symbols];
  currentOperator = s.operator;
}

/** Create an <img> element for the symbol at the given index (0, 1, 2, …). */
export function createSymbolEl(index: number): HTMLImageElement {
  const fileId = currentSymbols[index];
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}symbols/${String(fileId).padStart(4, '0')}.webp`;
  img.className = 'symbol-glyph';
  img.draggable = false;
  return img;
}

/** Create an element for the binary operator (image or text fallback). */
export function createOperatorEl(): HTMLElement {
  if (currentOperator !== null) {
    const img = document.createElement('img');
    img.src = `${import.meta.env.BASE_URL}operators/${String(currentOperator).padStart(4, '0')}.webp`;
    img.className = 'operator-glyph';
    img.draggable = false;
    return img;
  }
  const span = document.createElement('span');
  span.textContent = OP_SYMBOL;
  return span;
}
