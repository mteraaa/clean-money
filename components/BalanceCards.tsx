"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type BalanceCardsProps = {
  cashOnBank: number;
  cashOnHand: number;
  collectibles?: number;
  facultyCode?: string | null;
  campusCode?: string | null;
};

function formatPeso(amount: number) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function BalanceCards({
  cashOnBank,
  cashOnHand,
  collectibles = 0,
  facultyCode,
  campusCode,
}: BalanceCardsProps) {
  const [visible, setVisible] = useState(true);
  const [bank, setBank] = useState(cashOnBank);
  const [hand, setHand] = useState(cashOnHand);
  const [coll, setColl] = useState(collectibles);
  const [editing, setEditing] = useState<"bank" | "hand" | "coll" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const totalBalance = bank + hand + coll;

  function startEdit(field: "bank" | "hand" | "coll") {
    setEditing(field);
    setInputValue(String(field === "bank" ? bank : field === "hand" ? hand : coll));
  }

  function cancelEdit() {
    setEditing(null);
    setInputValue("");
  }

  async function saveEdit() {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0) return;

    const newBank = editing === "bank" ? parsed : bank;
    const newColl = editing === "coll" ? parsed : coll;
    const collDiff = coll - newColl;
    const newHand = editing === "hand" ? parsed
      : editing === "bank" ? totalBalance - parsed - coll
      : editing === "coll" && collDiff > 0 ? hand + collDiff
      : hand;

    setSaving(true);
    const supabase = createClient();

    let updateQuery = supabase.from("balance_cards").update({
      cash_on_bank: newBank,
      cash_on_hand: newHand,
      collectibles: newColl,
      account_balance: newBank + newHand + newColl,
    });

    if (facultyCode) updateQuery = updateQuery.eq("faculty_code", facultyCode);
    else updateQuery = updateQuery.eq("campus_code", campusCode);

    await updateQuery;

    setBank(newBank);
    setHand(newHand);
    setColl(newColl);

    setSaving(false);
    setEditing(null);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  }

  function EditableAmount({
    field,
    value,
    large,
  }: {
    field: "bank" | "hand" | "coll";
    value: number;
    large?: boolean;
  }) {
    if (editing === field) {
      return (
        <div className="flex items-center gap-1 mt-1">
          <span className={`${large ? "text-2xl" : "text-sm"} font-bold text-gray-900`}>₱</span>
          <input
            autoFocus
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full ${large ? "text-2xl" : "text-sm"} font-bold text-gray-900 border-b border-gray-400 outline-none bg-transparent`}
          />
          <button onClick={saveEdit} disabled={saving} className="text-green-500 hover:text-green-700">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <p className={`${large ? "text-3xl" : "text-lg"} font-bold text-gray-900`}>
        {visible ? formatPeso(value) : "₱ ••••••"}
      </p>
    );
  }

  return (
    <div className="flex gap-4 font-lexend">
      {/* Total Balance */}
      <div className="w-2/4 bg-white rounded-xl p-6 flex flex-col justify-between min-h-35 shadow-md">
        <div className="flex justify-between items-start">
          <p className="text-base text-gray-500 font-medium">Total Balance</p>
          <button
            onClick={() => setVisible((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {visible ? <Eye className="w-8 h-8" /> : <EyeOff className="w-8 h-8" />}
          </button>
        </div>
        <p className="text-4xl font-bold text-gray-900 mt-auto">
          {visible ? formatPeso(totalBalance) : "₱ •••••••••"}
        </p>
      </div>

      <div className="flex gap-2 w-2/4">
      {/* Middle column: Cash On-Bank + Cash On-Hand */}
      <div className="flex flex-col gap-4 flex-1">
        <div className="bg-white rounded-xl px-5 py-4 flex items-center justify-between flex-1 shadow-md">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-1">Cash On-Bank</p>
            <EditableAmount field="bank" value={bank} />
          </div>
          {editing !== "bank" && (
            <button onClick={() => startEdit("bank")} className="text-gray-400 hover:text-gray-600 transition-colors self-start ml-2">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl px-5 py-4 flex items-center justify-between flex-1 shadow-md">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-1">Cash On-Hand</p>
            <EditableAmount field="hand" value={hand} />
          </div>
          {editing !== "hand" && (
            <button onClick={() => startEdit("hand")} className="text-gray-400 hover:text-gray-600 transition-colors self-start ml-2">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collectibles */}
      <div className="flex-1 bg-white rounded-xl px-5 py-4 flex flex-col justify-between shadow-md min-h-35">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Collectibles</p>
            <p className="text-xs text-gray-400">(Accounts Receivables)</p>
          </div>
          {editing !== "coll" && (
            <button onClick={() => startEdit("coll")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-auto">
          <EditableAmount field="coll" value={coll} large />
        </div>
      </div>
      </div>
    </div>
  );
}
