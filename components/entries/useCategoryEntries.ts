"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { emptyForm, type FormState } from "./entryFormTypes";
import { type Entry, entryToForm } from "./entryUtils";
import { useEntryDelete } from "./useEntryDelete";

type Options = {
  category: "income" | "expense";
  facultyCode?: string | null;
  campusCode?: string | null;
  refreshKey: number;
  onMutation?: () => void;
};

export function useCategoryEntries({ category, facultyCode, campusCode, refreshKey, onMutation }: Options) {
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editErrors, setEditErrors] = useState<Record<string, boolean>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function fetchEntries(supabase: ReturnType<typeof createClient>, semId: number) {
    let query = supabase
      .from("entries")
      .select("id, control_number, description, category, unit_price, quantity, entry_date")
      .eq("semester_id", semId)
      .eq("category", category)
      .eq("is_deleted", false)
      .order("entry_date", { ascending: false });
    if (facultyCode) query = query.eq("faculty_code", facultyCode);
    else query = query.eq("campus_code", campusCode);
    const { data, error } = await query;
    if (error) console.error("Fetch error:", error.message);
    if (data) setEntries(data);
  }

  useEffect(() => {
    if (!facultyCode && !campusCode) { setIsLoading(false); return; }
    const supabase = createClient();
    (async () => {
      const { data: sem, error: semError } = await supabase
        .from("semesters").select("id").eq("is_active", true).single();
      if (semError) { console.error("Semester error:", semError.message); setIsLoading(false); return; }
      if (!sem) { setIsLoading(false); return; }
      setSemesterId(sem.id);
      await fetchEntries(supabase, sem.id);
      setIsLoading(false);
    })();
  }, [facultyCode, campusCode, refreshKey]);

  const refetch = async () => { if (semesterId) await fetchEntries(createClient(), semesterId); };

  const { handleBulkDelete: _bulkDelete, handleDelete } = useEntryDelete({
    category, facultyCode, campusCode, onMutation,
    entries, setEntries, semesterId,
    setSelectMode, setSelectedIds, refetch,
  });

  function toggleSelectMode() { setSelectMode((v) => !v); setSelectedIds(new Set()); }
  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === entries.length ? new Set() : new Set(entries.map((e) => e.id)));
  }
  async function handleBulkDelete() { await _bulkDelete(selectedIds); }

  function openEditSheet(entry: Entry) {
    setEditingEntry(entry);
    setEditForm(entryToForm(entry));
    setEditErrors({});
    setEditSheetOpen(true);
  }

  async function handleEditSave() {
    const editNeedsExtra =
      editForm.description_preset === "Others" ||
      (editForm.category === "expense" && editForm.description_preset === "Special Projects/Fund Raising") ||
      (editForm.category === "expense" && editForm.description_preset === "Reimbursement");
    const finalDescription = editNeedsExtra ? editForm.description_other : editForm.description_preset;
    const newErrors = {
      description: !finalDescription, date: !editForm.date,
      unit_price: !editForm.unit_price, quantity: !editForm.quantity,
    };
    setEditErrors(newErrors);
    if (Object.values(newErrors).some(Boolean) || !editingEntry) return;
    setEditSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("entries").update({
      description: finalDescription, category: editForm.category,
      unit_price: parseFloat(editForm.unit_price) || 0,
      quantity: parseInt(editForm.quantity) || 0,
      entry_date: editForm.date,
    }).eq("id", editingEntry.id);
    if (error) {
      console.error("Update error:", error.message);
    } else {
      setEditSheetOpen(false);
      toast.success(`Edited "${finalDescription}"`);
      logActivity({
        description: `Edited "${finalDescription}" in ${category === "income" ? "Income" : "Expense"} entries`,
        action: "EDIT_ENTRY", facultyCode, campusCode, targetTable: "entries", targetId: editingEntry.id,
      }).catch(() => {});
      setEditingEntry(null);
      await refetch();
    }
    setEditSubmitting(false);
  }

  return {
    entries, isLoading, selectMode, selectedIds,
    editSheetOpen, editingEntry, editForm, editErrors, editSubmitting,
    setEditSheetOpen, setEditForm, setEditErrors,
    toggleSelectMode, toggleSelect, toggleSelectAll,
    handleBulkDelete, handleDelete, openEditSheet, handleEditSave,
  };
}
