"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { SettingsCard, PasswordField } from "./SettingsCard";
import ConfirmDialog from "./ConfirmDialog";

export default function PasswordCard({ userEmail }: { userEmail: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm(currentPassword: string) {
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });
    if (authError) { toast.error("Current password is incorrect."); return; }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return; }

    setNewPassword("");
    setConfirmPassword("");
    setConfirming(false);
    toast.success("Password updated successfully.");
  }

  return (
    <>
      <SettingsCard title="Password" description="Change your account password.">
        <div className="flex flex-col gap-3">
          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
          />
          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
          />
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setConfirming(true)}
            disabled={!newPassword || !confirmPassword}
            className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Change Password
          </button>
        </div>
      </SettingsCard>

      {confirming && (
        <ConfirmDialog
          title="Change Password"
          description="Are you sure you want to change your password?"
          passwordLabel="Current Password"
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
