"use client";

import { Pencil, Plus } from "lucide-react";
import { formatPeso } from "./formatPeso";

export default function FinesCard({
  fineAmt,
  totalStudents,
  studentsPaid,
  visible,
  isPublished,
  onEdit,
  onAddToCollectibles,
}: {
  fineAmt: number;
  totalStudents: number;
  studentsPaid: number;
  visible: boolean;
  isPublished: boolean;
  onEdit: () => void;
  onAddToCollectibles: () => void;
}) {
  const remaining = Math.max(0, totalStudents - studentsPaid);
  const addAmount = remaining * fineAmt;

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex flex-col justify-between flex-1 shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500 font-medium">Fines</p>
        {!isPublished && (
          <div className="flex gap-1.5">
            <button
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-400 hover:bg-gray-50 transition-colors"
              title="Edit fine details"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onAddToCollectibles}
              disabled={remaining <= 0 || fineAmt <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-300 text-green-500 hover:bg-green-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title={`Add ${formatPeso(addAmount)} to Collectibles (${remaining} unpaid × fine)`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-lg font-bold text-gray-900">
          {visible ? formatPeso(fineAmt) : "₱ ••••••"}
        </p>
        <p className="text-sm font-semibold text-gray-500">
          {studentsPaid}/{totalStudents}
        </p>
      </div>
    </div>
  );
}
