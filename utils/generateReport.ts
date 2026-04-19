"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ReportData = {
  semesterName: string;   // e.g. "1st"
  yearStart: string;      // e.g. "24"
  yearEnd: string;        // e.g. "25"
  orgName: string;

  initialAccountBalance: number;
  initialCashOnHand: number;
  initialCashOnBank: number;

  membershipFee: number;
  donations: number;
  fines: number;
  collectiblesIncome: number;
  others: Array<{ label: string; amount: number }>;
  specialProjectsRevenues: number;

  collectiblesB: number;
  totalFunds: number;
  lessExpenses: number;
  netFundBalance: number;

  cashOnHand: number;
  cashOnBank: number;
};

function fmt(n: number): string {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Coordinate constants — all in PDF points (origin = bottom-left)
// Page: A4 595 × 842 pt
// Adjust these if values land in wrong positions after visual inspection.
// ---------------------------------------------------------------------------
const SZ = 9;
const COLOR = rgb(0, 0, 0);

// x anchors
const X_RIGHT = 468; // left edge of right-column amount blanks (after "P")
const X_INDENT = 250; // left edge of indented amount blanks (Cash on Hand / Bank / SP)
const X_BREAKDOWN = 343; // left edge of Breakdown section amounts
const X_OTHERS_LABEL = 120; // left edge of "Others" description label

// y positions (from bottom of page)
const Y = {
  semester:       762,
  orgName:        724,
  beginBal:       704,
  beginHand:      691,
  beginBank:      678,
  membership:     652,
  donations:      638,
  fines:          624,
  collections:    610,
  others:        [596, 582, 568, 554] as const,
  spRevenues:     525,
  spExpenses:     511,
  collectiblesB:  490,
  totalFunds:     470,
  lessExpenses:   450,
  netBalance:     431,
  bdHand:         403,
  bdBank:         389,
  bdCollectibles: 374,
};

export async function generateReport(data: ReportData): Promise<Blob> {
  const templateBytes = await fetch("/report-template.pdf").then((r) =>
    r.arrayBuffer()
  );
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  function draw(text: string, x: number, y: number, rightAlign = false) {
    if (!text) return;
    const w = rightAlign ? font.widthOfTextAtSize(text, SZ) : 0;
    page.drawText(text, { x: x - w, y, size: SZ, font, color: COLOR });
  }

  // Semester header line
  draw(data.semesterName, 80, Y.semester);
  draw(data.yearStart, 381, Y.semester);
  draw(data.yearEnd, 432, Y.semester);

  // Organization name — centered on page
  const orgW = font.widthOfTextAtSize(data.orgName, SZ);
  draw(data.orgName, (595 - orgW) / 2, Y.orgName);

  // Beginning balances
  draw(fmt(data.initialAccountBalance), X_RIGHT, Y.beginBal);
  draw(fmt(data.initialCashOnHand), X_INDENT, Y.beginHand);
  draw(fmt(data.initialCashOnBank), X_INDENT, Y.beginBank);

  // Contributions (Attachment A)
  draw(fmt(data.membershipFee), X_RIGHT, Y.membership);
  draw(fmt(data.donations), X_RIGHT, Y.donations);
  draw(fmt(data.fines), X_RIGHT, Y.fines);
  draw(fmt(data.collectiblesIncome), X_RIGHT, Y.collections);

  data.others.slice(0, 4).forEach(({ label, amount }, i) => {
    draw(label, X_OTHERS_LABEL, Y.others[i]);
    draw(fmt(amount), X_RIGHT, Y.others[i]);
  });

  // Special Projects
  draw(fmt(data.specialProjectsRevenues), X_INDENT, Y.spRevenues);
  // Less Expenses inside SP left blank (all expenses go to Attachment C)

  // Collectibles B, totals
  draw(fmt(data.collectiblesB), X_RIGHT, Y.collectiblesB);
  draw(fmt(data.totalFunds), X_RIGHT, Y.totalFunds);
  draw(fmt(data.lessExpenses), X_RIGHT, Y.lessExpenses);
  draw(fmt(data.netFundBalance), X_RIGHT, Y.netBalance);

  // Breakdown
  draw(fmt(data.cashOnHand), X_BREAKDOWN, Y.bdHand);
  draw(fmt(data.cashOnBank), X_BREAKDOWN, Y.bdBank);
  draw(fmt(data.collectiblesB), X_BREAKDOWN, Y.bdCollectibles);

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}
