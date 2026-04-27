"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { SettingsCard } from "./SettingsCard";
import ConfirmDialog from "./ConfirmDialog";

export default function EmailCard({ userEmail }: { userEmail: string }) {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm(password: string) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (authError) { toast.error("Incorrect password."); return; }

    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) { toast.error(error.message); return; }

    setConfirming(false);
    toast.success("Confirmation sent to new email address.");
  }

  return (
    <>
      <SettingsCard title="Email" description="Update your email address.">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setConfirming(true)}
            disabled={!email.trim() || email === userEmail}
            className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Update Email
          </button>
        </div>
      </SettingsCard>

      {confirming && (
        <ConfirmDialog
          title="Update Email"
          description="Are you sure you want to change your email address?"
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
