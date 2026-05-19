import { createClient } from "@/utils/supabase/client";
import type { Balance, SemesterMeta } from "./types";

export async function uploadEntryReceipt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  file: File,
  entryId: number,
  balance: Balance,
  semesterId: number,
  semesterMeta: SemesterMeta,
) {
  const bucket = balance.faculty_code ? "Faculties" : "Campus SEB";
  let folderName = "";
  let storageFolderPath = "";

  if (balance.faculty_code) {
    const { data: facData } = await supabase
      .from("faculty_seb").select("campus_code")
      .eq("faculty_code", balance.faculty_code).single();
    const { data: campusData } = await supabase
      .from("campus_seb").select("name")
      .eq("campus_code", facData?.campus_code).single();
    const campusName = campusData?.name ?? "";
    folderName = `${balance.faculty_code}-SEB Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
    storageFolderPath = `${campusName}/${balance.faculty_code}/Receipts/${folderName}`;
  } else {
    const { data: campusData } = await supabase
      .from("campus_seb").select("name")
      .eq("campus_code", balance.campus_code).single();
    const campusName = campusData?.name ?? balance.campus_code ?? "";
    folderName = `SEB-${campusName} Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
    storageFolderPath = `${balance.campus_code}/Receipts/${folderName}`;
  }

  const folderQ = supabase.from("receipt_archive_folders").select("id")
    .eq("semester_id", semesterId).eq("folder_name", folderName);
  if (balance.faculty_code) folderQ.eq("faculty_code", balance.faculty_code);
  else folderQ.eq("campus_code", balance.campus_code);
  let { data: folderData } = await folderQ.maybeSingle();

  if (!folderData) {
    const newFolder: Record<string, unknown> = {
      folder_name: folderName, semester_id: semesterId, created_by: userId,
    };
    if (balance.faculty_code) newFolder.faculty_code = balance.faculty_code;
    else newFolder.campus_code = balance.campus_code;
    const { data: created } = await supabase
      .from("receipt_archive_folders").insert(newFolder).select("id").single();
    folderData = created;
  }
  if (!folderData) return;

  const ext = file.name.split(".").pop() ?? "";
  const storedName = `${Date.now()}-${file.name}`;
  const filePath = `${storageFolderPath}/${storedName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket).upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) { console.error("Receipt upload error:", uploadError.message); return; }

  await supabase.from("receipt_archive_files").insert({
    folder_id: folderData.id,
    entry_receipt_id: entryId,
    original_name: file.name,
    stored_name: storedName,
    file_path: filePath,
    file_size_bytes: file.size,
    mime_type: file.type || `image/${ext}`,
    added_by: userId,
    added_at: new Date().toISOString(),
  });
}
