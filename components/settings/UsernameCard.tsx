"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { SettingsCard } from "./SettingsCard";
import ConfirmDialog from "./ConfirmDialog";

export default function UsernameCard({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!userId) return;
    createClient()
      .from("users")
      .select("username")
      .eq("auth_id", userId)
      .single()
      .then(({ data }) => {
        setCurrent(data?.username ?? "");
      });
  }, [userId]);

  async function handleConfirm(password: string) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (authError) { toast.error("Incorrect password."); return; }

    const { error } = await supabase
      .from("users")
      .update({ username: username.trim() })
      .eq("auth_id", userId);
    if (error) {
      if (error.code === "23505") { toast.error("That username is already taken."); return; }
      toast.error("Failed to update username.");
      return;
    }

    setCurrent(username.trim());
    setConfirming(false);
    toast.success("Username updated.");
  }

  return (
    <>
      <SettingsCard title="Username" description="Update your display name.">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setConfirming(true)}
            disabled={!username.trim() || username === current}
            className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Save Changes
          </button>
        </div>
      </SettingsCard>

      {confirming && (
        <ConfirmDialog
          title="Update Username"
          description="Are you sure you want to change your username?"
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
