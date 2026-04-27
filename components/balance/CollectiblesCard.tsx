"use client";

import { Plus, Undo2 } from "lucide-react";
import { formatPeso } from "./formatPeso";

export default function CollectiblesCard({
  coll,
  visible,
  isPublished,
  canUndo,
  onUndo,
  onAdd,
}: {
  coll: number;
  visible: boolean;
  isPublished: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="bg-white rounded-xl px-5 py-4 flex items-center justify-between flex-1 shadow-md">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-1">Collectibles</p>
        <p className="text-lg font-bold text-gray-900">
          {visible ? formatPeso(coll) : "₱ ••••••"}
        </p>
      </div>
      {!isPublished && (
        <div className="flex gap-1.5 self-start ml-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onAdd}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-300 text-green-500 hover:bg-green-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
