"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { formatPeso } from "./formatPeso";

export default function FinesCard({
  fineAmt,
  totalStudents,
  studentsPaid,
  visible,
  isPublished,
  finesAdded,
  onEdit,
  onAddToCollectibles,
}: {
  fineAmt: number;
  totalStudents: number;
  studentsPaid: number;
  visible: boolean;
  isPublished: boolean;
  finesAdded: boolean;
  onEdit: () => void;
  onAddToCollectibles: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const remaining = Math.max(0, totalStudents - studentsPaid);
  const addAmount = remaining * fineAmt;

  function handleConfirm() {
    setConfirming(false);
    onAddToCollectibles();
  }

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex flex-col justify-between flex-1 shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500 font-medium">Fines</p>
        {!isPublished && !confirming && (
          <div className="flex gap-1.5">
            <button
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-400 hover:bg-gray-50 transition-colors"
              title="Edit fine details"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={finesAdded || remaining <= 0 || fineAmt <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-300 text-green-500 hover:bg-green-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title={finesAdded ? "Already added to collectibles" : "Add uncollected fines to collectibles"}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {confirming ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-gray-700 font-medium leading-snug">
            Add {formatPeso(addAmount)} to Collectibles?
          </p>
          <p className="text-[11px] text-amber-600 leading-snug">
            Make sure all fine payments are settled before adding. This should be done right before publishing.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold text-gray-900">
            {visible ? formatPeso(fineAmt) : "₱ ••••••"}
          </p>
          <p className="text-sm font-semibold text-gray-500">
            {studentsPaid}/{totalStudents}
          </p>
        </div>
      )}
    </div>
  );
}
