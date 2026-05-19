import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import { buildCertUrl, type CertForm } from "./publishCertUtils";

type PublishedReport = { id: number; file_path: string; bucket: string };

type Options = {
  certForm: CertForm;
  attachABPdfSrc: string | null;
  attachCPdfSrc: string | null;
  onPublishSuccess?: (report: PublishedReport) => void;
  onClose: () => void;
};

export function usePublishReport({ certForm, attachABPdfSrc, attachCPdfSrc, onPublishSuccess, onClose }: Options) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const certRes = await fetch(buildCertUrl(certForm));
      if (!certRes.ok) throw new Error("Failed to generate main report");
      const certBlob = await certRes.blob();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const userId = user.id;

      const [{ data: userData }, { data: sem }] = await Promise.all([
        supabase.from("users").select("faculty_code, campus_code").eq("auth_id", userId).single(),
        supabase.from("semesters").select("id, semester_name, academic_years(year_label)").eq("is_active", true).single(),
      ]);
      if (!userData) throw new Error("User data not found");
      if (!sem) throw new Error("No active semester");
      const semId = sem.id;
      const facultyCode = userData.faculty_code;
      const campusCode = userData.campus_code;

      const ayRaw = sem.academic_years;
      const yearLabel = ((Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as { year_label?: string } | null)?.year_label ?? "";
      const semesterName = sem.semester_name ?? "";

      let title = "";
      let basePath = "";
      let publicBasePath = "";
      let pdfsBasePath = "";
      const bucket = facultyCode ? "Faculties" : "Campus SEB";

      if (facultyCode) {
        const { data: facData } = await supabase.from("faculty_seb").select("campus_code").eq("faculty_code", facultyCode).single();
        const { data: campusData } = await supabase.from("campus_seb").select("name").eq("campus_code", facData?.campus_code).single();
        const campusName = campusData?.name ?? "";
        title = `${facultyCode}-SEB Financial Report (${yearLabel}_${semesterName})`;
        basePath = `${campusName}/${facultyCode}/Financial Reports`;
        publicBasePath = `${campusName}/${facultyCode}/Public`;
        pdfsBasePath = `${campusName}/${facultyCode}/PDFs`;
      } else {
        const { data: campusData } = await supabase.from("campus_seb").select("name").eq("campus_code", campusCode).single();
        const campusName = campusData?.name ?? campusCode ?? "";
        title = `SEB-${campusName} Financial Report (${yearLabel}_${semesterName})`;
        basePath = `${campusCode}/Financial Reports`;
        publicBasePath = `${campusCode}/Public`;
        pdfsBasePath = `${campusCode}/PDFs`;
      }

      const mainPath = `${basePath}/${title}.pdf`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(mainPath, certBlob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      async function saveToArchives(srcUrl: string | null, label: string, folderPath: string): Promise<string | null> {
        if (!srcUrl) return null;
        const res = await fetch(srcUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        const archiveTitle = title.replace("Financial Report", label);
        const filePath = `${folderPath}/${archiveTitle}.pdf`;
        const { error } = await supabase.storage.from(bucket).upload(filePath, blob, { contentType: "application/pdf", upsert: true });
        if (error) return null;
        const record: Record<string, unknown> = {
          title: archiveTitle, original_name: `${archiveTitle}.pdf`, stored_name: `${archiveTitle}.pdf`,
          mime_type: "application/pdf", file_path: filePath,
          published_at: new Date().toISOString(), published_by: userId, semester_id: semId,
        };
        if (facultyCode) record.faculty_code = facultyCode;
        else record.campus_code = campusCode;
        await supabase.from("archives").insert(record);
        return filePath;
      }

      const summaryFilePath = await saveToArchives("/api/generate-financial-summary", "Financial Summary", publicBasePath);
      await saveToArchives(attachABPdfSrc, "Attachment A&B", pdfsBasePath);
      await saveToArchives(attachCPdfSrc, "Attachment C", pdfsBasePath);

      let existingQ = supabase.from("reports").select("id").eq("semester_id", semId);
      if (facultyCode) existingQ = existingQ.eq("faculty_code", facultyCode);
      else existingQ = existingQ.eq("campus_code", campusCode);
      const { data: existing } = await existingQ.maybeSingle();

      if (existing) {
        const updFileName = mainPath.split("/").pop() ?? `${title}.pdf`;
        const updatePayload: Record<string, unknown> = {
          title, original_name: updFileName, stored_name: updFileName,
          file_path: mainPath, published_at: new Date().toISOString(), published_by: userId,
        };
        if (summaryFilePath) updatePayload.summary_file_path = summaryFilePath;
        const { error: updateError } = await supabase.from("reports").update(updatePayload).eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
        onPublishSuccess?.({ id: existing.id, file_path: mainPath, bucket });
        toast.success("Financial report published successfully");
        onClose();
        return;
      }

      const fileName = mainPath.split("/").pop() ?? `${title}.pdf`;
      const record: Record<string, unknown> = {
        title, original_name: fileName, stored_name: fileName,
        mime_type: "application/pdf", file_path: mainPath,
        published_at: new Date().toISOString(), published_by: userId, semester_id: semId,
      };
      if (summaryFilePath) record.summary_file_path = summaryFilePath;
      if (facultyCode) record.faculty_code = facultyCode;
      else record.campus_code = campusCode;

      const { data: insertData, error: insertError } = await supabase.from("reports").insert(record).select("id").single();
      if (insertError) throw new Error(insertError.message);

      logActivity({
        description: `Published financial report: ${title}`,
        action: "PUBLISH_REPORT", module: "REPORTS",
        facultyCode, campusCode,
        targetTable: "reports", targetId: insertData?.id,
      }).catch(() => {});

      toast.success("Financial report published successfully");
      onPublishSuccess?.({ id: insertData?.id, file_path: mainPath, bucket });
      onClose();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPublishing(false);
    }
  }

  return { publishing, publishError, handlePublish };
}
