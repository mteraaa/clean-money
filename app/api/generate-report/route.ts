import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Coordinate constants — PDF points, origin bottom-left, A4 595×842
// ---------------------------------------------------------------------------
const SZ = 9;
const COLOR = rgb(0, 0, 0);
const X_RIGHT = 468;
const X_INDENT = 240;
const X_BREAKDOWN = 343;
const X_OTHERS_LABEL = 170;
const Y = {
  semester: 734,
  orgName: 708,
  beginBal: 670,
  beginHand: 657,
  beginBank: 644,
  membership: 617,
  donations: 604,
  fines: 591,
  collections: 578,
  others: [565, 552, 539, 525] as const,
  spRevenues: 499,
  collectiblesB: 472,
  totalFunds: 459,
  lessExpenses: 446,
  netBalance: 433,
  bdHand: 406,
  bdBank: 393,
  bdCollectibles: 380,
};

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

  // Active semester
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
  else balQ = balQ.eq("campus_code", campus_code);
  const { data: bal } = await balQ.single();

  // Income entries
  let incQ = supabase
    .from("entries")
    .select("description, total_price")
    .eq("semester_id", sem.id)
    .eq("category", "income");
  if (faculty_code) incQ = incQ.eq("faculty_code", faculty_code);
  else incQ = incQ.eq("campus_code", campus_code);
  const { data: incomeEntries } = await incQ;

  // Expense entries
  let expQ = supabase
    .from("entries")
    .select("total_price")
    .eq("semester_id", sem.id)
    .eq("category", "expense");
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code);
  const { data: expenseEntries } = await expQ;

  // Org name
  let orgName = "";
  if (faculty_code) {
    const { data: fac } = await supabase
      .from("faculty_seb")
      .select("name")
      .eq("faculty_code", faculty_code)
      .single();
    if (fac) orgName = `${fac.name} - Student Election Board`;
  } else {
    const { data: cam } = await supabase
      .from("campus_seb")
      .select("name")
      .eq("campus_code", campus_code!)
      .single();
    if (cam) orgName = `${cam.name} - Student Election Board`;
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
    if (e.description === "Membership Fee") membershipFee += t;
    else if (e.description === "Donations") donations += t;
    else if (e.description === "Fines") fines += t;
    else if (e.description === "Collectibles") collectiblesIncome += t;
    else if (e.description === "Special Projects/Fund Raising") spRevenues += t;
    else othersMap[e.description] = (othersMap[e.description] || 0) + t;
  }
  const others = Object.entries(othersMap).map(([label, amount]) => ({
    label,
    amount,
  }));
  const totalExpenses = (expenseEntries ?? []).reduce(
    (s, e) => s + (Number(e.total_price) || 0),
    0,
  );

  const initialBal = Number(bal?.initial_account_balance) || 0;
  const collectiblesB = Number(bal?.collectibles) || 0;
  const totalContributions =
    membershipFee +
    donations +
    fines +
    collectiblesIncome +
    others.reduce((s, o) => s + o.amount, 0) +
    spRevenues;
  const totalFunds = initialBal + totalContributions + collectiblesB;
  const netFundBalance = totalFunds - totalExpenses;

  // Parse semester / year
  const semName = (sem.semester_name ?? "")
    .replace(/\s*semester\s*/i, "")
    .trim();
  const yearLabel =
    (sem.academic_years as { year_label?: string } | null)?.year_label ?? "";
  const [y1, y2] = yearLabel.split("-");

  // Load template from disk (server-side — no HTTP fetch)
  const templatePath = path.join(
    process.cwd(),
    "public",
    "report-template.pdf",
  );
  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  function draw(text: string, x: number, y: number) {
    page.drawText(text, { x, y, size: SZ, font, color: COLOR });
  }

  draw(semName, 248, Y.semester);
  draw((y1 ?? "").slice(-2), 361, Y.semester);
  draw((y2 ?? "").slice(-2), 406, Y.semester);

  const orgW = font.widthOfTextAtSize(orgName, SZ);
  draw(orgName, (618 - orgW) / 2, Y.orgName);

  draw(fmt(initialBal), X_RIGHT, Y.beginBal);
  draw(fmt(Number(bal?.initial_cash_on_hand) || 0), X_INDENT, Y.beginHand);
  draw(fmt(Number(bal?.initial_cash_on_bank) || 0), X_INDENT, Y.beginBank);

  draw(fmt(membershipFee), X_RIGHT, Y.membership);
  draw(fmt(donations), X_RIGHT, Y.donations);
  draw(fmt(fines), X_RIGHT, Y.fines);
  draw(fmt(collectiblesIncome), X_RIGHT, Y.collections);

  others.slice(0, 4).forEach(({ label, amount }, i) => {
    draw(label, X_OTHERS_LABEL, Y.others[i]);
    draw(fmt(amount), X_RIGHT, Y.others[i]);
  });

  draw(fmt(spRevenues), X_INDENT, Y.spRevenues);
  draw(fmt(collectiblesB), X_RIGHT, Y.collectiblesB);
  draw(fmt(totalFunds), X_RIGHT, Y.totalFunds);
  draw(fmt(totalExpenses), X_RIGHT, Y.lessExpenses);
  draw(fmt(netFundBalance), X_RIGHT, Y.netBalance);

  draw(fmt(Number(bal?.cash_on_hand) || 0), X_BREAKDOWN, Y.bdHand);
  draw(fmt(Number(bal?.cash_on_bank) || 0), X_BREAKDOWN, Y.bdBank);
  draw(fmt(collectiblesB), X_BREAKDOWN, Y.bdCollectibles);

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="financial-report.pdf"',
    },
  });
}
