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
