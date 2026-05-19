export const INCOME_DESCRIPTIONS = [
  "Membership Fee",
  "Donations",
  "Fines",
  "Collectibles",
  "Special Projects/Fund Raising",
  "Others",
];
export const EXPENSE_DESCRIPTIONS = ["Special Projects/Fund Raising", "Reimbursement", "Others"];

export type FormState = {
  date: string;
  description_preset: string;
  description_other: string;
  payee: string;
  category: "income" | "expense";
  unit_price: string;
  quantity: string;
  receipt?: File | null;
  receipt_number?: string;
};

export const emptyForm: FormState = {
  date: "",
  description_preset: "",
  description_other: "",
  payee: "",
  category: "expense",
  unit_price: "",
  quantity: "",
  receipt: null,
  receipt_number: "",
};

export function formatPeso(amount: number) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
