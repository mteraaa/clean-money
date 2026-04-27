"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Balance, PublishedReport, SemesterMeta } from "./types";

export function useDashboardData() {
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

      if (userData.faculty_code) {
        const { data: facData } = await supabase
          .from("faculty_seb")
          .select("name")
          .eq("faculty_code", userData.faculty_code)
          .single();
        setUserName(facData?.name ?? "");
      } else if (userData.campus_code) {
        const { data: camData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        setUserName(camData?.name ?? "");
      }

      let balanceQuery = supabase
        .from("balance_cards")
        .select("cash_on_bank, cash_on_hand, collectibles");
      if (userData.faculty_code) {
        balanceQuery = balanceQuery.eq("faculty_code", userData.faculty_code);
      } else {
        balanceQuery = balanceQuery.eq("campus_code", userData.campus_code);
      }
      const { data: balanceData } = await balanceQuery.maybeSingle();
      setHasBalanceRow(!!balanceData);
      setBalance({
        cash_on_bank: balanceData?.cash_on_bank ?? 0,
        cash_on_hand: balanceData?.cash_on_hand ?? 0,
        collectibles: balanceData?.collectibles ?? 0,
        faculty_code: userData.faculty_code,
        campus_code: userData.campus_code,
      });

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
        ? { col: "faculty_code", val: userData.faculty_code }
        : { col: "campus_code", val: userData.campus_code };

      const [{ count: incomeCount }, { count: expenseCount }] = await Promise.all([
        supabase.from("entries").select("id", { count: "exact", head: true })
          .eq("semester_id", sem.id).eq("category", "income").eq(scope.col, scope.val),
        supabase.from("entries").select("id", { count: "exact", head: true })
          .eq("semester_id", sem.id).eq("category", "expense").eq(scope.col, scope.val),
      ]);
      setNextControlNumbers({ income: (incomeCount ?? 0) + 1, expense: (expenseCount ?? 0) + 1 });

      const reportQ = supabase.from("reports").select("id, file_path").eq("semester_id", sem.id);
      if (userData.faculty_code) reportQ.eq("faculty_code", userData.faculty_code);
      else reportQ.eq("campus_code", userData.campus_code);
      const { data: existingReport } = await reportQ.maybeSingle();
      if (existingReport) {
        setPublishedReport({
          id: existingReport.id,
          file_path: existingReport.file_path,
          bucket: userData.faculty_code ? "Faculties" : "Campus SEB",
        });
      }
    })();
  }, []);

  async function refreshBalance() {
    if (!balance) return;
    const supabase = createClient();
    let q = supabase.from("balance_cards").select("cash_on_bank, cash_on_hand, collectibles");
    if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
    else q = q.eq("campus_code", balance.campus_code);
    const { data, error } = await q.single();
    if (error) console.error("Balance fetch error:", error.message);
    if (data) setBalance((prev) => (prev ? { ...prev, ...data } : prev));
    setBalanceKey((prev) => prev + 1);
  }

  return {
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
    refreshBalance,
  };
}
