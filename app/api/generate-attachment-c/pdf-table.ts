import { type DrawPage, type Font, wrapText, BLACK, WHITE, ROW_H, LINE_H, TABLE_SZ } from "./pdf-helpers";

export function computeRowHeights(
  rows: string[][],
  colWidths: number[],
  font: Font,
  wrapCol = 2,
  hasTotalRow = true,
): number[] {
  return rows.map((row, r) => {
    if (r === 0 || (hasTotalRow && r === rows.length - 1)) return ROW_H;
    const lines = wrapText(row[wrapCol] ?? "", colWidths[wrapCol] - 8, font, TABLE_SZ);
    return Math.max(ROW_H, lines.length * LINE_H + 4);
  });
}

function drawTotalRow(
  page: DrawPage, x: number, rowTop: number, rh: number,
  colWidths: number[], row: string[], f: Font, sz: number,
) {
  const spanW = colWidths.slice(0, -1).reduce((a, b) => a + b, 0);
  const lastW = colWidths[colWidths.length - 1];
  const divX = x + spanW;
  const midY = rowTop - rh / 2 - sz * 0.3;
  page.drawLine({ start: { x: divX, y: rowTop }, end: { x: divX, y: rowTop - rh }, color: BLACK, thickness: 0.5 });
  const labelText = row[0] ?? "";
  page.drawText(labelText, { x: x + spanW - f.widthOfTextAtSize(labelText, sz) - 4, y: midY, size: sz, font: f, color: BLACK });
  const amtText = row[row.length - 1] ?? "";
  page.drawText(amtText, { x: divX + lastW - f.widthOfTextAtSize(amtText, sz) - 4, y: midY, size: sz, font: f, color: BLACK });
}

function drawRegularRow(
  page: DrawPage, x: number, rowTop: number, rh: number,
  colWidths: number[], row: string[], isHeader: boolean,
  f: Font, font: Font, sz: number, wrapCol: number, rightAlignCols: number[],
) {
  const midY = rowTop - rh / 2 - sz * 0.3;
  let cx = x;
  for (let c = 0; c < row.length; c++) {
    if (c > 0)
      page.drawLine({ start: { x: cx, y: rowTop }, end: { x: cx, y: rowTop - rh }, color: BLACK, thickness: 0.5 });
    const isRight = rightAlignCols.includes(c) && !isHeader;
    if (!isHeader && c === wrapCol) {
      const lines = wrapText(row[c] ?? "", colWidths[c] - 8, font, sz);
      const blockH = (lines.length - 1) * LINE_H + sz;
      const firstY = rowTop - Math.max(2, (rh - blockH) / 2) - sz * 0.75;
      lines.forEach((line, li) =>
        page.drawText(line, { x: cx + 4, y: firstY - li * LINE_H, size: sz, font, color: BLACK }),
      );
    } else {
      const cellText = row[c] ?? "";
      const textW = f.widthOfTextAtSize(cellText, sz);
      const tx = isHeader
        ? cx + (colWidths[c] - textW) / 2
        : isRight
          ? cx + colWidths[c] - textW - 4
          : cx + 4;
      page.drawText(cellText, { x: Math.max(cx + 2, tx), y: midY, size: sz, font: f, color: BLACK });
    }
    cx += colWidths[c];
  }
}

export function drawTable(
  page: DrawPage, x: number, y: number,
  colWidths: number[], rows: string[][],
  font: Font, boldFont: Font,
  rightAlignCols: number[] = [], wrapCol = 2, hasTotalRow = true,
) {
  const sz = TABLE_SZ;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const rowHeights = computeRowHeights(rows, colWidths, font, wrapCol, hasTotalRow);
  const totalH = rowHeights.reduce((a, b) => a + b, 0);
  page.drawRectangle({ x, y: y - totalH, width: totalW, height: totalH, borderColor: BLACK, borderWidth: 0.75, color: WHITE });
  let rowTop = y;
  for (let r = 0; r < rows.length; r++) {
    const rh = rowHeights[r];
    if (r > 0)
      page.drawLine({ start: { x, y: rowTop }, end: { x: x + totalW, y: rowTop }, color: BLACK, thickness: 0.5 });
    const isTotalRow = hasTotalRow && r === rows.length - 1;
    const f = r === 0 || isTotalRow ? boldFont : font;
    if (isTotalRow) drawTotalRow(page, x, rowTop, rh, colWidths, rows[r], f, sz);
    else drawRegularRow(page, x, rowTop, rh, colWidths, rows[r], r === 0, f, font, sz, wrapCol, rightAlignCols);
    rowTop -= rh;
  }
}

export function calcTableH(
  tableRows: string[][],
  colWidths: number[],
  font: Font,
  hasTotalRow = true,
): number {
  return computeRowHeights(tableRows, colWidths, font, 2, hasTotalRow).reduce((a, b) => a + b, 0);
}
