"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import BalanceCards from "@/components/BalanceCards";
import WelcomeCard from "@/components/WelcomeCard";
import IncomeEntriesTable from "@/components/IncomeEntriesTable";
import ExpenseEntriesTable from "@/components/ExpenseEntriesTable";
import AddEntrySheet, { FormState } from "@/components/AddEntrySheet";
import PDFViewerCard from "@/components/PDFViewerCard";
import PublishDialog from "@/components/PublishDialog";
import { logActivity } from "@/utils/logActivity";
import { toast } from "sonner";
import UnpublishDialog from "@/components/UnpublishDialog";

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const [balance, setBalance] = useState<{
    cash_on_bank: number;
    cash_on_hand: number;
    collectibles: number;
    faculty_code: string | null;
    campus_code: string | null;
  } | null>(null);

  const [isSemesterEnded, setIsSemesterEnded] = useState(false);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [semesterMeta, setSemesterMeta] = useState<{
    name: string;
    yearLabel: string;
  } | null>(null);
  const [nextControlNumbers, setNextControlNumbers] = useState({
    income: 1,
    expense: 1,
  });
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [balanceKey, setBalanceKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [publishedReport, setPublishedReport] = useState<{
    id: number;
    file_path: string;
    bucket: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("faculty_code, campus_code, full_name")
        .eq("auth_id", user.id)
        .single();

      if (!userData) return;

      if (userData.faculty_code) {
        const { data: facData } = await supabase
          .from("faculty_seb")
          .select("name")
          .eq("faculty_code", userData.faculty_code)
          .single();
        setUserName(facData?.name ?? "");
      } else if (userData.campus_code) {
        const { data: camData } = await supabase
          .from("campus_seb")
          .select("name")
          .eq("campus_code", userData.campus_code)
          .single();
        setUserName(camData?.name ?? "");
      }

      let balanceQuery = supabase
        .from("balance_cards")
        .select("cash_on_bank, cash_on_hand, collectibles");

      if (userData.faculty_code) {
        balanceQuery = balanceQuery.eq("faculty_code", userData.faculty_code);
      } else {
        balanceQuery = balanceQuery.eq("campus_code", userData.campus_code);
      }

      const { data } = await balanceQuery.maybeSingle();
      setBalance({
        cash_on_bank: data?.cash_on_bank ?? 0,
        cash_on_hand: data?.cash_on_hand ?? 0,
        collectibles: data?.collectibles ?? 0,
        faculty_code: userData.faculty_code,
        campus_code: userData.campus_code,
      });

      const { data: sem } = await supabase
        .from("semesters")
        .select("id, semester_name, academic_years(year_label)")
        .eq("is_active", true)
        .single();

      if (!sem) { setIsSemesterEnded(true); return; }
      setIsSemesterEnded(false);
      setSemesterId(sem.id);
      const ayRaw = sem.academic_years;
      const yearLabel =
        (
          (Array.isArray(ayRaw) ? ayRaw[0] : ayRaw) as {
            year_label?: string;
          } | null
        )?.year_label ?? "";
      setSemesterMeta({ name: sem.semester_name ?? "", yearLabel });

      const scope = userData.faculty_code
        ? { col: "faculty_code", val: userData.faculty_code }
        : { col: "campus_code", val: userData.campus_code };

      const [{ count: incomeCount }, { count: expenseCount }] =
        await Promise.all([
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .eq("semester_id", sem.id)
            .eq("category", "income")
            .eq(scope.col, scope.val),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .eq("semester_id", sem.id)
            .eq("category", "expense")
            .eq(scope.col, scope.val),
        ]);
      setNextControlNumbers({
        income: (incomeCount ?? 0) + 1,
        expense: (expenseCount ?? 0) + 1,
      });

      // Check if a report is already published for this semester
      const reportQ = supabase
        .from("reports")
        .select("id, file_path")
        .eq("semester_id", sem.id);
      if (userData.faculty_code)
        reportQ.eq("faculty_code", userData.faculty_code);
      else reportQ.eq("campus_code", userData.campus_code);
      const { data: existingReport } = await reportQ.maybeSingle();
      if (existingReport) {
        setPublishedReport({
          id: existingReport.id,
          file_path: existingReport.file_path,
          bucket: userData.faculty_code ? "Faculties" : "Campus SEB",
        });
      }
    })();
  }, []);

  async function refreshBalance() {
    if (!balance) return;
    const supabase = createClient();
    let q = supabase
      .from("balance_cards")
      .select("cash_on_bank, cash_on_hand, collectibles");
    if (balance.faculty_code) q = q.eq("faculty_code", balance.faculty_code);
    else q = q.eq("campus_code", balance.campus_code);
    const { data, error } = await q.single();
    if (error) console.error("Balance fetch error:", error.message);
    if (data) setBalance((prev) => (prev ? { ...prev, ...data } : prev));
    setBalanceKey((prev) => prev + 1);
  }

  async function handleUnpublish() {
    if (!publishedReport) return;
    const supabase = createClient();
    await supabase.storage
      .from(publishedReport.bucket)
      .remove([publishedReport.file_path]);
    await supabase.from("reports").delete().eq("id", publishedReport.id);
    setPublishedReport(null);
    setUnpublishOpen(false);
  }

  async function uploadReceipt(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    file: File,
    entryId: number,
  ) {
    if (!balance || !semesterId || !semesterMeta) return;

    const bucket = balance.faculty_code ? "Faculties" : "Campus SEB";
    let folderName = "";
    let storageFolderPath = "";

    if (balance.faculty_code) {
      const { data: facData } = await supabase
        .from("faculty_seb")
        .select("campus_code")
        .eq("faculty_code", balance.faculty_code)
        .single();
      const { data: campusData } = await supabase
        .from("campus_seb")
        .select("name")
        .eq("campus_code", facData?.campus_code)
        .single();
      const campusName = campusData?.name ?? "";
      folderName = `${balance.faculty_code}-SEB Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
      storageFolderPath = `${campusName}/${balance.faculty_code}/Receipts/${folderName}`;
    } else {
      const { data: campusData } = await supabase
        .from("campus_seb")
        .select("name")
        .eq("campus_code", balance.campus_code)
        .single();
      const campusName = campusData?.name ?? balance.campus_code ?? "";
      folderName = `SEB-${campusName} Receipts Compilation (${semesterMeta.yearLabel}_${semesterMeta.name})`;
      storageFolderPath = `${balance.campus_code}/Receipts/${folderName}`;
    }

    // Ensure folder record exists
    const folderQ = supabase
      .from("receipt_archive_folders")
      .select("id")
      .eq("semester_id", semesterId)
      .eq("folder_name", folderName);
    if (balance.faculty_code) folderQ.eq("faculty_code", balance.faculty_code);
    else folderQ.eq("campus_code", balance.campus_code);
    let { data: folderData } = await folderQ.maybeSingle();

    if (!folderData) {
      const newFolder: Record<string, unknown> = {
        folder_name: folderName,
        semester_id: semesterId,
        created_by: userId,
      };
      if (balance.faculty_code) newFolder.faculty_code = balance.faculty_code;
      else newFolder.campus_code = balance.campus_code;
      const { data: created } = await supabase
        .from("receipt_archive_folders")
        .insert(newFolder)
        .select("id")
        .single();
      folderData = created;
    }

    if (!folderData) return;

    // Upload file to storage
    const ext = file.name.split(".").pop() ?? "";
    const storedName = `${Date.now()}-${file.name}`;
    const filePath = `${storageFolderPath}/${storedName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Receipt upload error:", uploadError.message);
      return;
    }

    // Track in receipt_archive_files
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

  async function handleAdd(forms: FormState[]) {
    if (!semesterId || !balance) return;
    setAddSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAddSubmitting(false);
      return;
    }

    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      const needsExtra =
        f.description_preset === "Others" ||
        (f.category === "expense" &&
          f.description_preset === "Special Projects/Fund Raising");
      const finalDescription = needsExtra
        ? f.description_other
        : f.description_preset;

      const incomesBefore = forms
        .slice(0, i)
        .filter((f) => f.category === "income").length;
      const expensesBefore = forms
        .slice(0, i)
        .filter((f) => f.category === "expense").length;
      const controlNumber =
        f.category === "income"
          ? nextControlNumbers.income + incomesBefore
          : nextControlNumbers.expense + expensesBefore;

      const payload: Record<string, unknown> = {
        created_by: user.id,
        control_number: controlNumber,
        description: finalDescription,
        category: f.category,
        unit_price: parseFloat(f.unit_price) || 0,
        quantity: parseInt(f.quantity) || 0,
        entry_date: f.date,
        semester_id: semesterId,
      };
      if (balance.faculty_code) payload.faculty_code = balance.faculty_code;
      else payload.campus_code = balance.campus_code;

      const { data: entryData, error } = await supabase
        .from("entries")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        console.error("Insert error:", error.message);
        setAddSubmitting(false);
        return;
      }

      const amt = (parseFloat(f.unit_price) || 0) * (parseInt(f.quantity) || 0);
      const fmtAmt = `₱${amt.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      toast.success(
        `Added ${fmtAmt} to ${f.category === "income" ? "Income" : "Expenses"} for ${finalDescription}`,
      );
      logActivity({
        description: `Added ${fmtAmt} to ${f.category === "income" ? "Income" : "Expenses"} for ${finalDescription}`,
        action: "ADD_ENTRY",
        facultyCode: balance?.faculty_code,
        campusCode: balance?.campus_code,
        targetTable: "entries",
        targetId: entryData.id,
      }).catch(() => {});

      // Upload receipt if provided
      if (f.receipt && semesterMeta && balance) {
        await uploadReceipt(supabase, user.id, f.receipt, entryData.id);
      }
    }

    await refreshBalance();
    setAddSheetOpen(false);
    const addedIncome = forms.filter((f) => f.category === "income").length;
    const addedExpense = forms.filter((f) => f.category === "expense").length;
    setNextControlNumbers((prev) => ({
      income: prev.income + addedIncome,
      expense: prev.expense + addedExpense,
    }));
    setRefreshKey((prev) => prev + 1);
    setAddSubmitting(false);
  }

  return (
    <div className="bg-[#f3f4f6] min-h-full px-4 pt-3 pb-6">
      <WelcomeCard
        name={userName}
        isPublished={!!publishedReport}
        isSemesterEnded={isSemesterEnded}
        onAdd={() => setAddSheetOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        onPublish={() => setPublishOpen(true)}
        onUnpublish={() => setUnpublishOpen(true)}
      />
      {balance && (
        <>
          <BalanceCards
            key={balanceKey}
            cashOnBank={balance.cash_on_bank}
            cashOnHand={balance.cash_on_hand}
            collectibles={balance.collectibles}
            facultyCode={balance.faculty_code}
            campusCode={balance.campus_code}
            isPublished={!!publishedReport || isSemesterEnded}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ExpenseEntriesTable
              facultyCode={balance.faculty_code}
              campusCode={balance.campus_code}
              refreshKey={refreshKey}
              isPublished={!!publishedReport || isSemesterEnded}
              onMutation={() => {
                setRefreshKey((prev) => prev + 1);
                refreshBalance();
              }}
            />
            <IncomeEntriesTable
              facultyCode={balance.faculty_code}
              campusCode={balance.campus_code}
              refreshKey={refreshKey}
              isPublished={!!publishedReport || isSemesterEnded}
              onMutation={() => {
                setRefreshKey((prev) => prev + 1);
                refreshBalance();
              }}
            />
          </div>
        </>
      )}

      <PDFViewerCard open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublishSuccess={(report) => setPublishedReport(report)}
      />
      <UnpublishDialog
        open={unpublishOpen}
        onClose={() => setUnpublishOpen(false)}
        onConfirm={handleUnpublish}
      />

      <AddEntrySheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        submitting={addSubmitting}
        nextControlNumbers={nextControlNumbers}
        onSubmit={handleAdd}
      />
    </div>
  );
}
