"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import AttachmentCTab from "@/components/AttachmentCTab";
import AttachmentABTab from "@/components/AttachmentABTab";

type PublishedReport = { id: number; file_path: string; bucket: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPublishSuccess?: (report: PublishedReport) => void;
};

type CertForm = {
  receiver: string;
  designation: string;
  dateDeposited: string;
  amount: string;
  treasurer: string;
  auditDate: string;
  auditor: string;
};
const EMPTY_CERT: CertForm = {
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
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function w(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + w(n % 100) : "");
    if (n < 1_000_000) return w(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + w(n % 1000) : "");
    return w(Math.floor(n / 1_000_000)) + " Million" + (n % 1_000_000 ? " " + w(n % 1_000_000) : "");
  }
  const intPart = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - intPart) * 100);
  let result = w(intPart) + " Pesos";
  if (cents > 0) result += " and " + w(cents) + " Centavos";
  return result;
}

function buildCertUrl(form: CertForm): string {
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

type Tab = "cert" | "attachAB" | "attachC" | "public";

export default function PublishDialog({ open, onClose, onPublishSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("cert");
  const [certForm, setCertForm] = useState<CertForm>(EMPTY_CERT);
  const [certPdfSrc, setCertPdfSrc] = useState<string | null>(null);
  const [attachABPdfSrc, setAttachABPdfSrc] = useState<string | null>(null);
  const [attachCPdfSrc, setAttachCPdfSrc] = useState<string | null>(null);
  const [publicPdfSrc, setPublicPdfSrc] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab("cert");
    setCertForm(EMPTY_CERT);
    setCertPdfSrc(`/api/generate-report?t=${Date.now()}`);
    setAttachABPdfSrc(null);
    setAttachCPdfSrc(null);
    setPublicPdfSrc(`/api/generate-financial-summary?t=${Date.now()}`);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function setCert(field: keyof CertForm, value: string) {
    setCertForm((prev) => ({ ...prev, [field]: value }));
  }
  function refreshCert(field: keyof CertForm, value: string) {
    const updated = { ...certForm, [field]: value };
    setCertPdfSrc(buildCertUrl(updated));
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const certRes = await fetch(buildCertUrl(certForm));
      if (!certRes.ok) throw new Error("Failed to generate main report");
      const certBlob = await certRes.blob();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [{ data: userData }, { data: sem }] = await Promise.all([
        supabase.from("users").select("faculty_code, campus_code").eq("auth_id", user.id).single(),
        supabase.from("semesters").select("id, semester_name, academic_years(year_label)").eq("is_active", true).single(),
      ]);
      if (!userData) throw new Error("User data not found");
      if (!sem) throw new Error("No active semester");

      const ayRaw = sem.academic_years;
      const yearLabel = ((Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as { year_label?: string } | null)?.year_label ?? "";
      const semesterName = sem.semester_name ?? "";

      let title = "";
      let basePath = "";
      let publicBasePath = "";
      let pdfsBasePath = "";
      const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";

      if (userData.faculty_code) {
        const { data: facData } = await supabase.from("faculty_seb").select("campus_code").eq("faculty_code", userData.faculty_code).single();
        const { data: campusData } = await supabase.from("campus_seb").select("name").eq("campus_code", facData?.campus_code).single();
        const campusName = campusData?.name ?? "";
        title = `${userData.faculty_code}-SEB Financial Report (${yearLabel}_${semesterName})`;
        basePath = `${campusName}/${userData.faculty_code}/Financial Reports`;
        publicBasePath = `${campusName}/${userData.faculty_code}/Public`;
        pdfsBasePath = `${campusName}/${userData.faculty_code}/PDFs`;
      } else {
        const { data: campusData } = await supabase.from("campus_seb").select("name").eq("campus_code", userData.campus_code).single();
        const campusName = campusData?.name ?? userData.campus_code ?? "";
        title = `SEB-${campusName} Financial Report (${yearLabel}_${semesterName})`;
        basePath = `${userData.campus_code}/Financial Reports`;
        publicBasePath = `${userData.campus_code}/Public`;
        pdfsBasePath = `${userData.campus_code}/PDFs`;
      }

      // Upload certification report to Financial Reports folder
      const mainPath = `${basePath}/${title}.pdf`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(mainPath, certBlob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      // Helper: upload a PDF blob to a bucket folder and insert into archives
      async function saveToArchives(srcUrl: string | null, label: string, folderPath: string): Promise<string | null> {
        if (!srcUrl) return null;
        const res = await fetch(srcUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        const archiveTitle = title.replace("Financial Report", label);
        const filePath = `${folderPath}/${archiveTitle}.pdf`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, { contentType: "application/pdf", upsert: true });
        if (error) return null;
        const record: Record<string, unknown> = {
          title: archiveTitle,
          original_name: `${archiveTitle}.pdf`,
          stored_name: `${archiveTitle}.pdf`,
          mime_type: "application/pdf",
          file_path: filePath,
          published_at: new Date().toISOString(),
          published_by: user.id,
          semester_id: sem.id,
        };
        if (userData.faculty_code) record.faculty_code = userData.faculty_code;
        else record.campus_code = userData.campus_code;
        await supabase.from("archives").insert(record);
        return filePath;
      }

      const summaryFilePath = await saveToArchives("/api/generate-financial-summary", "Financial Summary", publicBasePath);
      await saveToArchives(attachABPdfSrc, "Attachment A&B", pdfsBasePath);
      await saveToArchives(attachCPdfSrc, "Attachment C", pdfsBasePath);

      const existingQ = supabase.from("reports").select("id").eq("semester_id", sem.id);
      if (userData.faculty_code) existingQ.eq("faculty_code", userData.faculty_code);
      else existingQ.eq("campus_code", userData.campus_code);
      const { data: existing } = await existingQ.maybeSingle();

      if (existing) {
        const updFileName = mainPath.split("/").pop() ?? `${title}.pdf`;
        const updatePayload: Record<string, unknown> = {
          title, original_name: updFileName, stored_name: updFileName,
          file_path: mainPath, published_at: new Date().toISOString(), published_by: user.id,
        };
        if (summaryFilePath) updatePayload.summary_file_path = summaryFilePath;
        const { error: updateError } = await supabase.from("reports").update(updatePayload).eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
        onPublishSuccess?.({ id: existing.id, file_path: mainPath, bucket });
        toast.success("Financial report published successfully");
        onClose();
        return;
      }

      const fileName = mainPath.split("/").pop() ?? `${title}.pdf`;
      const record: Record<string, unknown> = {
        title, original_name: fileName, stored_name: fileName,
        mime_type: "application/pdf", file_path: mainPath,
        published_at: new Date().toISOString(), published_by: user.id, semester_id: sem.id,
      };
      if (summaryFilePath) record.summary_file_path = summaryFilePath;
      if (userData.faculty_code) record.faculty_code = userData.faculty_code;
      else record.campus_code = userData.campus_code;

      const { data: insertData, error: insertError } = await supabase.from("reports").insert(record).select("id").single();
      if (insertError) throw new Error(insertError.message);

      logActivity({
        description: `Published financial report: ${title}`,
        action: "PUBLISH_REPORT", module: "REPORTS",
        facultyCode: userData.faculty_code, campusCode: userData.campus_code,
        targetTable: "reports", targetId: insertData.id,
      }).catch(() => {});

      toast.success("Financial report published successfully");
      onPublishSuccess?.({ id: insertData.id, file_path: mainPath, bucket });
      onClose();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPublishing(false);
    }
  }

  const amountNum = parseFloat(certForm.amount);
  const displaySrc =
    activeTab === "cert"
      ? certPdfSrc
      : activeTab === "attachAB"
        ? attachABPdfSrc
        : activeTab === "attachC"
          ? attachCPdfSrc
          : publicPdfSrc;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center font-lexend"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex overflow-hidden"
        style={{ width: "min(1240px, 96vw)", height: "min(920px, 92vh)" }}
      >
        {/* PDF viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              {activeTab === "cert"
                ? "Financial Report Preview"
                : activeTab === "attachAB"
                  ? "Attachment A & B Preview"
                  : activeTab === "attachC"
                    ? "Attachment C Preview"
                    : "Public Financial Summary Preview"}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {displaySrc ? (
            <iframe key={displaySrc} src={displaySrc} className="flex-1 w-full border-0" title="Report Preview" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {activeTab === "attachAB"
                ? "Select income entries to generate a preview"
                : activeTab === "attachC"
                  ? "Select expenses to generate a preview"
                  : "Loading…"}
            </div>
          )}

        </div>

        {/* Form sheet */}
        <div className="w-80 border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Publish Report</h2>
            <div className="flex gap-1 mt-3 flex-wrap">
              {(["cert", "attachAB", "attachC", "public"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab === "cert"
                    ? "Certification"
                    : tab === "attachAB"
                      ? "Attach. A & B"
                      : tab === "attachC"
                        ? "Attach. C"
                        : "Public"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className={`space-y-5 ${activeTab !== "cert" ? "hidden" : ""}`}>
              <section>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Deposited With</p>
                <div className="space-y-3">
                  <Field label="Name of Receiver" value={certForm.receiver} onChange={(v) => setCert("receiver", v)} onBlur={(v) => refreshCert("receiver", v)} />
                  <Field label="Designation / Office" value={certForm.designation} onChange={(v) => setCert("designation", v)} onBlur={(v) => refreshCert("designation", v)} />
                  <Field label="Date Deposited" type="date" value={certForm.dateDeposited} onChange={(v) => setCert("dateDeposited", v)} onBlur={(v) => refreshCert("dateDeposited", v)} />
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Amount</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={certForm.amount}
                      onChange={(e) => setCert("amount", e.target.value)}
                      onBlur={(e) => refreshCert("amount", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    {certForm.amount && !isNaN(amountNum) && amountNum > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1.5 italic leading-snug">{toWords(amountNum)}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Treasurer</p>
                <Field label="Name of Treasurer" value={certForm.treasurer} onChange={(v) => setCert("treasurer", v)} onBlur={(v) => refreshCert("treasurer", v)} />
              </section>

              <section className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Audit Certificate</p>
                <div className="space-y-3">
                  <Field label="Date" type="date" value={certForm.auditDate} onChange={(v) => setCert("auditDate", v)} onBlur={(v) => refreshCert("auditDate", v)} />
                  <Field label="Name of Auditor" value={certForm.auditor} onChange={(v) => setCert("auditor", v)} onBlur={(v) => refreshCert("auditor", v)} />
                </div>
              </section>
            </div>

            <div className={activeTab !== "attachAB" ? "hidden" : ""}>
              <AttachmentABTab onPdfSrcChange={setAttachABPdfSrc} />
            </div>

            <div className={activeTab !== "attachC" ? "hidden" : ""}>
              <AttachmentCTab onPdfSrcChange={setAttachCPdfSrc} />
            </div>

            <div className={activeTab !== "public" ? "hidden" : ""}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Public Financial Summary
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                This PDF is auto-generated from your current financial data and
                saved to the <span className="font-semibold text-gray-700">Public</span> folder
                in the bucket when you publish. No inputs required.
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 shrink-0 space-y-2">
            {publishError && <p className="text-xs text-red-500 text-center">{publishError}</p>}
            <button
              onClick={handlePublish} disabled={publishing}
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
  label, value, onChange, onBlur, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
      />
    </div>
  );
}
