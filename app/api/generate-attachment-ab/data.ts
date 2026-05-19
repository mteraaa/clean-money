import { createClient } from "@/utils/supabase/server";
import type { ExpEntry } from "../generate-attachment-c/data";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type FinesCalc = {
  fineStudentsPaid: number;
  fineAmount: number;
  remaining: number;
  collected: number;
  collectibles: number;
  grandTotal: number;
};

export async function fetchOrgData(supabase: Supabase, userId: string) {
  const { data: userData } = await supabase
    .from("users")
    .select("faculty_code, campus_code")
    .eq("auth_id", userId)
    .single();
  if (!userData) return null;
  const { faculty_code, campus_code } = userData as { faculty_code: string | null; campus_code: string | null };
  let facultyName = "";
  if (faculty_code) {
    const { data: fac } = await supabase.from("faculty_seb").select("name").eq("faculty_code", faculty_code).single();
    facultyName = (fac as { name?: string } | null)?.name ?? "";
  } else {
    const { data: cam } = await supabase.from("campus_seb").select("name").eq("campus_code", campus_code!).single();
    facultyName = (cam as { name?: string } | null)?.name ?? "";
  }
  return { faculty_code, campus_code, facultyName };
}

export async function fetchIncomeEntries(
  supabase: Supabase,
  allIds: string[],
  semId: string,
  faculty_code: string | null,
  campus_code: string | null,
): Promise<Map<string, ExpEntry>> {
  let q = supabase
    .from("entries")
    .select("id, entry_date, control_number, description, unit_price, quantity, total_price")
    .in("id", allIds)
    .eq("semester_id", semId)
    .eq("category", "income")
    .order("entry_date", { ascending: true });
  if (faculty_code) q = q.eq("faculty_code", faculty_code);
  else q = q.eq("campus_code", campus_code!);
  const { data } = await q;
  return new Map<string, ExpEntry>((data ?? []).map((e) => [String(e.id), e as ExpEntry]));
}

export async function fetchFinesData(
  supabase: Supabase,
  semId: string,
  faculty_code: string | null,
  campus_code: string | null,
): Promise<FinesCalc> {
  let bcQ = supabase.from("balance_cards").select("fine_amount, total_students_with_fines");
  if (faculty_code) bcQ = bcQ.eq("faculty_code", faculty_code);
  else bcQ = bcQ.eq("campus_code", campus_code!).is("faculty_code", null);
  const { data: bc } = await bcQ.maybeSingle();

  let finesQ = supabase
    .from("entries")
    .select("quantity")
    .eq("semester_id", semId)
    .eq("category", "income")
    .eq("description", "Fines")
    .eq("is_deleted", false);
  if (faculty_code) finesQ = finesQ.eq("faculty_code", faculty_code);
  else finesQ = finesQ.eq("campus_code", campus_code!);
  const { data: finesData } = await finesQ;

  const fineStudentsPaid = (finesData ?? []).reduce(
    (sum: number, r: { quantity: unknown }) => sum + (Number(r.quantity) || 0),
    0,
  );
  const fineAmount = Number((bc as { fine_amount?: unknown } | null)?.fine_amount) || 0;
  const totalStudents = Number((bc as { total_students_with_fines?: unknown } | null)?.total_students_with_fines) || 0;
  const remaining = Math.max(0, totalStudents - fineStudentsPaid);
  const collected = fineStudentsPaid * fineAmount;
  const collectibles = remaining * fineAmount;
  return { fineStudentsPaid, fineAmount, remaining, collected, collectibles, grandTotal: collected + collectibles };
}
