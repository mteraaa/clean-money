import { INCOME_DESCRIPTIONS, type FormState } from "./entryFormTypes";

export type Entry = {
  id: number;
  control_number: number;
  description: string;
  category: "income" | "expense";
  unit_price: number;
  quantity: number;
  entry_date: string;
};

export function entryToForm(entry: Entry): FormState {
  const { category, description, unit_price, quantity, entry_date } = entry;
  let description_preset = "";
  let description_other = "";
  let payee = "";

  if (category === "income") {
    if (INCOME_DESCRIPTIONS.includes(description) && description !== "Others") {
      description_preset = description;
    } else {
      description_preset = "Others";
      description_other = description;
    }
  } else {
    if (description.startsWith("Special Projects/Fund Raising")) {
      description_preset = "Special Projects/Fund Raising";
      description_other = description.replace("Special Projects/Fund Raising — ", "");
    } else if (description.startsWith("Reimbursement")) {
      description_preset = "Reimbursement";
      const inner = description.replace("Reimbursement — ", "");
      const parts = inner.split(" — ");
      if (parts.length >= 2) {
        payee = parts[0];
        description_other = parts.slice(1).join(" — ");
      } else {
        description_other = inner;
      }
    } else {
      description_preset = "Others";
      description_other = description;
    }
  }

  return {
    date: entry_date,
    description_preset,
    description_other,
    payee,
    category,
    unit_price: String(unit_price),
    quantity: String(quantity),
  };
}

export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}
