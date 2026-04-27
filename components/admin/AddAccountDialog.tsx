"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Faculty = { faculty_code: string; name: string };

type Props = {
  campusCode: string;
  campusName: string;
  faculties: Faculty[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddAccountDialog({ campusCode, campusName, faculties, onClose, onSuccess }: Props) {
  const [facultyCode, setFacultyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password || !confirmPassword) { toast.error("Please fill in all fields."); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }

    setLoading(true);
    const selectedFaculty = faculties.find((f) => f.faculty_code === facultyCode);
    const fullName = selectedFaculty ? selectedFaculty.name : campusName;

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, facultyCode: facultyCode || null, campusCode, fullName }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) { toast.error(json.error ?? "Failed to create account."); return; }
    toast.success("Account created successfully.");
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 font-lexend">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add Account</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create a new faculty or campus account.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Campus (read-only) */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Campus</label>
            <input
              type="text"
              value={campusName}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 outline-none"
            />
          </div>

          {/* Faculty dropdown */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Faculty</label>
            <select
              value={facultyCode}
              onChange={(e) => setFacultyCode(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            >
              <option value="">Campus Account (no faculty)</option>
              {faculties.map((f) => (
                <option key={f.faculty_code} value={f.faculty_code}>
                  {f.name} ({f.faculty_code})
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40">
            {loading ? "Creating…" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
