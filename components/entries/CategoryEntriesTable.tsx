"use client";

import AddEntrySheet from "./AddEntrySheet";
import EntriesTableRow from "./EntriesTableRow";
import { useCategoryEntries } from "./useCategoryEntries";

type Props = {
  category: "income" | "expense";
  facultyCode?: string | null;
  campusCode?: string | null;
  refreshKey: number;
  onMutation?: () => void;
  isPublished?: boolean;
};

export default function CategoryEntriesTable({
  category, facultyCode, campusCode, refreshKey, onMutation, isPublished = false,
}: Props) {
  const {
    entries, isLoading, selectMode, selectedIds,
    editSheetOpen, editingEntry, editForm, editErrors, editSubmitting,
    setEditSheetOpen, setEditForm, setEditErrors,
    toggleSelectMode, toggleSelect, toggleSelectAll,
    handleBulkDelete, handleDelete, openEditSheet, handleEditSave,
  } = useCategoryEntries({ category, facultyCode, campusCode, refreshKey, onMutation });

  const title = category === "income" ? "Income Entries" : "Expense Entries";

  return (
    <>
      <div className="bg-white rounded-xl shadow-md font-lexend">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          {!isPublished && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectMode}
                className={`border rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectMode ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
              {selectMode && (
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </button>
              )}
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="overflow-y-auto max-h-80 animate-fade-in-up">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#E5E7EB] text-gray-700 font-semibold text-left">
                  {selectMode && (
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === entries.length && entries.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 w-10">#</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={selectMode ? 8 : 7} className="text-center py-10 text-gray-400">
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, index) => (
                    <EntriesTableRow
                      key={entry.id}
                      entry={entry}
                      index={index}
                      category={category}
                      selectMode={selectMode}
                      selected={selectedIds.has(entry.id)}
                      isPublished={isPublished}
                      onToggle={() => toggleSelect(entry.id)}
                      onEdit={() => openEditSheet(entry)}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddEntrySheet
        mode="edit"
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        form={editForm}
        setForm={setEditForm}
        errors={editErrors}
        setErrors={setEditErrors}
        submitting={editSubmitting}
        nextControlNumber={editingEntry?.control_number ?? 0}
        onSubmit={handleEditSave}
      />
    </>
  );
}
