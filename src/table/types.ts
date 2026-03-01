export interface OpTable {
  size: number;
  /** 0-indexed: cells[row][col] = result of row ○ col */
  cells: number[][];
}

/** Look up the result of left ○ right in the table. */
export function lookup(table: OpTable, left: number, right: number): number {
  return table.cells[left][right];
}

/** Generate a random operation table of the given size. */
export function randomTable(size: number): OpTable {
  const cells: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Math.floor(Math.random() * size));
    }
    cells.push(row);
  }
  return { size, cells };
}

/**
 * Convert a solver result (1-indexed) to an OpTable (0-indexed).
 * The solver returns `op` as a flat or nested 1-indexed array.
 */
export function fromSolverResult(op: number[][]): OpTable {
  const size = op.length;
  const cells = op.map(row => row.map(v => v - 1));
  return { size, cells };
}
