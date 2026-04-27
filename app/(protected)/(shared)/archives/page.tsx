"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import PublishedFilesTable, {
  PublishedFile,
} from "@/components/PublishedFilesTable";

export default function ArchivesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<PublishedFile[]>([]);
  const [bucketName, setBucketName] = useState<string>("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from("users")
      .select("faculty_code, campus_code")
      .eq("auth_id", user.id)
      .single();
    if (!userData) return;

    const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";
    setBucketName(bucket);

    const archivesQuery = supabase
      .from("archives")
      .select("id, title, mime_type, file_path, published_at")
      .order("published_at", { ascending: false });

    if (userData.faculty_code) archivesQuery.eq("faculty_code", userData.faculty_code);
    else if (userData.campus_code) archivesQuery.eq("campus_code", userData.campus_code);

    const foldersQuery = supabase
      .from("receipt_archive_folders")
      .select("id, folder_name, created_at")
      .order("created_at", { ascending: false });

    if (userData.faculty_code) foldersQuery.eq("faculty_code", userData.faculty_code);
    else if (userData.campus_code) foldersQuery.eq("campus_code", userData.campus_code);

    const [{ data: archivesData }, { data: foldersData }] = await Promise.all([
      archivesQuery,
      foldersQuery,
    ]);

    const archiveFiles: PublishedFile[] = await Promise.all(
      (archivesData ?? []).map(async (a) => {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(a.file_path, 60 * 60);
        return {
          id: `archive-${a.id}`,
          title: a.title,
          mime_type: a.mime_type,
          published_at: a.published_at,
          url: signed?.signedUrl,
          file_path: a.file_path,
        };
      }),
    );

    const folderFiles: PublishedFile[] = (foldersData ?? []).map((f) => ({
      id: `folder-${f.id}`,
      title: f.folder_name,
      mime_type: "folder",
      published_at: f.created_at,
      folder_id: f.id,
    }));

    const combined = [...archiveFiles, ...folderFiles].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    setFiles(combined);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(ids: string[]) {
    const supabase = createClient();
    const selected = files.filter((f) => ids.includes(f.id));

    const archiveIds = selected
      .filter((f) => f.id.startsWith("archive-"))
      .map((f) => parseInt(f.id.replace("archive-", "")));
    const archiveFilePaths = selected
      .filter((f) => f.id.startsWith("archive-") && f.file_path)
      .map((f) => f.file_path as string);

    const folderIds = selected
      .filter((f) => f.id.startsWith("folder-"))
      .map((f) => parseInt(f.id.replace("folder-", "")));

    if (archiveFilePaths.length > 0) {
      await supabase.storage.from(bucketName).remove(archiveFilePaths);
    }
    if (archiveIds.length > 0) {
      await supabase.from("archives").delete().in("id", archiveIds);
    }
    if (folderIds.length > 0) {
      await supabase.from("receipt_archive_folders").delete().in("id", folderIds);
    }

    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
  }

  return (
    <div className="bg-[#f3f4f6] min-h-full p-8">
      <PublishedFilesTable
        files={files}
        onFolderClick={(id) => router.push(`/archives/${id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
