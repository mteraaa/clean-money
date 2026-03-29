"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PublishedFilesTable, {
  PublishedFile,
} from "@/components/PublishedFilesTable";

export default function ReportsPage() {
  const [files, setFiles] = useState<PublishedFile[]>([]);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code")
        .eq("auth_id", user.id)
        .single();

      if (!userData) return;

      const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";

      const query = supabase
        .from("reports")
        .select("id, title, mime_type, file_path, published_at")
        .order("published_at", { ascending: false });

      if (userData.faculty_code) {
        query.eq("faculty_code", userData.faculty_code);
      } else if (userData.campus_code) {
        query.eq("campus_code", userData.campus_code);
      }

      const { data } = await query;

      const mapped: PublishedFile[] = await Promise.all(
        (data ?? []).map(async (r) => {
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(r.file_path, 60 * 60);
          return {
            id: `report-${r.id}`,
            title: r.title,
            mime_type: r.mime_type,
            published_at: r.published_at,
            url: signed?.signedUrl,
          };
        }),
      );

      setFiles(mapped);
    })();
  }, []);

  return (
    <div className="bg-[#f3f4f6] min-h-full p-8">
      <PublishedFilesTable files={files} />
    </div>
  );
}
