"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { EMPTY_CERT, buildCertUrl, type CertForm } from "./publishCertUtils";
import { usePublishReport } from "./usePublishReport";
import PublishCertTab from "./PublishCertTab";
import AttachmentCTab from "./AttachmentCTab";
import AttachmentABTab from "./AttachmentABTab";

type PublishedReport = { id: number; file_path: string; bucket: string };
type Tab = "cert" | "attachAB" | "attachC" | "public";

type Props = {
  open: boolean;
  onClose: () => void;
  onPublishSuccess?: (report: PublishedReport) => void;
};

const TAB_LABELS: Record<Tab, string> = {
  cert: "Certification",
  attachAB: "Attach. A & B",
  attachC: "Attach. C",
  public: "Public",
};

const TAB_TITLES: Record<Tab, string> = {
  cert: "Financial Report Preview",
  attachAB: "Attachment A & B Preview",
  attachC: "Attachment C Preview",
  public: "Public Financial Summary Preview",
};

const EMPTY_HINT: Record<string, string> = {
  attachAB: "Select income entries to generate a preview",
  attachC: "Select expenses to generate a preview",
};

export default function PublishDialog({ open, onClose, onPublishSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("cert");
  const [certForm, setCertForm] = useState<CertForm>(EMPTY_CERT);
  const [certPdfSrc, setCertPdfSrc] = useState<string | null>(null);
  const [attachABPdfSrc, setAttachABPdfSrc] = useState<string | null>(null);
  const [attachCPdfSrc, setAttachCPdfSrc] = useState<string | null>(null);
  const [publicPdfSrc, setPublicPdfSrc] = useState<string | null>(null);

  const { publishing, publishError, handlePublish } = usePublishReport({
    certForm, attachABPdfSrc, attachCPdfSrc, onPublishSuccess, onClose,
  });

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
    setCertPdfSrc(buildCertUrl({ ...certForm, [field]: value }));
  }

  const displaySrc =
    activeTab === "cert" ? certPdfSrc
    : activeTab === "attachAB" ? attachABPdfSrc
    : activeTab === "attachC" ? attachCPdfSrc
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
            <span className="text-sm font-semibold text-gray-900">{TAB_TITLES[activeTab]}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {displaySrc ? (
            <iframe key={displaySrc} src={displaySrc} className="flex-1 w-full border-0" title="Report Preview" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {EMPTY_HINT[activeTab] ?? "Loading…"}
            </div>
          )}
        </div>

        {/* Form sheet */}
        <div className="w-80 border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Publish Report</h2>
            <div className="grid grid-cols-2 gap-1 mt-3">
              {(["cert", "public", "attachAB", "attachC"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className={activeTab !== "cert" ? "hidden" : ""}>
              <PublishCertTab certForm={certForm} onChange={setCert} onBlur={refreshCert} />
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
