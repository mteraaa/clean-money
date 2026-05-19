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
    <div className="bg-white rounded-xl px-5 py-4 flex flex-col justify-between flex-1 shadow-md">
      <p className="text-xs text-gray-500 font-medium">Cash On-Hand</p>
      <p className="text-lg font-bold text-gray-900">
        {visible ? formatPeso(hand) : "₱ ••••••"}
      </p>
    </div>
  );
}
