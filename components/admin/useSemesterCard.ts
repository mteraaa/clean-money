import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type SemesterData = {
  id: number;
  semester_name: string;
  yearStart: string;
  yearEnd: string;
  yearLabel: string;
};

export type { SemesterData };

export function useSemesterCard() {
  const [data, setData] = useState<SemesterData | null>(null);
  const [editing, setEditing] = useState(false);
  const [semesterName, setSemesterName] = useState("1st Semester");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: sem } = await supabase
      .from("semesters")
      .select("id, semester_name, academic_years(year_label)")
      .eq("is_active", true)
      .single();

    if (!sem) { setData(null); return; }

    const ayRaw = sem.academic_years as { year_label?: string } | null;
    const yearLabel = ayRaw?.year_label ?? "";
    const parts = yearLabel.replace("A.Y. ", "").split("-");
    const start = parts[0]?.trim() ?? "";
    const end = parts[1]?.trim() ?? "";

    setData({ id: sem.id, semester_name: sem.semester_name, yearStart: start, yearEnd: end, yearLabel });
    setSemesterName(sem.semester_name);
    setYearStart(start);
    setYearEnd(end);
  }

  useEffect(() => { load(); }, []);

  async function handleUpdate() {
    if (!yearStart || !yearEnd) { toast.error("Please fill in the academic year."); return; }
    if (yearStart.length !== 4 || yearEnd.length !== 4) { toast.error("Academic year must be 4-digit years."); return; }

    setSaving(true);
    const supabase = createClient();
    const newYearLabel = `A.Y. ${yearStart}-${yearEnd}`;

    await supabase.from("semesters").update({ is_active: false }).eq("is_active", true);
    await supabase.from("academic_years").update({ is_active: false }).eq("is_active", true);

    const { data: cards } = await supabase
      .from("balance_cards")
      .select("id, cash_on_bank, cash_on_hand, collectibles");
    if (cards && cards.length > 0) {
      await Promise.all(
        cards.map((card) =>
          supabase.from("balance_cards").update({
            initial_cash_on_bank: card.cash_on_bank,
            initial_cash_on_hand: card.cash_on_hand,
            initial_collectibles: card.collectibles,
            initial_account_balance: card.cash_on_bank + card.cash_on_hand,
          }).eq("id", card.id)
        )
      );
    }

    await supabase.from("activity_logs").delete().gte("id", 0);

    let { data: ay } = await supabase.from("academic_years").select("id").eq("year_label", newYearLabel).single();
    if (!ay) {
      const { data: newAy } = await supabase.from("academic_years").insert({ year_label: newYearLabel, is_active: true }).select("id").single();
      ay = newAy;
    } else {
      await supabase.from("academic_years").update({ is_active: true }).eq("id", ay.id);
    }

    let { data: sem } = await supabase
      .from("semesters")
      .select("id")
      .eq("academic_year_id", ay!.id)
      .eq("semester_name", semesterName)
      .single();

    if (!sem) {
      const { data: newSem } = await supabase
        .from("semesters")
        .insert({ semester_name: semesterName, academic_year_id: ay!.id, is_active: true })
        .select("id")
        .single();
      sem = newSem;
    } else {
      await supabase.from("semesters").update({ is_active: true }).eq("id", sem.id);
    }

    setSaving(false);
    setEditing(false);
    toast.success("Semester updated.");
    load();
  }

  function cancelEdit() {
    setEditing(false);
    if (data) { setSemesterName(data.semester_name); setYearStart(data.yearStart); setYearEnd(data.yearEnd); }
  }

  return { data, editing, setEditing, semesterName, setSemesterName, yearStart, setYearStart, yearEnd, setYearEnd, saving, handleUpdate, cancelEdit, load };
}
