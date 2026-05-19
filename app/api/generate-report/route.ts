import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildReportPdf, type ReportData, type CertFields } from "./pdf-helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cert: CertFields = {
    receiver: searchParams.get("receiver") ?? "",
    designation: searchParams.get("designation") ?? "",
    dateDeposited: searchParams.get("dateDeposited") ?? "",
    amount: searchParams.get("amount") ?? "",
    treasurer: searchParams.get("treasurer") ?? "",
    auditDate: searchParams.get("auditDate") ?? "",
    auditor: searchParams.get("auditor") ?? "",
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  let balQ = supabase
    .from("balance_cards")
    .select("initial_account_balance, initial_cash_on_hand, initial_cash_on_bank, cash_on_hand, cash_on_bank, collectibles");
  if (faculty_code) balQ = balQ.eq("faculty_code", faculty_code);
  else balQ = balQ.eq("campus_code", campus_code);
  const { data: bal } = await balQ.single();

  let incQ = supabase
    .from("entries")
    .select("description, total_price")
    .eq("semester_id", sem.id)
    .eq("category", "income");
  if (faculty_code) incQ = incQ.eq("faculty_code", faculty_code);
  else incQ = incQ.eq("campus_code", campus_code);
  const { data: incomeEntries } = await incQ;

  let expQ = supabase
    .from("entries")
    .select("total_price")
    .eq("semester_id", sem.id)
    .eq("category", "expense");
  if (faculty_code) expQ = expQ.eq("faculty_code", faculty_code);
  else expQ = expQ.eq("campus_code", campus_code);
  const { data: expenseEntries } = await expQ;

  let orgName = "";
  if (faculty_code) {
    const { data: fac } = await supabase.from("faculty_seb").select("name").eq("faculty_code", faculty_code).single();
    if (fac) orgName = `${fac.name} - Student Election Board`;
  } else {
    const { data: cam } = await supabase.from("campus_seb").select("name").eq("campus_code", campus_code!).single();
    if (cam) orgName = `${cam.name} - Student Election Board`;
  }

  let membershipFee = 0, donations = 0, fines = 0, collectiblesIncome = 0, spRevenues = 0;
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
  const others = Object.entries(othersMap).map(([label, amount]) => ({ label, amount }));
  const totalExpenses = (expenseEntries ?? []).reduce((s, e) => s + (Number(e.total_price) || 0), 0);
  const initialBal = Number(bal?.initial_account_balance) || 0;
  const collectiblesB = Number(bal?.collectibles) || 0;
  const totalFunds = initialBal + membershipFee + donations + fines + collectiblesIncome
    + others.reduce((s, o) => s + o.amount, 0) + spRevenues + collectiblesB;

  const semName = (sem.semester_name ?? "").replace(/\s*semester\s*/i, "").trim();
  const yearLabel = (sem.academic_years as { year_label?: string } | null)?.year_label ?? "";
  const [y1 = "", y2 = ""] = yearLabel.split("-");

  const data: ReportData = {
    semName, y1, y2, orgName,
    initialBal,
    initCashHand: Number(bal?.initial_cash_on_hand) || 0,
    initCashBank: Number(bal?.initial_cash_on_bank) || 0,
    membershipFee, donations, fines, collectiblesIncome, others, spRevenues,
    collectiblesB, totalFunds, totalExpenses,
    netFundBalance: totalFunds - totalExpenses,
    cashOnHand: Number(bal?.cash_on_hand) || 0,
    cashOnBank: Number(bal?.cash_on_bank) || 0,
  };

  const pdfBytes = await buildReportPdf(data, cert);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" },
  });
}
