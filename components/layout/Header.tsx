"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
      let campusCode = userData?.campus_code;

      if (userData?.faculty_code && !campusCode) {
        const { data: facData } = await supabase
          .from("faculty_seb")
          .select("campus_code")
          .eq("faculty_code", userData.faculty_code)
          .single();
        campusCode = facData?.campus_code ?? null;
      }

      if (campusCode) {
        const { data: campusData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", campusCode)
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
    <header className="bg-[#fafafa] px-4 py-4 md:px-10 md:py-6 shadow-[0px_4px_10px_0px_rgba(74,85,104,0.2)] relative z-10">
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          {data ? (
            <>
              <span className="font-lexend-exa font-bold text-base md:text-xl tracking-wide uppercase truncate">
                VSU - {data.org_name}
              </span>
              <span className="text-gray-400 text-xs md:text-sm font-inter shrink-0">
                {data.year_label} | {data.semester_name}
              </span>
            </>
          ) : (
            <Skeleton className="h-5 w-48" />
          )}
        </div>
      </div>
    </header>
  );
}
