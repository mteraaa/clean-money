import type { PDFDocument } from "pdf-lib";
import { type DrawPage, type Font, centerText, wrapText, ensurePage, ROW_H, fmt } from "./pdf-helpers";
import { computeRowHeights, drawTable } from "./pdf-table";
import { type ExpEntry, STD_COLS, REIMB_COLS, STD_HEADERS, REIMB_HEADERS, buildRows, getPreset } from "./data";

export type CustomTable = { title: string; entryIds: string[] };
export type PdfState = { pageIndex: number; curY: number; currentPage: DrawPage };
export type PdfCtx = {
  pdfDoc: PDFDocument;
  setup: (pg: DrawPage) => void;
  cover: (pg: DrawPage) => void;
  font: Font;
  boldFont: Font;
  width: number;
  CONTENT_W: number;
  LEFT: number;
  CONTENT_TOP: number;
  CONTENT_BOT: number;
};

export async function ensurePdfSpace(state: PdfState, ctx: PdfCtx, neededH: number) {
  if (state.curY - neededH < ctx.CONTENT_BOT + 10) {
    state.currentPage = await ensurePage(ctx.pdfDoc, ++state.pageIndex);
    ctx.setup(state.currentPage);
    ctx.cover(state.currentPage);
    state.curY = ctx.CONTENT_TOP;
  }
}

async function nextPage(state: PdfState, ctx: PdfCtx) {
  state.currentPage = await ensurePage(ctx.pdfDoc, ++state.pageIndex);
  ctx.setup(state.currentPage);
  ctx.cover(state.currentPage);
  state.curY = ctx.CONTENT_TOP;
}

export async function drawExpenseTables(
  state: PdfState,
  ctx: PdfCtx,
  customTables: CustomTable[],
  entryMap: Map<string, ExpEntry>,
) {
  for (const ct of customTables) {
    const entries = ct.entryIds.map((id) => entryMap.get(id)).filter(Boolean) as ExpEntry[];
    if (entries.length === 0) continue;

    const isReimb = entries.every((e) => getPreset(e.description ?? "") === "Reimbursement");
    const colWidths = isReimb ? REIMB_COLS : STD_COLS;
    const total = entries.reduce((s, e) => s + (Number(e.total_price) || 0), 0);
    const tableRows: string[][] = [
      isReimb ? REIMB_HEADERS : STD_HEADERS,
      ...buildRows(entries, isReimb),
      ["TOTAL", ...Array(colWidths.length - 2).fill(""), fmt(total)],
    ];
    const titleLines = wrapText(ct.title, ctx.CONTENT_W, ctx.boldFont, 11);
    await ensurePdfSpace(state, ctx, titleLines.length * 14 + 4 + ROW_H * 2);
    for (const line of titleLines) { centerText(state.currentPage, line, state.curY, ctx.width, ctx.boldFont, 11); state.curY -= 14; }
    state.curY -= 4;

    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1, -1);
    const totalRow = tableRows[tableRows.length - 1];
    const tableX = ctx.LEFT + (ctx.CONTENT_W - colWidths.reduce((a, b) => a + b, 0)) / 2;
    const rightAlign = isReimb ? [3] : [3, 4, 5];
    const allDataHeights = computeRowHeights([headerRow, ...dataRows], colWidths, ctx.font, 2, false).slice(1);

    let di = 0;
    while (di <= dataRows.length) {
      if (state.curY - ctx.CONTENT_BOT - 10 < ROW_H * 2) await nextPage(state, ctx);
      const avail = state.curY - ctx.CONTENT_BOT - 10 - ROW_H * 2;
      let usedH = 0, count = 0;
      while (di + count < dataRows.length && usedH + allDataHeights[di + count] <= avail) { usedH += allDataHeights[di + count]; count++; }
      if (count === 0 && di < dataRows.length) count = 1;
      const isLast = di + count >= dataRows.length;
      const segRows = [headerRow, ...dataRows.slice(di, di + count), ...(isLast ? [totalRow] : [])];
      const segH = ROW_H + allDataHeights.slice(di, di + count).reduce((a, b) => a + b, 0) + (isLast ? ROW_H : 0);
      drawTable(state.currentPage, tableX, state.curY, colWidths, segRows, ctx.font, ctx.boldFont, rightAlign, 2, isLast);
      state.curY -= segH; di += count;
      if (isLast) break;
      await nextPage(state, ctx);
    }
    state.curY -= 20;
  }
}
