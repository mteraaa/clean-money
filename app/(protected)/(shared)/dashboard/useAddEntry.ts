"use client";

import { useState } from "react";
import type React from "react";
import { createClient } from "@/utils/supabase/client";
import { type FormState } from "@/components/entries/AddEntrySheet";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import type { Balance, SemesterMeta } from "./types";

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

  async function uploadReceipt(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    file: File,
    entryId: number,
  ) {
    if (!balance || !semesterId || !semesterMeta) return;

    const bucket = balance.faculty_code ? "Faculties" : "Campus SEB";
    let folderName = "";
    let storageFolderPath = "";

    if (balance.faculty_code) {
      const { data: facData } = await supabase
        .from("faculty_seb").select("campus_code")
        .eq("faculty_code", balance.faculty_code).single();
      const { data: campusData } = await supabase
        .from("campus_seb").select("name")
        .eq("campus_code", facData?.campus_code).single();
      const campusName = campusData?.name ?? "";
      folderName = `${balance.faculty_code}-SEB Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
      storageFolderPath = `${campusName}/${balance.faculty_code}/Receipts/${folderName}`;
    } else {
      const { data: campusData } = await supabase
        .from("campus_seb").select("name")
        .eq("campus_code", balance.campus_code).single();
      const campusName = campusData?.name ?? balance.campus_code ?? "";
      folderName = `SEB-${campusName} Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
      storageFolderPath = `${balance.campus_code}/Receipts/${folderName}`;
    }

    const folderQ = supabase.from("receipt_archive_folders").select("id")
      .eq("semester_id", semesterId).eq("folder_name", folderName);
    if (balance.faculty_code) folderQ.eq("faculty_code", balance.faculty_code);
    else folderQ.eq("campus_code", balance.campus_code);
    let { data: folderData } = await folderQ.maybeSingle();

    if (!folderData) {
      const newFolder: Record<string, unknown> = {
        folder_name: folderName, semester_id: semesterId, created_by: userId,
      };
      if (balance.faculty_code) newFolder.faculty_code = balance.faculty_code;
      else newFolder.campus_code = balance.campus_code;
      const { data: created } = await supabase
        .from("receipt_archive_folders").insert(newFolder).select("id").single();
      folderData = created;
    }
    if (!folderData) return;

    const ext = file.name.split(".").pop() ?? "";
    const storedName = `${Date.now()}-${file.name}`;
    const filePath = `${storageFolderPath}/${storedName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket).upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { console.error("Receipt upload error:", uploadError.message); return; }

    await supabase.from("receipt_archive_files").insert({
      folder_id: folderData.id,
      entry_receipt_id: entryId,
      original_name: file.name,
      stored_name: storedName,
      file_path: filePath,
      file_size_bytes: file.size,
      mime_type: file.type || `image/${ext}`,
      added_by: userId,
      added_at: new Date().toISOString(),
    });
  }

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
        await uploadReceipt(supabase, user.id, f.receipt, entryData.id);
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
