import type { PDFDocument } from "pdf-lib";
import { type DrawPage, type Font, centerText, wrapText, ensurePage, fmtDate, fmt, ROW_H } from "../generate-attachment-c/pdf-helpers";
import { computeRowHeights, drawTable } from "../generate-attachment-c/pdf-table";
import type { ExpEntry } from "../generate-attachment-c/data";
import type { FinesCalc } from "./data";

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

const INC_COLS = [70, 160, 60, 45, 70];
const INC_HEADERS = ["Date", "Description", "Unit Price", "Qty", "Amount"];

function buildIncomeRows(entries: ExpEntry[]): string[][] {
  return entries.map((e) => [
    fmtDate(e.entry_date ?? ""),
    e.description ?? "",
    fmt(Number(e.unit_price) || 0),
    String(Number(e.quantity) || 0),
    fmt(Number(e.total_price) || 0),
  ]);
}

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

export async function drawAttachmentA(
  state: PdfState,
  ctx: PdfCtx,
  sectionTitleA: string,
  customTables: CustomTable[],
  entryMap: Map<string, ExpEntry>,
) {
  if (sectionTitleA) {
    const lines = wrapText(sectionTitleA, ctx.CONTENT_W, ctx.boldFont, 11);
    await ensurePdfSpace(state, ctx, lines.length * 14 + 10);
    for (const line of lines) { centerText(state.currentPage, line, state.curY, ctx.width, ctx.boldFont, 11); state.curY -= 14; }
    state.curY -= 10;
  }

  for (const ct of customTables) {
    const entries = ct.entryIds.map((id) => entryMap.get(id)).filter(Boolean) as ExpEntry[];
    if (entries.length === 0) continue;

    const total = entries.reduce((s, e) => s + (Number(e.total_price) || 0), 0);
    const tableRows = [INC_HEADERS, ...buildIncomeRows(entries), ["TOTAL", ...Array(INC_COLS.length - 2).fill(""), fmt(total)]];
    const titleLines = wrapText(ct.title, ctx.CONTENT_W, ctx.boldFont, 11);
    await ensurePdfSpace(state, ctx, titleLines.length * 14 + 4 + ROW_H * 2);
    for (const line of titleLines) { centerText(state.currentPage, line, state.curY, ctx.width, ctx.boldFont, 11); state.curY -= 14; }
    state.curY -= 4;

    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1, -1);
    const totalRow = tableRows[tableRows.length - 1];
    const tableX = ctx.LEFT + (ctx.CONTENT_W - INC_COLS.reduce((a, b) => a + b, 0)) / 2;
    const allDataHeights = computeRowHeights([headerRow, ...dataRows], INC_COLS, ctx.font, 1, false).slice(1);

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
      drawTable(state.currentPage, tableX, state.curY, INC_COLS, segRows, ctx.font, ctx.boldFont, [2, 3, 4], 1, isLast);
      state.curY -= segH; di += count;
      if (isLast) break;
      await nextPage(state, ctx);
    }
    state.curY -= 20;
  }
}

export async function drawAttachmentB(
  state: PdfState,
  ctx: PdfCtx,
  sectionTitleB: string,
  fines: FinesCalc,
  AB_COLS: number[],
) {
  state.curY -= 10;
  if (sectionTitleB) {
    const lines = wrapText(sectionTitleB, ctx.CONTENT_W, ctx.boldFont, 11);
    await ensurePdfSpace(state, ctx, lines.length * 14 + 10);
    for (const line of lines) { centerText(state.currentPage, line, state.curY, ctx.width, ctx.boldFont, 11); state.curY -= 14; }
    state.curY -= 10;
  }

  const bTitleLines = wrapText("TABLE OF SUMMARY OF COLLECTIONS", ctx.CONTENT_W, ctx.boldFont, 11);
  const bTableRows = [
    ["", "No. of Students", "Amount (Php)", "Total (Php)"],
    ["Collected", String(fines.fineStudentsPaid), fmt(fines.fineAmount), fmt(fines.collected)],
    ["Collectibles", String(fines.remaining), fmt(fines.fineAmount), fmt(fines.collectibles)],
    ["Grand Total", "", "", fmt(fines.grandTotal)],
  ];
  const bTableH = computeRowHeights(bTableRows, AB_COLS, ctx.font, 0, true).reduce((a, b) => a + b, 0);
  await ensurePdfSpace(state, ctx, bTitleLines.length * 14 + 4 + bTableH + 10);
  for (const line of bTitleLines) { centerText(state.currentPage, line, state.curY, ctx.width, ctx.boldFont, 11); state.curY -= 14; }
  state.curY -= 4;
  const bTableX = ctx.LEFT + (ctx.CONTENT_W - AB_COLS.reduce((a, b) => a + b, 0)) / 2;
  drawTable(state.currentPage, bTableX, state.curY, AB_COLS, bTableRows, ctx.font, ctx.boldFont, [1, 2, 3], 0, true);
  state.curY -= bTableH + 20;
}
