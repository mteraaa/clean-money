"use client";

import React, { useState, useEffect } from "react";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export const INCOME_DESCRIPTIONS = [
  "Membership Fee",
  "Donations",
  "Fines",
  "Collectibles",
  "Special Projects/Fund Raising",
  "Others",
];
export const EXPENSE_DESCRIPTIONS = ["Special Projects/Fund Raising", "Others"];

export type FormState = {
  date: string;
  description_preset: string;
  description_other: string;
  category: "income" | "expense";
  unit_price: string;
  quantity: string;
  receipt?: File | null;
};

export const emptyForm: FormState = {
  date: "",
  description_preset: "",
  description_other: "",
  category: "expense",
  unit_price: "",
  quantity: "",
  receipt: null,
};

function formatPeso(amount: number) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function EntryFormFields({
  index,
  baseControlNumber,
  form,
  onChange,
  errors,
  onClearError,
  onRemove,
}: {
  index: number;
  baseControlNumber: number;
  form: FormState;
  onChange: (form: FormState) => void;
  errors: Record<string, boolean>;
  onClearError: (key: string) => void;
  onRemove?: () => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const needsExtra =
    form.description_preset === "Others" ||
    (form.category === "expense" && form.description_preset === "Special Projects/Fund Raising");
  const total = (parseFloat(form.unit_price) || 0) * (parseInt(form.quantity) || 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Control Number</label>
        <input
          disabled
          value={baseControlNumber + index}
          className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-100 text-gray-500 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Category</label>
        <select
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value as "income" | "expense", description_preset: "", description_other: "" })}
          className={`border rounded-lg px-4 pr-10 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-300 font-medium ${errors.category && !form.category ? "border-red-500" : form.category === "income" ? "border-green-500" : form.category === "expense" ? "border-red-500" : "border-gray-200"} ${form.category === "income" ? "text-green-600" : form.category === "expense" ? "text-red-500" : "text-gray-400"}`}
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
          disabled={!form.category}
          onChange={(e) => {
            onChange({ ...form, description_preset: e.target.value, description_other: "" });
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
            onChange={(e) => {
              onChange({ ...form, description_other: e.target.value });
              onClearError("description");
            }}
            placeholder={form.description_preset === "Others" ? "Specify description" : "Specify project name"}
            className={`border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 mt-1 ${errors.description && !form.description_other ? "border-red-500" : "border-gray-200"}`}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Date</label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className={`flex items-center justify-between border rounded-lg px-4 py-3 text-sm outline-none text-left ${errors.date ? "border-red-500" : "border-gray-200"}`}>
              <span className={form.date ? "text-gray-900" : "text-gray-400"}>
                {form.date
                  ? new Date(form.date).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })
                  : "Select date"}
              </span>
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.date ? new Date(form.date) : undefined}
              onSelect={(date) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  onChange({ ...form, date: `${y}-${m}-${d}` });
                  setCalendarOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Unit Price</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">₱</span>
          <input
            type="number"
            min="0"
            value={form.unit_price}
            onChange={(e) => { onChange({ ...form, unit_price: e.target.value }); onClearError("unit_price"); }}
            placeholder="0.00"
            className={`border rounded-lg pl-8 pr-4 py-3 text-sm w-full outline-none focus:ring-2 focus:ring-gray-300 ${errors.unit_price ? "border-red-500" : "border-gray-200"}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Quantity</label>
        <input
          type="number"
          min="1"
          value={form.quantity}
          onChange={(e) => { onChange({ ...form, quantity: e.target.value }); onClearError("quantity"); }}
          placeholder="0"
          className={`border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 ${errors.quantity ? "border-red-500" : "border-gray-200"}`}
        />
      </div>

      {form.category === "expense" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-500">Receipt <span className="text-gray-400">(optional)</span></label>
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => onChange({ ...form, receipt: e.target.files?.[0] ?? null })}
            />
            <span className="text-sm text-gray-400 truncate">
              {form.receipt ? form.receipt.name : "Click to upload receipt…"}
            </span>
          </label>
          {form.receipt && (
            <button
              type="button"
              onClick={() => onChange({ ...form, receipt: null })}
              className="text-xs text-red-400 hover:text-red-600 text-left"
            >
              Remove receipt
            </button>
          )}
        </div>
      )}

      <div className="flex items-end justify-between mt-2 pb-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500">Total</label>
          <p className="text-3xl font-bold text-gray-900">{formatPeso(total)}</p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-500 border border-red-500 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

type CommonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
};

type AddModeProps = CommonProps & {
  mode?: "add";
  nextControlNumbers: { income: number; expense: number };
  onSubmit: (forms: FormState[]) => void;
};

type EditModeProps = CommonProps & {
  mode: "edit";
  nextControlNumber: number;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, boolean>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSubmit: () => void;
};

type Props = AddModeProps | EditModeProps;

export default function AddEntrySheet(props: Props) {
  const { open, onOpenChange, submitting } = props;
  const isEdit = props.mode === "edit";
  const nextControlNumber = isEdit ? (props as EditModeProps).nextControlNumber : 0;
  const nextControlNumbers = !isEdit ? (props as AddModeProps).nextControlNumbers : { income: 0, expense: 0 };

  const [forms, setForms] = useState<FormState[]>([]);
  const [formsErrors, setFormsErrors] = useState<Record<string, boolean>[]>([{}]);

  useEffect(() => {
    if (open && !isEdit) {
      setForms([{ ...emptyForm, category: "" as "income" | "expense" }]);
      setFormsErrors([{}]);
    }
  }, [open]);

  function addAnotherEntry() {
    setForms((prev) => [...prev, { ...emptyForm, category: "" as "income" | "expense" }]);
    setFormsErrors((prev) => [...prev, {}]);
  }

  function handleSave() {
    if (isEdit) {
      (props as EditModeProps).onSubmit();
      return;
    }
    const newErrors = forms.map((form) => {
      const needsExtra =
        form.description_preset === "Others" ||
        (form.category === "expense" && form.description_preset === "Special Projects/Fund Raising");
      const finalDescription = needsExtra ? form.description_other : form.description_preset;
      return {
        category: !form.category,
        description: !finalDescription,
        date: !form.date,
        unit_price: !form.unit_price,
        quantity: !form.quantity,
      };
    });
    setFormsErrors(newErrors);
    if (newErrors.some((e) => Object.values(e).some(Boolean))) return;
    (props as AddModeProps).onSubmit(forms);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-105 font-lexend flex flex-col gap-0 px-8 pt-5 pb-8 sm:max-w-none!">
        <SheetHeader className="p-0 mb-3">
          <SheetTitle className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Entry" : "Add Entry"}
          </SheetTitle>
        </SheetHeader>

        <div
          className="flex flex-col flex-1 overflow-y-auto snap-y snap-mandatory"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        >
          {isEdit ? (
            <EntryFormFields
              index={0}
              baseControlNumber={nextControlNumber}
              form={(props as EditModeProps).form}
              onChange={(f) => (props as EditModeProps).setForm(f)}
              errors={(props as EditModeProps).errors}
              onClearError={(key) => (props as EditModeProps).setErrors((p) => ({ ...p, [key]: false }))}
            />
          ) : (
            <>
              {forms.map((form, index) => {
                const incomesBefore = forms.slice(0, index).filter((f) => f.category === "income").length;
                const expensesBefore = forms.slice(0, index).filter((f) => f.category === "expense").length;
                const controlNum = !form.category ? 0
                  : form.category === "income"
                    ? nextControlNumbers.income + incomesBefore
                    : nextControlNumbers.expense + expensesBefore;
                return (
                <React.Fragment key={index}>
                  {index > 0 && <hr className="border-gray-200 my-6" />}
                  <div className="snap-start">
                    <EntryFormFields
                      index={0}
                      baseControlNumber={controlNum}
                      form={form}
                      onChange={(f) => setForms((prev) => prev.map((pf, i) => i === index ? f : pf))}
                      errors={formsErrors[index] || {}}
                      onClearError={(key) => setFormsErrors((prev) => prev.map((e, i) => i === index ? { ...e, [key]: false } : e))}
                      onRemove={forms.length > 1 ? () => {
                        setForms((prev) => prev.filter((_, i) => i !== index));
                        setFormsErrors((prev) => prev.filter((_, i) => i !== index));
                      } : undefined}
                    />
                  </div>
                </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        <div className="pt-6 flex justify-between items-center gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {!isEdit ? (
            <button
              type="button"
              onClick={addAnotherEntry}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Entry
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border border-gray-300 text-gray-700 rounded-lg px-6 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="bg-gray-900 text-white rounded-lg px-8 py-3 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Save"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
