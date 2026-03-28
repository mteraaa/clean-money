"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type HeaderData = {
  org_name: string;
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
          .select("faculty_code, campus_code")
          .eq("auth_id", user.id)
          .single(),
        supabase
          .from("semesters")
          .select("semester_name, academic_years(year_label)")
          .eq("is_active", true)
          .single(),
      ]);

      const ayRaw = semesterData?.academic_years;
      const academicYear = (Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as {
        year_label: string;
      } | null;

      let orgName = "";

      if (userData?.faculty_code) {
        const { data: facultyData } = await supabase
          .from("faculty_seb")
          .select("name")
          .eq("faculty_code", userData.faculty_code)
          .single();
        orgName = facultyData?.name ?? "";
      } else if (userData?.campus_code) {
        const { data: campusData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        orgName = campusData?.name ?? "";
      }

      if (orgName && semesterData && academicYear) {
        setData({
          org_name: orgName,
          year_label: academicYear.year_label,
          semester_name: semesterData.semester_name,
        });
      }
    })();
  }, []);

  return (
    <header className="bg-[#fafafa] px-10 py-8 shadow-[0px_4px_10px_0px_rgba(74,85,104,0.2)] relative z-10">
      <div className="flex items-baseline gap-3">
        <span className="font-lexend-exa font-bold text-xl tracking-wide uppercase">
          {data?.org_name ?? ""}
        </span>
        {data && (
          <span className="text-gray-400 text-sm font-inter">
            {data.year_label} | {data.semester_name}
          </span>
        )}
      </div>
    </header>
  );
}
