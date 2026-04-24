"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type PublishedReport = { id: number; file_path: string; bucket: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPublishSuccess?: (report: PublishedReport) => void;
};

type Form = {
  receiver: string;
  designation: string;
  dateDeposited: string;
  amount: string;
  treasurer: string;
  auditDate: string;
  auditor: string;
};

const EMPTY: Form = {
  receiver: "",
  designation: "",
  dateDeposited: "",
  amount: "",
  treasurer: "",
  auditDate: "",
  auditor: "",
};

function toWords(num: number): string {
  if (num === 0) return "Zero Pesos";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tensArr = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function w(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100)
      return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + w(n % 100) : "")
      );
    if (n < 1_000_000)
      return (
        w(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + w(n % 1000) : "")
      );
    return (
      w(Math.floor(n / 1_000_000)) +
      " Million" +
      (n % 1_000_000 ? " " + w(n % 1_000_000) : "")
    );
  }
  const intPart = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - intPart) * 100);
  let result = w(intPart) + " Pesos";
  if (cents > 0) result += " and " + w(cents) + " Centavos";
  return result;
}

function buildUrl(form: Form): string {
  const p = new URLSearchParams({ t: Date.now().toString() });
  if (form.receiver) p.set("receiver", form.receiver);
  if (form.designation) p.set("designation", form.designation);
  if (form.dateDeposited) p.set("dateDeposited", form.dateDeposited);
  if (form.amount) p.set("amount", form.amount);
  if (form.treasurer) p.set("treasurer", form.treasurer);
  if (form.auditDate) p.set("auditDate", form.auditDate);
  if (form.auditor) p.set("auditor", form.auditor);
  return `/api/generate-report?${p.toString()}`;
}

