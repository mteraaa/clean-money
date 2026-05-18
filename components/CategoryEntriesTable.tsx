"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddEntrySheet, {
  emptyForm,
  FormState,
  INCOME_DESCRIPTIONS,
} from "@/components/AddEntrySheet";

const INCOME_NO_SUFFIX = [
  "Membership Fee",
  "Donations",
  "Fines",
  "Collectibles",
  "Special Projects/Fund Raising",
];

type Entry = {
  id: number;
  control_number: number;
  description: string;
  category: "income" | "expense";
  unit_price: number;
  quantity: number;
  entry_date: string;
};

function entryToForm(entry: Entry): FormState {
  const { category, description, unit_price, quantity, entry_date } = entry;
  let description_preset = "";
  let description_other = "";
  let payee = "";

  if (category === "income") {
    if (INCOME_DESCRIPTIONS.includes(description) && description !== "Others") {
      description_preset = description;
    } else {
      description_preset = "Others";
      description_other = description;
    }
  } else {
    if (description.startsWith("Special Projects/Fund Raising")) {
      description_preset = "Special Projects/Fund Raising";
      description_other = description.replace("Special Projects/Fund Raising — ", "");
    } else if (description.startsWith("Reimbursement")) {
      description_preset = "Reimbursement";
      const inner = description.replace("Reimbursement — ", "");
      const parts = inner.split(" — ");
      if (parts.length >= 2) {
        payee = parts[0];
        description_other = parts.slice(1).join(" — ");
      } else {
        description_other = inner;
      }
    } else {
      description_preset = "Others";
      description_other = description;
    }
  }

  return {
    date: entry_date,
    description_preset,
    description_other,
    payee,
    category,
    unit_price: String(unit_price),
    quantity: String(quantity),
  };
}

function formatPeso(amount: number) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

type Props = {
  category: "income" | "expense";
  facultyCode?: string | null;
  campusCode?: string | null;
  refreshKey: number;
  onMutation?: () => void;
  isPublished?: boolean;
};

