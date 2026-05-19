import { FormState, formatPeso } from "./entryFormTypes";

type Props = {
  form: FormState;
  onChange: (form: FormState) => void;
  errors: Record<string, boolean>;
  onClearError: (key: string) => void;
  descriptionOnly?: boolean;
  onRemove?: () => void;
};

export default function EntryPriceFields({ form, onChange, errors, onClearError, descriptionOnly, onRemove }: Props) {
  const total = (parseFloat(form.unit_price) || 0) * (parseInt(form.quantity) || 0);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Unit Price</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">₱</span>
          <input
            type="number"
            min="0"
            value={form.unit_price}
            disabled={descriptionOnly}
            onChange={(e) => { onChange({ ...form, unit_price: e.target.value }); onClearError("unit_price"); }}
            placeholder="0.00"
            className={`border rounded-lg pl-8 pr-4 py-3 text-sm w-full outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${errors.unit_price ? "border-red-500" : "border-gray-200"}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-500">Quantity</label>
        <input
          type="number"
          min="1"
          value={form.quantity}
          disabled={descriptionOnly}
          onChange={(e) => { onChange({ ...form, quantity: e.target.value }); onClearError("quantity"); }}
          placeholder="0"
          className={`border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${errors.quantity ? "border-red-500" : "border-gray-200"}`}
        />
      </div>

      {form.category === "expense" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-500">Receipt <span className="text-gray-400">(optional)</span></label>
          <label className={`flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 transition-colors ${descriptionOnly ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
            <input
              type="file"
              accept="image/*,.pdf"
              disabled={descriptionOnly}
              className="hidden"
              onChange={(e) => onChange({ ...form, receipt: e.target.files?.[0] ?? null })}
            />
            <span className="text-sm text-gray-400 truncate">
              {form.receipt ? form.receipt.name : "Click to upload receipt…"}
            </span>
          </label>
          {form.receipt && (
            <>
              <input
                type="text"
                value={form.receipt_number ?? ""}
                onChange={(e) => onChange({ ...form, receipt_number: e.target.value })}
                placeholder="Receipt number"
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button
                type="button"
                onClick={() => onChange({ ...form, receipt: null, receipt_number: "" })}
                className="text-xs text-red-400 hover:text-red-600 text-left"
              >
                Remove receipt
              </button>
            </>
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
    </>
  );
}
