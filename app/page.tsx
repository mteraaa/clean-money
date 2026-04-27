"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ArrowDown,
  Download,
  ZoomIn,
  ZoomOut,
  FileText,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Campus = { campus_code: string; name: string };
type Faculty = { faculty_code: string; name: string };
type SemRow = {
  id: number;
  semester_name: string | null;
  academic_years: { year_label: string } | { year_label: string }[] | null;
};

export default function Home() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [semesters, setSemesters] = useState<SemRow[]>([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const viewerRef = useRef<HTMLElement>(null);
  const [reportUrl, setReportUrl] = useState("/report-template.pdf");
  const [reportTitle, setReportTitle] = useState("Financial Report Preview");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("campus_seb").select("campus_code, name").order("name"),
      supabase
        .from("semesters")
        .select("id, semester_name, academic_years(year_label)")
        .order("id", { ascending: false }),
    ]).then(([{ data: c }, { data: s }]) => {
      setCampuses(c ?? []);
      const sorted = ((s ?? []) as SemRow[]).sort((a, b) => {
        const ayA =
          (Array.isArray(a.academic_years)
            ? a.academic_years[0]
            : a.academic_years
          )?.year_label ?? "";
        const ayB =
          (Array.isArray(b.academic_years)
            ? b.academic_years[0]
            : b.academic_years
          )?.year_label ?? "";
        const yearCmp = ayB.localeCompare(ayA);
        if (yearCmp !== 0) return yearCmp;
        return (b.semester_name ?? "").localeCompare(a.semester_name ?? "");
      });
      setSemesters(sorted);
    });
  }, []);

  useEffect(() => {
    if (!selectedCampus) {
      setFaculties([]);
      setSelectedFaculty("");
      return;
    }
    const supabase = createClient();
    supabase
      .from("faculty_seb")
      .select("faculty_code, name")
      .eq("campus_code", selectedCampus)
      .order("name")
      .then(({ data }) => {
        setFaculties(data ?? []);
        setSelectedFaculty("");
      });
  }, [selectedCampus]);

  useEffect(() => {
    if (!selectedCampus || !selectedSemester) {
      setReportUrl("/report-template.pdf");
      setReportTitle("Financial Report Preview");
      return;
    }
    (async () => {
      const supabase = createClient();
      const query = supabase
        .from("reports")
        .select("id, file_path, title")
        .eq("semester_id", parseInt(selectedSemester));
      const isFaculty = selectedFaculty && selectedFaculty !== "__none__";
      if (isFaculty) query.eq("faculty_code", selectedFaculty);
      else query.eq("campus_code", selectedCampus).is("faculty_code", null);
      const { data } = await query.maybeSingle();
      if (!data?.file_path) {
        setReportUrl("/report-template.pdf");
        setReportTitle("No report available");
        return;
      }
      const bucket = isFaculty ? "Faculties" : "Campus SEB";
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.file_path, 3600);
      setReportUrl(signed?.signedUrl ?? "/report-template.pdf");
      setReportTitle(data.title ?? "Financial Report");
    })();
  }, [selectedCampus, selectedFaculty, selectedSemester]);

  function semLabel(s: SemRow): string {
    const ay = Array.isArray(s.academic_years)
      ? s.academic_years[0]
      : s.academic_years;
    return [s.semester_name, ay?.year_label].filter(Boolean).join(" — ");
  }

  return (
    <main
      className="h-screen overflow-y-auto overflow-x-hidden"
      style={{ background: "#101415", color: "#e0e3e5" }}
    >
      {/* ── Hero ── */}
      <section className="relative h-200 w-full flex flex-col items-center justify-center">
        {/* Background image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/landing-bg.png"
            alt=""
            className="w-full h-full object-cover grayscale opacity-30 mix-blend-luminosity"
          />
          {/* Gradient fade to page colour */}
          <div className="absolute inset-0 bg-linear-to-b from-[#101415]/40 via-[#101415]/60 to-[#101415]" />
        </div>

        {/* Hero content — pulled up with -mt-64 so the viewer section peeks in */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl px-6 -mt-96">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="CLARO"
            className="h-32 object-contain mb-8 brightness-0 invert"
          />

          {/* Tagline */}
          <h1
            className="text-[#e0e3e5] uppercase tracking-widest mb-1"
            style={{
              fontFamily: "var(--font-lexend-exa)",
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              fontWeight: 600,
            }}
          >
            Financial Transparency
          </h1>
          <h2
            className="text-[#e0e3e5] uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-lexend-exa)",
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              fontWeight: 600,
            }}
          >
            Clear Accountability
          </h2>

          {/* Scroll indicator */}
          <div
            className="absolute -bottom-32 flex flex-col items-center animate-bounce opacity-50 cursor-pointer"
            onClick={() =>
              viewerRef.current?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <span
              className="text-[11px] text-[#c6c6cc] uppercase tracking-widest mb-2"
              style={{ fontFamily: "var(--font-lexend)" }}
            >
              Explore Report
            </span>
            <ArrowDown className="w-5 h-5 text-[#c6c6cc]" />
          </div>
        </div>
      </section>

      {/* ── Dropdowns + PDF viewer ── */}
      {/* -mt-[200px] pulls this section up so it overlaps the hero */}
      <section
        ref={viewerRef}
        className="relative w-full max-w-7xl mx-auto px-6 pb-12 -mt-64 z-20"
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <FilterSelect
            label="Campus"
            value={selectedCampus}
            onChange={setSelectedCampus}
            placeholder="Select a campus"
            options={campuses.map((c) => ({
              value: c.campus_code,
              label: c.name,
            }))}
          />
          <FilterSelect
            label="Faculty"
            value={selectedFaculty}
            onChange={setSelectedFaculty}
            placeholder="Select a faculty"
            options={[
              {
                value: "__none__",
                label: `Campus Only (SEB - ${campuses.find((c) => c.campus_code === selectedCampus)?.name ?? ""})`,
              },
              ...faculties.map((f) => ({
                value: f.faculty_code,
                label: f.name,
              })),
            ]}
            disabled={!selectedCampus}
          />
          <FilterSelect
            label="Semester & Academic Year"
            value={selectedSemester}
            onChange={setSelectedSemester}
            placeholder="Select semester & academic year"
            options={semesters.map((s) => ({
              value: String(s.id),
              label: semLabel(s),
            }))}
          />
        </div>

        {/* Glass PDF viewer card */}
        <div
          className="w-full rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-700 ease-in-out hover:-translate-y-2 group"
          style={{
            background: "rgba(32,37,49,0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(100,116,139,0.1)",
          }}
        >
          {/* Viewer toolbar */}
          <div
            className="h-16 border-b flex items-center justify-between px-6"
            style={{
              borderColor: "rgba(69,70,76,0.3)",
              background: "rgba(29,32,34,0.4)",
            }}
          >
            <div className="flex items-center gap-4">
              <FileText className="w-5 h-5 text-[#c2c6d6]" />
              <span
                className="text-[#e0e3e5] text-base font-medium truncate max-w-xs"
                style={{ fontFamily: "var(--font-lexend-exa)" }}
              >
                {reportTitle}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[#c6c6cc]">
              <button className="hover:text-[#c2c6d6] transition-colors">
                <ZoomOut className="w-5 h-5" />
              </button>
              <span
                className="text-xs font-semibold tracking-wider w-9 text-center"
                style={{ fontFamily: "var(--font-lexend)" }}
              >
                100%
              </span>
              <button className="hover:text-[#c2c6d6] transition-colors">
                <ZoomIn className="w-5 h-5" />
              </button>
              <div
                className="w-px h-4 mx-2"
                style={{ background: "rgba(69,70,76,0.5)" }}
              />
              <a
                href={reportUrl}
                download
                className="hover:text-[#c2c6d6] transition-colors"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* PDF content area */}
          <div
            className="relative"
            style={{ height: "819px", background: "#e0e3e5" }}
          >
            <iframe
              key={reportUrl}
              src={reportUrl}
              className="w-full h-full border-0"
              title="Financial Report"
            />
            {/* Scroll hint — appears on card hover */}
            <div
              className="absolute bottom-0 left-0 w-full h-32 pointer-events-none flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(to top, #e0e3e5, transparent)",
              }}
            >
              <span
                className="bg-[#272a2c] text-[#e0e3e5] px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 pointer-events-auto"
                style={{ fontFamily: "var(--font-lexend)" }}
              >
                Scroll to read more <ArrowDown className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type SelectOption = { value: string; label: string };

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col gap-2">
      <label
        className="text-[11px] text-[#c6c6cc] uppercase tracking-wider pl-1"
        style={{
          fontFamily: "var(--font-lexend)",
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(29,32,34,0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(69,70,76,0.3)",
            color: "#e0e3e5",
            fontFamily: "var(--font-lexend)",
          }}
        >
          <option value="" style={{ background: "#1d2022" }}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              style={{ background: "#1d2022" }}
            >
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "#909096" }}
        />
      </div>
    </div>
  );
}
