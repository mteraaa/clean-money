"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import BalanceCards from "@/components/BalanceCards";
import WelcomeCard from "@/components/WelcomeCard";
import IncomeEntriesTable from "@/components/IncomeEntriesTable";
import ExpenseEntriesTable from "@/components/ExpenseEntriesTable";
import AddEntrySheet, { FormState } from "@/components/AddEntrySheet";

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const [balance, setBalance] = useState<{
    cash_on_bank: number;
    cash_on_hand: number;
    collectibles: number;
    faculty_code: string | null;
    campus_code: string | null;
  } | null>(null);

  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [nextControlNumbers, setNextControlNumbers] = useState({ income: 1, expense: 1 });
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [balanceKey, setBalanceKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code, full_name")
        .eq("auth_id", user.id)
        .single();

      if (!userData) return;
      setUserName(userData.full_name ?? "");

      let balanceQuery = supabase
        .from("balance_cards")
        .select("cash_on_bank, cash_on_hand, collectibles");

      if (userData.faculty_code) {
        balanceQuery = balanceQuery.eq("faculty_code", userData.faculty_code);
      } else {
        balanceQuery = balanceQuery.eq("campus_code", userData.campus_code);
      }

      const { data } = await balanceQuery.single();
      if (data)
        setBalance({
          ...data,
          faculty_code: userData.faculty_code,
          campus_code: userData.campus_code,
        });

      const { data: sem } = await supabase
        .from("semesters")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!sem) return;
      setSemesterId(sem.id);

      const scope = userData.faculty_code
        ? { col: "faculty_code", val: userData.faculty_code }
        : { col: "campus_code", val: userData.campus_code };

      const [{ count: incomeCount }, { count: expenseCount }] = await Promise.all([
        supabase.from("entries").select("id", { count: "exact", head: true }).eq("semester_id", sem.id).eq("category", "income").eq(scope.col, scope.val),
        supabase.from("entries").select("id", { count: "exact", head: true }).eq("semester_id", sem.id).eq("category", "expense").eq(scope.col, scope.val),
      ]);
      setNextControlNumbers({ income: (incomeCount ?? 0) + 1, expense: (expenseCount ?? 0) + 1 });
    })();
  }, []);

  async function handlePreview() {
    if (!balance || !semesterId) return;
    setPreviewLoading(true);
    try {
      const supabase = createClient();

      const [{ data: semData }, { data: balData }, { data: incomeEntries }, { data: expenseEntries }] =
        await Promise.all([
          supabase
            .from("semesters")
            .select("semester_name, academic_years(year_label)")
            .eq("id", semesterId)
            .single(),
          (() => {
            let q = supabase
              .from("balance_cards")
              .select("initial_account_balance, initial_cash_on_hand, initial_cash_on_bank, cash_on_hand, cash_on_bank, collectibles");
            if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
            else q = q.eq("campus_code", balance.campus_code);
            return q.single();
          })(),
          (() => {
            let q = supabase
              .from("entries")
              .select("description, total_price")
              .eq("semester_id", semesterId)
              .eq("category", "income");
            if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
            else q = q.eq("campus_code", balance.campus_code);
            return q;
          })(),
          (() => {
            let q = supabase
              .from("entries")
              .select("total_price")
              .eq("semester_id", semesterId)
              .eq("category", "expense");
            if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
            else q = q.eq("campus_code", balance.campus_code);
            return q;
          })(),
        ]);

      // Org name
      let orgName = "";
      if (balance.faculty_code) {
        const { data: fac } = await supabase
          .from("faculty_seb")
          .select("name")
          .eq("faculty_code", balance.faculty_code)
          .single();
        if (fac) orgName = `${fac.name} - Student Election Board`;
      } else if (balance.campus_code) {
        const { data: cam } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", balance.campus_code)
          .single();
        if (cam) orgName = `${cam.name} - Student Election Board`;
      }

      // Aggregate income
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

      const initialBal = Number(balData?.initial_account_balance) || 0;
      const collectiblesB = Number(balData?.collectibles) || 0;
      const totalContributions = membershipFee + donations + fines + collectiblesIncome +
        others.reduce((s, o) => s + o.amount, 0) + spRevenues;
      const totalFunds = initialBal + totalContributions + collectiblesB;
      const netFundBalance = totalFunds - totalExpenses;

      // Parse semester/year
      const semName = (semData?.semester_name ?? "").replace(/\s*semester\s*/i, "").trim();
      const yearLabel = (semData?.academic_years as { year_label?: string } | null)?.year_label ?? "";
      const [y1, y2] = yearLabel.split("-");
      const yearStart = (y1 ?? "").slice(-2);
      const yearEnd = (y2 ?? "").slice(-2);

      const { generateReport } = await import("@/utils/generateReport");
      const blob = await generateReport({
        semesterName: semName,
        yearStart,
        yearEnd,
        orgName,
        initialAccountBalance: initialBal,
        initialCashOnHand: Number(balData?.initial_cash_on_hand) || 0,
        initialCashOnBank: Number(balData?.initial_cash_on_bank) || 0,
        membershipFee,
        donations,
        fines,
        collectiblesIncome,
        others: others.slice(0, 4),
        specialProjectsRevenues: spRevenues,
        collectiblesB,
        totalFunds,
        lessExpenses: totalExpenses,
        netFundBalance,
        cashOnHand: Number(balData?.cash_on_hand) || 0,
        cashOnBank: Number(balData?.cash_on_bank) || 0,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function refreshBalance() {
    if (!balance) return;
    const supabase = createClient();
    let q = supabase.from("balance_cards").select("cash_on_bank, cash_on_hand, collectibles");
    if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
    else q = q.eq("campus_code", balance.campus_code);
    const { data, error } = await q.single();
    if (error) console.error("Balance fetch error:", error.message);
    if (data) setBalance((prev) => prev ? { ...prev, ...data } : prev);
    setBalanceKey((prev) => prev + 1);
  }

  async function handleAdd(forms: FormState[]) {
    if (!semesterId || !balance) return;
    setAddSubmitting(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddSubmitting(false); return; }

    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      const needsExtra =
        f.description_preset === "Others" ||
        (f.category === "expense" && f.description_preset === "Special Projects/Fund Raising");
      const finalDescription = needsExtra ? f.description_other : f.description_preset;

      const incomesBefore = forms.slice(0, i).filter((f) => f.category === "income").length;
      const expensesBefore = forms.slice(0, i).filter((f) => f.category === "expense").length;
      const controlNumber = f.category === "income"
        ? nextControlNumbers.income + incomesBefore
        : nextControlNumbers.expense + expensesBefore;

      const payload: Record<string, unknown> = {
        created_by: user.id,
        control_number: controlNumber,
        description: finalDescription,
        category: f.category,
        unit_price: parseFloat(f.unit_price) || 0,
        quantity: parseInt(f.quantity) || 0,
        entry_date: f.date,
        semester_id: semesterId,
      };
      if (balance.faculty_code) payload.faculty_code = balance.faculty_code;
      else payload.campus_code = balance.campus_code;

      const { error } = await supabase.from("entries").insert(payload);
      if (error) { console.error("Insert error:", error.message); setAddSubmitting(false); return; }
    }

    await refreshBalance();
    setAddSheetOpen(false);
    const addedIncome = forms.filter((f) => f.category === "income").length;
    const addedExpense = forms.filter((f) => f.category === "expense").length;
    setNextControlNumbers((prev) => ({
      income: prev.income + addedIncome,
      expense: prev.expense + addedExpense,
    }));
    setRefreshKey((prev) => prev + 1);
    setAddSubmitting(false);
  }

  return (
    <div className="bg-[#f3f4f6] min-h-full px-4 pt-3 pb-6">
      <WelcomeCard name={userName} onAdd={() => setAddSheetOpen(true)} onPreview={handlePreview} previewLoading={previewLoading} />
      {balance && (
        <>
          <BalanceCards
            key={balanceKey}
            cashOnBank={balance.cash_on_bank}
            cashOnHand={balance.cash_on_hand}
            collectibles={balance.collectibles}
            facultyCode={balance.faculty_code}
            campusCode={balance.campus_code}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ExpenseEntriesTable
              facultyCode={balance.faculty_code}
              campusCode={balance.campus_code}
              refreshKey={refreshKey}
              onMutation={() => { setRefreshKey((prev) => prev + 1); refreshBalance(); }}
            />
            <IncomeEntriesTable
              facultyCode={balance.faculty_code}
              campusCode={balance.campus_code}
              refreshKey={refreshKey}
              onMutation={() => { setRefreshKey((prev) => prev + 1); refreshBalance(); }}
            />
          </div>
        </>
      )}

      <AddEntrySheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        submitting={addSubmitting}
        nextControlNumbers={nextControlNumbers}
        onSubmit={handleAdd}
      />
    </div>
  );
}
