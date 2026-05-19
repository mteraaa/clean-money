"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Props = {
  facultyCode?: string | null;
  campusCode?: string | null;
  semesterId: number;
  onComplete: (values: {
    cash_on_bank: number;
    cash_on_hand: number;
    collectibles: number;
  }) => void;
};

export default function InitialBalanceSetupCard({ facultyCode, campusCode, semesterId, onComplete }: Props) {
  const [cashOnBank, setCashOnBank] = useState("");
  const [cashOnHand, setCashOnHand] = useState("");
  const [collectibles, setCollectibles] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const bank = parseFloat(cashOnBank) || 0;
    const hand = parseFloat(cashOnHand) || 0;
    const coll = parseFloat(collectibles) || 0;

    const payload: Record<string, unknown> = {
      semester_id: semesterId,
      cash_on_bank: bank,
      cash_on_hand: hand,
      collectibles: coll,
      initial_cash_on_bank: bank,
      initial_cash_on_hand: hand,
      initial_account_balance: bank + hand,
      initial_collectibles: coll,
    };
    if (facultyCode) payload.faculty_code = facultyCode;
    if (campusCode) payload.campus_code = campusCode;

    const { error } = await supabase.from("balance_cards").insert(payload);
    if (error) {
      toast.error(`Failed to save initial balance: ${error.message}`);
      setSaving(false);
      return;
    }

    toast.success("Initial balance saved.");
    onComplete({ cash_on_bank: bank, cash_on_hand: hand, collectibles: coll });
  }

  return (
    <div className="bg-white rounded-xl shadow-md px-6 py-5 font-lexend mb-4">
      <p className="text-sm font-semibold text-gray-700 mb-4">Set Initial Balance</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Cash on Bank</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={cashOnBank}
            onChange={(e) => setCashOnBank(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Cash on Hand</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={cashOnHand}
            onChange={(e) => setCashOnHand(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Collectibles</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={collectibles}
            onChange={(e) => setCollectibles(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
