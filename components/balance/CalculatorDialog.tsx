"use client";

import { ArrowDownToLine, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPeso } from "./formatPeso";

type BankAction = "deposit" | "withdrawal" | "interest" | "collectibles_add";

const CALC_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];

const TITLES: Record<BankAction, string> = {
  withdrawal: "Withdrawal",
  interest: "Interest Earnings",
  collectibles_add: "Add to Collectibles",
  deposit: "Deposit",
};

export default function CalculatorDialog({
  open,
  bankAction,
  calcInput,
  calcSaving,
  onClose,
  onBankActionChange,
  onCalcKey,
  onConfirm,
}: {
  open: boolean;
  bankAction: BankAction | null;
  calcInput: string;
  calcSaving: boolean;
  onClose: () => void;
  onBankActionChange: (action: BankAction) => void;
  onCalcKey: (key: string) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-72 font-lexend p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {bankAction ? TITLES[bankAction] : ""}
          </DialogTitle>
        </DialogHeader>

        {(bankAction === "deposit" || bankAction === "interest") && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-1">
            {(["deposit", "interest"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onBankActionChange(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  bankAction === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "deposit" ? (
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {tab === "deposit" ? "Deposit" : "Interest Earnings"}
              </button>
            ))}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl px-4 py-3 mt-2 text-right">
          <p className="text-xs text-gray-400 mb-1">Amount</p>
          <p className="text-3xl font-bold text-gray-900 min-h-9">
            {calcInput ? formatPeso(parseFloat(calcInput) || 0) : "₱0.00"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {CALC_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => onCalcKey(key)}
              className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg py-3 text-lg font-semibold text-gray-800 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onCalcKey("clear")}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onConfirm}
            disabled={calcSaving || !calcInput}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {calcSaving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
