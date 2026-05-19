"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import PublishedFilesTable, {
  PublishedFile,
} from "@/components/reports/PublishedFilesTable";

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<PublishedFile[]>([]);
  const [bucketName, setBucketName] = useState<string>("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data: userData } = await supabase
      .from("users")
      .select("faculty_code, campus_code")
      .eq("auth_id", user.id)
      .single();
    if (!userData) { setIsLoading(false); return; }

    const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";
    setBucketName(bucket);

    const query = supabase
      .from("reports")
      .select("id, title, mime_type, file_path, published_at")
      .order("published_at", { ascending: false });

    if (userData.faculty_code) query.eq("faculty_code", userData.faculty_code);
    else if (userData.campus_code) query.eq("campus_code", userData.campus_code);

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
          file_path: r.file_path,
        };
      }),
    );

    setFiles(mapped);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(ids: string[]) {
    const supabase = createClient();
    const selected = files.filter((f) => ids.includes(f.id));
    const filePaths = selected.map((f) => f.file_path).filter(Boolean) as string[];
    const numericIds = selected.map((f) => parseInt(f.id.replace("report-", "")));

    if (filePaths.length > 0) {
      await supabase.storage.from(bucketName).remove(filePaths);
    }
    await supabase.from("reports").delete().in("id", numericIds);
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
  }

  return (
    <div className="bg-[#f3f4f6] min-h-full p-4 md:p-8">
      {!isLoading && (
        <div className="animate-fade-in-up">
          <PublishedFilesTable files={files} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}
