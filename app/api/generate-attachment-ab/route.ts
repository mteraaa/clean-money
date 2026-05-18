import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import {
  BLACK,
  WHITE,
  fmt,
  ROW_H,
  type DrawPage,
  type PageSetupOpts,
  centerText,
  wrapText,
  computeRowHeights,
  drawTable,
  setupPage,
  ensurePage,
  drawPreparedBy,
} from "../generate-attachment-c/pdf-helpers";
import { type ExpEntry } from "../generate-attachment-c/data";
import { fmtDate } from "../generate-attachment-c/pdf-helpers";

// Income entries: no OR/TR No. column
const INC_COLS = [70, 160, 60, 45, 70]; // Date, Description, Unit Price, Qty, Amount
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

const LEFT = 40,
  CONTENT_TOP = 680,
  CONTENT_BOT = 80;

// Label | No. of Students | Amount (Php) | Total (Php)
const AB_COLS = [130, 90, 90, 90];

type CustomTable = { title: string; entryIds: string[] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionTitleA = searchParams.get("sectionTitleA") ?? "";
  const sectionTitleB = searchParams.get("sectionTitleB") ?? "";
  const preparedByName = searchParams.get("preparedByName") ?? "";
  const preparedByPosition = searchParams.get("preparedByPosition") ?? "";

  let customTables: CustomTable[] = [];
  try {
    const raw = searchParams.get("customTables");
    if (raw) customTables = JSON.parse(raw);
  } catch {
    /* empty */
  }

  const allIds = customTables.flatMap((t) => t.entryIds);

  if (allIds.length === 0) {
    const templateBytes = fs.readFileSync(
      path.join(process.cwd(), "public", "attachment-a-b-template.pdf"),
    );
    return new NextResponse(Buffer.from(templateBytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" },
    });
  }

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

  // Attachment A: income entries
  let incQ = supabase
    .from("entries")
    .select("id, entry_date, control_number, description, unit_price, quantity, total_price")
    .in("id", allIds)
    .eq("semester_id", sem.id)
    .eq("category", "income")
    .order("entry_date", { ascending: true });
  if (faculty_code) incQ = incQ.eq("faculty_code", faculty_code);
  else incQ = incQ.eq("campus_code", campus_code!);
  const { data: incomeRaw } = await incQ;

  const entryMap = new Map<string, ExpEntry>(
    (incomeRaw ?? []).map((e) => [String(e.id), e as ExpEntry]),
  );

  // Attachment B: balance card + fines paid
  let bcQ = supabase
    .from("balance_cards")
    .select("fine_amount, total_students_with_fines");
  if (faculty_code) bcQ = bcQ.eq("faculty_code", faculty_code);
  else bcQ = bcQ.eq("campus_code", campus_code!).is("faculty_code", null);
  const { data: bc } = await bcQ.maybeSingle();

  let finesQ = supabase
    .from("entries")
    .select("quantity")
    .eq("semester_id", sem.id)
    .eq("category", "income")
    .eq("description", "Fines")
    .eq("is_deleted", false);
  if (faculty_code) finesQ = finesQ.eq("faculty_code", faculty_code);
  else finesQ = finesQ.eq("campus_code", campus_code!);
  const { data: finesData } = await finesQ;

  const fineStudentsPaid = (finesData ?? []).reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0,
  );
  const fineAmount = Number(bc?.fine_amount) || 0;
  const totalStudents = Number(bc?.total_students_with_fines) || 0;
  const remaining = Math.max(0, totalStudents - fineStudentsPaid);
  const collected = fineStudentsPaid * fineAmount;
  const collectibles = remaining * fineAmount;
  const grandTotal = collected + collectibles;

  // Build PDF
  const pdfDoc = await PDFDocument.load(
    fs.readFileSync(
      path.join(process.cwd(), "public", "attachment-a-b-template.pdf"),
    ),
  );
  while (pdfDoc.getPageCount() > 1) pdfDoc.removePage(1);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width } = pdfDoc.getPages()[0].getSize();
  const CONTENT_W = width - 80;

  const pageOpts: PageSetupOpts = {
    facultyName,
    font,
    boldFont,
    left: LEFT,
    contentW: CONTENT_W,
    contentTop: CONTENT_TOP,
    contentBot: CONTENT_BOT,
  };
  const setup = (pg: DrawPage) => setupPage(pg, pageOpts);

  let pageIndex = 0,
    curY = CONTENT_TOP;
  let currentPage = pdfDoc.getPages()[0];
  setup(currentPage);

  function coverPlaceholders(pg: DrawPage) {
    pg.drawRectangle({ x: 0, y: CONTENT_TOP, width, height: 50, color: WHITE });
  }

  async function ensureSpace(neededH: number) {
    if (curY - neededH < CONTENT_BOT + 10) {
      currentPage = await ensurePage(pdfDoc, ++pageIndex);
      setup(currentPage);
      coverPlaceholders(currentPage);
      curY = CONTENT_TOP;
    }
  }

  // ── Attachment A section title ──
  if (sectionTitleA) {
    const aTitleLines = wrapText(sectionTitleA, CONTENT_W, boldFont, 11);
    const aTitleH = aTitleLines.length * 14;
    await ensureSpace(aTitleH + 10);
    for (const line of aTitleLines) {
      centerText(currentPage, line, curY, width, boldFont, 11);
      curY -= 14;
    }
    curY -= 10;
  }

  // ── Attachment A tables ──
  for (const ct of customTables) {
    const entries = ct.entryIds
      .map((id) => entryMap.get(id))
      .filter(Boolean) as ExpEntry[];
    if (entries.length === 0) continue;

    const total = entries.reduce((s, e) => s + (Number(e.total_price) || 0), 0);
    const tableRows: string[][] = [
      INC_HEADERS,
      ...buildIncomeRows(entries),
      ["TOTAL", ...Array(INC_COLS.length - 2).fill(""), fmt(total)],
    ];
    const titleLines = wrapText(ct.title, CONTENT_W, boldFont, 11);
    const titleH = titleLines.length * 14;
    await ensureSpace(titleH + 4 + ROW_H * 2);
    for (const line of titleLines) {
      centerText(currentPage, line, curY, width, boldFont, 11);
      curY -= 14;
    }
    curY -= 4;

    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1, -1);
    const totalRow = tableRows[tableRows.length - 1];
    const tableX = LEFT + (CONTENT_W - INC_COLS.reduce((a, b) => a + b, 0)) / 2;
    const rightAlign = [2, 3, 4]; // Unit Price, Qty, Amount
    const allDataHeights = computeRowHeights(
      [headerRow, ...dataRows],
      INC_COLS,
      font,
      1, // Description is at index 1
      false,
    ).slice(1);

    let di = 0;
    while (di <= dataRows.length) {
      const reserved = ROW_H * 2;
      const available = curY - CONTENT_BOT - 10;
      if (available < reserved) {
        currentPage = await ensurePage(pdfDoc, ++pageIndex);
        setup(currentPage);
        coverPlaceholders(currentPage);
        curY = CONTENT_TOP;
      }
      const avail2 = curY - CONTENT_BOT - 10 - reserved;
      let usedH = 0,
        count = 0;
      while (
        di + count < dataRows.length &&
        usedH + allDataHeights[di + count] <= avail2
      ) {
        usedH += allDataHeights[di + count];
        count++;
      }
      if (count === 0 && di < dataRows.length) count = 1;
      const isLast = di + count >= dataRows.length;
      const segData = dataRows.slice(di, di + count);
      const segRows = [headerRow, ...segData, ...(isLast ? [totalRow] : [])];
      const segH =
        ROW_H +
        allDataHeights.slice(di, di + count).reduce((a, b) => a + b, 0) +
        (isLast ? ROW_H : 0);
      drawTable(
        currentPage,
        tableX,
        curY,
        INC_COLS,
        segRows,
        font,
        boldFont,
        rightAlign,
        1, // Description is at index 1
        isLast,
      );
      curY -= segH;
      di += count;
      if (isLast) break;
      currentPage = await ensurePage(pdfDoc, ++pageIndex);
      setup(currentPage);
      coverPlaceholders(currentPage);
      curY = CONTENT_TOP;
    }
    curY -= 20;
  }

  // ── Attachment B ──
  curY -= 10;

  // Attachment B section title
  if (sectionTitleB) {
    const bSecLines = wrapText(sectionTitleB, CONTENT_W, boldFont, 11);
    const bSecH = bSecLines.length * 14;
    await ensureSpace(bSecH + 10);
    for (const line of bSecLines) {
      centerText(currentPage, line, curY, width, boldFont, 11);
      curY -= 14;
    }
    curY -= 10;
  }

  const bTitle = "TABLE OF SUMMARY OF COLLECTIONS";
  const bTitleLines = wrapText(bTitle, CONTENT_W, boldFont, 11);
  const bTitleH = bTitleLines.length * 14;
  const bTableRows: string[][] = [
    ["", "No. of Students", "Amount (Php)", "Total (Php)"],
    ["Collected", String(fineStudentsPaid), fmt(fineAmount), fmt(collected)],
    ["Collectibles", String(remaining), fmt(fineAmount), fmt(collectibles)],
    ["Grand Total", "", "", fmt(grandTotal)],
  ];
  const bTableH = computeRowHeights(bTableRows, AB_COLS, font, 0, true).reduce(
    (a, b) => a + b,
    0,
  );
  await ensureSpace(bTitleH + 4 + bTableH + 10);

  for (const line of bTitleLines) {
    centerText(currentPage, line, curY, width, boldFont, 11);
    curY -= 14;
  }
  curY -= 4;

  const bTableX = LEFT + (CONTENT_W - AB_COLS.reduce((a, b) => a + b, 0)) / 2;
  drawTable(
    currentPage,
    bTableX,
    curY,
    AB_COLS,
    bTableRows,
    font,
    boldFont,
    [1, 2, 3],
    0,
    true,
  );
  curY -= bTableH + 20;

  // ── Prepared by ──
  await ensureSpace(70);
  const orgCode = faculty_code ?? campus_code ?? "";
  const designation = [orgCode, orgCode ? "- SEB" : "SEB", preparedByPosition]
    .filter(Boolean)
    .join(" ");
  drawPreparedBy(
    currentPage,
    preparedByName,
    designation,
    LEFT,
    curY - 40,
    font,
    boldFont,
  );

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
