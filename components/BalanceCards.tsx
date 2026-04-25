"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Plus, ArrowDownToLine, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BalanceCardsProps = {
  cashOnBank: number;
  cashOnHand: number;
  collectibles?: number;
  facultyCode?: string | null;
  campusCode?: string | null;
  isPublished?: boolean;
};

type BankAction = "deposit" | "withdrawal" | "interest" | "collectibles_add";

function formatPeso(amount: number) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const CALC_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];


export default function BalanceCards({
  cashOnBank,
  cashOnHand,
  collectibles = 0,
  facultyCode,
  campusCode,
  isPublished = false,
}: BalanceCardsProps) {
  const [visible, setVisible] = useState(true);
  const [bank, setBank] = useState(cashOnBank);
  const [hand, setHand] = useState(cashOnHand);
  const [coll, setColl] = useState(collectibles);

  // Calculator flow
  const [bankAction, setBankAction] = useState<BankAction | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcSaving, setCalcSaving] = useState(false);

  const totalBalance = bank + hand;

  function openCalc(action: BankAction) {
    setBankAction(action);
    setCalcInput("");
    setCalcOpen(true);
  }

  function closeCalc() {
    setCalcOpen(false);
    setCalcInput("");
  }

  const handleCalcKey = useCallback((key: string) => {
    if (key === "⌫") {
      setCalcInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key === ".") {
      setCalcInput((prev) => (prev.includes(".") ? prev : prev + "."));
      return;
    }
    setCalcInput((prev) => {
      if (prev === "0") return key;
      return prev + key;
    });
  }, []);

  const confirmCalc = useCallback(async () => {
    const amount = parseFloat(calcInput);
    if (isNaN(amount) || amount <= 0) return;
    setCalcSaving(true);

    const supabase = createClient();

    if (bankAction === "collectibles_add") {
      const newColl = coll + amount;
      let q = supabase.from("balance_cards").update({ collectibles: newColl });
      if (facultyCode) q = q.eq("faculty_code", facultyCode);
      else q = q.eq("campus_code", campusCode);
      await q;
      setColl(newColl);
    } else if (bankAction === "interest") {
      const newBank = bank + amount;
      let selQ = supabase
        .from("balance_cards")
        .select("initial_cash_on_bank, initial_account_balance");
      if (facultyCode) selQ = selQ.eq("faculty_code", facultyCode);
      else selQ = selQ.eq("campus_code", campusCode);
      const { data: balData } = await selQ.single();
      const newInitialBank = ((balData?.initial_cash_on_bank as number) || 0) + amount;
      const newInitialBal = ((balData?.initial_account_balance as number) || 0) + amount;
      let updQ = supabase.from("balance_cards").update({
        cash_on_bank: newBank,
        initial_cash_on_bank: newInitialBank,
        initial_account_balance: newInitialBal,
      });
      if (facultyCode) updQ = updQ.eq("faculty_code", facultyCode);
      else updQ = updQ.eq("campus_code", campusCode);
      await updQ;
      setBank(newBank);
    } else {
      let newBank = bank;
      let newHand = hand;
      if (bankAction === "deposit") {
        newBank = bank + amount;
        newHand = hand - amount;
      } else if (bankAction === "withdrawal") {
        newBank = bank - amount;
        newHand = hand + amount;
      }
      let q = supabase.from("balance_cards").update({
        cash_on_bank: newBank,
        cash_on_hand: newHand,
      });
      if (facultyCode) q = q.eq("faculty_code", facultyCode);
      else q = q.eq("campus_code", campusCode);
      await q;
      setBank(newBank);
      setHand(newHand);
    }

    const fmtAmt = `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const descriptions: Record<string, string> = {
      collectibles_add: `Added ${fmtAmt} to Collectibles`,
      interest: `Added ${fmtAmt} Interest Earnings to Cash on Bank`,
      deposit: `Deposited ${fmtAmt} to Cash on Bank`,
      withdrawal: `Withdrew ${fmtAmt} from Cash on Bank`,
    };
    logActivity({
      description: descriptions[bankAction ?? ""] ?? "",
      action: (bankAction ?? "").toUpperCase(),
      facultyCode,
      campusCode,
      targetTable: "balance_cards",
    }).catch(() => {});

    setCalcSaving(false);
    closeCalc();
  }, [calcInput, bank, hand, coll, bankAction, facultyCode, campusCode]);

  // Keyboard support for calculator
  useEffect(() => {
    if (!calcOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleCalcKey(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleCalcKey(".");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleCalcKey("⌫");
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmCalc();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeCalc();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [calcOpen, handleCalcKey, confirmCalc]);

  const dialogTitle =
    bankAction === "withdrawal"
      ? "Withdrawal"
      : bankAction === "interest"
      ? "Interest Earnings"
      : bankAction === "collectibles_add"
      ? "Add to Collectibles"
      : "Deposit";

  return (
    <>
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
          {/* Left column: Collectibles + Cash On-Hand */}
          <div className="flex flex-col gap-4 flex-1">
            {/* Collectibles */}
            <div className="bg-white rounded-xl px-5 py-4 flex items-center justify-between flex-1 shadow-md">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-1">Collectibles</p>
                <p className="text-lg font-bold text-gray-900">
                  {visible ? formatPeso(coll) : "₱ ••••••"}
                </p>
              </div>
              {!isPublished && (
                <button
                  onClick={() => openCalc("collectibles_add")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-300 text-green-500 hover:bg-green-50 transition-colors self-start ml-2"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Cash On-Hand (read-only) */}
            <div className="bg-white rounded-xl px-5 py-4 flex items-center flex-1 shadow-md">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-1">Cash On-Hand</p>
                <p className="text-lg font-bold text-gray-900">
                  {visible ? formatPeso(hand) : "₱ ••••••"}
                </p>
              </div>
            </div>
          </div>

          {/* Cash On-Bank (full-height) */}
          <div className="flex-1 bg-white rounded-xl px-5 py-4 flex flex-col justify-between shadow-md min-h-35">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">Cash On-Bank</p>
              {!isPublished && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openCalc("withdrawal")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors text-base font-semibold leading-none"
                  >
                    −
                  </button>
                  <button
                    onClick={() => openCalc("deposit")}
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
        </div>
      </div>

      {/* Calculator Dialog */}
      <Dialog open={calcOpen} onOpenChange={(o) => { if (!o) closeCalc(); }}>
        <DialogContent className="w-72 font-lexend p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs — only shown for bank + (deposit/interest) */}
          {(bankAction === "deposit" || bankAction === "interest") && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-1">
              {(["deposit", "interest"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setBankAction(tab); setCalcInput(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    bankAction === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "deposit" ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {tab === "deposit" ? "Deposit" : "Interest Earnings"}
                </button>
              ))}
            </div>
          )}

          {/* Display */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mt-2 text-right">
            <p className="text-xs text-gray-400 mb-1">Amount</p>
            <p className="text-3xl font-bold text-gray-900 min-h-9">
              {calcInput ? formatPeso(parseFloat(calcInput) || 0) : "₱0.00"}
            </p>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {CALC_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleCalcKey(key)}
                className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg py-3 text-lg font-semibold text-gray-800 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setCalcInput("")}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={confirmCalc}
              disabled={calcSaving || !calcInput}
              className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {calcSaving ? "Saving..." : "Confirm"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
