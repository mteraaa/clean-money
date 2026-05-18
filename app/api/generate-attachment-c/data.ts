import { fmt, fmtDate } from "./pdf-helpers";

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
