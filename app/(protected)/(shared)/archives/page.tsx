"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import PublishedFilesTable, {
  PublishedFile,
} from "@/components/PublishedFilesTable";

export default function ArchivesPage() {
  const router = useRouter();
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

      // Fetch PDF archives
      const archivesQuery = supabase
        .from("archives")
        .select("id, title, mime_type, file_path, published_at")
        .order("published_at", { ascending: false });

      if (userData.faculty_code) {
        archivesQuery.eq("faculty_code", userData.faculty_code);
      } else if (userData.campus_code) {
        archivesQuery.eq("campus_code", userData.campus_code);
      }

      // Fetch receipt folders
      const foldersQuery = supabase
        .from("receipt_archive_folders")
        .select("id, folder_name, created_at")
        .order("created_at", { ascending: false });

      if (userData.faculty_code) {
        foldersQuery.eq("faculty_code", userData.faculty_code);
      } else if (userData.campus_code) {
        foldersQuery.eq("campus_code", userData.campus_code);
      }

      const [{ data: archivesData }, { data: foldersData }] = await Promise.all(
        [archivesQuery, foldersQuery],
      );

      // Generate signed URLs for PDFs
      const archiveFiles: PublishedFile[] = await Promise.all(
        (archivesData ?? []).map(async (a) => {
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(a.file_path, 60 * 60); // 1 hour
          return {
            id: `archive-${a.id}`,
            title: a.title,
            mime_type: a.mime_type,
            published_at: a.published_at,
            url: signed?.signedUrl,
          };
        }),
      );

      // Map folders as folder rows
      const folderFiles: PublishedFile[] = (foldersData ?? []).map((f) => ({
        id: `folder-${f.id}`,
        title: f.folder_name,
        mime_type: "folder",
        published_at: f.created_at,
        folder_id: f.id,
      }));

      // Combine and sort by date
      const combined = [...archiveFiles, ...folderFiles].sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime(),
      );

      setFiles(combined);
    })();
  }, []);

  function handleFolderClick(folderId: number) {
    router.push(`/archives/${folderId}`);
  }

  return (
    <div className="bg-[#f3f4f6] min-h-full p-8">
      <PublishedFilesTable files={files} onFolderClick={handleFolderClick} />
    </div>
  );
}
