"use client";

import { Eye, EyeOff } from "lucide-react";
import { formatPeso } from "./formatPeso";

export default function TotalBalanceCard({
  total,
  visible,
  onToggle,
}: {
  total: number;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="w-full sm:w-2/4 bg-white rounded-xl p-6 flex flex-col justify-between min-h-35 shadow-md">
      <div className="flex justify-between items-start">
        <p className="text-base text-gray-500 font-medium">Total Balance</p>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {visible ? <Eye className="w-8 h-8" /> : <EyeOff className="w-8 h-8" />}
        </button>
      </div>
      <p className="text-4xl font-bold text-gray-900 mt-auto">
        {visible ? formatPeso(total) : "₱ •••••••••"}
      </p>
    </div>
  );
}
