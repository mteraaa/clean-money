"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";

export type BankAction = "deposit" | "withdrawal" | "interest" | "collectibles_add";

export function useBalanceActions({
  cashOnBank,
  cashOnHand,
  collectibles = 0,
  facultyCode,
  campusCode,
}: {
  cashOnBank: number;
  cashOnHand: number;
  collectibles?: number;
  facultyCode?: string | null;
  campusCode?: string | null;
}) {
  const [visible, setVisible] = useState(true);
  const [bank, setBank] = useState(cashOnBank);
  const [hand, setHand] = useState(cashOnHand);
  const [coll, setColl] = useState(collectibles);

  const [prevColl, setPrevColl] = useState<number | null>(null);
  const [prevBank, setPrevBank] = useState<{ bank: number; hand: number } | null>(null);
  const collToastId = useRef<string | number | null>(null);
  const bankToastId = useRef<string | number | null>(null);
  const collLogId = useRef<number | null>(null);
  const bankLogId = useRef<number | null>(null);

  const [bankAction, setBankAction] = useState<BankAction | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcSaving, setCalcSaving] = useState(false);

  function openCalc(action: BankAction) {
    setBankAction(action);
    setCalcInput("");
    setCalcOpen(true);
  }

  function closeCalc() {
    setCalcOpen(false);
    setCalcInput("");
  }

  async function executeUndoColl(value: number) {
    const supabase = createClient();
    let q = supabase.from("balance_cards").update({ collectibles: value });
    if (facultyCode) q = q.eq("faculty_code", facultyCode);
    else q = q.eq("campus_code", campusCode!);
    await q;
    if (collLogId.current !== null) {
      await supabase.from("activity_logs").delete().eq("id", collLogId.current);
      collLogId.current = null;
    }
    setColl(value);
    setPrevColl(null);
    collToastId.current = null;
  }

  async function executeUndoBank(value: { bank: number; hand: number }) {
    const supabase = createClient();
    let q = supabase.from("balance_cards").update({ cash_on_bank: value.bank, cash_on_hand: value.hand });
    if (facultyCode) q = q.eq("faculty_code", facultyCode);
    else q = q.eq("campus_code", campusCode!);
    await q;
    if (bankLogId.current !== null) {
      await supabase.from("activity_logs").delete().eq("id", bankLogId.current);
      bankLogId.current = null;
    }
    setBank(value.bank);
    setHand(value.hand);
    setPrevBank(null);
    bankToastId.current = null;
  }

  async function handleUndoColl() {
    if (prevColl === null) return;
    if (collToastId.current !== null) toast.dismiss(collToastId.current);
    await executeUndoColl(prevColl);
  }

  async function handleUndoBank() {
    if (!prevBank) return;
    if (bankToastId.current !== null) toast.dismiss(bankToastId.current);
    await executeUndoBank(prevBank);
  }

  const handleCalcKey = useCallback((key: string) => {
    if (key === "clear") { setCalcInput(""); return; }
    if (key === "⌫") { setCalcInput((prev) => prev.slice(0, -1)); return; }
    if (key === ".") { setCalcInput((prev) => (prev.includes(".") ? prev : prev + ".")); return; }
    setCalcInput((prev) => (prev === "0" ? key : prev + key));
  }, []);

  const confirmCalc = useCallback(async () => {
    const amount = parseFloat(calcInput);
    if (isNaN(amount) || amount <= 0) return;
    setCalcSaving(true);

    const supabase = createClient();

    if (bankAction === "collectibles_add") {
      setPrevColl(coll);
      const newColl = coll + amount;
      let q = supabase.from("balance_cards").update({ collectibles: newColl });
      if (facultyCode) q = q.eq("faculty_code", facultyCode);
      else q = q.eq("campus_code", campusCode!);
      await q;
      setColl(newColl);
    } else if (bankAction === "interest") {
      setPrevBank({ bank, hand });
      const newBank = bank + amount;
      let selQ = supabase.from("balance_cards").select("initial_cash_on_bank, initial_account_balance");
      if (facultyCode) selQ = selQ.eq("faculty_code", facultyCode);
      else selQ = selQ.eq("campus_code", campusCode!);
      const { data: balData } = await selQ.single();
      let updQ = supabase.from("balance_cards").update({
        cash_on_bank: newBank,
        initial_cash_on_bank: ((balData?.initial_cash_on_bank as number) || 0) + amount,
        initial_account_balance: ((balData?.initial_account_balance as number) || 0) + amount,
      });
      if (facultyCode) updQ = updQ.eq("faculty_code", facultyCode);
      else updQ = updQ.eq("campus_code", campusCode!);
      await updQ;
      setBank(newBank);
    } else {
      setPrevBank({ bank, hand });
      const newBank = bankAction === "deposit" ? bank + amount : bank - amount;
      const newHand = bankAction === "deposit" ? hand - amount : hand + amount;
      let q = supabase.from("balance_cards").update({ cash_on_bank: newBank, cash_on_hand: newHand });
      if (facultyCode) q = q.eq("faculty_code", facultyCode);
      else q = q.eq("campus_code", campusCode!);
      await q;
      setBank(newBank);
      setHand(newHand);
    }

    const fmtAmt = `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const descriptions: Record<BankAction, string> = {
      collectibles_add: `Added ${fmtAmt} to Collectibles`,
      interest: `Added ${fmtAmt} Interest Earnings to Cash on Bank`,
      deposit: `Deposited ${fmtAmt} to Cash on Bank`,
      withdrawal: `Withdrew ${fmtAmt} from Cash on Bank`,
    };
    const desc = descriptions[bankAction!];

    if (bankAction === "collectibles_add") {
      const saved = coll;
      logActivity({ description: desc, action: bankAction.toUpperCase(), facultyCode, campusCode, targetTable: "balance_cards" })
        .then((id) => { collLogId.current = id ?? null; }).catch(() => {});
      const id = toast.success(desc, { action: { label: "Undo", onClick: () => executeUndoColl(saved) } });
      collToastId.current = id;
    } else {
      const saved = { bank, hand };
      logActivity({ description: desc, action: bankAction!.toUpperCase(), facultyCode, campusCode, targetTable: "balance_cards" })
        .then((id) => { bankLogId.current = id ?? null; }).catch(() => {});
      const id = toast.success(desc, { action: { label: "Undo", onClick: () => executeUndoBank(saved) } });
      bankToastId.current = id;
    }

    setCalcSaving(false);
    closeCalc();
  }, [calcInput, bank, hand, coll, bankAction, facultyCode, campusCode]);

  useEffect(() => {
    if (!calcOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); handleCalcKey(e.key); }
      else if (e.key === ".") { e.preventDefault(); handleCalcKey("."); }
      else if (e.key === "Backspace") { e.preventDefault(); handleCalcKey("⌫"); }
      else if (e.key === "Enter") { e.preventDefault(); confirmCalc(); }
      else if (e.key === "Escape") { e.preventDefault(); closeCalc(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [calcOpen, handleCalcKey, confirmCalc]);

  return {
    visible, setVisible,
    bank, hand, coll,
    prevColl, prevBank,
    bankAction, setBankAction,
    calcOpen, calcInput, calcSaving,
    openCalc, closeCalc,
    handleUndoColl, handleUndoBank,
    handleCalcKey, confirmCalc,
  };
}
