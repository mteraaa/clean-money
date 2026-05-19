"use client";

import { useEffect } from "react";
import { X, Download } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PDFViewerCard({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center font-lexend"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      {/* Floating card */}
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "min(860px, 92vw)", height: "min(920px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-semibold text-gray-900">Financial Report Preview</span>
          <div className="flex items-center gap-2">
            <a
              href="/api/generate-report"
              download="financial-report.pdf"
              className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF */}
        <iframe
          key={open ? "open" : "closed"}
          src="/api/generate-report"
          className="flex-1 w-full border-0"
          title="Financial Report"
        />
      </div>
    </div>
  );
}
