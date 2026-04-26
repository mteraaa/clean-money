"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import EndSemesterDialog from "./EndSemesterDialog";

type SemesterData = {
  id: number;
  semester_name: string;
  yearStart: string;
  yearEnd: string;
  yearLabel: string;
};

export default function SemesterCard() {
  const [data, setData] = useState<SemesterData | null>(null);
  const [editing, setEditing] = useState(false);
  const [semesterName, setSemesterName] = useState("1st Semester");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: sem } = await supabase
      .from("semesters")
      .select("id, semester_name, academic_years(year_label)")
      .eq("is_active", true)
      .single();

    if (!sem) { setData(null); return; }

    const ayRaw = sem.academic_years as { year_label?: string } | null;
    const yearLabel = ayRaw?.year_label ?? "";
    const parts = yearLabel.replace("A.Y. ", "").split("-");
    const start = parts[0]?.trim() ?? "";
    const end = parts[1]?.trim() ?? "";

    setData({ id: sem.id, semester_name: sem.semester_name, yearStart: start, yearEnd: end, yearLabel });
    setSemesterName(sem.semester_name);
    setYearStart(start);
    setYearEnd(end);
  }

  useEffect(() => { load(); }, []);

  async function handleUpdate() {
    if (!yearStart || !yearEnd) { toast.error("Please fill in the academic year."); return; }
    if (yearStart.length !== 4 || yearEnd.length !== 4) { toast.error("Academic year must be 4-digit years."); return; }

    setSaving(true);
    const supabase = createClient();
    const newYearLabel = `A.Y. ${yearStart}-${yearEnd}`;

    // Deactivate all semesters
    await supabase.from("semesters").update({ is_active: false }).eq("is_active", true);
    await supabase.from("academic_years").update({ is_active: false }).eq("is_active", true);

    // Find or create academic year
    let { data: ay } = await supabase.from("academic_years").select("id").eq("year_label", newYearLabel).single();
    if (!ay) {
      const { data: newAy } = await supabase.from("academic_years").insert({ year_label: newYearLabel, is_active: true }).select("id").single();
      ay = newAy;
    } else {
      await supabase.from("academic_years").update({ is_active: true }).eq("id", ay.id);
    }

    // Find or create semester
    let { data: sem } = await supabase
      .from("semesters")
      .select("id")
      .eq("academic_year_id", ay!.id)
      .eq("semester_name", semesterName)
      .single();

    if (!sem) {
      const { data: newSem } = await supabase
        .from("semesters")
        .insert({ semester_name: semesterName, academic_year_id: ay!.id, is_active: true })
        .select("id")
        .single();
      sem = newSem;
    } else {
      await supabase.from("semesters").update({ is_active: true }).eq("id", sem.id);
    }

    setSaving(false);
    setEditing(false);
    toast.success("Semester updated.");
    load();
  }

  const semesterLabel = data
    ? `${data.semester_name} — ${data.yearLabel}`
    : "No active semester";

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 font-lexend">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Semester & Academic Year</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage the active semester.</p>
          </div>
          <button
            onClick={() => { if (editing) handleUpdate(); else setEditing(true); }}
            disabled={saving}
            className="flex items-center gap-1.5 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {editing ? (saving ? "Saving…" : "Save") : (<><Pencil className="w-3.5 h-3.5" />Update</>)}
          </button>
        </div>

        {/* Semester dropdown */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Semester</label>
            <select
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              disabled={!editing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Academic Year</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value.replace(/\D/g, ""))}
                disabled={!editing}
                placeholder="2025"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 text-center outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
              <span className="text-gray-400 font-semibold shrink-0">—</span>
              <input
                type="text"
                maxLength={4}
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value.replace(/\D/g, ""))}
                disabled={!editing}
                placeholder="2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 text-center outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Cancel when editing */}
        {editing && (
          <button
            onClick={() => { setEditing(false); if (data) { setSemesterName(data.semester_name); setYearStart(data.yearStart); setYearEnd(data.yearEnd); } }}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
          {data ? (
            <span className="text-xs text-gray-400">Active: {semesterLabel}</span>
          ) : (
            <span className="text-xs text-amber-500 font-medium">No active semester</span>
          )}
          <button
            onClick={() => setEndOpen(true)}
            disabled={!data || editing}
            className="text-sm font-semibold text-red-500 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            End Semester
          </button>
        </div>
      </div>

      {endOpen && data && (
        <EndSemesterDialog
          semesterLabel={semesterLabel}
          onClose={() => setEndOpen(false)}
          onSuccess={load}
        />
      )}
    </>
  );
}
