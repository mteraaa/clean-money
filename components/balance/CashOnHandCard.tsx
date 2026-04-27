"use client";

import { formatPeso } from "./formatPeso";

export default function CashOnHandCard({
  hand,
  visible,
}: {
  hand: number;
  visible: boolean;
}) {
  return (
    <div className="bg-white rounded-xl px-5 py-4 flex items-center flex-1 shadow-md">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-1">Cash On-Hand</p>
        <p className="text-lg font-bold text-gray-900">
          {visible ? formatPeso(hand) : "₱ ••••••"}
        </p>
      </div>
    </div>
  );
}
