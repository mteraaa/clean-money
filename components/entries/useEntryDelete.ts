"use client";

import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { type Entry } from "./entryUtils";

type Options = {
  category: "income" | "expense";
  facultyCode?: string | null;
  campusCode?: string | null;
  onMutation?: () => void;
  entries: Entry[];
  setEntries: (fn: (prev: Entry[]) => Entry[]) => void;
  semesterId: number | null;
  setSelectMode: (v: boolean) => void;
  setSelectedIds: (s: Set<number>) => void;
  refetch: () => Promise<void>;
};

export function useEntryDelete({
  category, facultyCode, campusCode, onMutation,
  entries, setEntries, semesterId,
  setSelectMode, setSelectedIds, refetch,
}: Options) {
  const categoryLabel = category === "income" ? "Income" : "Expense";

  async function handleBulkDelete(selectedIds: Set<number>) {
    if (selectedIds.size === 0) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const deleted = entries.filter((e) => selectedIds.has(e.id));
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("entries")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .in("id", ids);
    if (error) { console.error("Bulk delete error:", error.message); return; }
    setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    onMutation?.();
    const label = `${category} ${deleted.length === 1 ? "entry" : "entries"}`;
    toast.error(`Deleted ${deleted.length} ${label}`, {
      action: { label: "Undo", onClick: async () => {
        await supabase.from("entries").update({ is_deleted: false, deleted_at: null, deleted_by: null }).in("id", ids);
        await refetch();
        onMutation?.();
      }},
    });
    deleted.forEach((e) => logActivity({
      description: `Deleted "${e.description}" from ${categoryLabel} entries`,
      action: "DELETE_ENTRY", facultyCode, campusCode, targetTable: "entries", targetId: e.id,
    }).catch(() => {}));
  }

  async function handleDelete(id: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const entry = entries.find((e) => e.id === id);
    const { error } = await supabase.from("entries")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .eq("id", id);
    if (error) { console.error("Delete error:", error.message); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    onMutation?.();
    if (entry) {
      toast.error(`Deleted "${entry.description}"`, {
        action: { label: "Undo", onClick: async () => {
          await supabase.from("entries").update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq("id", id);
          await refetch();
          onMutation?.();
        }},
      });
      logActivity({
        description: `Deleted "${entry.description}" from ${categoryLabel} entries`,
        action: "DELETE_ENTRY", facultyCode, campusCode, targetTable: "entries", targetId: id,
      }).catch(() => {});
    }
  }

  return { handleBulkDelete, handleDelete };
}
