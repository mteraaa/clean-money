"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";

type PublishedReport = { id: number; file_path: string; bucket: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPublishSuccess?: (report: PublishedReport) => void;
};

// ── Tab 1: Certification ──────────────────────────────────────────────────────
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

// ── Tab 2: Attachment A & B ───────────────────────────────────────────────────
type PaymentRow = { mode: string; students: string; amount: string };
type AttachABForm = {
  attachATitle: string;
  attachATableName: string;
  attachBTitle: string;
  attachBTable1Name: string;
  assemblyDesc: string;
  voted: string;
  excusedAbsence: string;
  didNotVote: string;
  votingPopulation: string;
  attachBTable2Name: string;
  paymentRows: PaymentRow[];
  attachBTable3Name: string;
  collectedStudents: string;
  collectedAmount: string;
  collectiblesStudents: string;
  collectiblesAmount: string;
};
const EMPTY_ATTACH_AB: AttachABForm = {
  attachATitle: "",
  attachATableName: "Table 1. Summary of Registration Fee Collected",
  attachBTitle: "",
  attachBTable1Name: "Table 1. Summary of Canvassed Votes",
  assemblyDesc: "",
  voted: "",
  excusedAbsence: "",
  didNotVote: "",
  votingPopulation: "",
  attachBTable2Name:
    "Table 2. Summary of Amounts Collected based on the Number of Physical Receipts and Attendance.",
  paymentRows: [{ mode: "Cash", students: "", amount: "" }],
  attachBTable3Name: "Table 3. Summary of Collections",
  collectedStudents: "",
  collectedAmount: "",
  collectiblesStudents: "",
  collectiblesAmount: "",
};

