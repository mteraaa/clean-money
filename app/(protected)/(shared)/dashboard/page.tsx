"use client";

import { useDashboard } from "./useDashboard";
import BalanceCards from "@/components/BalanceCards";
import WelcomeCard from "@/components/WelcomeCard";
import IncomeEntriesTable from "@/components/IncomeEntriesTable";
import ExpenseEntriesTable from "@/components/ExpenseEntriesTable";
import AddEntrySheet from "@/components/AddEntrySheet";
import InitialBalanceSetupCard from "@/components/InitialBalanceSetupCard";
import PDFViewerCard from "@/components/PDFViewerCard";
import PublishDialog from "@/components/PublishDialog";
import UnpublishDialog from "@/components/UnpublishDialog";
import DashboardSkeleton from "@/components/DashboardSkeleton";

export default function DashboardPage() {
  const {
    isLoading,
    userName,
    balance, setBalance,
    hasBalanceRow, setHasBalanceRow,
    isSemesterEnded,
    semesterId,
    nextControlNumbers,
    addSheetOpen, setAddSheetOpen,
    addSubmitting,
    refreshKey,
    balanceKey,
    fineStudentsPaid,
    previewOpen, setPreviewOpen,
    publishOpen, setPublishOpen,
    unpublishOpen, setUnpublishOpen,
    publishedReport, setPublishedReport,
    handleMutation,
    handleUnpublish,
    handleAdd,
  } = useDashboard();

  const isLocked = !!publishedReport || isSemesterEnded;

  if (isLoading) return <DashboardSkeleton />;

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

      {balance && !hasBalanceRow && (
        <InitialBalanceSetupCard
          facultyCode={balance.faculty_code}
          campusCode={balance.campus_code}
          semesterId={semesterId!}
          onComplete={(values) => {
            setBalance((prev) => (prev ? { ...prev, ...values } : prev));
            setHasBalanceRow(true);
          }}
        />
      )}

      {balance && hasBalanceRow && (
        <BalanceCards
          key={balanceKey}
          cashOnBank={balance.cash_on_bank}
          cashOnHand={balance.cash_on_hand}
          collectibles={balance.collectibles}
          fineAmount={balance.fine_amount}
          totalStudentsWithFines={balance.total_students_with_fines}
          fineStudentsPaid={fineStudentsPaid}
          facultyCode={balance.faculty_code}
          campusCode={balance.campus_code}
          isPublished={isLocked}
        />
      )}

      {balance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <ExpenseEntriesTable
            facultyCode={balance.faculty_code}
            campusCode={balance.campus_code}
            refreshKey={refreshKey}
            isPublished={isLocked}
            onMutation={handleMutation}
          />
          <IncomeEntriesTable
            facultyCode={balance.faculty_code}
            campusCode={balance.campus_code}
            refreshKey={refreshKey}
            isPublished={isLocked}
            onMutation={handleMutation}
          />
        </div>
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
