"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useFineActions } from "./useFineActions";
import { executeBankUpdate } from "./executeBankUpdate";

export type BankAction = "deposit" | "withdrawal" | "interest" | "collectibles_add";

export function useBalanceActions({
  cashOnBank, cashOnHand, collectibles = 0,
  fineAmount = 0, totalStudentsWithFines = 0, fineStudentsPaid = 0,
  facultyCode, campusCode,
}: {
  cashOnBank: number; cashOnHand: number; collectibles?: number;
  fineAmount?: number; totalStudentsWithFines?: number; fineStudentsPaid?: number;
  facultyCode?: string | null; campusCode?: string | null;
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
  const [finesAdded, setFinesAdded] = useState(false);

  const applyFilter = (q: any) =>
    facultyCode ? q.eq("faculty_code", facultyCode) : q.eq("campus_code", campusCode!).is("faculty_code", null);

  async function executeUndoColl(value: number) {
    const supabase = createClient();
    await applyFilter(supabase.from("balance_cards").update({ collectibles: value }));
    if (collLogId.current !== null) {
      await supabase.from("activity_logs").delete().eq("id", collLogId.current);
      collLogId.current = null;
    }
    setColl(value); setPrevColl(null); collToastId.current = null; setFinesAdded(false);
  }

  async function executeUndoBank(value: { bank: number; hand: number }) {
    const supabase = createClient();
    await applyFilter(supabase.from("balance_cards").update({ cash_on_bank: value.bank, cash_on_hand: value.hand }));
    if (bankLogId.current !== null) {
      await supabase.from("activity_logs").delete().eq("id", bankLogId.current);
      bankLogId.current = null;
    }
    setBank(value.bank); setHand(value.hand); setPrevBank(null); bankToastId.current = null;
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

  function openCalc(action: BankAction) { setBankAction(action); setCalcInput(""); setCalcOpen(true); }
  function closeCalc() { setCalcOpen(false); setCalcInput(""); }

  const handleCalcKey = useCallback((key: string) => {
    if (key === "clear") { setCalcInput(""); return; }
    if (key === "⌫") { setCalcInput((p) => p.slice(0, -1)); return; }
    if (key === ".") { setCalcInput((p) => (p.includes(".") ? p : p + ".")); return; }
    setCalcInput((p) => (p === "0" ? key : p + key));
  }, []);

  const confirmCalc = useCallback(async () => {
    const amount = parseFloat(calcInput);
    if (isNaN(amount) || amount <= 0) return;
    setCalcSaving(true);
    if (bankAction === "collectibles_add") setPrevColl(coll); else setPrevBank({ bank, hand });
    const result = await executeBankUpdate({
      amount, bankAction: bankAction!, bank, hand, coll, facultyCode, campusCode,
      onUndoColl: executeUndoColl, onUndoBank: executeUndoBank,
    });
    if (result.type === "coll") {
      setColl(result.newColl!);
      result.logIdRef.then((id) => { collLogId.current = id; });
      collToastId.current = result.toastId;
    } else {
      if (result.newBank !== undefined) setBank(result.newBank);
      if (result.newHand !== undefined) setHand(result.newHand);
      result.logIdRef.then((id) => { bankLogId.current = id; });
      bankToastId.current = result.toastId;
    }
    setCalcSaving(false); closeCalc();
  }, [calcInput, bank, hand, coll, bankAction, facultyCode, campusCode]);

  const fineActions = useFineActions({
    fineAmount, totalStudentsWithFines, fineStudentsPaid,
    coll, setColl,
    onPrevColl: setPrevColl,
    onCollLog: (id) => { collLogId.current = id; },
    onCollToast: (id) => { collToastId.current = id; },
    setFinesAdded,
    executeUndoColl,
    facultyCode, campusCode,
  });

  return {
    visible, setVisible,
    bank, hand, coll,
    prevColl, prevBank,
    bankAction, setBankAction,
    calcOpen, calcInput, calcSaving,
    openCalc, closeCalc, handleCalcKey, confirmCalc,
    handleUndoColl, handleUndoBank,
    finesAdded,
    ...fineActions,
  };
}
