"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { formatPeso } from "./formatPeso";

export function useFineActions({
  fineAmount = 0,
  totalStudentsWithFines = 0,
  fineStudentsPaid = 0,
  coll,
  setColl,
  onPrevColl,
  onCollLog,
  onCollToast,
  setFinesAdded,
  executeUndoColl,
  facultyCode,
  campusCode,
}: {
  fineAmount?: number;
  totalStudentsWithFines?: number;
  fineStudentsPaid?: number;
  coll: number;
  setColl: (val: number) => void;
  onPrevColl: (val: number) => void;
  onCollLog: (id: number | null) => void;
  onCollToast: (id: string | number) => void;
  setFinesAdded: (val: boolean) => void;
  executeUndoColl: (val: number) => Promise<void>;
  facultyCode?: string | null;
  campusCode?: string | null;
}) {
  const [fineAmt, setFineAmt] = useState(fineAmount);
  const [totalFineStudents, setTotalFineStudents] = useState(totalStudentsWithFines);
  const [fineEditOpen, setFineEditOpen] = useState(false);
  const [fineAmtInput, setFineAmtInput] = useState("");
  const [fineTotalInput, setFineTotalInput] = useState("");
  const [fineSaving, setFineSaving] = useState(false);
  const prevFineStudentsPaid = useRef(fineStudentsPaid);

  useEffect(() => {
    if (prevFineStudentsPaid.current !== fineStudentsPaid) {
      prevFineStudentsPaid.current = fineStudentsPaid;
      setFinesAdded(false);
    }
  }, [fineStudentsPaid, setFinesAdded]);

  function openFineEdit() {
    setFineAmtInput(fineAmt > 0 ? String(fineAmt) : "");
    setFineTotalInput(totalFineStudents > 0 ? String(totalFineStudents) : "");
    setFineEditOpen(true);
  }

  function closeFineEdit() { setFineEditOpen(false); }

  async function saveFineEdit() {
    const amt = parseFloat(fineAmtInput) || 0;
    const total = parseInt(fineTotalInput) || 0;
    setFineSaving(true);
    const supabase = createClient();
    let q = supabase.from("balance_cards").update({ fine_amount: amt, total_students_with_fines: total });
    if (facultyCode) q = q.eq("faculty_code", facultyCode);
    else q = q.eq("campus_code", campusCode!).is("faculty_code", null);
    await q;
    setFineAmt(amt); setTotalFineStudents(total);
    setFineSaving(false); setFineEditOpen(false); setFinesAdded(false);
    toast.success("Fine details updated");
  }

  async function handleAddFineToCollectibles() {
    const remaining = Math.max(0, totalFineStudents - fineStudentsPaid);
    const addAmt = remaining * fineAmt;
    if (addAmt <= 0) return;

    const saved = coll;
    onPrevColl(coll);
    const newColl = coll + addAmt;
    const supabase = createClient();
    let q = supabase.from("balance_cards").update({ collectibles: newColl });
    if (facultyCode) q = q.eq("faculty_code", facultyCode);
    else q = q.eq("campus_code", campusCode!).is("faculty_code", null);
    await q;
    setColl(newColl);

    const desc = `Added ${formatPeso(addAmt)} to Collectibles from Fines (${remaining} unpaid × ${formatPeso(fineAmt)})`;
    logActivity({ description: desc, action: "COLLECTIBLES_ADD", facultyCode, campusCode, targetTable: "balance_cards" })
      .then((id) => { onCollLog(id ?? null); }).catch(() => {});
    const id = toast.success(desc, { action: { label: "Undo", onClick: () => executeUndoColl(saved) } });
    onCollToast(id);
    setFinesAdded(true);
  }

  return {
    fineAmt, totalFineStudents,
    fineEditOpen, fineAmtInput, fineTotalInput, fineSaving,
    openFineEdit, closeFineEdit,
    setFineAmtInput, setFineTotalInput,
    saveFineEdit, handleAddFineToCollectibles,
  };
}
