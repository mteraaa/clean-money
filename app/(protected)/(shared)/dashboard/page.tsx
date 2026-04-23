"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import BalanceCards from "@/components/BalanceCards";
import WelcomeCard from "@/components/WelcomeCard";
import IncomeEntriesTable from "@/components/IncomeEntriesTable";
import ExpenseEntriesTable from "@/components/ExpenseEntriesTable";
import AddEntrySheet, { FormState } from "@/components/AddEntrySheet";
import PDFViewerCard from "@/components/PDFViewerCard";
import PublishDialog from "@/components/PublishDialog";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

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

      if (userData.faculty_code) {
        const { data: facData } = await supabase
          .from("faculty_seb")
          .select("name")
          .eq("faculty_code", userData.faculty_code)
          .single();
        setUserName(facData?.name ?? "");
      } else if (userData.campus_code) {
        const { data: camData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        setUserName(camData?.name ?? "");
      }

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
      <WelcomeCard name={userName} onAdd={() => setAddSheetOpen(true)} onPreview={() => setPreviewOpen(true)} onPublish={() => setPublishOpen(true)} />
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

      <PDFViewerCard open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />

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