// ── Tab 3: Attachment C ───────────────────────────────────────────────────────
type AttachCForm = {
  attachCTitle: string;
  table1Name: string;
};
const EMPTY_ATTACH_C: AttachCForm = {
  attachCTitle: "ATTACHMENT C",
  table1Name: "TABLE 1. YEAR-END BREAKDOWN OF EXPENSES",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function buildAttachABUrl(form: AttachABForm): string {
  const p = new URLSearchParams({ t: Date.now().toString() });
  p.set("attachATitle", form.attachATitle);
  p.set("attachATableName", form.attachATableName);
  p.set("attachBTitle", form.attachBTitle);
  p.set("attachBTable1Name", form.attachBTable1Name);
  p.set("assemblyDesc", form.assemblyDesc);
  p.set("voted", form.voted);
  p.set("excusedAbsence", form.excusedAbsence);
  p.set("didNotVote", form.didNotVote);
  p.set("votingPopulation", form.votingPopulation);
  p.set("attachBTable2Name", form.attachBTable2Name);
  p.set("paymentRows", JSON.stringify(form.paymentRows));
  p.set("attachBTable3Name", form.attachBTable3Name);
  p.set("collectedStudents", form.collectedStudents);
  p.set("collectedAmount", form.collectedAmount);
  p.set("collectiblesStudents", form.collectiblesStudents);
  p.set("collectiblesAmount", form.collectiblesAmount);
  return `/api/generate-attachment-ab?${p.toString()}`;
}

function buildAttachCUrl(form: AttachCForm): string {
  const p = new URLSearchParams({ t: Date.now().toString() });
  p.set("attachCTitle", form.attachCTitle);
  p.set("table1Name", form.table1Name);
  return `/api/generate-attachment-c?${p.toString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
type Tab = "cert" | "attachAB" | "attachC";

export default function PublishDialog({
  open,
  onClose,
  onPublishSuccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("cert");
  const [certForm, setCertForm] = useState<CertForm>(EMPTY_CERT);
  const [attachABForm, setAttachABForm] =
    useState<AttachABForm>(EMPTY_ATTACH_AB);
  const [attachCForm, setAttachCForm] = useState<AttachCForm>(EMPTY_ATTACH_C);
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Refs always hold the latest form values so no-arg refreshers stay current
  const abFormRef = useRef(attachABForm);
  abFormRef.current = attachABForm;

  useEffect(() => {
    if (!open) return;
    setCertForm(EMPTY_CERT);
    setAttachABForm(EMPTY_ATTACH_AB);
    setAttachCForm(EMPTY_ATTACH_C);
    setActiveTab("cert");
    setPdfSrc(`/api/generate-report?t=${Date.now()}`);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === "cert")
      setPdfSrc(`/api/generate-report?t=${Date.now()}`);
    else if (activeTab === "attachAB")
      setPdfSrc(buildAttachABUrl(attachABForm));
    else setPdfSrc(buildAttachCUrl(attachCForm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!open) return null;

  function setCert(field: keyof CertForm, value: string) {
    setCertForm((prev) => ({ ...prev, [field]: value }));
  }
  function refreshCert(field: keyof CertForm, value: string) {
    const updated = { ...certForm, [field]: value };
    setPdfSrc(buildCertUrl(updated));
  }

  function setAB(field: keyof AttachABForm, value: unknown) {
    setAttachABForm((prev) => ({ ...prev, [field]: value }));
  }
  // Build a preview URL from current AB state overriding one field
  function blurAB(field: keyof Omit<AttachABForm, "paymentRows">, value: string) {
    const updated = { ...attachABForm, [field]: value };
    setPdfSrc(buildAttachABUrl(updated));
  }
  function refreshABPreview() {
    setPdfSrc(buildAttachABUrl(abFormRef.current));
  }

  function setC(field: keyof AttachCForm, value: string) {
    setAttachCForm((prev) => ({ ...prev, [field]: value }));
  }
  function blurC(field: keyof AttachCForm, value: string) {
    const updated = { ...attachCForm, [field]: value };
    setPdfSrc(buildAttachCUrl(updated));
  }

  // Payment rows helpers
  function addPaymentRow() {
    setAB("paymentRows", [
      ...attachABForm.paymentRows,
      { mode: "", students: "", amount: "" },
    ]);
  }
  function removePaymentRow(idx: number) {
    setAB(
      "paymentRows",
      attachABForm.paymentRows.filter((_, i) => i !== idx),
    );
  }
  function setPaymentRow(
    idx: number,
    field: keyof PaymentRow,
    value: string,
  ) {
    const updated = attachABForm.paymentRows.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r,
    );
    setAB("paymentRows", updated);
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      // Generate all 3 PDFs
      const [certRes, abRes, cRes] = await Promise.all([
        fetch(buildCertUrl(certForm)),
        fetch(buildAttachABUrl(attachABForm)),
        fetch(buildAttachCUrl(attachCForm)),
      ]);
      if (!certRes.ok) throw new Error("Failed to generate main report");
      if (!abRes.ok) throw new Error("Failed to generate Attachment A & B");
      if (!cRes.ok) throw new Error("Failed to generate Attachment C");

      const [certBlob, abBlob, cBlob] = await Promise.all([
        certRes.blob(),
        abRes.blob(),
        cRes.blob(),
      ]);

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
      let basePath = "";
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
        basePath = `${campusName}/${userData.faculty_code}/Financial Reports`;
      } else {
        const { data: campusData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        const campusName = campusData?.name ?? userData.campus_code ?? "";
        title = `SEB-${campusName} Financial Report (${yearLabel}_${semesterName})`;
        basePath = `${userData.campus_code}/Financial Reports`;
      }

      const mainPath = `${basePath}/${title}.pdf`;
      const abPath = `${basePath}/${title}-Attachment-AB.pdf`;
      const cPath = `${basePath}/${title}-Attachment-C.pdf`;

      // Upload all 3 PDFs
      const uploadResults = await Promise.all([
        supabase.storage
          .from(bucket)
          .upload(mainPath, certBlob, {
            contentType: "application/pdf",
            upsert: true,
          }),
        supabase.storage
          .from(bucket)
          .upload(abPath, abBlob, {
            contentType: "application/pdf",
            upsert: true,
          }),
        supabase.storage
          .from(bucket)
          .upload(cPath, cBlob, {
            contentType: "application/pdf",
            upsert: true,
          }),
      ]);
      const uploadError = uploadResults.find((r) => r.error)?.error;
      if (uploadError) throw new Error(uploadError.message);

      // Check if a report already exists for this semester
      const existingQ = supabase
        .from("reports")
        .select("id")
        .eq("semester_id", sem.id);
      if (userData.faculty_code)
        existingQ.eq("faculty_code", userData.faculty_code);
      else existingQ.eq("campus_code", userData.campus_code);
      const { data: existing } = await existingQ.maybeSingle();

      if (existing) {
        const updFileName = mainPath.split("/").pop() ?? `${title}.pdf`;
        const { error: updateError } = await supabase
          .from("reports")
          .update({
            title,
            original_name: updFileName,
            stored_name: updFileName,
            file_path: mainPath,
            published_at: new Date().toISOString(),
            published_by: user.id,
          })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
        onPublishSuccess?.({ id: existing.id, file_path: mainPath, bucket });
        toast.success("Financial report published successfully");
        onClose();
        return;
      }

      const fileName = mainPath.split("/").pop() ?? `${title}.pdf`;
      const record: Record<string, unknown> = {
        title,
        original_name: fileName,
        stored_name: fileName,
        mime_type: "application/pdf",
        file_path: mainPath,
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

      logActivity({
        description: `Published financial report: ${title}`,
        action: "PUBLISH_REPORT",
        module: "REPORTS",
        facultyCode: userData.faculty_code,
        campusCode: userData.campus_code,
        targetTable: "reports",
        targetId: insertData.id,
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "cert", label: "Certification" },
    { id: "attachAB", label: "Attachment A & B" },
    { id: "attachC", label: "Attachment C" },
  ];

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
              {activeTab === "cert"
                ? "Financial Report Preview"
                : activeTab === "attachAB"
                  ? "Attachment A & B Preview"
                  : "Attachment C Preview"}
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
              title="Report Preview"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          )}
        </div>

        {/* ── Form sheet ── */}
        <div className="w-80 border-l border-gray-200 flex flex-col shrink-0">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Publish Report
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in the certification and attachment details
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-gray-200 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-[10px] font-semibold transition-colors leading-tight px-1 ${
                  activeTab === tab.id
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* ── Tab 1: Certification ── */}
            {activeTab === "cert" && (
              <>
                <section>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Deposited With
                  </p>
                  <div className="space-y-3">
                    <Field
                      label="Name of Receiver"
                      value={certForm.receiver}
                      onChange={(v) => setCert("receiver", v)}
                      onBlur={(v) => refreshCert("receiver", v)}
                    />
                    <Field
                      label="Designation / Office"
                      value={certForm.designation}
                      onChange={(v) => setCert("designation", v)}
                      onBlur={(v) => refreshCert("designation", v)}
                    />
                    <Field
                      label="Date Deposited"
                      type="date"
                      value={certForm.dateDeposited}
                      onChange={(v) => setCert("dateDeposited", v)}
                      onBlur={(v) => refreshCert("dateDeposited", v)}
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
                        value={certForm.amount}
                        onChange={(e) => setCert("amount", e.target.value)}
                        onBlur={(e) =>
                          refreshCert("amount", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      {certForm.amount &&
                        !isNaN(amountNum) &&
                        amountNum > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1.5 italic leading-snug">
                            {toWords(amountNum)}
                          </p>
                        )}
                    </div>
                  </div>
                </section>

                <section className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Treasurer
                  </p>
                  <Field
                    label="Name of Treasurer"
                    value={certForm.treasurer}
                    onChange={(v) => setCert("treasurer", v)}
                    onBlur={(v) => refreshCert("treasurer", v)}
                  />
                </section>

                <section className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Audit Certificate
                  </p>
                  <div className="space-y-3">
                    <Field
                      label="Date"
                      type="date"
                      value={certForm.auditDate}
                      onChange={(v) => setCert("auditDate", v)}
                      onBlur={(v) => refreshCert("auditDate", v)}
                    />
                    <Field
                      label="Name of Auditor"
                      value={certForm.auditor}
                      onChange={(v) => setCert("auditor", v)}
                      onBlur={(v) => refreshCert("auditor", v)}
                    />
                  </div>
                </section>
              </>
            )}

            {/* ── Tab 2: Attachment A & B ── */}
            {activeTab === "attachAB" && (
              <>
                {/* Attachment A */}
                <section>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Attachment A
                  </p>
                  <p className="text-[10px] text-gray-400 mb-3">
                    Table data is auto-generated from income entries.
                  </p>
                  <div className="space-y-3">
                    <Field
                      label="Attachment A Title"
                      value={attachABForm.attachATitle}
                      onChange={(v) => setAB("attachATitle", v)}
                      onBlur={(v) => blurAB("attachATitle", v)}
                      placeholder="e.g. AUDIT OF THE COLLECTED REGISTRATION FEE..."
                    />
                    <Field
                      label="Table Name"
                      value={attachABForm.attachATableName}
                      onChange={(v) => setAB("attachATableName", v)}
                      onBlur={(v) => blurAB("attachATableName", v)}
                    />
                  </div>
                </section>

                {/* Attachment B */}
                <section className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Attachment B
                  </p>
                  <div className="space-y-3">
                    <Field
                      label="Attachment B Title"
                      value={attachABForm.attachBTitle}
                      onChange={(v) => setAB("attachBTitle", v)}
                      onBlur={(v) => blurAB("attachBTitle", v)}
                      placeholder="e.g. AUDIT OF THE COLLECTED PLEBISCITE FINES..."
                    />

                    {/* Table 1 — Canvassed Votes */}
                    <div className="pt-2">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Table 1 — Canvassed Votes
                      </p>
                      <div className="space-y-2">
                        <Field
                          label="Table 1 Name"
                          value={attachABForm.attachBTable1Name}
                          onChange={(v) => setAB("attachBTable1Name", v)}
                          onBlur={(v) => blurAB("attachBTable1Name", v)}
                        />
                        <Field
                          label="Assembly / Context Description"
                          value={attachABForm.assemblyDesc}
                          onChange={(v) => setAB("assemblyDesc", v)}
                          onBlur={(v) => blurAB("assemblyDesc", v)}
                          placeholder="e.g. during the 1st Federation Assembly on April 2, 2025..."
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Field
                            label="Voted"
                            type="number"
                            value={attachABForm.voted}
                            onChange={(v) => setAB("voted", v)}
                            onBlur={(v) => blurAB("voted", v)}
                          />
                          <Field
                            label="Excused Absence"
                            type="number"
                            value={attachABForm.excusedAbsence}
                            onChange={(v) => setAB("excusedAbsence", v)}
                            onBlur={(v) => blurAB("excusedAbsence", v)}
                          />
                          <Field
                            label="Did Not Vote"
                            type="number"
                            value={attachABForm.didNotVote}
                            onChange={(v) => setAB("didNotVote", v)}
                            onBlur={(v) => blurAB("didNotVote", v)}
                          />
                          <Field
                            label="Voting Population"
                            type="number"
                            value={attachABForm.votingPopulation}
                            onChange={(v) => setAB("votingPopulation", v)}
                            onBlur={(v) => blurAB("votingPopulation", v)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Table 2 — Payment Modes */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Table 2 — Payment Modes
                      </p>
                      <div className="space-y-2">
                        <Field
                          label="Table 2 Name"
                          value={attachABForm.attachBTable2Name}
                          onChange={(v) => setAB("attachBTable2Name", v)}
                          onBlur={(v) => blurAB("attachBTable2Name", v)}
                        />
                        {attachABForm.paymentRows.map((row, idx) => (
                          <div
                            key={idx}
                            className="border border-gray-100 rounded-lg p-2 space-y-2"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-400 font-medium">
                                Row {idx + 1}
                              </span>
                              {attachABForm.paymentRows.length > 1 && (
                                <button
                                  onClick={() => removePaymentRow(idx)}
                                  className="text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <Field
                              label="Mode of Payment"
                              value={row.mode}
                              onChange={(v) => setPaymentRow(idx, "mode", v)}
                              onBlur={refreshABPreview}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Field
                                label="No. of Students"
                                type="number"
                                value={row.students}
                                onChange={(v) =>
                                  setPaymentRow(idx, "students", v)
                                }
                                onBlur={refreshABPreview}
                              />
                              <Field
                                label="Amount (Php)"
                                type="number"
                                value={row.amount}
                                onChange={(v) =>
                                  setPaymentRow(idx, "amount", v)
                                }
                                onBlur={refreshABPreview}
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={addPaymentRow}
                          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-900 border border-dashed border-gray-200 rounded-lg py-1.5 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Row
                        </button>
                      </div>
                    </div>

                    {/* Table 3 — Collections Summary */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Table 3 — Collections Summary
                      </p>
                      <div className="space-y-2">
                        <Field
                          label="Table 3 Name"
                          value={attachABForm.attachBTable3Name}
                          onChange={(v) => setAB("attachBTable3Name", v)}
                          onBlur={(v) => blurAB("attachBTable3Name", v)}
                        />
                        <p className="text-[10px] text-gray-400">Collected</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field
                            label="No. of Students"
                            type="number"
                            value={attachABForm.collectedStudents}
                            onChange={(v) => setAB("collectedStudents", v)}
                            onBlur={(v) => blurAB("collectedStudents", v)}
                          />
                          <Field
                            label="Amount (Php)"
                            type="number"
                            value={attachABForm.collectedAmount}
                            onChange={(v) => setAB("collectedAmount", v)}
                            onBlur={(v) => blurAB("collectedAmount", v)}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Collectibles
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field
                            label="No. of Students"
                            type="number"
                            value={attachABForm.collectiblesStudents}
                            onChange={(v) => setAB("collectiblesStudents", v)}
                            onBlur={(v) => blurAB("collectiblesStudents", v)}
                          />
                          <Field
                            label="Amount (Php)"
                            type="number"
                            value={attachABForm.collectiblesAmount}
                            onChange={(v) => setAB("collectiblesAmount", v)}
                            onBlur={(v) => blurAB("collectiblesAmount", v)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ── Tab 3: Attachment C ── */}
            {activeTab === "attachC" && (
              <section>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Attachment C
                </p>
                <p className="text-[10px] text-gray-400 mb-3">
                  Table 1 uses expense entries. Table 2 uses income entries.
                </p>
                <div className="space-y-3">
                  <Field
                    label="Attachment C Title"
                    value={attachCForm.attachCTitle}
                    onChange={(v) => setC("attachCTitle", v)}
                    onBlur={(v) => blurC("attachCTitle", v)}
                  />
                  <Field
                    label="Table 1 Name"
                    value={attachCForm.table1Name}
                    onChange={(v) => setC("table1Name", v)}
                    onBlur={(v) => blurC("table1Name", v)}
                  />
                </div>
              </section>
            )}
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
  placeholder,
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
      <label className="text-xs font-medium text-gray-600 block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300"
      />
    </div>
  );
}
