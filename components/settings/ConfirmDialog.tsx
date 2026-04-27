"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  passwordLabel = "Password",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  passwordLabel?: string;
  onConfirm: (password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!password) return;
    setLoading(true);
    await onConfirm(password);
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 font-lexend">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-xs font-medium text-gray-500">{passwordLabel}</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !password}
            className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {loading ? "Confirming…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
