"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Plus } from "lucide-react";

type EntryOption = { id: string; description: string };
type RowDef = { rowId: string; entryId: string };
type TableGroup = { tableId: string; title: string; rows: RowDef[] };
type Props = { onPdfSrcChange: (url: string | null) => void };

let _counter = 0;
const uid = () => String(_counter++);
const newRow = (): RowDef => ({ rowId: uid(), entryId: "" });
const newTable = (n: number): TableGroup => ({
  tableId: uid(),
  title: `TABLE ${n}`,
  rows: [newRow()],
});

type CustomTableParam = { title: string; entryIds: string[] };

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

export default function AttachmentABTab({ onPdfSrcChange }: Props) {
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
      const { data: sem } = await supabase
        .from("semesters")
        .select("id")
        .eq("is_active", true)
        .single();
      if (!sem) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code")
        .eq("auth_id", user.id)
        .single();
      if (!userData) { setLoading(false); return; }

      let incQ = supabase
        .from("entries")
        .select("id, description")
        .eq("semester_id", sem.id)
        .eq("category", "income")
        .eq("is_deleted", false)
        .order("entry_date", { ascending: true });
      if (userData.faculty_code) incQ = incQ.eq("faculty_code", userData.faculty_code);
      else incQ = incQ.eq("campus_code", userData.campus_code);
      const { data: incomeData } = await incQ;
      setEntries(
        (incomeData ?? []).map((e) => ({
          id: String(e.id),
          description: e.description ?? "",
        })),
      );
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh(
    currentTables: TableGroup[],
    titleA = sectionTitleA,
    titleB = sectionTitleB,
    name = preparedByName,
    position = preparedByPosition,
  ) {
    onPdfSrcChange(buildUrl(currentTables, titleA, titleB, name, position));
  }

  /* ── Table actions ── */
  function addTable() {
    setTables((prev) => [...prev, newTable(prev.length + 1)]);
  }

  function updateTableTitle(tableId: string, title: string) {
    setTables((prev) =>
      prev.map((t) => (t.tableId === tableId ? { ...t, title } : t)),
    );
  }

  function blurTableTitle(tableId: string, title: string) {
    const next = tables.map((t) =>
      t.tableId === tableId ? { ...t, title } : t,
    );
    setTables(next);
    refresh(next);
  }

  /* ── Row actions ── */
  function addRow(tableId: string) {
    setTables((prev) =>
      prev.map((t) =>
        t.tableId === tableId ? { ...t, rows: [...t.rows, newRow()] } : t,
      ),
    );
  }

  function removeRow(tableId: string, rowId: string) {
    const next = tables.map((t) =>
      t.tableId === tableId
        ? { ...t, rows: t.rows.filter((r) => r.rowId !== rowId) }
        : t,
    );
    setTables(next);
    refresh(next);
  }

  function handleEntryChange(tableId: string, rowId: string, entryId: string) {
    const next = tables.map((t) =>
      t.tableId !== tableId
        ? t
        : {
            ...t,
            rows: t.rows.map((r) =>
              r.rowId === rowId ? { ...r, entryId } : r,
            ),
          },
    );
    setTables(next);
    refresh(next);
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Loading entries…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Attachment A ── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Attachment A
        </p>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Section Title
          </label>
          <input
            type="text"
            value={sectionTitleA}
            placeholder="e.g. A. Audit of the Collected Registration Fee…"
            onChange={(e) => setSectionTitleA(e.target.value)}
            onBlur={(e) => refresh(tables, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
          />
        </div>

        {tables.map((table, ti) => {
          const usedIds = new Set(
            table.rows.map((r) => r.entryId).filter(Boolean),
          );
          return (
            <section
              key={table.tableId}
              className={`${ti > 0 ? "pt-4 border-t-2 border-dashed border-gray-300" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Table {ti + 1}
                </p>
                <button
                  onClick={() => {
                    const next = tables.filter(
                      (t) => t.tableId !== table.tableId,
                    );
                    setTables(next);
                    refresh(next);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mb-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Table Title
                </label>
                <input
                  type="text"
                  value={table.title}
                  onChange={(e) =>
                    updateTableTitle(table.tableId, e.target.value)
                  }
                  onBlur={(e) => blurTableTitle(table.tableId, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                {table.rows.map((row) => (
                  <div key={row.rowId} className="flex gap-2 items-center">
                    <select
                      value={row.entryId}
                      onChange={(e) =>
                        handleEntryChange(
                          table.tableId,
                          row.rowId,
                          e.target.value,
                        )
                      }
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <option value="">Select income entry…</option>
                      {entries.map((e) => (
                        <option
                          key={e.id}
                          value={e.id}
                          disabled={usedIds.has(e.id) && row.entryId !== e.id}
                        >
                          {e.description}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeRow(table.tableId, row.rowId)}
                      className="shrink-0 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addRow(table.tableId)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another row
              </button>
            </section>
          );
        })}

        <div className="pt-2">
          <button
            onClick={addTable}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-600 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Table
          </button>
        </div>
      </div>

      {/* ── Attachment B ── */}
      <section className="pt-4 border-t-2 border-dashed border-gray-300">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Attachment B
        </p>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Section Title
          </label>
          <input
            type="text"
            value={sectionTitleB}
            placeholder="e.g. B. Audit of the Collected Plebiscite Fines…"
            onChange={(e) => setSectionTitleB(e.target.value)}
            onBlur={(e) =>
              refresh(tables, sectionTitleA, e.target.value)
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
          />
        </div>
      </section>

      {/* ── Prepared By ── */}
      <section className="pt-4 border-t-2 border-dashed border-gray-300">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Prepared By
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Name
            </label>
            <input
              type="text"
              value={preparedByName}
              onChange={(e) => setPreparedByName(e.target.value)}
              onBlur={(e) => refresh(tables, sectionTitleA, sectionTitleB, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Position
            </label>
            <input
              type="text"
              value={preparedByPosition}
              onChange={(e) => setPreparedByPosition(e.target.value)}
              onBlur={(e) =>
                refresh(tables, sectionTitleA, sectionTitleB, preparedByName, e.target.value)
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
