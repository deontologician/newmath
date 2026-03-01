import type { OpTable } from './types.ts';
import { SYMBOL_NAMES, SYMBOL_COLORS, OP_SYMBOL } from '../symbols.ts';

/** Render an OpTable as a DOM <table> element. */
export function renderTable(table: OpTable): HTMLTableElement {
  const el = document.createElement('table');
  el.className = 'op-table';

  // Header row: blank corner + column headers
  const thead = el.createTHead();
  const headerRow = thead.insertRow();
  const corner = document.createElement('th');
  corner.textContent = OP_SYMBOL;
  corner.className = 'op-table-corner';
  headerRow.appendChild(corner);

  for (let c = 0; c < table.size; c++) {
    const th = document.createElement('th');
    th.textContent = SYMBOL_NAMES[c];
    th.style.color = SYMBOL_COLORS[c];
    headerRow.appendChild(th);
  }

  // Body rows: row header + cells
  const tbody = el.createTBody();
  for (let r = 0; r < table.size; r++) {
    const row = tbody.insertRow();
    const rowHeader = document.createElement('th');
    rowHeader.textContent = SYMBOL_NAMES[r];
    rowHeader.style.color = SYMBOL_COLORS[r];
    row.appendChild(rowHeader);

    for (let c = 0; c < table.size; c++) {
      const td = row.insertCell();
      const val = table.cells[r][c];
      td.id = `cell-${r}-${c}`;
      td.dataset.value = String(val);
      td.textContent = SYMBOL_NAMES[val];
      td.style.color = SYMBOL_COLORS[val];
    }
  }

  return el;
}
