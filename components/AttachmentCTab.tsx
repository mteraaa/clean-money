"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

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

type TableDef = {
  preset: Preset;
  title: string;
};

type Props = {
  onPdfSrcChange: (url: string) => void;
};

function buildUrl(
  attachCTitle: string,
  tables: TableDef[],
  preparedByName: string,
  preparedByPosition: string,
): string {
  const titles: Record<string, string> = {};
  tables.forEach((t) => { titles[t.preset] = t.title; });
  const p = new URLSearchParams({ t: Date.now().toString() });
  if (attachCTitle) p.set("attachCTitle", attachCTitle);
  p.set("tableTitles", JSON.stringify(titles));
  if (preparedByName) p.set("preparedByName", preparedByName);
  if (preparedByPosition) p.set("preparedByPosition", preparedByPosition);
  return `/api/generate-attachment-c?${p.toString()}`;
}

export default function AttachmentCTab({ onPdfSrcChange }: Props) {
  const [tables, setTables] = useState<TableDef[]>([]);
  const [attachCTitle, setAttachCTitle] = useState("ATTACHMENT C");
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByPosition, setPreparedByPosition] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: sem } = await supabase
        .from("semesters").select("id").eq("is_active", true).single();
      if (!sem) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from("users").select("faculty_code, campus_code").eq("auth_id", user.id).single();
      if (!userData) { setLoading(false); return; }

      let q = supabase
        .from("entries")
        .select("description")
        .eq("semester_id", sem.id)
        .eq("category", "expense");
      if (userData.faculty_code) q = q.eq("faculty_code", userData.faculty_code);
      else q = q.eq("campus_code", userData.campus_code);
      const { data: entries } = await q;

      // Determine which preset categories have at least one entry
      const hasPreset = new Set<Preset>();
      for (const e of entries ?? []) {
        hasPreset.add(getPreset(e.description ?? ""));
      }

      // Build table defs in fixed order, skipping empty presets
      const tableDefs: TableDef[] = [];
      let tableNum = 1;
      for (const preset of PRESET_ORDER) {
        if (!hasPreset.has(preset)) continue;
        tableDefs.push({
          preset,
          title: `TABLE ${tableNum}. ${preset.toUpperCase()}`,
        });
        tableNum++;
      }

      setTables(tableDefs);
      setLoading(false);
      onPdfSrcChange(buildUrl("ATTACHMENT C", tableDefs, "", ""));
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateTitle(index: number, value: string) {
    setTables((prev) => prev.map((t, i) => (i === index ? { ...t, title: value } : t)));
  }

  function refreshOnBlur(index: number, value: string) {
    const updated = tables.map((t, i) => (i === index ? { ...t, title: value } : t));
    onPdfSrcChange(buildUrl(attachCTitle, updated, preparedByName, preparedByPosition));
  }

  function refreshTitleOnBlur(value: string) {
    onPdfSrcChange(buildUrl(value, tables, preparedByName, preparedByPosition));
  }

  function refreshSignatureOnBlur(name: string, position: string) {
    onPdfSrcChange(buildUrl(attachCTitle, tables, name, position));
  }

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-6">Loading expense categories…</p>;
  }

  if (tables.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No expense entries found.</p>;
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Attachment Header
        </p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
          <input
            type="text"
            value={attachCTitle}
            onChange={(e) => setAttachCTitle(e.target.value)}
            onBlur={(e) => refreshTitleOnBlur(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </section>

      <section className="pt-4 border-t border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Table Titles
        </p>
        <div className="space-y-3">
          {tables.map((table, i) => (
            <div key={table.preset}>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {table.preset}
              </label>
              <input
                type="text"
                value={table.title}
                onChange={(e) => updateTitle(i, e.target.value)}
                onBlur={(e) => refreshOnBlur(i, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4 border-t border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Prepared By
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Name</label>
            <input
              type="text"
              value={preparedByName}
              onChange={(e) => setPreparedByName(e.target.value)}
              onBlur={(e) => refreshSignatureOnBlur(e.target.value, preparedByPosition)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Position</label>
            <input
              type="text"
              value={preparedByPosition}
              onChange={(e) => setPreparedByPosition(e.target.value)}
              onBlur={(e) => refreshSignatureOnBlur(preparedByName, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
