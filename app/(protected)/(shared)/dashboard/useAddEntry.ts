"use client";

import { useState } from "react";
import type React from "react";
import { createClient } from "@/utils/supabase/client";
import { type FormState } from "@/components/entries/AddEntrySheet";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import type { Balance, SemesterMeta } from "./types";
import { uploadEntryReceipt } from "./uploadEntryReceipt";

type Deps = {
  balance: Balance | null;
  semesterId: number | null;
  semesterMeta: SemesterMeta | null;
  nextControlNumbers: { income: number; expense: number };
  setNextControlNumbers: React.Dispatch<React.SetStateAction<{ income: number; expense: number }>>;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  refreshBalance: () => Promise<void>;
};

export function useAddEntry({
  balance,
  semesterId,
  semesterMeta,
  nextControlNumbers,
  setNextControlNumbers,
  setRefreshKey,
  refreshBalance,
}: Deps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  async function handleAdd(forms: FormState[]) {
    if (!semesterId || !balance) return;
    setAddSubmitting(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddSubmitting(false); return; }

    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      const isReimbursement = f.category === "expense" && f.description_preset === "Reimbursement";
      const needsExtra =
        f.description_preset === "Others" ||
        (f.category === "expense" && f.description_preset === "Special Projects/Fund Raising") ||
        isReimbursement;
      const finalDescription = isReimbursement
        ? `Reimbursement — ${f.payee ? f.payee + " — " : ""}${f.description_other}`
        : needsExtra
          ? f.description_other
          : f.description_preset;

      const incomesBefore = forms.slice(0, i).filter((f) => f.category === "income").length;
      const expensesBefore = forms.slice(0, i).filter((f) => f.category === "expense").length;
      const controlNumber =
        f.category === "income"
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
      if (f.receipt && f.receipt_number) payload.receipt_number = f.receipt_number;
      if (balance.faculty_code) payload.faculty_code = balance.faculty_code;
      else payload.campus_code = balance.campus_code;

      const { data: entryData, error } = await supabase
        .from("entries").insert(payload).select("id").single();
      if (error) {
        console.error("Insert error:", error.message);
        setAddSubmitting(false);
        return;
      }

      const amt = (parseFloat(f.unit_price) || 0) * (parseInt(f.quantity) || 0);
      const fmtAmt = `₱${amt.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      toast.success(`Added ${fmtAmt} to ${f.category === "income" ? "Income" : "Expenses"} for ${finalDescription}`);
      logActivity({
        description: `Added ${fmtAmt} to ${f.category === "income" ? "Income" : "Expenses"} for ${finalDescription}`,
        action: "ADD_ENTRY",
        facultyCode: balance.faculty_code,
        campusCode: balance.campus_code,
        targetTable: "entries",
        targetId: entryData.id,
      }).catch(() => {});

      if (f.receipt && semesterMeta) {
        await uploadEntryReceipt(supabase, user.id, f.receipt, entryData.id, balance, semesterId, semesterMeta);
      }
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

  return { addSheetOpen, setAddSheetOpen, addSubmitting, handleAdd };
}
