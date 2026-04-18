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

    // Compute balance deltas
    let handDelta = 0;
    let collDelta = 0;
    for (const f of forms) {
      const total = (parseFloat(f.unit_price) || 0) * (parseInt(f.quantity) || 0);
      if (f.category === "income") {
        if (f.description_preset === "Collectibles") collDelta -= total;
        handDelta += total;
      } else {
        handDelta -= total;
      }
    }

    // Fetch current balance and apply deltas
    let balFetchQuery = supabase
      .from("balance_cards")
      .select("cash_on_bank, cash_on_hand, collectibles");
    if (balance.faculty_code) balFetchQuery = balFetchQuery.eq("faculty_code", balance.faculty_code);
    else balFetchQuery = balFetchQuery.eq("campus_code", balance.campus_code);
    const { data: currentBal } = await balFetchQuery.single();

    if (currentBal) {
      const newHand = currentBal.cash_on_hand + handDelta;
      const newColl = currentBal.collectibles + collDelta;
      const newBank = currentBal.cash_on_bank;

      let balUpdateQuery = supabase.from("balance_cards").update({
        cash_on_hand: newHand,
        collectibles: newColl,
        account_balance: newBank + newHand + newColl,
      });
      if (balance.faculty_code) balUpdateQuery = balUpdateQuery.eq("faculty_code", balance.faculty_code);
      else balUpdateQuery = balUpdateQuery.eq("campus_code", balance.campus_code);
      await balUpdateQuery;

      setBalance((prev) => prev ? { ...prev, cash_on_hand: newHand, collectibles: newColl } : prev);
      setBalanceKey((prev) => prev + 1);
    }

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
      <WelcomeCard name={userName} onAdd={() => setAddSheetOpen(true)} />
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
              onMutation={() => setRefreshKey((prev) => prev + 1)}
            />
            <IncomeEntriesTable
              facultyCode={balance.faculty_code}
              campusCode={balance.campus_code}
              refreshKey={refreshKey}
              onMutation={() => setRefreshKey((prev) => prev + 1)}
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
