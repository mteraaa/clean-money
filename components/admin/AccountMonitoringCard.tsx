"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trash2, UserPlus } from "lucide-react";
import AddAccountDialog from "./AddAccountDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";

type Account = {
  auth_id: string;
  email: string;
  faculty_code: string | null;
  campus_code: string | null;
  is_active: boolean;
};

type Faculty = { faculty_code: string; name: string };

export default function AccountMonitoringCard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [campusCode, setCampusCode] = useState("");
  const [campusName, setCampusName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ authId: string; email: string } | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from("users")
      .select("campus_code")
      .eq("auth_id", user.id)
      .single();
    if (!me) return;

    setCampusCode(me.campus_code);

    const [{ data: campusData }, { data: facultyData }] = await Promise.all([
      supabase.from("campus_seb").select("name").eq("campus_code", me.campus_code).single(),
      supabase.from("faculty_seb").select("faculty_code, name").eq("campus_code", me.campus_code).order("faculty_code"),
    ]);

    const { data: accountData } = await supabase
      .from("users")
      .select("auth_id, email, faculty_code, campus_code, is_active")
      .neq("role", "super_admin");

    setCampusName(campusData?.name ?? me.campus_code);
    setFaculties(facultyData ?? []);
    setAccounts(accountData ?? []);
  }

  useEffect(() => { load(); }, []);

  function handleDeleteSuccess() {
    if (!deleteTarget) return;
    setAccounts((prev) => prev.filter((a) => a.auth_id !== deleteTarget.authId));
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 font-lexend">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Account Monitoring</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage faculty and campus accounts.</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="overflow-y-auto max-h-72">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E5E7EB] text-gray-700 font-semibold text-left">
                <th className="px-6 py-3">Email</th>
                <th className="px-4 py-3">Faculty</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">No accounts found.</td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.auth_id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-900">{acc.email}</td>
                    <td className="px-4 py-3 text-gray-600">{acc.faculty_code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${acc.faculty_code ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                        {acc.faculty_code ? "Faculty" : "Campus"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget({ authId: acc.auth_id, email: acc.email })}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddAccountDialog
          campusCode={campusCode}
          campusName={campusName}
          faculties={faculties}
          onClose={() => setAddOpen(false)}
          onSuccess={load}
        />
      )}

      {deleteTarget && (
        <DeleteAccountDialog
          email={deleteTarget.email}
          authId={deleteTarget.authId}
          onClose={() => setDeleteTarget(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
