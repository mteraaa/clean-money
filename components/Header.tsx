"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type HeaderData = {
  faculty_name: string;
  year_label: string;
  semester_name: string;
};

export default function Header() {
  const [data, setData] = useState<HeaderData | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: userData }, { data: semesterData }] = await Promise.all([
        supabase
          .from("users")
          .select("faculty_code")
          .eq("auth_id", user.id)
          .single(),
        supabase
          .from("semesters")
          .select("semester_name, academic_years(year_label)")
          .eq("is_active", true)
          .single(),
      ]);

      if (!userData?.faculty_code) return;

      const { data: facultyData } = await supabase
        .from("faculty_seb")
        .select("name")
        .eq("code", userData.faculty_code)
        .single();

      const ayRaw = semesterData?.academic_years;
      const academicYear = (Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as {
        year_label: string;
      } | null;

      if (facultyData && semesterData && academicYear) {
        setData({
          faculty_name: facultyData.name,
          year_label: academicYear.year_label,
          semester_name: semesterData.semester_name,
        });
      }
    })();
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-10 py-8 shadow-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-lexend font-bold text-xl tracking-wide uppercase">
          {data?.faculty_name ?? ""}
        </span>
        {data && (
          <span className="text-gray-400 text-sm font-inter">
            A.Y. {data.year_label} | {data.semester_name}
          </span>
        )}
      </div>
    </header>
  );
}
