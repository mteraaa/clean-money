import { createClient } from "@/utils/supabase/client";
import type { Balance, PublishedReport } from "./types";

type UserData = { faculty_code: string | null; campus_code: string | null };
type Scope = { col: "faculty_code" | "campus_code"; val: string };

export async function resolveUserName(
  supabase: ReturnType<typeof createClient>,
  userData: UserData,
): Promise<string> {
  if (userData.faculty_code) {
    const { data } = await supabase
      .from("faculty_seb").select("name")
      .eq("faculty_code", userData.faculty_code).single();
    return data?.name ?? "";
  }
  const { data } = await supabase
    .from("campus_seb").select("name")
    .eq("campus_code", userData.campus_code).single();
  return data?.name ?? "";
}

export async function resolveBalance(
  supabase: ReturnType<typeof createClient>,
  userData: UserData,
): Promise<{ balance: Balance; hasBalanceRow: boolean }> {
  let q = supabase
    .from("balance_cards")
    .select("cash_on_bank, cash_on_hand, collectibles, fine_amount, total_students_with_fines");
  if (userData.faculty_code) {
    q = q.eq("faculty_code", userData.faculty_code);
  } else {
    q = q.eq("campus_code", userData.campus_code).is("faculty_code", null);
  }
  const { data } = await q.maybeSingle();
  return {
    hasBalanceRow: !!data,
    balance: {
      cash_on_bank: data?.cash_on_bank ?? 0,
      cash_on_hand: data?.cash_on_hand ?? 0,
      collectibles: data?.collectibles ?? 0,
      fine_amount: data?.fine_amount ?? 0,
      total_students_with_fines: data?.total_students_with_fines ?? 0,
      faculty_code: userData.faculty_code,
      campus_code: userData.campus_code,
    },
  };
}

export async function resolveControlNumbers(
  supabase: ReturnType<typeof createClient>,
  semId: number,
  scope: Scope,
): Promise<{ nextControlNumbers: { income: number; expense: number }; fineStudentsPaid: number }> {
  const [
    { count: incomeCount },
    { count: expenseCount },
    { data: finesData },
  ] = await Promise.all([
    supabase.from("entries").select("id", { count: "exact", head: true })
      .eq("semester_id", semId).eq("category", "income").eq(scope.col, scope.val),
    supabase.from("entries").select("id", { count: "exact", head: true })
      .eq("semester_id", semId).eq("category", "expense").eq(scope.col, scope.val),
    supabase.from("entries").select("quantity")
      .eq("semester_id", semId).eq("category", "income").eq("description", "Fines")
      .eq("is_deleted", false).eq(scope.col, scope.val),
  ]);
  return {
    nextControlNumbers: { income: (incomeCount ?? 0) + 1, expense: (expenseCount ?? 0) + 1 },
    fineStudentsPaid: (finesData ?? []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
  };
}

export async function resolvePublishedReport(
  supabase: ReturnType<typeof createClient>,
  semId: number,
  userData: UserData,
): Promise<PublishedReport | null> {
  const q = supabase.from("reports").select("id, file_path").eq("semester_id", semId);
  if (userData.faculty_code) q.eq("faculty_code", userData.faculty_code);
  else q.eq("campus_code", userData.campus_code);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    file_path: data.file_path,
    bucket: userData.faculty_code ? "Faculties" : "Campus SEB",
  };
}
