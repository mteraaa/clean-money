import { PDFDocument, rgb } from "pdf-lib";

export type PageSetupOpts = {
  facultyName: string;
  font: Font;
  boldFont: Font;
  left: number;
  contentW: number;
  contentTop: number;
  contentBot: number;
};

export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(1, 1, 1);
export const HEADER_GREEN = rgb(27 / 255, 77 / 255, 48 / 255);
export const ROW_H = 20;
export const LINE_H = 14;
export const TABLE_SZ = 11;

export type DrawPage = ReturnType<PDFDocument["getPages"]>[0];
export type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

export function wrapText(
  text: string,
  maxWidth: number,
  font: Font,
  size: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function fmt(n: number) {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(dateStr: string) {
  const [y, m, d] = (dateStr ?? "").split("-");
  if (!y || !m || !d) return dateStr ?? "";
  return `${m}-${d}-${y}`;
}

export function centerText(
  page: DrawPage,
  text: string,
  y: number,
  pageWidth: number,
  font: Font,
  size: number,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - w) / 2, y, size, font, color: BLACK });
}

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

export function drawTable(
  page: DrawPage,
  x: number,
  y: number,
  colWidths: number[],
  rows: string[][],
  font: Font,
  boldFont: Font,
  rightAlignCols: number[] = [],
  wrapCol = 2,
  hasTotalRow = true,
) {
  const sz = TABLE_SZ;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  const rowHeights = computeRowHeights(rows, colWidths, font, wrapCol, hasTotalRow);
  const totalH = rowHeights.reduce((a, b) => a + b, 0);

  page.drawRectangle({
    x,
    y: y - totalH,
    width: totalW,
    height: totalH,
    borderColor: BLACK,
    borderWidth: 0.75,
    color: WHITE,
  });

  let rowTop = y;
  for (let r = 0; r < rows.length; r++) {
    const rh = rowHeights[r];
    if (r > 0)
      page.drawLine({
        start: { x, y: rowTop },
        end: { x: x + totalW, y: rowTop },
        color: BLACK,
        thickness: 0.5,
      });

    const isTotalRow = hasTotalRow && r === rows.length - 1;
    const f = r === 0 || isTotalRow ? boldFont : font;
    const midY = rowTop - rh / 2 - sz * 0.3;

    if (isTotalRow) {
      const spanW = colWidths.slice(0, -1).reduce((a, b) => a + b, 0);
      const lastW = colWidths[colWidths.length - 1];
      const divX = x + spanW;
      page.drawLine({
        start: { x: divX, y: rowTop },
        end: { x: divX, y: rowTop - rh },
        color: BLACK,
        thickness: 0.5,
      });

      const labelText = rows[r][0] ?? "";
      page.drawText(labelText, {
        x: x + spanW - f.widthOfTextAtSize(labelText, sz) - 4,
        y: midY,
        size: sz,
        font: f,
        color: BLACK,
      });

      const amtText = rows[r][rows[r].length - 1] ?? "";
      page.drawText(amtText, {
        x: divX + lastW - f.widthOfTextAtSize(amtText, sz) - 4,
        y: midY,
        size: sz,
        font: f,
        color: BLACK,
      });
    } else {
      let cx = x;
      for (let c = 0; c < rows[r].length; c++) {
        if (c > 0)
          page.drawLine({
            start: { x: cx, y: rowTop },
            end: { x: cx, y: rowTop - rh },
            color: BLACK,
            thickness: 0.5,
          });

        const isHeader = r === 0;
        const isRight = rightAlignCols.includes(c) && !isHeader;

        if (!isHeader && c === wrapCol) {
          const lines = wrapText(rows[r][c] ?? "", colWidths[c] - 8, font, sz);
          const blockH = (lines.length - 1) * LINE_H + sz;
          const firstY = rowTop - Math.max(2, (rh - blockH) / 2) - sz * 0.75;
          lines.forEach((line, li) =>
            page.drawText(line, {
              x: cx + 4,
              y: firstY - li * LINE_H,
              size: sz,
              font,
              color: BLACK,
            }),
          );
        } else {
          const cellText = rows[r][c] ?? "";
          const textW = f.widthOfTextAtSize(cellText, sz);
          const tx = isHeader
            ? cx + (colWidths[c] - textW) / 2
            : isRight
              ? cx + colWidths[c] - textW - 4
              : cx + 4;
          page.drawText(cellText, {
            x: Math.max(cx + 2, tx),
            y: midY,
            size: sz,
            font: f,
            color: BLACK,
          });
        }
        cx += colWidths[c];
      }
    }
    rowTop -= rh;
  }
}

export function setupPage(pg: DrawPage, opts: PageSetupOpts) {
  const { facultyName, font, left, contentW, contentTop, contentBot } = opts;
  pg.drawRectangle({ x: 200, y: 800, width: 330, height: 24, color: WHITE });
  pg.drawText(facultyName.toUpperCase(), {
    x: 280,
    y: 779,
    size: 14,
    font,
    color: HEADER_GREEN,
  });
  pg.drawRectangle({
    x: left,
    y: contentBot,
    width: contentW,
    height: contentTop - contentBot,
    color: WHITE,
  });
}

export async function ensurePage(
  pdfDoc: PDFDocument,
  idx: number,
): Promise<DrawPage> {
  while (pdfDoc.getPageCount() <= idx) {
    const [copied] = await pdfDoc.copyPages(pdfDoc, [0]);
    pdfDoc.addPage(copied);
  }
  return pdfDoc.getPages()[idx];
}

export function calcTableH(
  tableRows: string[][],
  colWidths: number[],
  font: Font,
  hasTotalRow = true,
): number {
  return computeRowHeights(tableRows, colWidths, font, 2, hasTotalRow).reduce((a, b) => a + b, 0);
}

export function drawPreparedBy(
  page: DrawPage,
  name: string,
  designation: string,
  x: number,
  startY: number,
  font: Font,
  boldFont: Font,
) {
  page.drawText("Prepared by:", { x, y: startY, size: 11, font, color: BLACK });
  const lineY = startY - 24;
  if (name)
    page.drawText(name, {
      x: x + 2,
      y: lineY + 3,
      size: 11,
      font,
      color: BLACK,
    });
  page.drawLine({
    start: { x, y: lineY },
    end: { x: x + 180, y: lineY },
    color: BLACK,
    thickness: 0.75,
  });
  page.drawText(designation, {
    x,
    y: lineY - 13,
    size: 11,
    font: boldFont,
    color: BLACK,
  });
}
