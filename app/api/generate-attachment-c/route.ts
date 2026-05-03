import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const HEADER_GREEN = rgb(27 / 255, 77 / 255, 48 / 255); // VSU/SEB dark forest green
const ROW_H = 17;

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

type DrawPage = ReturnType<PDFDocument["getPages"]>[0];
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

function centerText(
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

function drawTable(
  page: DrawPage,
  x: number,
  y: number,
  colWidths: number[],
  rows: string[][],
  font: Font,
  boldFont: Font,
  headerRows = 1,
  rightAlignCols: number[] = [],
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
      const isCenter = r < headerRows;
      const isRight = rightAlignCols.includes(c) && r >= headerRows;
      const tx = isRight
        ? cx + colWidths[c] - textW - 4
        : isCenter
          ? cx + (colWidths[c] - textW) / 2
          : cx + 4;
      page.drawText(cellText, {
        x: Math.max(cx + 2, tx),
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

  const attachCTitle = searchParams.get("attachCTitle") ?? "";
  const table1Name =
    searchParams.get("table1Name") ??
    "TABLE 1. YEAR-END BREAKDOWN OF EXPENSES";

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
    .select("id, semester_name, academic_years(year_label)")
    .eq("is_active", true)
    .single();
  if (!sem) return new NextResponse("No active semester", { status: 404 });

  // Expense entries for Table 1
  let expQ = supabase
    .from("entries")
    .select(
      "entry_date, control_number, description, unit_price, quantity, total_price",
    )
    .eq("semester_id", sem.id)
    .eq("category", "expense")
    .order("entry_date", { ascending: true });
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code!);
  const { data: expenseEntries } = await expQ;

  // Semester/year label for title fallback
  const yearLabel =
    (sem.academic_years as { year_label?: string } | null)?.year_label ?? "";
  const semName = (sem.semester_name ?? "").replace(/\s*semester\s*/i, "").trim();

  // Load template
  const templatePath = path.join(
    process.cwd(),
    "public",
    "attachment-c-template.pdf",
  );
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const montserratBytes = fs.readFileSync(
    path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf"),
  );
  const montserrat = await pdfDoc.embedFont(montserratBytes);

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { width } = page.getSize();

  const LEFT = 40;
  const RIGHT = width - 40;
  const CONTENT_W = RIGHT - LEFT;
  const CONTENT_TOP = 755;
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

  // ── Dynamic header/footer overlay ──
  // Faculty name in header (above STUDENT ELECTION BOARD)
  page.drawRectangle({ x: 200, y: 800, width: 330, height: 24, color: WHITE });
  page.drawText(facultyName.toUpperCase(), {
    x: 205,
    y: 804,
    size: 14,
    font: montserrat,
    color: HEADER_GREEN,
  });

  // Faculty name in footer (above STUDENT ELECTION BOARD)
  page.drawRectangle({ x: 44, y: 50, width: 200, height: 12, color: WHITE });
  draw(page, facultyName, 45, 51, boldFont, 7);

  // Email in footer
  page.drawRectangle({ x: 44, y: 22, width: 200, height: 10, color: WHITE });
  draw(page, email, 79, 23, font, 7);

  // ── Clear content area ──
  page.drawRectangle({
    x: LEFT,
    y: CONTENT_BOT,
    width: CONTENT_W,
    height: CONTENT_TOP - CONTENT_BOT,
    color: WHITE,
  });

  let curY = CONTENT_TOP;

  // "ATTACHMENT C"
  const mainTitle = attachCTitle || "ATTACHMENT C";
  centerText(page, mainTitle, curY, width, boldFont, 11);
  curY -= 22;

  // ── Table 1: Expense breakdown ──
  if (table1Name) {
    draw(page, table1Name, LEFT, curY, boldFont, 8.5);
    curY -= 16;
  }

  const colT1 = [70, 80, 200, 65, 80];
  const t1X = LEFT + (CONTENT_W - colT1.reduce((a, b) => a + b, 0)) / 2;

  const expRows = (expenseEntries ?? []).map((e) => [
    fmtDate(e.entry_date ?? ""),
    String(e.control_number ?? ""),
    e.description ?? "",
    fmt(Number(e.unit_price) || 0),
    fmt(Number(e.total_price) || 0),
  ]);
  const totalExpenses = (expenseEntries ?? []).reduce(
    (s, e) => s + (Number(e.total_price) || 0),
    0,
  );

  const t1Rows: string[][] = [
    ["Date", "OR/TR No.", "Description", "Unit Price", "Amount"],
    ...expRows,
    ["TOTAL", "", "", "", fmt(totalExpenses)],
  ];
  drawTable(page, t1X, curY, colT1, t1Rows, font, boldFont, 1, [3, 4]);

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
