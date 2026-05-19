"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function UnpublishDialog({ open, onClose, onConfirm }: Props) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setPassword(""); setError(null); }
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    if (!password) return;
    setVerifying(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setVerifying(false); return; }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError) {
      setError("Incorrect password. Please try again.");
      setVerifying(false);
      return;
    }

    await onConfirm();
    setVerifying(false);
    setPassword("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center font-lexend"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">Unpublish Report?</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              This will delete the published report and unlock all entries for editing. This action cannot be undone.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Enter your password to confirm
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            placeholder="Password"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password || verifying}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Unpublish"}
          </button>
        </div>
      </div>
    </div>
  );
}
