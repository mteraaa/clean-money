"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Balance, PublishedReport, SemesterMeta } from "./types";
import {
  resolveUserName,
  resolveBalance,
  resolveControlNumbers,
  resolvePublishedReport,
} from "./dashboardHelpers";

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [hasBalanceRow, setHasBalanceRow] = useState(false);
  const [isSemesterEnded, setIsSemesterEnded] = useState(false);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [semesterMeta, setSemesterMeta] = useState<SemesterMeta | null>(null);
  const [nextControlNumbers, setNextControlNumbers] = useState({ income: 1, expense: 1 });
  const [publishedReport, setPublishedReport] = useState<PublishedReport | null>(null);
  const [balanceKey, setBalanceKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fineStudentsPaid, setFineStudentsPaid] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code, full_name")
        .eq("auth_id", user.id)
        .single();
      if (!userData) return;

      const [name, { balance: bal, hasBalanceRow: hasBal }] = await Promise.all([
        resolveUserName(supabase, userData),
        resolveBalance(supabase, userData),
      ]);
      setUserName(name);
      setHasBalanceRow(hasBal);
      setBalance(bal);

      const { data: sem } = await supabase
        .from("semesters")
        .select("id, semester_name, academic_years(year_label)")
        .eq("is_active", true)
        .single();
      if (!sem) { setIsSemesterEnded(true); return; }

      setIsSemesterEnded(false);
      setSemesterId(sem.id);
      const ayRaw = sem.academic_years;
      const yearLabel =
        ((Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as { year_label?: string } | null)
          ?.year_label ?? "";
      setSemesterMeta({ name: sem.semester_name ?? "", yearLabel });

      const scope = userData.faculty_code
        ? { col: "faculty_code" as const, val: userData.faculty_code }
        : { col: "campus_code" as const, val: userData.campus_code! };

      const [{ nextControlNumbers: ctrl, fineStudentsPaid: fines }, report] = await Promise.all([
        resolveControlNumbers(supabase, sem.id, scope),
        resolvePublishedReport(supabase, sem.id, userData),
      ]);
      setNextControlNumbers(ctrl);
      setFineStudentsPaid(fines);
      if (report) setPublishedReport(report);

      setIsLoading(false);
    })();
  }, []);

  async function refreshBalance() {
    if (!balance) return;
    const supabase = createClient();
    let q = supabase.from("balance_cards")
      .select("cash_on_bank, cash_on_hand, collectibles, fine_amount, total_students_with_fines");
    if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
    else q = q.eq("campus_code", balance.campus_code).is("faculty_code", null);
    const { data, error } = await q.single();
    if (error) console.error("Balance fetch error:", error.message);
    if (data) setBalance((prev) => (prev ? { ...prev, ...data } : prev));

    const scope = balance.faculty_code
      ? { col: "faculty_code" as const, val: balance.faculty_code }
      : { col: "campus_code" as const, val: balance.campus_code! };
    const activeSem = await supabase.from("semesters").select("id").eq("is_active", true).single();
    if (activeSem.data) {
      const { data: finesData } = await supabase.from("entries").select("quantity")
        .eq("semester_id", activeSem.data.id).eq("category", "income").eq("description", "Fines")
        .eq("is_deleted", false).eq(scope.col, scope.val);
      const paid = (finesData ?? []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      setFineStudentsPaid(paid);
    }
    setBalanceKey((prev) => prev + 1);
  }

  return {
    isLoading,
    userName,
    balance, setBalance,
    hasBalanceRow, setHasBalanceRow,
    isSemesterEnded,
    semesterId,
    semesterMeta,
    nextControlNumbers, setNextControlNumbers,
    publishedReport, setPublishedReport,
    balanceKey,
    refreshKey, setRefreshKey,
    fineStudentsPaid,
    refreshBalance,
  };
}
