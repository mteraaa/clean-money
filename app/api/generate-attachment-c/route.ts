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
} from "./pdf-helpers";
import {
  type ExpEntry,
  STD_COLS,
  REIMB_COLS,
  STD_HEADERS,
  REIMB_HEADERS,
  buildRows,
  getPreset,
} from "./data";

const LEFT = 40,
  CONTENT_TOP = 680,
  CONTENT_BOT = 80;

type CustomTable = { title: string; entryIds: string[] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
      path.join(process.cwd(), "public", "attachment-c-template.pdf"),
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

  let expQ = supabase
    .from("entries")
    .select(
      "id, entry_date, control_number, receipt_number, description, unit_price, quantity, total_price",
    )
    .in("id", allIds)
    .eq("semester_id", sem.id)
    .eq("category", "expense")
    .order("entry_date", { ascending: true });
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code!);
  const { data: raw } = await expQ;

  const entryMap = new Map<string, ExpEntry>(
    (raw ?? []).map((e) => [String(e.id), e as ExpEntry]),
  );

  const pdfDoc = await PDFDocument.load(
    fs.readFileSync(
      path.join(process.cwd(), "public", "attachment-c-template.pdf"),
    ),
  );
  // Strip extra template pages so ensurePage always copies the clean page 0
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

  function coverTemplatePlaceholders(pg: DrawPage) {
    // Cover only the narrow band between the header bottom and CONTENT_TOP where
    // the template has placeholder text (ATTACHMENT C, TABLE 1, etc.).
    // height: 80 reaches from CONTENT_TOP up to ~y=760, below the logo at ~y=760+.
    pg.drawRectangle({ x: 0, y: CONTENT_TOP, width, height: 50, color: WHITE });
  }

  async function ensureSpace(neededH: number) {
    if (curY - neededH < CONTENT_BOT + 10) {
      currentPage = await ensurePage(pdfDoc, ++pageIndex);
      setup(currentPage);
      coverTemplatePlaceholders(currentPage);
      curY = CONTENT_TOP;
    }
  }

  for (const ct of customTables) {
    const entries = ct.entryIds
      .map((id) => entryMap.get(id))
      .filter(Boolean) as ExpEntry[];
    if (entries.length === 0) continue;

    const isReimb = entries.every(
      (e) => getPreset(e.description ?? "") === "Reimbursement",
    );
    const colWidths = isReimb ? REIMB_COLS : STD_COLS;
    const total = entries.reduce((s, e) => s + (Number(e.total_price) || 0), 0);
    const tableRows: string[][] = [
      isReimb ? REIMB_HEADERS : STD_HEADERS,
      ...buildRows(entries, isReimb),
      ["TOTAL", ...Array(colWidths.length - 2).fill(""), fmt(total)],
    ];
    const titleLines = wrapText(ct.title, CONTENT_W, boldFont, 11);
    const titleH = titleLines.length * 14;
    // Ensure space for title + at least header + 1 data row
    await ensureSpace(titleH + 4 + ROW_H * 2);
    for (const line of titleLines) {
      centerText(currentPage, line, curY, width, boldFont, 11);
      curY -= 14;
    }
    curY -= 4;

    // Paginate table rows: header row + data rows + total row
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1, -1);
    const totalRow = tableRows[tableRows.length - 1];
    const tableX = LEFT + (CONTENT_W - colWidths.reduce((a, b) => a + b, 0)) / 2;
    const rightAlign = isReimb ? [3] : [3, 4, 5];
    const allDataHeights = computeRowHeights(
      [headerRow, ...dataRows],
      colWidths,
      font,
      2,
      false,
    ).slice(1); // drop header height, keep only data row heights

    let di = 0;
    while (di <= dataRows.length) {
      // Collect data rows that fit on current page (reserve space for header + total)
      const reserved = ROW_H * 2;
      const available = curY - CONTENT_BOT - 10;
      if (available < reserved) {
        currentPage = await ensurePage(pdfDoc, ++pageIndex);
        setup(currentPage);
        coverTemplatePlaceholders(currentPage);
        curY = CONTENT_TOP;
      }
      const avail2 = curY - CONTENT_BOT - 10 - reserved;
      let usedH = 0;
      let count = 0;
      while (di + count < dataRows.length && usedH + allDataHeights[di + count] <= avail2) {
        usedH += allDataHeights[di + count];
        count++;
      }
      // Force at least 1 data row to avoid infinite loop
      if (count === 0 && di < dataRows.length) count = 1;

      const isLast = di + count >= dataRows.length;
      const segData = dataRows.slice(di, di + count);
      const segRows = [headerRow, ...segData, ...(isLast ? [totalRow] : [])];
      const segH = ROW_H + allDataHeights.slice(di, di + count).reduce((a, b) => a + b, 0) + (isLast ? ROW_H : 0);

      drawTable(currentPage, tableX, curY, colWidths, segRows, font, boldFont, rightAlign, 2, isLast);
      curY -= segH;
      di += count;

      if (isLast) break;
      currentPage = await ensurePage(pdfDoc, ++pageIndex);
      setup(currentPage);
      coverTemplatePlaceholders(currentPage);
      curY = CONTENT_TOP;
    }
    curY -= 20;
  }

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
