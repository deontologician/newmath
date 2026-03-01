import type { OpTable } from './types.ts';
import { createSymbolEl, createOperatorEl } from '../symbols.ts';

/** Render an OpTable as a DOM <table> element. */
export function renderTable(table: OpTable): HTMLTableElement {
  const el = document.createElement('table');
  el.className = 'op-table';

  // Header row: blank corner + column headers
  const thead = el.createTHead();
  const headerRow = thead.insertRow();
  const corner = document.createElement('th');
  corner.className = 'op-table-corner';
  corner.appendChild(createOperatorEl());
  headerRow.appendChild(corner);

  for (let c = 0; c < table.size; c++) {
    const th = document.createElement('th');
    th.id = `col-header-${c}`;
    th.dataset.col = String(c);
    th.appendChild(createSymbolEl(c));
    headerRow.appendChild(th);
  }

  // Body rows: row header + cells
  const tbody = el.createTBody();
  for (let r = 0; r < table.size; r++) {
    const row = tbody.insertRow();
    row.dataset.row = String(r);
    const rowHeader = document.createElement('th');
    rowHeader.id = `row-header-${r}`;
    rowHeader.appendChild(createSymbolEl(r));
    row.appendChild(rowHeader);

    for (let c = 0; c < table.size; c++) {
      const td = row.insertCell();
      const val = table.cells[r][c];
      td.id = `cell-${r}-${c}`;
      td.dataset.row = String(r);
      td.dataset.col = String(c);
      td.dataset.value = String(val);
      td.appendChild(createSymbolEl(val));
    }
  }

  return el;
}
