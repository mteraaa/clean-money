"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Props = {
  email: string;
  authId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DeleteAccountDialog({ email, authId, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!password) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: me } = await supabase.from("users").select("email").eq("auth_id", user.id).single();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: me?.email ?? "", password });
    if (authError) { toast.error("Incorrect password."); setLoading(false); return; }

    const res = await fetch("/api/admin/remove-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authId }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) { toast.error(json.error ?? "Failed to remove account."); return; }
    toast.success(`Removed ${email}.`);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 font-lexend">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Remove Account</h3>
            <p className="text-xs text-gray-400 mt-1">This action is permanent and cannot be undone.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-red-600">Removing: <span className="font-semibold">{email}</span></p>
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-xs font-medium text-gray-500">Admin Password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") onClose(); }}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !password}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {loading ? "Removing…" : "Remove Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
