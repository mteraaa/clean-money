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
    if (!data.publishedReport) return;
    const supabase = createClient();
    await supabase.storage
      .from(data.publishedReport.bucket)
      .remove([data.publishedReport.file_path]);
    await supabase.from("reports").delete().eq("id", data.publishedReport.id);
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
