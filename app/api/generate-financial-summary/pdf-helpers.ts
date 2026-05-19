import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_W = 595;
const MARGIN_L = 60;
const MARGIN_R = 535;
const START_Y = 800;
const SZ = 9.5;
const LINE_H = 17;
const SECTION_GAP = 14;
const BLACK = rgb(0, 0, 0);

function fmt(n: number) {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type SummaryData = {
  orgName: string;
  semName: string;
  yearLabel: string;
  initialBal: number;
  initCashHand: number;
  initCashBank: number;
  membershipFee: number;
  donations: number;
  fines: number;
  collectiblesIncome: number;
  others: [string, number][];
  spRevenues: number;
  collectiblesB: number;
  totalFunds: number;
  totalExpenses: number;
  netFundBalance: number;
  cashOnHand: number;
  cashOnBank: number;
};

export async function buildSummaryPdf(d: SummaryData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = START_Y;

  function centerDraw(text: string, f: typeof font, sz: number) {
    const w = f.widthOfTextAtSize(text, sz);
    page.drawText(text, { x: (PAGE_W - w) / 2, y, size: sz, font: f, color: BLACK });
    y -= sz + 6;
  }

  function drawLine(
    label: string,
    amount: number,
    opts: { bold?: boolean; indent?: number; pPrefix?: boolean } = {},
  ) {
    const { bold = false, indent = 0, pPrefix = false } = opts;
    const f = bold ? boldFont : font;
    page.drawText(label, { x: MARGIN_L + indent, y, size: SZ, font: f, color: BLACK });
    const amtStr = fmt(amount);
    const pW = pPrefix ? font.widthOfTextAtSize("P", SZ) : 0;
    const amtW = font.widthOfTextAtSize(amtStr, SZ);
    const startX = MARGIN_R - pW - amtW;
    if (pPrefix) page.drawText("P", { x: startX, y, size: SZ, font, color: BLACK });
    page.drawText(amtStr, { x: startX + pW, y, size: SZ, font, color: BLACK });
    y -= LINE_H;
  }

  centerDraw(`${d.orgName.toUpperCase()} – STUDENT ELECTION BOARD`, boldFont, 10);
  centerDraw(`${d.semName}, ${d.yearLabel} FINANCIAL REPORT`, boldFont, 10);
  y -= LINE_H * 2;

  drawLine("Beginning Cash Balance", d.initialBal, { bold: true, pPrefix: true });
  drawLine("Cash on Hand P", d.initCashHand, { indent: 24 });
  drawLine("Cash In Bank", d.initCashBank, { indent: 24 });
  y -= SECTION_GAP;

  page.drawText("Contributions Received: (Attachment A)", {
    x: MARGIN_L, y, size: SZ, font: boldFont, color: BLACK,
  });
  y -= LINE_H;

  if (d.membershipFee > 0) drawLine("Membership Fee", d.membershipFee);
  if (d.donations > 0) drawLine("Donations", d.donations);
  drawLine("Fines", d.fines);
  drawLine("Collections from previous accounts receivables (collectibles)", d.collectiblesIncome);

  page.drawText("Others: ", { x: MARGIN_L, y, size: SZ, color: BLACK });
  for (const [label, amount] of d.others) {
    drawLine(`              ${label}`, amount);
  }

  if (d.spRevenues > 0) drawLine("Special Projects/Fund Raising", d.spRevenues);
  y -= SECTION_GAP;

  drawLine("Collectibles (Attachment B)", d.collectiblesB, { bold: true, pPrefix: true });
  y -= SECTION_GAP;

  drawLine("Total Funds", d.totalFunds, { pPrefix: true });
  drawLine("Less: Expenses (Attachment C)", d.totalExpenses, { pPrefix: true });
  drawLine("Net Fund Balance", d.netFundBalance, { bold: true, pPrefix: true });
  y -= SECTION_GAP;

  page.drawText("Breakdown:", { x: MARGIN_L, y, size: SZ, font: boldFont, color: BLACK });
  y -= LINE_H;

  drawLine("Cash on Hand P", d.cashOnHand);
  drawLine("Cash in Bank", d.cashOnBank);
  drawLine("Accounts Receivables (Collectibles)", d.collectiblesB);

  return pdfDoc.save();
}
