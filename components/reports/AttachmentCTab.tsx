"use client";

import { Plus } from "lucide-react";
import { useAttachmentCData } from "./useAttachmentCData";
import AttachmentCTableSection from "./AttachmentCTableSection";

type Props = { onPdfSrcChange: (url: string | null) => void };

export default function AttachmentCTab({ onPdfSrcChange }: Props) {
  const {
    grouped, tables, loading,
    preparedByName, setPreparedByName,
    preparedByPosition, setPreparedByPosition,
    refresh, addTable, updateTableTitle, blurTableTitle, removeTable,
    handleTableCategoryChange, addRow, removeRow, handleEntryChange,
  } = useAttachmentCData(onPdfSrcChange);

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-6">Loading expenses…</p>;
  }

  return (
    <div className="space-y-5">
      {tables.map((table, ti) => (
        <AttachmentCTableSection
          key={table.tableId}
          table={table}
          tableIndex={ti}
          grouped={grouped}
          onRemove={removeTable}
          onUpdateTitle={updateTableTitle}
          onBlurTitle={blurTableTitle}
          onCategoryChange={handleTableCategoryChange}
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

      <section className="pt-4 border-t-2 border-dashed border-gray-300">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Prepared By</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Name</label>
            <input
              type="text"
              value={preparedByName}
              onChange={(e) => setPreparedByName(e.target.value)}
              onBlur={(e) => refresh(tables, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Position</label>
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
