"use client";

import { Plus } from "lucide-react";
import { useAttachmentABData } from "./useAttachmentABData";
import AttachmentABTableSection from "./AttachmentABTableSection";

type Props = { onPdfSrcChange: (url: string | null) => void };

export default function AttachmentABTab({ onPdfSrcChange }: Props) {
  const {
    entries, tables, loading,
    sectionTitleA, setSectionTitleA,
    sectionTitleB, setSectionTitleB,
    preparedByName, setPreparedByName,
    preparedByPosition, setPreparedByPosition,
    refresh, addTable, updateTableTitle, blurTableTitle, removeTable,
    addRow, removeRow, handleEntryChange,
  } = useAttachmentABData(onPdfSrcChange);

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-6">Loading entries…</p>;
  }

  return (
    <div className="space-y-5">
      {/* Attachment A */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Attachment A
        </p>
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">Section Title</label>
          <input
            type="text"
            value={sectionTitleA}
            placeholder="e.g. A. Audit of the Collected Registration Fee…"
            onChange={(e) => setSectionTitleA(e.target.value)}
            onBlur={(e) => refresh(tables, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
          />
        </div>

        {tables.map((table, ti) => (
          <AttachmentABTableSection
            key={table.tableId}
            table={table}
            tableIndex={ti}
            entries={entries}
            onRemove={removeTable}
            onUpdateTitle={updateTableTitle}
            onBlurTitle={blurTableTitle}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onEntryChange={handleEntryChange}
          />
        ))}

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

      {/* Attachment B */}
      <section className="pt-4 border-t-2 border-dashed border-gray-300">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Attachment B
        </p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Section Title</label>
          <input
            type="text"
            value={sectionTitleB}
            placeholder="e.g. B. Audit of the Collected Plebiscite Fines…"
            onChange={(e) => setSectionTitleB(e.target.value)}
            onBlur={(e) => refresh(tables, sectionTitleA, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
          />
        </div>
      </section>

      {/* Prepared By */}
      <section className="pt-4 border-t-2 border-dashed border-gray-300">
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
              onBlur={(e) => refresh(tables, sectionTitleA, sectionTitleB, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Position</label>
            <input
              type="text"
              value={preparedByPosition}
              onChange={(e) => setPreparedByPosition(e.target.value)}
              onBlur={(e) => refresh(tables, sectionTitleA, sectionTitleB, preparedByName, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
