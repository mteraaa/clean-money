import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import {
  BLACK,
  fmt,
  type DrawPage,
  type PageSetupOpts,
  centerText,
  drawTable,
  setupPage,
  ensurePage,
  calcTableH,
  drawPreparedBy,
} from "./pdf-helpers";
import {
  PRESET_ORDER,
  type ExpEntry,
  STD_COLS,
  REIMB_COLS,
  STD_HEADERS,
  REIMB_HEADERS,
  buildRows,
  groupEntries,
} from "./data";

const LEFT = 40,
  CONTENT_TOP = 680,
  CONTENT_BOT = 80;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const attachCTitle = searchParams.get("attachCTitle") || "ATTACHMENT C";
  const preparedByName = searchParams.get("preparedByName") ?? "";
  const preparedByPosition = searchParams.get("preparedByPosition") ?? "";
  let tableTitles: Record<string, string> = {};
  try {
    tableTitles = JSON.parse(searchParams.get("tableTitles") ?? "{}");
  } catch {
    /* empty */
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
      "entry_date, control_number, description, unit_price, quantity, total_price",
    )
    .eq("semester_id", sem.id)
    .eq("category", "expense")
    .order("entry_date", { ascending: true });
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code!);
  const { data: raw } = await expQ;

  const groups = groupEntries((raw ?? []) as ExpEntry[]);
  const activePresets = PRESET_ORDER.filter(
    (p) => (groups.get(p)?.length ?? 0) > 0,
  );

  const pdfDoc = await PDFDocument.load(
    fs.readFileSync(
      path.join(process.cwd(), "public", "attachment-c-template.pdf"),
    ),
  );
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

  async function ensureSpace(neededH: number) {
    if (curY - neededH < CONTENT_BOT + 10) {
      currentPage = await ensurePage(pdfDoc, ++pageIndex);
      setup(currentPage);
      curY = CONTENT_TOP;
    }
  }

  centerText(currentPage, attachCTitle, curY, width, boldFont, 11);
  curY -= 22;

  for (let ti = 0; ti < activePresets.length; ti++) {
    const preset = activePresets[ti];
    const entries = groups.get(preset) ?? [];
    const isReimb = preset === "Reimbursement";
    const colWidths = isReimb ? REIMB_COLS : STD_COLS;
    const total = entries.reduce((s, e) => s + (Number(e.total_price) || 0), 0);
    const tableRows: string[][] = [
      isReimb ? REIMB_HEADERS : STD_HEADERS,
      ...buildRows(entries, isReimb),
      ["TOTAL", ...Array(colWidths.length - 2).fill(""), fmt(total)],
    ];
    const tableH = calcTableH(tableRows, colWidths, font);
    await ensureSpace(16 + tableH);
    currentPage.drawText(
      tableTitles[preset] ?? `TABLE ${ti + 1}. ${preset.toUpperCase()}`,
      { x: LEFT, y: curY, size: 8.5, font: boldFont, color: BLACK },
    );
    curY -= 16;
    drawTable(
      currentPage,
      LEFT + (CONTENT_W - colWidths.reduce((a, b) => a + b, 0)) / 2,
      curY,
      colWidths,
      tableRows,
      font,
      boldFont,
      isReimb ? [3] : [3, 4, 5],
    );
    curY -= tableH + 20;
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
