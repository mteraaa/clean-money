import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { BankAction } from "./useBalanceActions";

function applyFilter(q: any, facultyCode?: string | null, campusCode?: string | null) {
  return facultyCode ? q.eq("faculty_code", facultyCode) : q.eq("campus_code", campusCode!).is("faculty_code", null);
}

type Result = {
  newColl?: number; newBank?: number; newHand?: number;
  logIdRef: Promise<number | null>;
  toastId: string | number;
  type: "coll" | "bank";
};

export async function executeBankUpdate({
  amount, bankAction, bank, hand, coll, facultyCode, campusCode, onUndoColl, onUndoBank,
}: {
  amount: number;
  bankAction: BankAction;
  bank: number; hand: number; coll: number;
  facultyCode?: string | null; campusCode?: string | null;
  onUndoColl: (saved: number) => void;
  onUndoBank: (saved: { bank: number; hand: number }) => void;
}): Promise<Result> {
  const supabase = createClient();
  const fmtAmt = `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const descriptions: Record<BankAction, string> = {
    collectibles_add: `Added ${fmtAmt} to Collectibles`,
    interest: `Added ${fmtAmt} Interest Earnings to Cash on Bank`,
    deposit: `Deposited ${fmtAmt} to Cash on Bank`,
    withdrawal: `Withdrew ${fmtAmt} from Cash on Bank`,
  };
  const desc = descriptions[bankAction];

  if (bankAction === "collectibles_add") {
    const newColl = coll + amount;
    await applyFilter(supabase.from("balance_cards").update({ collectibles: newColl }), facultyCode, campusCode);
    const logIdRef = logActivity({ description: desc, action: "COLLECTIBLES_ADD", facultyCode, campusCode, targetTable: "balance_cards" })
      .then((id) => id ?? null).catch(() => null);
    const toastId = toast.success(desc, { action: { label: "Undo", onClick: () => onUndoColl(coll) } });
    return { newColl, logIdRef, toastId, type: "coll" };
  }

  if (bankAction === "interest") {
    const { data: balData } = await applyFilter(
      supabase.from("balance_cards").select("initial_cash_on_bank, initial_account_balance"),
      facultyCode, campusCode
    ).single();
    const newBank = bank + amount;
    await applyFilter(supabase.from("balance_cards").update({
      cash_on_bank: newBank,
      initial_cash_on_bank: ((balData?.initial_cash_on_bank as number) || 0) + amount,
      initial_account_balance: ((balData?.initial_account_balance as number) || 0) + amount,
    }), facultyCode, campusCode);
    const logIdRef = logActivity({ description: desc, action: "INTEREST", facultyCode, campusCode, targetTable: "balance_cards" })
      .then((id) => id ?? null).catch(() => null);
    const toastId = toast.success(desc, { action: { label: "Undo", onClick: () => onUndoBank({ bank, hand }) } });
    return { newBank, logIdRef, toastId, type: "bank" };
  }

  const newBank = bankAction === "deposit" ? bank + amount : bank - amount;
  const newHand = bankAction === "deposit" ? hand - amount : hand + amount;
  await applyFilter(supabase.from("balance_cards").update({ cash_on_bank: newBank, cash_on_hand: newHand }), facultyCode, campusCode);
  const logIdRef = logActivity({ description: desc, action: bankAction.toUpperCase(), facultyCode, campusCode, targetTable: "balance_cards" })
    .then((id) => id ?? null).catch(() => null);
  const toastId = toast.success(desc, { action: { label: "Undo", onClick: () => onUndoBank({ bank, hand }) } });
  return { newBank, newHand, logIdRef, toastId, type: "bank" };
}
