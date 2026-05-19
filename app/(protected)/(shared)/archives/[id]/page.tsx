"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import PublishedFilesTable, {
  PublishedFile,
} from "@/components/reports/PublishedFilesTable";
import { ChevronLeft } from "lucide-react";

export default function ReceiptFolderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState<PublishedFile[]>([]);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code")
        .eq("auth_id", user.id)
        .single();

      if (!userData) { setIsLoading(false); return; }

      const bucket = userData.faculty_code ? "Faculties" : "Campus SEB";

      // Fetch folder info
      const { data: folder } = await supabase
        .from("receipt_archive_folders")
        .select("folder_name")
        .eq("id", id)
        .single();

      if (folder) setFolderName(folder.folder_name);

      // Fetch files in folder
      const { data: filesData } = await supabase
        .from("receipt_archive_files")
        .select("id, original_name, mime_type, added_at, file_path")
        .eq("folder_id", id)
        .order("added_at", { ascending: false });

      // Generate signed URLs
      const mapped: PublishedFile[] = await Promise.all(
        (filesData ?? []).map(async (f) => {
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(f.file_path, 60 * 60);
          return {
            id: `file-${f.id}`,
            title: f.original_name,
            mime_type: f.mime_type,
            published_at: f.added_at,
            url: signed?.signedUrl,
          };
        })
      );

      setFiles(mapped);
      setIsLoading(false);
    })();
  }, [id]);

  return (
    <div className="bg-[#f3f4f6] min-h-full p-4 md:p-8">
      {!isLoading && (
        <div className="animate-fade-in-up">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-inter text-gray-500 hover:text-gray-800 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Archives
          </button>
          <h2 className="font-inter font-semibold text-lg mb-4">{folderName}</h2>
          <PublishedFilesTable files={files} />
        </div>
      )}
    </div>
  );
}
