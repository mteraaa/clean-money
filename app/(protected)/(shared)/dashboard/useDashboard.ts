"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useDashboardData } from "./useDashboardData";
import { useAddEntry } from "./useAddEntry";

export function useDashboard() {
  const data = useDashboardData();
  const {
    balance, semesterId, semesterMeta,
    nextControlNumbers, setNextControlNumbers,
    setRefreshKey, refreshBalance,
  } = data;

  const addEntry = useAddEntry({
    balance,
    semesterId,
    semesterMeta,
    nextControlNumbers,
    setNextControlNumbers,
    setRefreshKey,
    refreshBalance,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);

  async function handleUnpublish() {
    if (!data.publishedReport || !data.semesterId) return;
    const supabase = createClient();
    const { bucket, file_path, id } = data.publishedReport;

    // Delete related archives (files + rows) for this semester/org scope
    let archivesQ = supabase
      .from("archives")
      .select("id, file_path")
      .eq("semester_id", data.semesterId);
    if (data.balance?.faculty_code)
      archivesQ = archivesQ.eq("faculty_code", data.balance.faculty_code);
    else if (data.balance?.campus_code)
      archivesQ = archivesQ.eq("campus_code", data.balance.campus_code);
    const { data: archiveRows } = await archivesQ;
    if (archiveRows && archiveRows.length > 0) {
      const paths = archiveRows.map((a) => a.file_path as string);
      await supabase.storage.from(bucket).remove(paths);
      await supabase.from("archives").delete().in("id", archiveRows.map((a) => a.id));
    }

    // Delete main report file and row
    await supabase.storage.from(bucket).remove([file_path]);
    await supabase.from("reports").delete().eq("id", id);
    data.setPublishedReport(null);
    setUnpublishOpen(false);
  }

  function handleMutation() {
    setRefreshKey((prev) => prev + 1);
    refreshBalance();
  }

  return {
    ...data,
    ...addEntry,
    previewOpen, setPreviewOpen,
    publishOpen, setPublishOpen,
    unpublishOpen, setUnpublishOpen,
    handleUnpublish,
    handleMutation,
  };
}