export default function PublishDialog({ open, onClose, onPublishSuccess }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setPdfSrc(`/api/generate-report?t=${Date.now()}`);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set(field: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function refreshOnBlur(field: keyof Form, value: string) {
    const updated = { ...form, [field]: value };
    setPdfSrc(buildUrl(updated));
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      // 1. Fetch the PDF bytes from the API
      const url = buildUrl(form);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const pdfBlob = await res.blob();

      // 2. Get user info, active semester, and org name
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [{ data: userData }, { data: sem }] = await Promise.all([
        supabase
          .from("users")
          .select("faculty_code, campus_code")
          .eq("auth_id", user.id)
          .single(),
        supabase
          .from("semesters")
          .select("id, semester_name, academic_years(year_label)")
          .eq("is_active", true)
          .single(),
      ]);
      if (!userData) throw new Error("User data not found");
      if (!sem) throw new Error("No active semester");

      const ayRaw = sem.academic_years;
      const yearLabel =
        (
          (Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as {
            year_label?: string;
          } | null
        )?.year_label ?? "";
      const semesterName = sem.semester_name ?? "";

      let title = "";
      let filePath = "";
      const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";

      if (userData.faculty_code) {
        const { data: facData } = await supabase
          .from("faculty_seb")
          .select("campus_code")
          .eq("faculty_code", userData.faculty_code)
          .single();
        const { data: campusData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", facData?.campus_code)
          .single();
        const campusName = campusData?.name ?? "";
        title = `${userData.faculty_code}-SEB Financial Report (${yearLabel}_${semesterName})`;
        filePath = `${campusName}/${userData.faculty_code}/Financial Reports/${title}.pdf`;
      } else {
        const { data: campusData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        const campusName = campusData?.name ?? userData.campus_code ?? "";
        title = `SEB-${campusName} Financial Report (${yearLabel}_${semesterName})`;
        filePath = `${userData.campus_code}/Financial Reports/${title}.pdf`;
      }

      // 3. Upload to storage bucket (upsert to overwrite if file already exists)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) throw new Error(uploadError.message);

      // 4. Check if a report already exists for this semester
      const existingQ = supabase
        .from("reports")
        .select("id")
        .eq("semester_id", sem.id);
      if (userData.faculty_code)
        existingQ.eq("faculty_code", userData.faculty_code);
      else existingQ.eq("campus_code", userData.campus_code);
      const { data: existing } = await existingQ.maybeSingle();

      if (existing) {
        // Update the existing row — preserves all past semester reports
        const updFileName = filePath.split("/").pop() ?? `${title}.pdf`;
        const { error: updateError } = await supabase
          .from("reports")
          .update({
            title,
            original_name: updFileName,
            stored_name: updFileName,
            file_path: filePath,
            published_at: new Date().toISOString(),
            published_by: user.id,
          })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
        onPublishSuccess?.({ id: existing.id, file_path: filePath, bucket });
        onClose();
        return;
      }

      // 5. No existing report — insert new row
      const fileName = filePath.split("/").pop() ?? `${title}.pdf`;
      const record: Record<string, unknown> = {
        title,
        original_name: fileName,
        stored_name: fileName,
        mime_type: "application/pdf",
        file_path: filePath,
        published_at: new Date().toISOString(),
        published_by: user.id,
        semester_id: sem.id,
      };
      if (userData.faculty_code) record.faculty_code = userData.faculty_code;
      else record.campus_code = userData.campus_code;

      const { data: insertData, error: insertError } = await supabase
        .from("reports")
        .insert(record)
        .select("id")
        .single();
      if (insertError) throw new Error(insertError.message);

      onPublishSuccess?.({ id: insertData.id, file_path: filePath, bucket });
      onClose();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPublishing(false);
    }
  }

  const amountNum = parseFloat(form.amount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center font-lexend"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex overflow-hidden"
        style={{ width: "min(1240px, 96vw)", height: "min(920px, 92vh)" }}
      >
        {/* ── PDF viewer ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              Financial Report Preview
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {pdfSrc ? (
            <iframe
              key={pdfSrc}
              src={pdfSrc}
              className="flex-1 w-full border-0"
              title="Financial Report"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          )}
        </div>

        {/* ── Form sheet ── */}
        <div className="w-80 border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Publish Report
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in the certification details
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Deposited with */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Deposited With
              </p>
              <div className="space-y-3">
                <Field
                  label="Name of Receiver"
                  value={form.receiver}
                  onChange={(v) => set("receiver", v)}
                  onBlur={(v) => refreshOnBlur("receiver", v)}
                />
                <Field
                  label="Designation / Office"
                  value={form.designation}
                  onChange={(v) => set("designation", v)}
                  onBlur={(v) => refreshOnBlur("designation", v)}
                />
                <Field
                  label="Date Deposited"
                  type="date"
                  value={form.dateDeposited}
                  onChange={(v) => set("dateDeposited", v)}
                  onBlur={(v) => refreshOnBlur("dateDeposited", v)}
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    onBlur={(e) => refreshOnBlur("amount", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  {form.amount && !isNaN(amountNum) && amountNum > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1.5 italic leading-snug">
                      {toWords(amountNum)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Treasurer */}
            <section className="pt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Treasurer
              </p>
              <Field
                label="Name of Treasurer"
                value={form.treasurer}
                onChange={(v) => set("treasurer", v)}
                onBlur={(v) => refreshOnBlur("treasurer", v)}
              />
            </section>

            {/* Audit Certificate */}
            <section className="pt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Audit Certificate
              </p>
              <div className="space-y-3">
                <Field
                  label="Date"
                  type="date"
                  value={form.auditDate}
                  onChange={(v) => set("auditDate", v)}
                  onBlur={(v) => refreshOnBlur("auditDate", v)}
                />
                <Field
                  label="Name of Auditor"
                  value={form.auditor}
                  onChange={(v) => set("auditor", v)}
                  onBlur={(v) => refreshOnBlur("auditor", v)}
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 shrink-0 space-y-2">
            {publishError && (
              <p className="text-xs text-red-500 text-center">{publishError}</p>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}
