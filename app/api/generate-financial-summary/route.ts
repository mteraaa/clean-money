import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildSummaryPdf } from "./pdf-helpers";

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

  // Aggregate income by description
  let membershipFee = 0, donations = 0, fines = 0, collectiblesIncome = 0, spRevenues = 0;
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
    membershipFee + donations + fines + collectiblesIncome +
    Object.values(othersMap).reduce((s, a) => s + a, 0) + spRevenues;
  const totalFunds = initialBal + totalContributions + collectiblesB;
  const semName = (sem.semester_name ?? "").toUpperCase();
  const yearLabel =
    (sem.academic_years as { year_label?: string } | null)?.year_label ?? "";

  const pdfBytes = await buildSummaryPdf({
    orgName,
    isCampusOnly: !faculty_code,
    semName,
    yearLabel,
    initialBal,
    initCashHand,
    initCashBank,
    membershipFee,
    donations,
    fines,
    collectiblesIncome,
    others: Object.entries(othersMap),
    spRevenues,
    collectiblesB,
    totalFunds,
    totalExpenses,
    netFundBalance: totalFunds - totalExpenses,
    cashOnHand,
    cashOnBank,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
