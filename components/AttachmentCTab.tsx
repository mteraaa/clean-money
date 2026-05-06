"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Plus } from "lucide-react";

const PRESET_ORDER = [
  "Others",
  "Special Projects/Fund Raising",
  "Reimbursement",
] as const;
type Preset = (typeof PRESET_ORDER)[number];

function getPreset(description: string): Preset {
  if (description.startsWith("Reimbursement")) return "Reimbursement";
  if (description.startsWith("Special Projects/Fund Raising"))
    return "Special Projects/Fund Raising";
  return "Others";
}

type EntryOption = { id: string; description: string };

type RowDef = { rowId: string; entryId: string };

type TableGroup = {
  tableId: string;
  title: string;
  category: Preset | "";
  rows: RowDef[];
};

type Props = { onPdfSrcChange: (url: string | null) => void };

let _counter = 0;
const uid = () => String(_counter++);
const newRow = (): RowDef => ({ rowId: uid(), entryId: "" });
const newTable = (n: number): TableGroup => ({
  tableId: uid(),
  title: `TABLE ${n}`,
  category: "",
  rows: [newRow()],
});

type CustomTableParam = { title: string; entryIds: string[] };

function buildUrl(
  tables: TableGroup[],
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
  if (preparedByName) p.set("preparedByName", preparedByName);
  if (preparedByPosition) p.set("preparedByPosition", preparedByPosition);
  p.set("customTables", JSON.stringify(custom));
  return `/api/generate-attachment-c?${p.toString()}`;
}

export default function AttachmentCTab({ onPdfSrcChange }: Props) {
  const [grouped, setGrouped] = useState<Record<Preset, EntryOption[]>>({
    Others: [],
    "Special Projects/Fund Raising": [],
    Reimbursement: [],
  });
  const [tables, setTables] = useState<TableGroup[]>([newTable(1)]);
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
      if (!sem) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code")
        .eq("auth_id", user.id)
        .single();
      if (!userData) {
        setLoading(false);
        return;
      }

      let q = supabase
        .from("entries")
        .select("id, description")
        .eq("semester_id", sem.id)
        .eq("category", "expense");
      if (userData.faculty_code)
        q = q.eq("faculty_code", userData.faculty_code);
      else q = q.eq("campus_code", userData.campus_code);
      const { data: entries } = await q;

      const g: Record<Preset, EntryOption[]> = {
        Others: [],
        "Special Projects/Fund Raising": [],
        Reimbursement: [],
      };
      for (const e of entries ?? []) {
        g[getPreset(e.description ?? "")].push({
          id: String(e.id),
          description: e.description ?? "",
        });
      }
      setGrouped(g);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh(
    currentTables: TableGroup[],
    name = preparedByName,
    position = preparedByPosition,
  ) {
    onPdfSrcChange(buildUrl(currentTables, name, position));
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

  function handleTableCategoryChange(tableId: string, category: Preset | "") {
    // Clear all row selections when category changes
    const next = tables.map((t) =>
      t.tableId === tableId
        ? { ...t, category, rows: t.rows.map((r) => ({ ...r, entryId: "" })) }
        : t,
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
        Loading expenses…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Table Groups */}
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

            {/* Table title */}
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

            {/* Category — once per table */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Expense Description
              </label>
              <select
                value={table.category}
                onChange={(e) =>
                  handleTableCategoryChange(
                    table.tableId,
                    e.target.value as Preset | "",
                  )
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
              >
                <option value="">Select expense description…</option>
                {PRESET_ORDER.map((p) => (
                  <option key={p} value={p} disabled={grouped[p].length === 0}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Rows — only show when category is selected */}
            {table.category && (
              <>
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
                        <option value="">Select expense…</option>
                        {grouped[table.category as Preset]?.map((e) => (
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
              </>
            )}
          </section>
        );
      })}

      {/* Add Another Table */}
      <div className="pt-2">
        <button
          onClick={addTable}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-600 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Another Table
        </button>
      </div>

      {/* Prepared By */}
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
              onBlur={(e) => refresh(tables, e.target.value)}
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
              onBlur={(e) => refresh(tables, preparedByName, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
