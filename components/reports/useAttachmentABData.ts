"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export type EntryOption = { id: string; description: string };
export type RowDef = { rowId: string; entryId: string };
export type TableGroup = { tableId: string; title: string; rows: RowDef[] };
type CustomTableParam = { title: string; entryIds: string[] };

let _counter = 0;
const uid = () => String(_counter++);
export const newRow = (): RowDef => ({ rowId: uid(), entryId: "" });
export const newTable = (n: number): TableGroup => ({
  tableId: uid(),
  title: `TABLE ${n}`,
  rows: [newRow()],
});

function buildUrl(
  tables: TableGroup[],
  sectionTitleA: string,
  sectionTitleB: string,
  preparedByName: string,
  preparedByPosition: string,
): string | null {
  const custom: CustomTableParam[] = tables
    .map((t) => ({
      title: t.title,
      entryIds: t.rows.filter((r) => r.entryId).map((r) => r.entryId),
    }))
    .filter((t) => t.entryIds.length > 0);
  if (custom.length === 0) return null;
  const p = new URLSearchParams({ t: Date.now().toString() });
  if (sectionTitleA) p.set("sectionTitleA", sectionTitleA);
  if (sectionTitleB) p.set("sectionTitleB", sectionTitleB);
  if (preparedByName) p.set("preparedByName", preparedByName);
  if (preparedByPosition) p.set("preparedByPosition", preparedByPosition);
  p.set("customTables", JSON.stringify(custom));
  return `/api/generate-attachment-ab?${p.toString()}`;
}

export function useAttachmentABData(onPdfSrcChange: (url: string | null) => void) {
  const [entries, setEntries] = useState<EntryOption[]>([]);
  const [tables, setTables] = useState<TableGroup[]>([newTable(1)]);
  const [sectionTitleA, setSectionTitleA] = useState("");
  const [sectionTitleB, setSectionTitleB] = useState("");
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByPosition, setPreparedByPosition] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: sem } = await supabase.from("semesters").select("id").eq("is_active", true).single();
      if (!sem) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: userData } = await supabase.from("users").select("faculty_code, campus_code").eq("auth_id", user.id).single();
      if (!userData) { setLoading(false); return; }
      let q = supabase.from("entries").select("id, description")
        .eq("semester_id", sem.id).eq("category", "income").eq("is_deleted", false)
        .order("entry_date", { ascending: true });
      if (userData.faculty_code) q = q.eq("faculty_code", userData.faculty_code);
      else q = q.eq("campus_code", userData.campus_code);
      const { data } = await q;
      setEntries((data ?? []).map((e) => ({ id: String(e.id), description: e.description ?? "" })));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh(
    t = tables,
    titleA = sectionTitleA,
    titleB = sectionTitleB,
    name = preparedByName,
    pos = preparedByPosition,
  ) {
    onPdfSrcChange(buildUrl(t, titleA, titleB, name, pos));
  }

  function addTable() {
    setTables((prev) => [...prev, newTable(prev.length + 1)]);
  }

  function updateTableTitle(tableId: string, title: string) {
    setTables((prev) => prev.map((t) => (t.tableId === tableId ? { ...t, title } : t)));
  }

  function blurTableTitle(tableId: string, title: string) {
    const next = tables.map((t) => (t.tableId === tableId ? { ...t, title } : t));
    setTables(next);
    refresh(next);
  }

  function removeTable(tableId: string) {
    const next = tables.filter((t) => t.tableId !== tableId);
    setTables(next);
    refresh(next);
  }

  function addRow(tableId: string) {
    setTables((prev) =>
      prev.map((t) => (t.tableId === tableId ? { ...t, rows: [...t.rows, newRow()] } : t)),
    );
  }

  function removeRow(tableId: string, rowId: string) {
    const next = tables.map((t) =>
      t.tableId === tableId ? { ...t, rows: t.rows.filter((r) => r.rowId !== rowId) } : t,
    );
    setTables(next);
    refresh(next);
  }

  function handleEntryChange(tableId: string, rowId: string, entryId: string) {
    const next = tables.map((t) =>
      t.tableId !== tableId ? t : {
        ...t,
        rows: t.rows.map((r) => (r.rowId === rowId ? { ...r, entryId } : r)),
      },
    );
    setTables(next);
    refresh(next);
  }

  return {
    entries, tables, loading,
    sectionTitleA, setSectionTitleA,
    sectionTitleB, setSectionTitleB,
    preparedByName, setPreparedByName,
    preparedByPosition, setPreparedByPosition,
    refresh, addTable, updateTableTitle, blurTableTitle, removeTable,
    addRow, removeRow, handleEntryChange,
  };
}
