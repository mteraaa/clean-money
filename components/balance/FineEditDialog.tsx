"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FineEditDialog({
  open,
  fineAmtInput,
  fineTotalInput,
  saving,
  onClose,
  onFineAmtChange,
  onFineTotalChange,
  onConfirm,
}: {
  open: boolean;
  fineAmtInput: string;
  fineTotalInput: string;
  saving: boolean;
  onClose: () => void;
  onFineAmtChange: (val: string) => void;
  onFineTotalChange: (val: string) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-80 font-lexend p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Edit Fines</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              Fine Amount per Student
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fineAmtInput}
                onChange={(e) => onFineAmtChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              Total Students with Fines
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={fineTotalInput}
              onChange={(e) => onFineTotalChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
