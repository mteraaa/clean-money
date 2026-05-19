import { X, Plus } from "lucide-react";
import { PRESET_ORDER, type EntryOption, type TableGroup, type Preset } from "./useAttachmentCData";

type Props = {
  table: TableGroup;
  tableIndex: number;
  grouped: Record<Preset, EntryOption[]>;
  onRemove: (tableId: string) => void;
  onUpdateTitle: (tableId: string, title: string) => void;
  onBlurTitle: (tableId: string, title: string) => void;
  onCategoryChange: (tableId: string, category: Preset | "") => void;
  onAddRow: (tableId: string) => void;
  onRemoveRow: (tableId: string, rowId: string) => void;
  onEntryChange: (tableId: string, rowId: string, entryId: string) => void;
};

export default function AttachmentCTableSection({
  table, tableIndex, grouped,
  onRemove, onUpdateTitle, onBlurTitle, onCategoryChange,
  onAddRow, onRemoveRow, onEntryChange,
}: Props) {
  const usedIds = new Set(table.rows.map((r) => r.entryId).filter(Boolean));

  return (
    <section className={tableIndex > 0 ? "pt-4 border-t-2 border-dashed border-gray-300" : ""}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Table {tableIndex + 1}
        </p>
        <button
          onClick={() => onRemove(table.tableId)}
          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mb-2">
        <label className="text-xs font-medium text-gray-600 block mb-1">Table Title</label>
        <input
          type="text"
          value={table.title}
          onChange={(e) => onUpdateTitle(table.tableId, e.target.value)}
          onBlur={(e) => onBlurTitle(table.tableId, e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 block mb-1">Expense Description</label>
        <select
          value={table.category}
          onChange={(e) => onCategoryChange(table.tableId, e.target.value as Preset | "")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
        >
          <option value="">Select expense description…</option>
          {PRESET_ORDER.map((p) => (
            <option key={p} value={p} disabled={grouped[p].length === 0}>{p}</option>
          ))}
        </select>
      </div>

      {table.category && (
        <>
          <div className="space-y-2">
            {table.rows.map((row) => (
              <div key={row.rowId} className="flex gap-2 items-center">
                <select
                  value={row.entryId}
                  onChange={(e) => onEntryChange(table.tableId, row.rowId, e.target.value)}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  <option value="">Select expense…</option>
                  {grouped[table.category as Preset]?.map((e) => (
                    <option key={e.id} value={e.id} disabled={usedIds.has(e.id) && row.entryId !== e.id}>
                      {e.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveRow(table.tableId, row.rowId)}
                  className="shrink-0 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAddRow(table.tableId)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another row
          </button>
        </>
      )}
    </section>
  );
}
