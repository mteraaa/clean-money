"use client";

import { Undo2 } from "lucide-react";
import { formatPeso } from "./formatPeso";

export default function CashOnBankCard({
  bank,
  visible,
  isPublished,
  canUndo,
  onUndo,
  onDeposit,
  onWithdrawal,
}: {
  bank: number;
  visible: boolean;
  isPublished: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onDeposit: () => void;
  onWithdrawal: () => void;
}) {
  return (
    <div className="flex-1 bg-white rounded-xl px-5 py-4 flex flex-col justify-between shadow-md min-h-35">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-medium">Cash On-Bank</p>
        {!isPublished && (
          <div className="flex gap-1.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onWithdrawal}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors text-base font-semibold leading-none"
            >
              −
            </button>
            <button
              onClick={onDeposit}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-300 text-green-500 hover:bg-green-50 transition-colors text-base font-semibold leading-none"
            >
              +
            </button>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-auto">
        {visible ? formatPeso(bank) : "₱ ••••••"}
      </p>
    </div>
  );
}
