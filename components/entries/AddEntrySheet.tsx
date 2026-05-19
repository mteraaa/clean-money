"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import EntryFormFields from "./EntryFormFields";
import { emptyForm, type FormState } from "./entryFormTypes";

export { INCOME_DESCRIPTIONS, EXPENSE_DESCRIPTIONS, emptyForm, type FormState } from "./entryFormTypes";

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
    if (isEdit) { (props as EditModeProps).onSubmit(); return; }
    const newErrors = forms.map((form) => {
      const needsExtra =
        form.description_preset === "Others" ||
        (form.category === "expense" && form.description_preset === "Special Projects/Fund Raising");
      const finalDescription = needsExtra ? form.description_other : form.description_preset;
      return { category: !form.category, description: !finalDescription, date: !form.date, unit_price: !form.unit_price, quantity: !form.quantity };
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
              descriptionOnly
            />
          ) : (
            <>
              {forms.map((form, index) => {
                const incomesBefore = forms.slice(0, index).filter((f) => f.category === "income").length;
                const expensesBefore = forms.slice(0, index).filter((f) => f.category === "expense").length;
                const controlNum = !form.category ? 0
                  : form.category === "income" ? nextControlNumbers.income + incomesBefore
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
