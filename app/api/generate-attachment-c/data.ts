import { fmt, fmtDate } from "./pdf-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PRESET_ORDER = ["Others", "Special Projects/Fund Raising", "Reimbursement"] as const;
export type Preset = (typeof PRESET_ORDER)[number];

export const STD_COLS = [70, 80, 160, 60, 45, 70];
export const REIMB_COLS = [70, 120, 225, 70];
export const STD_HEADERS = ["Date", "OR/TR No.", "Description", "Unit Price", "Qty", "Amount"];
export const REIMB_HEADERS = ["Date", "Payee", "Description", "Amount"];

export type ExpEntry = {
  id: string;
  entry_date: string | null;
  control_number: number | null;
  receipt_number: string | null;
  description: string | null;
  unit_price: number | null;
  quantity: number | null;
  total_price: number | null;
};

export function getPreset(desc: string): Preset {
  if (desc.startsWith("Reimbursement")) return "Reimbursement";
  if (desc.startsWith("Special Projects/Fund Raising")) return "Special Projects/Fund Raising";
  return "Others";
}

function parseReimbursement(description: string) {
  const parts = description.split(" — ");
  return { payee: parts[1] ?? description, desc: parts.slice(2).join(" — ") };
}

export function buildRows(entries: ExpEntry[], isReimb: boolean): string[][] {
  return entries.map((e) => {
    const date = fmtDate(e.entry_date ?? "");
    const amt = fmt(Number(e.total_price) || 0);
    if (isReimb) {
      const { payee, desc } = parseReimbursement(e.description ?? "");
      return [date, payee, desc, amt];
    }
    return [date, e.receipt_number ?? "-", e.description ?? "", fmt(Number(e.unit_price) || 0), String(Number(e.quantity) || 0), amt];
  });
}

export function groupEntries(entries: ExpEntry[]) {
  const groups = new Map<Preset, ExpEntry[]>([
    ["Special Projects/Fund Raising", []],
    ["Reimbursement", []],
    ["Others", []],
  ]);
  for (const e of entries) groups.get(getPreset(e.description ?? ""))!.push(e);
  return groups;
}

export async function fetchOrgData(supabase: SupabaseClient, userId: string) {
  const { data: userData } = await supabase
    .from("users")
    .select("faculty_code, campus_code")
    .eq("auth_id", userId)
    .single();
  if (!userData) return null;
  const { faculty_code, campus_code } = userData;
  let facultyName = "";
  if (faculty_code) {
    const { data: fac } = await supabase.from("faculty_seb").select("name").eq("faculty_code", faculty_code).single();
    facultyName = fac?.name ?? "";
  } else {
    const { data: cam } = await supabase.from("campus_seb").select("name").eq("campus_code", campus_code!).single();
    facultyName = cam?.name ?? "";
  }
  return { faculty_code, campus_code, facultyName };
}

export async function fetchExpenseEntries(
  supabase: SupabaseClient,
  allIds: string[],
  semId: string,
  faculty_code: string | null,
  campus_code: string | null,
): Promise<Map<string, ExpEntry>> {
  let q = supabase
    .from("entries")
    .select("id, entry_date, control_number, receipt_number, description, unit_price, quantity, total_price")
    .in("id", allIds)
    .eq("semester_id", semId)
    .eq("category", "expense")
    .order("entry_date", { ascending: true });
  if (faculty_code) q = q.eq("faculty_code", faculty_code);
  else q = q.eq("campus_code", campus_code!);
  const { data } = await q;
  return new Map((data ?? []).map((e) => [String(e.id), e as ExpEntry]));
}
