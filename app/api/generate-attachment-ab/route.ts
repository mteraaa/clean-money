import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const HEADER_GREEN = rgb(27 / 255, 77 / 255, 48 / 255); // VSU/SEB dark forest green
const ROW_H = 18;

function fmt(n: number) {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(dateStr: string) {
  const [y, m, d] = (dateStr ?? "").split("-");
  if (!y || !m || !d) return dateStr ?? "";
  return `${m}-${d}-${y}`;
}

function centerText(
  page: ReturnType<PDFDocument["getPages"]>[0],
  text: string,
  y: number,
  pageWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - w) / 2, y, size, font, color: BLACK });
}

function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type DrawPage = ReturnType<PDFDocument["getPages"]>[0];
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

function drawTable(
  page: DrawPage,
  x: number,
  y: number,
  colWidths: number[],
  rows: string[][],
  font: Font,
  boldFont: Font,
  headerRows = 1,
  centerCols: number[] = [],
) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const totalH = rows.length * ROW_H;

  page.drawRectangle({
    x,
    y: y - totalH,
    width: totalW,
    height: totalH,
    borderColor: BLACK,
    borderWidth: 0.75,
    color: WHITE,
  });

  for (let r = 0; r < rows.length; r++) {
    const rowTop = y - r * ROW_H;

    if (r > 0) {
      page.drawLine({
        start: { x, y: rowTop },
        end: { x: x + totalW, y: rowTop },
        color: BLACK,
        thickness: 0.5,
      });
    }

    let cx = x;
    const f = r < headerRows ? boldFont : font;
    for (let c = 0; c < rows[r].length; c++) {
      if (c > 0) {
        page.drawLine({
          start: { x: cx, y: rowTop },
          end: { x: cx, y: rowTop - ROW_H },
          color: BLACK,
          thickness: 0.5,
        });
      }
      const cellText = rows[r][c] ?? "";
      const sz = 7.5;
      const textW = f.widthOfTextAtSize(cellText, sz);
      const shouldCenter = centerCols.includes(c) || r < headerRows;
      const tx = shouldCenter
        ? cx + (colWidths[c] - textW) / 2
        : cx + colWidths[c] - textW - 4;
      page.drawText(cellText, {
        x: Math.max(cx + 3, tx),
        y: rowTop - ROW_H + 5,
        size: sz,
        font: f,
        color: BLACK,
      });
      cx += colWidths[c];
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const attachATitle = searchParams.get("attachATitle") ?? "";
  const attachATableName =
    searchParams.get("attachATableName") ??
    "Table 1. Summary of Registration Fee Collected";
  const attachBTitle = searchParams.get("attachBTitle") ?? "";
  const attachBTable1Name =
    searchParams.get("attachBTable1Name") ??
    "Table 1. Summary of Canvassed Votes";
  const assemblyDesc = searchParams.get("assemblyDesc") ?? "";
  const voted = parseInt(searchParams.get("voted") ?? "0") || 0;
  const excusedAbsence =
    parseInt(searchParams.get("excusedAbsence") ?? "0") || 0;
  const didNotVote = parseInt(searchParams.get("didNotVote") ?? "0") || 0;
  const votingPopulation =
    parseInt(searchParams.get("votingPopulation") ?? "0") || 0;
  const attachBTable2Name =
    searchParams.get("attachBTable2Name") ??
    "Table 2. Summary of Amounts Collected based on the Number of Physical Receipts and Attendance.";
  const attachBTable3Name =
    searchParams.get("attachBTable3Name") ?? "Table 3. Summary of Collections";
  const collectedStudents =
    parseInt(searchParams.get("collectedStudents") ?? "0") || 0;
  const collectedAmount =
    parseFloat(searchParams.get("collectedAmount") ?? "0") || 0;
  const collectiblesStudents =
    parseInt(searchParams.get("collectiblesStudents") ?? "0") || 0;
  const collectiblesAmount =
    parseFloat(searchParams.get("collectiblesAmount") ?? "0") || 0;

  type PaymentRow = { mode: string; students: number; amount: number };
  let paymentRows: PaymentRow[] = [];
  try {
    paymentRows = JSON.parse(searchParams.get("paymentRows") ?? "[]").map(
      (r: { mode: string; students: string; amount: string }) => ({
        mode: r.mode,
        students: parseInt(r.students) || 0,
        amount: parseFloat(r.amount) || 0,
      }),
    );
  } catch {}

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("faculty_code, campus_code")
    .eq("auth_id", user.id)
    .single();
  if (!userData) return new NextResponse("Not found", { status: 404 });

  const { faculty_code, campus_code } = userData;
  const email = user.email ?? "";

  let facultyName = "";
  if (faculty_code) {
    const { data: fac } = await supabase
      .from("faculty_seb")
      .select("name")
      .eq("faculty_code", faculty_code)
      .single();
    facultyName = fac?.name ?? "";
  } else {
    const { data: cam } = await supabase
      .from("campus_seb")
      .select("name")
      .eq("campus_code", campus_code!)
      .single();
    facultyName = cam?.name ?? "";
  }

  const { data: sem } = await supabase
    .from("semesters")
    .select("id")
    .eq("is_active", true)
    .single();
  if (!sem) return new NextResponse("No active semester", { status: 404 });

  let incQ = supabase
    .from("entries")
    .select("description, quantity, unit_price, total_price")
    .eq("semester_id", sem.id)
    .eq("category", "income");
  if (faculty_code) incQ = incQ.eq("faculty_code", faculty_code);
  else incQ = incQ.eq("campus_code", campus_code!);
  const { data: incomeEntries } = await incQ;

  // Load template (2-page PDF)
  const templatePath = path.join(
    process.cwd(),
    "public",
    "attachment-a-b-template.pdf",
  );
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const montserratBytes = fs.readFileSync(
    path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf"),
  );
  const montserrat = await pdfDoc.embedFont(montserratBytes);

  // Ensure 2 pages exist
  while (pdfDoc.getPageCount() < 2) {
    const [copied] = await pdfDoc.copyPages(pdfDoc, [0]);
    pdfDoc.addPage(copied);
  }

  const page1 = pdfDoc.getPages()[0];
  const page2 = pdfDoc.getPages()[1];
  const { width } = page1.getSize();

  const LEFT = 40;
  const RIGHT = width - 40;
  const CONTENT_W = RIGHT - LEFT;
  // Content area (between header ~90pt and footer ~70pt)
  const CONTENT_TOP = 745;
  const CONTENT_BOT = 80;

  function draw(
    pg: DrawPage,
    text: string,
    x: number,
    y: number,
    f: Font = font,
    size = 9,
  ) {
    pg.drawText(text, { x, y, size, font: f, color: BLACK });
  }

  // ── Dynamic header/footer overlay on both pages ──
  for (const pg of [page1, page2]) {
    // Cover any static faculty name in header and draw dynamic one
    // Header right section: faculty name sits above "STUDENT ELECTION BOARD"
    pg.drawRectangle({ x: 220, y: 800, width: 320, height: 24, color: WHITE });
    pg.drawText(facultyName.toUpperCase(), {
      x: 225,
      y: 804,
      size: 14,
      font: montserrat,
      color: HEADER_GREEN,
    });

    // Footer: faculty name above STUDENT ELECTION BOARD
    // Cover static text and draw dynamic
    pg.drawRectangle({ x: 44, y: 50, width: 200, height: 12, color: WHITE });
    draw(pg, facultyName, 45, 51, boldFont, 7);

    // Email in footer
    pg.drawRectangle({ x: 44, y: 22, width: 200, height: 10, color: WHITE });
    draw(pg, email, 79, 23, font, 7);
  }

  // ── Clear content areas ──
  for (const pg of [page1, page2]) {
    pg.drawRectangle({
      x: LEFT,
      y: CONTENT_BOT,
      width: CONTENT_W,
      height: CONTENT_TOP - CONTENT_BOT,
      color: WHITE,
    });
  }

  // ══════════════ PAGE 1 — ATTACHMENT A ══════════════
  let curY = CONTENT_TOP;

  // "ATTACHMENT A & B"
  centerText(page1, "ATTACHMENT A & B", curY, width, boldFont, 11);
  curY -= 22;

  // Section heading A
  if (attachATitle) {
    draw(page1, "A.", LEFT, curY, boldFont, 9);
    const lines = wrapText(attachATitle, CONTENT_W - 20, boldFont, 9);
    lines.forEach((line, i) => {
      centerText(page1, line, curY - i * 13, width, boldFont, 9);
    });
    curY -= lines.length * 13 + 10;
  }

  // Table name
  if (attachATableName) {
    draw(page1, attachATableName, LEFT, curY, boldFont, 8);
    curY -= 16;
  }

  // Attachment A table — income entries
  const colA = [160, 105, 105, 105];
  const aX = LEFT + (CONTENT_W - colA.reduce((a, b) => a + b, 0)) / 2;

  const aDataRows = (incomeEntries ?? []).map((e) => [
    e.description ?? "",
    String(Number(e.quantity) || 0),
    fmt(Number(e.unit_price) || 0),
    fmt(Number(e.total_price) || 0),
  ]);
  const grandTotalA = (incomeEntries ?? []).reduce(
    (s, e) => s + (Number(e.total_price) || 0),
    0,
  );

  const aRows: string[][] = [
    ["", "No. of Candidates", "Amount (Php)", "Total (Php)"],
    ...aDataRows,
    ["", "Grand Total", "", fmt(grandTotalA)],
  ];
  drawTable(page1, aX, curY, colA, aRows, font, boldFont, 1, [0, 1, 2, 3]);

  // ══════════════ PAGE 2 — ATTACHMENT B ══════════════
  curY = CONTENT_TOP;

  if (attachBTitle) {
    draw(page2, "B.", LEFT, curY, boldFont, 9);
    const lines = wrapText(attachBTitle, CONTENT_W - 20, boldFont, 9);
    lines.forEach((line, i) => {
      centerText(page2, line, curY - i * 13, width, boldFont, 9);
    });
    curY -= lines.length * 13 + 10;
  }

  // Table 1 — Canvassed Votes
  if (attachBTable1Name) {
    draw(page2, attachBTable1Name, LEFT, curY, boldFont, 8);
    curY -= 14;
  }
  if (assemblyDesc) {
    draw(page2, assemblyDesc, LEFT, curY, font, 8);
    curY -= 14;
  }

  const colB1 = [130, 70, 90, 110, 95];
  const b1X = LEFT + (CONTENT_W - colB1.reduce((a, b) => a + b, 0)) / 2;
  const b1Rows: string[][] = [
    [
      "",
      "Voted",
      "Excused\nAbsence",
      "Did Not Vote &\nNot Excused",
      "Voting\nPopulation",
    ],
    [
      "No. of Students",
      String(voted),
      String(excusedAbsence),
      String(didNotVote),
      String(votingPopulation),
    ],
  ];
  drawTable(page2, b1X, curY, colB1, b1Rows, font, boldFont, 1, [0, 1, 2, 3, 4]);
  curY -= b1Rows.length * ROW_H + 18;

  // Table 2 — Amounts Collected by Mode of Payment
  if (attachBTable2Name) {
    draw(page2, attachBTable2Name, LEFT, curY, boldFont, 8);
    curY -= 14;
  }

  const colB2 = [130, 100, 100, 100];
  const b2X = LEFT + (CONTENT_W - colB2.reduce((a, b) => a + b, 0)) / 2;
  const payGrandTotal = paymentRows.reduce(
    (s, r) => s + r.students * r.amount,
    0,
  );
  const b2Rows: string[][] = [
    ["Mode of Payment", "Total No. of Students", "Amount (Php)", "Total (Php)"],
    ...paymentRows.map((r) => [
      r.mode,
      String(r.students),
      fmt(r.amount),
      fmt(r.students * r.amount),
    ]),
    ["", "Grand Total", "", fmt(payGrandTotal)],
  ];
  drawTable(page2, b2X, curY, colB2, b2Rows, font, boldFont, 1, [0, 1, 2, 3]);
  curY -= b2Rows.length * ROW_H + 18;

  // Table 3 — Summary of Collections
  if (attachBTable3Name) {
    draw(page2, attachBTable3Name, LEFT, curY, boldFont, 8);
    curY -= 14;
  }

  const colB3 = [130, 100, 100, 100];
  const b3X = LEFT + (CONTENT_W - colB3.reduce((a, b) => a + b, 0)) / 2;
  const collectedTotal = collectedStudents * collectedAmount;
  const collectiblesTotal = collectiblesStudents * collectiblesAmount;
  const grandTotal3 = collectedTotal + collectiblesTotal;
  const b3Rows: string[][] = [
    ["", "No. of Students", "Amount (Php)", "Total (Php)"],
    [
      "Collected",
      String(collectedStudents),
      fmt(collectedAmount),
      fmt(collectedTotal),
    ],
    [
      "Collectibles",
      String(collectiblesStudents),
      fmt(collectiblesAmount),
      fmt(collectiblesTotal),
    ],
    ["", "Grand Total", "", fmt(grandTotal3)],
  ];
  drawTable(page2, b3X, curY, colB3, b3Rows, font, boldFont, 1, [0, 1, 2, 3]);

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
