import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_W = 595;
const PAGE_H = 842;
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

export async function GET() {
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

  const { data: sem } = await supabase
    .from("semesters")
    .select("id, semester_name, academic_years(year_label)")
    .eq("is_active", true)
    .single();
  if (!sem) return new NextResponse("No active semester", { status: 404 });

  // Balance card
  let balQ = supabase
    .from("balance_cards")
    .select(
      "initial_account_balance, initial_cash_on_hand, initial_cash_on_bank, cash_on_hand, cash_on_bank, collectibles",
    );
  if (faculty_code) balQ = balQ.eq("faculty_code", faculty_code);
  else balQ = balQ.eq("campus_code", campus_code!).is("faculty_code", null);
  const { data: bal } = await balQ.single();

  // Income entries
  let incQ = supabase
    .from("entries")
    .select("description, total_price")
    .eq("semester_id", sem.id)
    .eq("category", "income")
    .eq("is_deleted", false);
  if (faculty_code) incQ = incQ.eq("faculty_code", faculty_code);
  else incQ = incQ.eq("campus_code", campus_code!);
  const { data: incomeEntries } = await incQ;

  // Expense entries
  let expQ = supabase
    .from("entries")
    .select("total_price")
    .eq("semester_id", sem.id)
    .eq("category", "expense")
    .eq("is_deleted", false);
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code!);
  const { data: expenseEntries } = await expQ;

  // Org name
  let orgName = "";
  if (faculty_code) {
    const { data: fac } = await supabase
      .from("faculty_seb")
      .select("name")
      .eq("faculty_code", faculty_code)
      .single();
    orgName = fac?.name ?? "";
  } else {
    const { data: cam } = await supabase
      .from("campus_seb")
      .select("name")
      .eq("campus_code", campus_code!)
      .single();
    orgName = cam?.name ?? "";
  }

  // Aggregate income
  let membershipFee = 0,
    donations = 0,
    fines = 0,
    collectiblesIncome = 0,
    spRevenues = 0;
  const othersMap: Record<string, number> = {};
  for (const e of incomeEntries ?? []) {
    const t = Number(e.total_price) || 0;
    const desc = e.description ?? "";
    if (desc === "Membership Fee") membershipFee += t;
    else if (desc === "Donations") donations += t;
    else if (desc === "Fines") fines += t;
    else if (desc === "Collectibles") collectiblesIncome += t;
    else if (desc === "Special Projects/Fund Raising") spRevenues += t;
    else othersMap[desc] = (othersMap[desc] || 0) + t;
  }
  const others = Object.entries(othersMap);

  const totalExpenses = (expenseEntries ?? []).reduce(
    (s, e) => s + (Number(e.total_price) || 0),
    0,
  );

  const initialBal = Number(bal?.initial_account_balance) || 0;
  const initCashHand = Number(bal?.initial_cash_on_hand) || 0;
  const initCashBank = Number(bal?.initial_cash_on_bank) || 0;
  const collectiblesB = Number(bal?.collectibles) || 0;
  const cashOnHand = Number(bal?.cash_on_hand) || 0;
  const cashOnBank = Number(bal?.cash_on_bank) || 0;

  const totalContributions =
    membershipFee +
    donations +
    fines +
    collectiblesIncome +
    others.reduce((s, [, a]) => s + a, 0) +
    spRevenues;
  const totalFunds = initialBal + totalContributions + collectiblesB;
  const netFundBalance = totalFunds - totalExpenses;

  // Semester / year labels
  const rawSem = sem.semester_name ?? "";
  const semName = rawSem.toUpperCase();
  const yearLabel =
    (sem.academic_years as { year_label?: string } | null)?.year_label ?? "";

  // ── Build PDF ──
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = START_Y;

  function centerDraw(text: string, f: typeof font, sz: number) {
    const w = f.widthOfTextAtSize(text, sz);
    page.drawText(text, {
      x: (PAGE_W - w) / 2,
      y,
      size: sz,
      font: f,
      color: BLACK,
    });
    y -= sz + 6;
  }

  // Draws: label   [P]amount  (right-aligned, no dots, no underlines)
  function drawLine(
    label: string,
    amount: number,
    opts: { bold?: boolean; indent?: number; pPrefix?: boolean } = {},
  ) {
    const { bold = false, indent = 0, pPrefix = false } = opts;
    const f = bold ? boldFont : font;

    page.drawText(label, {
      x: MARGIN_L + indent,
      y,
      size: SZ,
      font: f,
      color: BLACK,
    });

    const amtStr = fmt(amount);
    const pW = pPrefix ? font.widthOfTextAtSize("P", SZ) : 0;
    const amtW = font.widthOfTextAtSize(amtStr, SZ);
    const startX = MARGIN_R - pW - amtW;

    if (pPrefix) {
      page.drawText("P", { x: startX, y, size: SZ, font, color: BLACK });
    }
    page.drawText(amtStr, { x: startX + pW, y, size: SZ, font, color: BLACK });

    y -= LINE_H;
  }

  // Breakdown row: same style as drawLine
  function drawBreakdownRow(label: string, amount: number, indent = 0) {
    drawLine(label, amount, { indent });
  }

  // ══════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════
  centerDraw(`${orgName.toUpperCase()} – STUDENT ELECTION BOARD`, boldFont, 10);
  centerDraw(`${semName}, ${yearLabel} FINANCIAL REPORT`, boldFont, 10);
  y -= LINE_H * 2; // two blank lines

  // ══════════════════════════════════════════════
  // SECTION 1 — Beginning Cash Balance
  // ══════════════════════════════════════════════
  drawLine("Beginning Cash Balance", initialBal, { bold: true, pPrefix: true });
  drawLine("Cash on Hand P", initCashHand, { indent: 24 });
  drawLine("Cash In Bank", initCashBank, { indent: 24 });
  y -= SECTION_GAP;

  // ══════════════════════════════════════════════
  // SECTION 2 — Contributions Received (Attachment A)
  // ══════════════════════════════════════════════
  page.drawText("Contributions Received: (Attachment A)", {
    x: MARGIN_L,
    y,
    size: SZ,
    font: boldFont,
    color: BLACK,
  });
  y -= LINE_H;

  if (membershipFee > 0) drawLine("Membership Fee", membershipFee);
  if (donations > 0) drawLine("Donations", donations);
  drawLine("Fines", fines);
  drawLine(
    "Collections from previous accounts receivables (collectibles)",
    collectiblesIncome,
  );

  page.drawText("Others: ", {
    x: MARGIN_L,
    y,
    size: SZ,
    color: BLACK,
  });
  for (const [label, amount] of others) {
    drawLine(`              ${label}`, amount);
  }

  if (spRevenues > 0) drawLine("Special Projects/Fund Raising", spRevenues);
  y -= SECTION_GAP;

  // ══════════════════════════════════════════════
  // SECTION 3 — Collectibles (Attachment B)
  // ══════════════════════════════════════════════
  drawLine("Collectibles (Attachment B)", collectiblesB, {
    bold: true,
    pPrefix: true,
  });
  y -= SECTION_GAP;

  // ══════════════════════════════════════════════
  // SECTION 4 — Total Funds / Expenses / Net Balance / Breakdown
  // ══════════════════════════════════════════════
  drawLine("Total Funds", totalFunds, { pPrefix: true });
  drawLine("Less: Expenses (Attachment C)", totalExpenses, { pPrefix: true });
  drawLine("Net Fund Balance", netFundBalance, {
    bold: true,
    pPrefix: true,
  });
  y -= SECTION_GAP;

  page.drawText("Breakdown:", {
    x: MARGIN_L,
    y,
    size: SZ,
    font: boldFont,
    color: BLACK,
  });
  y -= LINE_H;

  drawBreakdownRow("Cash on Hand P", cashOnHand);
  drawBreakdownRow("Cash in Bank", cashOnBank);
  drawBreakdownRow("Accounts Receivables (Collectibles)", collectiblesB);

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