export default function CategoryEntriesTable({
  category,
  facultyCode,
  campusCode,
  refreshKey,
  onMutation,
  isPublished = false,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editErrors, setEditErrors] = useState<Record<string, boolean>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function fetchEntries(
    supabase: ReturnType<typeof createClient>,
    semId: number,
  ) {
    let query = supabase
      .from("entries")
      .select(
        "id, control_number, description, category, unit_price, quantity, entry_date",
      )
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
    if (!facultyCode && !campusCode) return;
    const supabase = createClient();
    (async () => {
      const { data: sem, error: semError } = await supabase
        .from("semesters")
        .select("id")
        .eq("is_active", true)
        .single();

      if (semError) {
        console.error("Semester error:", semError.message);
        return;
      }
      if (!sem) return;

      setSemesterId(sem.id);
      await fetchEntries(supabase, sem.id);
    })();
  }, [facultyCode, campusCode, refreshKey]);

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const deleted = entries.filter((e) => selectedIds.has(e.id));
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from("entries")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .in("id", ids);
    if (error) { console.error("Bulk delete error:", error.message); return; }

    setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    onMutation?.();

    const label = `${category === "income" ? "income" : "expense"} ${deleted.length === 1 ? "entry" : "entries"}`;
    toast.error(`Deleted ${deleted.length} ${label}`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await supabase
            .from("entries")
            .update({ is_deleted: false, deleted_at: null, deleted_by: null })
            .in("id", ids);
          if (semesterId) await fetchEntries(createClient(), semesterId);
          onMutation?.();
        },
      },
    });

    deleted.forEach((e) => logActivity({
      description: `Deleted "${e.description}" from ${category === "income" ? "Income" : "Expense"} entries`,
      action: "DELETE_ENTRY",
      facultyCode,
      campusCode,
      targetTable: "entries",
      targetId: e.id,
    }).catch(() => {}));
  }

  async function handleDelete(id: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const entry = entries.find((e) => e.id === id);

    const { error } = await supabase
      .from("entries")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .eq("id", id);
    if (error) { console.error("Delete error:", error.message); return; }

    setEntries((prev) => prev.filter((e) => e.id !== id));
    onMutation?.();

    if (entry) {
      toast.error(`Deleted "${entry.description}"`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await supabase
              .from("entries")
              .update({ is_deleted: false, deleted_at: null, deleted_by: null })
              .eq("id", id);
            if (semesterId) await fetchEntries(createClient(), semesterId);
            onMutation?.();
          },
        },
      });
      logActivity({
        description: `Deleted "${entry.description}" from ${category === "income" ? "Income" : "Expense"} entries`,
        action: "DELETE_ENTRY",
        facultyCode,
        campusCode,
        targetTable: "entries",
        targetId: id,
      }).catch(() => {});
    }
  }

  function openEditSheet(entry: Entry) {
    setEditingEntry(entry);
    setEditForm(entryToForm(entry));
    setEditErrors({});
    setEditSheetOpen(true);
  }

  async function handleEditSave() {
    const editNeedsExtra =
      editForm.description_preset === "Others" ||
      (editForm.category === "expense" &&
        editForm.description_preset === "Special Projects/Fund Raising") ||
      (editForm.category === "expense" &&
        editForm.description_preset === "Reimbursement");
    const finalDescription = editNeedsExtra
      ? editForm.description_other
      : editForm.description_preset;
    const newErrors = {
      description: !finalDescription,
      date: !editForm.date,
      unit_price: !editForm.unit_price,
      quantity: !editForm.quantity,
    };
    setEditErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    if (!editingEntry) return;

    setEditSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("entries")
      .update({
        description: finalDescription,
        category: editForm.category,
        unit_price: parseFloat(editForm.unit_price) || 0,
        quantity: parseInt(editForm.quantity) || 0,
        entry_date: editForm.date,
      })
      .eq("id", editingEntry.id);

    if (error) {
      console.error("Update error:", error.message);
    } else {
      setEditSheetOpen(false);
      toast.success(`Edited "${finalDescription}"`);
      logActivity({
        description: `Edited "${finalDescription}" in ${category === "income" ? "Income" : "Expense"} entries`,
        action: "EDIT_ENTRY",
        facultyCode,
        campusCode,
        targetTable: "entries",
        targetId: editingEntry.id,
      }).catch(() => {});
      setEditingEntry(null);
      if (semesterId) await fetchEntries(createClient(), semesterId);
    }

    setEditSubmitting(false);
  }

  const title = category === "income" ? "Income Entries" : "Expense Entries";

  return (
    <>
      <div className="bg-white rounded-xl shadow-md font-lexend">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          {!isPublished && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectMode}
                className={`border rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectMode
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
              {selectMode && (
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E5E7EB] text-gray-700 font-semibold text-left">
                {selectMode && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === entries.length &&
                        entries.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-3 w-10">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectMode ? 8 : 7}
                    className="text-center py-10 text-gray-400"
                  >
                    No entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedIds.has(entry.id) ? "bg-gray-100" : ""
                    }`}
                  >
                    {selectMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {entry.category === "expense" &&
                      entry.description.startsWith(
                        "Special Projects/Fund Raising",
                      )
                        ? entry.description.replace(
                            "Special Projects/Fund Raising — ",
                            "",
                          )
                        : entry.description}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatPeso(entry.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {entry.quantity}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${category === "income" ? "text-green-500" : "text-red-500"}`}
                    >
                      {category === "income" ? "+" : "-"}
                      {formatPeso(entry.unit_price * entry.quantity)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-4 py-3">
                      {!isPublished && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSheet(entry)}>
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEntrySheet
        mode="edit"
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        form={editForm}
        setForm={setEditForm}
        errors={editErrors}
        setErrors={setEditErrors}
        submitting={editSubmitting}
        nextControlNumber={editingEntry?.control_number ?? 0}
        onSubmit={handleEditSave}
      />
    </>
  );
}
