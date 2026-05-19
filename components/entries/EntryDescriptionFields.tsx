import { FormState, INCOME_DESCRIPTIONS, EXPENSE_DESCRIPTIONS } from "./entryFormTypes";

type Props = {
  form: FormState;
  onChange: (form: FormState) => void;
  errors: Record<string, boolean>;
  onClearError: (key: string) => void;
  descriptionOnly?: boolean;
};

export default function EntryDescriptionFields({ form, onChange, errors, onClearError, descriptionOnly }: Props) {
  const isReimbursement = form.category === "expense" && form.description_preset === "Reimbursement";
  const needsExtra =
    form.description_preset === "Others" ||
    (form.category === "expense" && form.description_preset === "Special Projects/Fund Raising") ||
    isReimbursement;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Category</label>
        <select
          value={form.category}
          disabled={descriptionOnly}
          onChange={(e) => onChange({ ...form, category: e.target.value as "income" | "expense", description_preset: "", description_other: "", payee: "" })}
          className={`border rounded-lg px-4 pr-10 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-300 font-medium disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${errors.category && !form.category ? "border-red-500" : form.category === "income" ? "border-green-500" : form.category === "expense" ? "border-red-500" : "border-gray-200"} ${form.category === "income" ? "text-green-600" : form.category === "expense" ? "text-red-500" : "text-gray-400"}`}
        >
          <option value="" disabled>Select category</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Description</label>
        <select
          value={form.description_preset}
          disabled={!form.category || descriptionOnly}
          onChange={(e) => {
            onChange({ ...form, description_preset: e.target.value, description_other: "", payee: "" });
            onClearError("description");
          }}
          className={`border rounded-lg px-4 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${errors.description && !form.description_preset ? "border-red-500" : "border-gray-200"}`}
        >
          <option value="">Select description</option>
          {(form.category === "income" ? INCOME_DESCRIPTIONS : EXPENSE_DESCRIPTIONS).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {needsExtra && (
          <input
            type="text"
            value={form.description_other}
            onChange={(e) => { onChange({ ...form, description_other: e.target.value }); onClearError("description"); }}
            placeholder={form.description_preset === "Others" ? "Specify description" : "Specify project name"}
            className={`border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 mt-1 ${errors.description && !form.description_other ? "border-red-500" : "border-gray-200"}`}
          />
        )}
        {isReimbursement && (
          <input
            type="text"
            value={form.payee}
            disabled={descriptionOnly}
            onChange={(e) => onChange({ ...form, payee: e.target.value })}
            placeholder="Payee"
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 mt-1 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        )}
      </div>
    </>
  );
}
