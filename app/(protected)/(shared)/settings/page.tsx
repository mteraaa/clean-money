"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, X } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserEmail(user.email ?? "");
      setUserId(user.id);
    });
  }, []);

  return (
    <div className="bg-[#f3f4f6] h-full p-8 font-lexend">
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <UsernameCard userId={userId} userEmail={userEmail} />
          <EmailCard userEmail={userEmail} />
        </div>
        {/* Right column */}
        <PasswordCard userEmail={userEmail} />
      </div>
    </div>
  );
}

/* ── Confirm Dialog ── */
function ConfirmDialog({
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
          <label className="text-xs font-medium text-gray-500">
            {passwordLabel}
          </label>
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
              placeholder=""
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
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

/* ── Username Card ── */
function UsernameCard({
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
    if (authError) {
      toast.error("Incorrect password.");
      return;
    }

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
      <Card title="Username" description="Update your display name.">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=""
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
      </Card>

      {confirming && (
        <ConfirmDialog
          title="Update Username"
          description="Are you sure you want to change your username?"
          passwordLabel="Password"
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

/* ── Email Card ── */
function EmailCard({ userEmail }: { userEmail: string }) {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    // track current email for comparison only, don't pre-fill input
  }, [userEmail]);

  async function handleConfirm(password: string) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (authError) {
      toast.error("Incorrect password.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }

    setConfirming(false);
    toast.success("Confirmation sent to new email address.");
  }

  return (
    <>
      <Card title="Email" description="Update your email address.">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=""
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
      </Card>

      {confirming && (
        <ConfirmDialog
          title="Update Email"
          description="Are you sure you want to change your email address?"
          passwordLabel="Password"
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

/* ── Password Card ── */
function PasswordCard({ userEmail }: { userEmail: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm(currentPassword: string) {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });
    if (authError) {
      toast.error("Current password is incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setConfirming(false);
    toast.success("Password updated successfully.");
  }

  return (
    <>
      <Card title="Password" description="Change your account password.">
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
      </Card>

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

/* ── Shared sub-components ── */
function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
