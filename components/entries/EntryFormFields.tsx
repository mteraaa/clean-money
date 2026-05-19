"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FormState } from "./entryFormTypes";
import EntryDescriptionFields from "./EntryDescriptionFields";
import EntryPriceFields from "./EntryPriceFields";

type Props = {
  index: number;
  baseControlNumber: number;
  form: FormState;
  onChange: (form: FormState) => void;
  errors: Record<string, boolean>;
  onClearError: (key: string) => void;
  onRemove?: () => void;
  descriptionOnly?: boolean;
};

export default function EntryFormFields({ index, baseControlNumber, form, onChange, errors, onClearError, onRemove, descriptionOnly = false }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);

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

      <EntryDescriptionFields
        form={form}
        onChange={onChange}
        errors={errors}
        onClearError={onClearError}
        descriptionOnly={descriptionOnly}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Date</label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button disabled={descriptionOnly} className={`flex items-center justify-between border rounded-lg px-4 py-3 text-sm outline-none text-left disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${errors.date ? "border-red-500" : "border-gray-200"}`}>
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

      <EntryPriceFields
        form={form}
        onChange={onChange}
        errors={errors}
        onClearError={onClearError}
        descriptionOnly={descriptionOnly}
        onRemove={onRemove}
      />
    </div>
  );
}
