/** Display names for the algebraic symbols. */
export const SYMBOL_NAMES = ['X', 'Y', 'Z'] as const;

/** Colors for each symbol (indexed by symbol value). */
export const SYMBOL_COLORS = [
  '#ff6b6b', // X — red
  '#4ecdc4', // Y — teal
  '#ffe66d', // Z — gold
] as const;

/** The binary operation symbol shown between operands. */
export const OP_SYMBOL = '\u25CB'; // ○ (white circle)
