"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import EndSemesterDialog from "./EndSemesterDialog";
import { useSemesterCard } from "./useSemesterCard";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 text-center outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";
const selectCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

export default function SemesterCard() {
  const { data, editing, setEditing, semesterName, setSemesterName, yearStart, setYearStart, yearEnd, setYearEnd, saving, handleUpdate, cancelEdit, load } = useSemesterCard();
  const [endOpen, setEndOpen] = useState(false);

  const semesterLabel = data ? `${data.semester_name} — ${data.yearLabel}` : "No active semester";

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

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Semester</label>
            <select value={semesterName} onChange={(e) => setSemesterName(e.target.value)} disabled={!editing} className={selectCls}>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Academic Year</label>
            <div className="flex items-center gap-2">
              <input type="text" maxLength={4} value={yearStart} onChange={(e) => setYearStart(e.target.value.replace(/\D/g, ""))} disabled={!editing} placeholder="2025" className={inputCls} />
              <span className="text-gray-400 font-semibold shrink-0">—</span>
              <input type="text" maxLength={4} value={yearEnd} onChange={(e) => setYearEnd(e.target.value.replace(/\D/g, ""))} disabled={!editing} placeholder="2026" className={inputCls} />
            </div>
          </div>
        </div>

        {editing && (
          <button onClick={cancelEdit} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Cancel
          </button>
        )}

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
        <EndSemesterDialog semesterLabel={semesterLabel} onClose={() => setEndOpen(false)} onSuccess={load} />
      )}
    </>
  );
}
